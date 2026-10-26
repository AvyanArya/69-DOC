import Foundation

/// Preferences, memory, conversation history, daily overview and calendar.
@MainActor
enum AssistantTools {
    static func all() -> [RegisteredTool] {
        [getPreferences, updatePreferences, saveMemory, searchMemory, deleteMemory, searchConversations,
         dailyOverview, calendarEvents, findFreeTime, createEvent, createReminder]
    }

    // MARK: Preferences

    static func preferencesJSON(_ prefs: UserPreferences) -> JSONValue {
        [
            "preferred_name": .string(prefs.preferredName),
            "answer_length": .string(prefs.answerLength.rawValue),
            "tone": .string(prefs.tone.rawValue),
            "custom_instructions": .string(prefs.customInstructions),
            "favorite_apps": .array(prefs.favoriteApps.map(JSONValue.string)),
            "default_focus_minutes": .int(prefs.defaultFocusMinutes),
            "default_break_minutes": .int(prefs.defaultBreakMinutes),
            "workday_start": .string(prefs.workdayStart),
            "workday_end": .string(prefs.workdayEnd),
        ]
    }

    static let getPreferences = RegisteredTool(
        ToolDefinition(name: "get_preferences", description: "Returns the user's saved assistant preferences.", schema: .empty, risk: .read, feature: .preferences),
        describe: { _ in "Read preferences" },
        run: { _, context in ToolOutput(preferencesJSON(context.services.settings.preferences), summary: "Read preferences") }
    )

    static let updatePreferences = RegisteredTool(
        ToolDefinition(
            name: "update_preferences",
            description: "Updates the user's assistant preferences, e.g. when they say they prefer short answers, a different focus length, or their working hours. Only include fields that change.",
            schema: .object(properties: [
                .init("preferred_name", .string(description: "What to call the user", maxLength: 60)),
                .init("answer_length", .string(description: "Preferred answer length", enumValues: AnswerLength.allCases.map(\.rawValue))),
                .init("tone", .string(description: "Preferred tone", enumValues: AnswerTone.allCases.map(\.rawValue))),
                .init("custom_instructions", .string(description: "Standing instructions from the user (replaces existing)", maxLength: 1_000)),
                .init("favorite_apps", .array(items: .string(maxLength: 60), description: "Apps the user uses often", maxItems: 12)),
                .init("default_focus_minutes", .integer(description: "Default focus session length", minimum: 5, maximum: 180)),
                .init("default_break_minutes", .integer(description: "Default break length", minimum: 1, maximum: 60)),
                .init("workday_start", .string(description: "Start of working hours, HH:mm", minLength: 5, maxLength: 5)),
                .init("workday_end", .string(description: "End of working hours, HH:mm", minLength: 5, maxLength: 5)),
            ], required: []),
            risk: .appWrite, feature: .preferences
        ),
        describe: { args in "Update preferences: " + args.object.keys.joined(separator: ", ") },
        run: { args, context in
            for key in ["workday_start", "workday_end"] {
                if let value = args.optionalString(key), DateCoding.parseClockTime(value) == nil {
                    throw ToolError.invalidArguments("\(key) must be HH:mm")
                }
            }
            let updated = try context.services.settings.updatePreferences { prefs in
                if let v = args.optionalString("preferred_name") { prefs.preferredName = v }
                if let v = args.optionalString("answer_length").flatMap(AnswerLength.init(rawValue:)) { prefs.answerLength = v }
                if let v = args.optionalString("tone").flatMap(AnswerTone.init(rawValue:)) { prefs.tone = v }
                if let v = args.optionalString("custom_instructions") { prefs.customInstructions = v }
                if args.object["favorite_apps"] != nil { prefs.favoriteApps = args.strings("favorite_apps") }
                if let v = args.int("default_focus_minutes") { prefs.defaultFocusMinutes = v }
                if let v = args.int("default_break_minutes") { prefs.defaultBreakMinutes = v }
                if let v = args.optionalString("workday_start") { prefs.workdayStart = v }
                if let v = args.optionalString("workday_end") { prefs.workdayEnd = v }
            }
            return ToolOutput(["preferences": preferencesJSON(updated)], summary: "Updated preferences")
        }
    )

    // MARK: Memory

    static let saveMemory = RegisteredTool(
        ToolDefinition(
            name: "save_memory",
            description: "Saves a long-term memory used in future conversations. Only call this when the user asks you to remember something or states a lasting preference, project or goal. Never save passwords, financial, health or other sensitive details unless the user explicitly asks. The user approves each memory.",
            schema: .object(properties: [
                .init("content", .string(description: "The fact to remember, written as a short standalone sentence", minLength: 3, maxLength: 500)),
                .init("category", .string(description: "Kind of memory", enumValues: MemoryCategory.allCases.map(\.rawValue))),
            ], required: ["content", "category"]),
            risk: .appWrite, feature: .memory
        ),
        describe: { args in "Remember: “\((try? args.string("content")) ?? "")”" },
        run: { args, context in
            let item = try context.services.memory.add(
                try args.string("content"), category: MemoryCategory(rawValue: try args.string("category")) ?? .fact, source: .assistant
            )
            return ToolOutput(["saved": ToolJSON.memory(item)], summary: "Saved memory")
        }
    )

    static let searchMemory = RegisteredTool(
        ToolDefinition(
            name: "search_memory",
            description: "Searches the user's saved long-term memories (approved facts, preferences, projects, goals, summaries).",
            schema: .object(properties: [
                .init("query", .string(description: "Words to look for (omit to list recent memories)", maxLength: 200)),
                .init("category", .string(description: "Filter by category", enumValues: MemoryCategory.allCases.map(\.rawValue))),
                .init("limit", .integer(description: "Maximum results (default 15)", minimum: 1, maximum: 50)),
            ], required: []),
            risk: .read, feature: .memory
        ),
        describe: { args in args.optionalString("query").map { "Search memories for “\($0)”" } ?? "List memories" },
        run: { args, context in
            let items = context.services.memory.search(
                args.optionalString("query"), category: args.optionalString("category").flatMap(MemoryCategory.init(rawValue:)), limit: args.int("limit") ?? 15
            )
            return ToolOutput(["memories": .array(items.map(ToolJSON.memory)), "count": .int(items.count)], summary: "Found \(items.count) memories")
        }
    )

    static let deleteMemory = RegisteredTool(
        ToolDefinition(
            name: "delete_memory",
            description: "Deletes a saved memory when the user asks you to forget it. The user is asked to confirm.",
            schema: .object(properties: [.init("id", .string(description: "Memory id", minLength: 6, maxLength: 40))], required: ["id"]),
            risk: .destructive, feature: .memory
        ),
        describe: { args in "Forget memory \((try? args.string("id")) ?? "")" },
        run: { args, context in
            let store = context.services.memory
            let item = try store.item(try args.string("id"))
            try store.delete(item.id)
            return ToolOutput(["deleted": ToolJSON.memory(item)], summary: "Deleted memory")
        }
    )

    static let searchConversations = RegisteredTool(
        ToolDefinition(
            name: "search_conversations",
            description: "Searches the user's earlier NotchPilot conversations by keyword and returns matching snippets. Use when the user refers to something discussed before.",
            schema: .object(properties: [
                .init("query", .string(description: "Words to search for", minLength: 2, maxLength: 200)),
                .init("limit", .integer(description: "Maximum conversations (default 5)", minimum: 1, maximum: 20)),
            ], required: ["query"]),
            risk: .read, feature: .conversations
        ),
        describe: { args in "Search past conversations for “\((try? args.string("query")) ?? "")”" },
        run: { args, context in
            let hits = context.services.conversations.search(try args.string("query"), limit: args.int("limit") ?? 5, excluding: context.conversationID)
            let output: JSONValue = ["results": .array(hits.map { hit in
                ["title": .string(hit.title), "date": ToolJSON.date(hit.updatedAt, hasTime: false), "snippet": .string(hit.snippet)]
            })]
            return ToolOutput(output, summary: "Found \(hits.count) conversation\(hits.count == 1 ? "" : "s")")
        }
    )

    // MARK: Daily overview

    static let dailyOverview = RegisteredTool(
        ToolDefinition(
            name: "get_daily_overview",
            description: "Gathers everything needed to summarise a day: calendar events (if calendar access is allowed), overdue and due tasks, high-priority tasks, the timer, and saved goals. Call this for requests like “summarise my day” or “what should I prioritise”.",
            schema: .object(properties: [
                .init("date", .string(description: "Day to summarise (default today)", format: .dateOrDateTime)),
            ], required: []),
            risk: .read, feature: .core
        ),
        describe: { _ in "Gather today’s overview" },
        run: { args, context in
            let services = context.services
            let now = context.now
            let calendar = Calendar.current
            let day = calendar.startOfDay(for: try args.date("date")?.date ?? now)
            let nextDay = calendar.date(byAdding: .day, value: 1, to: day)!
            var output = JSONObject()
            output["date"] = .string(DateCoding.friendly(day, includeTime: false))
            output["now"] = .string(DateCoding.friendly(now))

            if services.settings.settings.features.calendar {
                do {
                    try await CalendarAccess.ensure(services.calendar, needsRead: true)
                    let events = try await services.calendar.events(from: day, to: nextDay)
                    output["events"] = .array(events.map(ToolJSON.event))
                } catch {
                    output["events_unavailable"] = .string(error.localizedDescription)
                }
            } else {
                output["events_unavailable"] = "Calendar integration is turned off in Settings."
            }

            let open = services.tasks.openTasks
            output["overdue_tasks"] = .array(open.filter { $0.isOverdue(at: now) }.prefix(15).map { ToolJSON.task($0, now: now) })
            output["due_this_day"] = .array(open.filter { $0.isDue(on: day) && !$0.isOverdue(at: now) }.prefix(15).map { ToolJSON.task($0, now: now) })
            output["high_priority_open"] = .array(open.filter { $0.priority == .high && !$0.isDue(on: day) && !$0.isOverdue(at: now) }.prefix(10).map { ToolJSON.task($0, now: now) })
            output["open_task_count"] = .int(open.count)
            output["completed_today"] = .int(services.tasks.tasks.filter { $0.completedAt.map { calendar.isDate($0, inSameDayAs: now) } ?? false }.count)
            output["timer"] = ToolJSON.timer(services.timer, now: now)
            output["focus_sessions_completed_today"] = .int(services.timer.focusSessionsCompleted(on: now))
            if services.settings.settings.features.memory {
                let goals = services.memory.items.filter { $0.category == .goal || $0.category == .project }.prefix(8)
                output["goals_and_projects"] = .array(goals.map(ToolJSON.memory))
            }
            let prefs = services.settings.preferences
            output["workday"] = .string("\(prefs.workdayStart)–\(prefs.workdayEnd)")
            return ToolOutput(.object(output), summary: "Gathered overview")
        }
    )

    // MARK: Calendar

    static let calendarEvents = RegisteredTool(
        ToolDefinition(
            name: "get_calendar_events",
            description: "Reads events from the user's calendars (macOS Calendar, including synced accounts) for a time range. Defaults to the rest of today. The first use may show a macOS permission prompt.",
            schema: .object(properties: [
                .init("start", .string(description: "Range start (default now)", format: .dateOrDateTime)),
                .init("end", .string(description: "Range end (default end of the start day)", format: .dateOrDateTime)),
                .init("days", .integer(description: "Alternative to end: number of days from start", minimum: 1, maximum: 31)),
            ], required: []),
            risk: .read, feature: .calendar, timeout: 60
        ),
        describe: { _ in "Read calendar events" },
        run: { args, context in
            let services = context.services
            let calendar = Calendar.current
            let now = context.now
            let start = try args.date("start")?.date ?? now
            var end: Date
            if let explicit = try args.date("end") {
                end = explicit.hasTime ? explicit.date : calendar.date(byAdding: .day, value: 1, to: explicit.date)!
            } else if let days = args.int("days") {
                end = calendar.date(byAdding: .day, value: days, to: calendar.startOfDay(for: start))!
            } else {
                end = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: start))!
            }
            guard end > start else { throw ToolError.invalidArguments("end must be after start") }
            try await CalendarAccess.ensure(services.calendar, needsRead: true)
            let events = try await services.calendar.events(from: start, to: end)
            let output: JSONValue = [
                "range": ["start": ToolJSON.date(start), "end": ToolJSON.date(end)],
                "events": .array(events.prefix(100).map(ToolJSON.event)),
                "count": .int(events.count),
            ]
            return ToolOutput(output, summary: "Found \(events.count) event\(events.count == 1 ? "" : "s")")
        }
    )

    static let findFreeTime = RegisteredTool(
        ToolDefinition(
            name: "find_free_time",
            description: "Finds free slots of a given length in the user's calendar within working hours (defaults to the user's workday). Use it to suggest times for study or focus sessions.",
            schema: .object(properties: [
                .init("duration_minutes", .integer(description: "Length of the slot needed", minimum: 5, maximum: 480)),
                .init("date", .string(description: "First day to search (default today)", format: .dateOrDateTime)),
                .init("days", .integer(description: "How many days to search (default 1)", minimum: 1, maximum: 7)),
                .init("earliest", .string(description: "Earliest start, HH:mm (default workday start)", minLength: 4, maxLength: 5)),
                .init("latest", .string(description: "Latest end, HH:mm (default workday end)", minLength: 4, maxLength: 5)),
            ], required: ["duration_minutes"]),
            risk: .read, feature: .calendar, timeout: 60
        ),
        describe: { args in "Find \(args.int("duration_minutes") ?? 0)-minute free slots" },
        run: { args, context in
            let services = context.services
            let prefs = services.settings.preferences
            guard let earliest = DateCoding.parseClockTime(args.optionalString("earliest") ?? prefs.workdayStart),
                  let latest = DateCoding.parseClockTime(args.optionalString("latest") ?? prefs.workdayEnd) else {
                throw ToolError.invalidArguments("earliest/latest must be HH:mm")
            }
            let now = context.now
            let firstDay = Calendar.current.startOfDay(for: try args.date("date")?.date ?? now)
            let days = args.int("days") ?? 1
            let rangeEnd = Calendar.current.date(byAdding: .day, value: days, to: firstDay)!
            try await CalendarAccess.ensure(services.calendar, needsRead: true)
            let events = try await services.calendar.events(from: firstDay, to: rangeEnd)
            let slots = FreeTimeFinder.findSlots(
                events: events, from: firstDay, days: days, earliest: earliest, latest: latest,
                duration: TimeInterval((args.int("duration_minutes") ?? 30) * 60), notBefore: now
            )
            let output: JSONValue = ["slots": .array(slots.prefix(10).map { slot in
                ["start": ToolJSON.date(slot.start), "end": ToolJSON.date(slot.end), "free_minutes": .int(Int(slot.end.timeIntervalSince(slot.start) / 60))]
            }), "events_considered": .int(events.count)]
            return ToolOutput(output, summary: "Found \(slots.count) free slot\(slots.count == 1 ? "" : "s")")
        }
    )

    static let createEvent = RegisteredTool(
        ToolDefinition(
            name: "create_calendar_event",
            description: "Adds an event to the user's default calendar. The user confirms before it is created. Provide either end or duration_minutes.",
            schema: .object(properties: [
                .init("title", .string(description: "Event title", minLength: 1, maxLength: 200)),
                .init("start", .string(description: "Start date-time", format: .dateOrDateTime)),
                .init("end", .string(description: "End date-time", format: .dateOrDateTime)),
                .init("duration_minutes", .integer(description: "Length if end is not given (default 60)", minimum: 5, maximum: 1_440)),
                .init("location", .string(description: "Optional location", maxLength: 200)),
                .init("notes", .string(description: "Optional notes", maxLength: 2_000)),
            ], required: ["title", "start"]),
            risk: .external, feature: .calendar, timeout: 60
        ),
        describe: { args in
            let title = (try? args.string("title")) ?? ""
            guard let start = try? args.date("start") else { return "Add “\(title)” to Calendar" }
            return "Add “\(title)” to Calendar on \(DateCoding.friendly(start.date, includeTime: start.hasTime))"
        },
        run: { args, context in
            let services = context.services
            guard let start = try args.date("start"), start.hasTime else { throw ToolError.invalidArguments("start must include a time") }
            let end = try args.date("end")?.date ?? start.date.addingTimeInterval(TimeInterval((args.int("duration_minutes") ?? 60) * 60))
            guard end > start.date else { throw ToolError.invalidArguments("end must be after start") }
            try await CalendarAccess.ensure(services.calendar, needsRead: false)
            let event = try await services.calendar.createEvent(
                title: try args.string("title"), start: start.date, end: end, notes: args.optionalString("notes"), location: args.optionalString("location")
            )
            return ToolOutput(["created": ToolJSON.event(event)], summary: "Added “\(event.title)” to \(event.calendarName.isEmpty ? "Calendar" : event.calendarName)")
        }
    )

    static let createReminder = RegisteredTool(
        ToolDefinition(
            name: "create_reminder",
            description: "Creates a reminder in the macOS Reminders app (useful for alerts outside NotchPilot). The user confirms first. For NotchPilot's own task list use create_task instead.",
            schema: .object(properties: [
                .init("title", .string(description: "Reminder text", minLength: 1, maxLength: 200)),
                .init("due", .string(description: "When to remind", format: .dateOrDateTime)),
                .init("notes", .string(description: "Optional notes", maxLength: 2_000)),
            ], required: ["title"]),
            risk: .external, feature: .reminders, timeout: 60
        ),
        describe: { args in
            var text = "Create reminder “\((try? args.string("title")) ?? "")”"
            if let due = try? args.date("due") { text += " for \(DateCoding.friendly(due.date, includeTime: due.hasTime))" }
            return text
        },
        run: { args, context in
            let calendar = context.services.calendar
            var state = calendar.remindersAuthorization()
            if state == .notDetermined { state = await calendar.requestRemindersAccess() }
            switch state {
            case .authorized, .writeOnly: break
            case .unavailable: throw ToolError.unsupported("Reminders are only available in the macOS app.")
            default: throw ToolError.notAuthorized("Reminders access is off. Allow NotchPilot in System Settings › Privacy & Security › Reminders.")
            }
            let reminder = try await calendar.createReminder(title: try args.string("title"), due: try args.date("due"), notes: args.optionalString("notes"))
            return ToolOutput(["created": ["title": .string(reminder.title), "due": ToolJSON.date(reminder.due), "list": .string(reminder.listName)]],
                              summary: "Created reminder “\(reminder.title)”")
        }
    )
}

@MainActor
enum CalendarAccess {
    /// Requests calendar access through the system prompt if undecided, and
    /// explains how to enable it if it was denied.
    static func ensure(_ calendar: CalendarService, needsRead: Bool) async throws {
        var state = calendar.eventsAuthorization()
        if state == .notDetermined { state = await calendar.requestEventsAccess() }
        switch state {
        case .authorized:
            return
        case .writeOnly where !needsRead:
            return
        case .writeOnly:
            throw ToolError.notAuthorized("NotchPilot can add events but not read them. Choose “Full Access” for NotchPilot in System Settings › Privacy & Security › Calendars.")
        case .unavailable:
            throw ToolError.unsupported("Calendar access is only available in the macOS app.")
        case .denied, .restricted, .notDetermined:
            throw ToolError.notAuthorized("Calendar access is off. Allow NotchPilot in System Settings › Privacy & Security › Calendars.")
        }
    }
}

/// Pure free-slot computation (unit tested).
public enum FreeTimeFinder {
    public struct Slot: Equatable, Sendable {
        public let start: Date
        public let end: Date
    }

    public static func findSlots(
        events: [CalendarEventInfo], from firstDay: Date, days: Int, earliest: (hour: Int, minute: Int),
        latest: (hour: Int, minute: Int), duration: TimeInterval, notBefore: Date, calendar: Calendar = .current
    ) -> [Slot] {
        var slots: [Slot] = []
        let busy = events.filter { !$0.isAllDay }.map { ($0.start, $0.end) }.sorted { $0.0 < $1.0 }
        for offset in 0..<max(1, days) {
            guard let day = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: firstDay)),
                  let windowStart = calendar.date(bySettingHour: earliest.hour, minute: earliest.minute, second: 0, of: day),
                  let windowEnd = calendar.date(bySettingHour: latest.hour, minute: latest.minute, second: 0, of: day),
                  windowEnd > windowStart else { continue }
            // Round "now" up to the next 5 minutes so suggestions look natural.
            var cursor = max(windowStart, roundUp(notBefore, minutes: 5, calendar: calendar))
            for (start, end) in busy where end > cursor && start < windowEnd {
                if start > cursor, start.timeIntervalSince(cursor) >= duration {
                    slots.append(Slot(start: cursor, end: min(start, windowEnd)))
                }
                cursor = max(cursor, end)
                if cursor >= windowEnd { break }
            }
            if windowEnd > cursor, windowEnd.timeIntervalSince(cursor) >= duration {
                slots.append(Slot(start: cursor, end: windowEnd))
            }
        }
        return slots
    }

    static func roundUp(_ date: Date, minutes: Int, calendar: Calendar) -> Date {
        let components = calendar.dateComponents([.minute, .second], from: date)
        let minute = components.minute ?? 0
        let remainder = minute % minutes
        if remainder == 0 && (components.second ?? 0) == 0 { return date }
        let add = minutes - remainder
        let base = calendar.date(bySetting: .second, value: 0, of: date) ?? date
        return calendar.date(byAdding: .minute, value: add, to: base) ?? date
    }
}
