import Foundation
import NotchPilotCore

/// Turns the proactive settings into scheduled local notifications.
///
/// Nothing polls: notifications are scheduled as one-shot system requests and
/// recomputed when tasks, the calendar or settings change, and once after
/// midnight. No data is sent to an AI provider in the background — the
/// briefing notification only asks the assistant after the user taps it.
@MainActor
final class ProactiveScheduler {
    private let services: AgentServices
    private let notifications: NotificationService
    private var pendingRefresh: Task<Void, Never>?
    private var midnightTask: Task<Void, Never>?

    init(services: AgentServices, notifications: NotificationService) {
        self.services = services
        self.notifications = notifications
    }

    func start() {
        scheduleRefresh(after: 0.5)
        scheduleMidnightRefresh()
    }

    /// Debounced recompute (task edits can arrive in bursts).
    func scheduleRefresh(after delay: TimeInterval = 1.5) {
        pendingRefresh?.cancel()
        pendingRefresh = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard !Task.isCancelled else { return }
            await self?.refresh()
        }
    }

    private func scheduleMidnightRefresh() {
        midnightTask?.cancel()
        let calendar = Calendar.current
        let next = calendar.nextDate(after: Date(), matching: DateComponents(hour: 0, minute: 1), matchingPolicy: .nextTime) ?? Date().addingTimeInterval(86_400)
        midnightTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(max(60, next.timeIntervalSinceNow) * 1_000_000_000))
            guard !Task.isCancelled else { return }
            self?.scheduleRefresh(after: 0)
            self?.scheduleMidnightRefresh()
        }
    }

    // MARK: Timer

    /// Keeps the timer's completion notification in sync with its state.
    func timerChanged(_ state: TimerState) {
        let id = "timer"
        guard services.settings.settings.proactive.focusSessionNotifications, state.phase == .running, let end = state.endDate else {
            notifications.cancel(ids: [id])
            return
        }
        let title: String
        var body: String
        switch state.kind {
        case .focus:
            title = "Focus session complete"
            body = "“\(state.label)” is done."
            if let minutes = state.breakMinutesAfter { body += " Time for a \(minutes)-minute break." }
        case .shortBreak:
            title = "Break over"
            body = "Ready to get back to it?"
        case .custom:
            title = "Timer finished"
            body = state.label
        }
        if let message = state.completionMessage { body = message }
        notifications.schedule(id: id, title: title, body: body, at: end, category: .timer, userInfo: ["break": String(state.breakMinutesAfter ?? services.settings.preferences.defaultBreakMinutes)])
    }

    // MARK: Recompute

    private func refresh() async {
        let settings = services.settings.settings.proactive
        let now = Date()
        let calendar = Calendar.current

        // Morning briefing: local counts only; the AI is asked only after a tap.
        if settings.morningBriefing, let time = DateCoding.parseClockTime(settings.morningBriefingTime),
           let fire = nextOccurrence(hour: time.hour, minute: time.minute, after: now) {
            let day = calendar.startOfDay(for: fire)
            let due = services.tasks.openTasks.filter { task in
                guard let date = task.dueDate else { return false }
                return calendar.isDate(date, inSameDayAs: day) || date < day
            }.count
            var body = due == 0 ? "No tasks due today." : "\(due) task\(due == 1 ? "" : "s") due or overdue."
            if let events = await eventCount(on: day) { body += " \(events) event\(events == 1 ? "" : "s") on your calendar." }
            if settings.briefingTapAsksAssistant { body += " Tap for your AI briefing." }
            notifications.schedule(
                id: "briefing", title: "Good morning", body: body, at: fire, category: .briefing,
                userInfo: settings.briefingTapAsksAssistant ? ["prompt": "Summarise my day and tell me what I need to prioritise."] : ["tab": "today"]
            )
        } else {
            notifications.cancel(ids: ["briefing"])
        }

        // Deadline reminders for app-owned tasks.
        await notifications.cancel(prefix: "deadline-")
        if settings.deadlineReminders {
            let lead = TimeInterval(settings.deadlineLeadMinutes * 60)
            let upcoming = services.tasks.openTasks.compactMap { task -> (TaskItem, Date)? in
                guard let due = task.dueDate else { return nil }
                // All-day tasks are reminded at 09:00 on the day.
                let fire = task.dueHasTime ? due.addingTimeInterval(-lead) : (calendar.date(bySettingHour: 9, minute: 0, second: 0, of: due) ?? due)
                return fire > now ? (task, fire) : nil
            }
            for (task, fire) in upcoming.sorted(by: { $0.1 < $1.1 }).prefix(40) {
                let when = task.dueHasTime ? "at \(DateCoding.friendly(task.dueDate!).components(separatedBy: ", ").last ?? "")" : "today"
                notifications.schedule(id: "deadline-\(task.id.uuidString)", title: "Due \(when): \(task.title)", body: task.notes.isEmpty ? "From your NotchPilot tasks." : String(task.notes.prefix(120)), at: fire, category: .deadline, userInfo: ["tab": "tasks"])
            }
        }

        // Preparation reminders before calendar events (next 24 hours).
        await notifications.cancel(prefix: "event-")
        if settings.eventPreparation, services.settings.settings.features.calendar, services.calendar.eventsAuthorization() == .authorized,
           let events = try? await services.calendar.events(from: now, to: now.addingTimeInterval(86_400)) {
            let lead = TimeInterval(settings.eventLeadMinutes * 60)
            for event in events where !event.isAllDay && event.start.addingTimeInterval(-lead) > now {
                notifications.schedule(id: "event-\(event.id.hashValue)", title: "Coming up: \(event.title)", body: "Starts in \(settings.eventLeadMinutes) minutes\(event.location.map { " · \($0)" } ?? "").", at: event.start.addingTimeInterval(-lead), category: .event, userInfo: ["tab": "today"])
            }
        }

        // End-of-day summary of incomplete tasks.
        if settings.endOfDaySummary, let time = DateCoding.parseClockTime(settings.endOfDayTime),
           let fire = nextOccurrence(hour: time.hour, minute: time.minute, after: now) {
            let open = services.tasks.openTasks
            let dueToday = open.filter { $0.dueDate.map { calendar.isDate($0, inSameDayAs: fire) || $0 < fire } ?? false }.count
            let body = dueToday == 0 ? "Nothing left that was due today. \(open.count) open task\(open.count == 1 ? "" : "s") overall." : "\(dueToday) task\(dueToday == 1 ? " is" : "s are") still open from today."
            notifications.schedule(id: "end-of-day", title: "End of day", body: body, at: fire, category: .summary, userInfo: ["tab": "tasks"])
        } else {
            notifications.cancel(ids: ["end-of-day"])
        }
    }

    private func nextOccurrence(hour: Int, minute: Int, after date: Date) -> Date? {
        Calendar.current.nextDate(after: date, matching: DateComponents(hour: hour, minute: minute), matchingPolicy: .nextTime)
    }

    private func eventCount(on day: Date) async -> Int? {
        guard services.settings.settings.features.calendar, services.calendar.eventsAuthorization() == .authorized else { return nil }
        let end = Calendar.current.date(byAdding: .day, value: 1, to: day) ?? day
        return try? await services.calendar.events(from: day, to: end).count
    }
}
