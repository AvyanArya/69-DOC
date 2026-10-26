import Foundation

/// Consistent JSON shapes for tool results.
@MainActor
enum ToolJSON {
    static func date(_ date: Date?, hasTime: Bool = true) -> JSONValue {
        guard let date else { return .null }
        return hasTime ? .string(DateCoding.iso8601String(date)) : .string(DateCoding.dayString(date))
    }

    static func task(_ task: TaskItem, now: Date) -> JSONValue {
        var object = JSONObject()
        object["id"] = .string(ShortID.make(task.id))
        object["title"] = .string(task.title)
        if !task.notes.isEmpty { object["notes"] = .string(TextUtilities.truncate(task.notes, limit: 1_000)) }
        object["priority"] = .string(task.priority.rawValue)
        object["due"] = date(task.dueDate, hasTime: task.dueHasTime)
        object["completed"] = .bool(task.isCompleted)
        if task.isOverdue(at: now) { object["overdue"] = true }
        if !task.tags.isEmpty { object["tags"] = .array(task.tags.map(JSONValue.string)) }
        return .object(object)
    }

    static func note(_ note: Note, includeBody: Bool, bodyLimit: Int = 20_000) -> JSONValue {
        var object = JSONObject()
        object["id"] = .string(ShortID.make(note.id))
        object["title"] = .string(note.title)
        if includeBody {
            object["body"] = .string(TextUtilities.truncate(note.body, limit: bodyLimit))
        } else {
            object["preview"] = .string(TextUtilities.preview(note.body, limit: 120))
        }
        object["updated"] = date(note.updatedAt)
        if note.pinned { object["pinned"] = true }
        return .object(object)
    }

    static func memory(_ item: MemoryItem) -> JSONValue {
        [
            "id": .string(ShortID.make(item.id)),
            "content": .string(item.content),
            "category": .string(item.category.rawValue),
            "saved": date(item.createdAt, hasTime: false),
        ]
    }

    static func timer(_ timer: FocusTimer, now: Date) -> JSONValue {
        let state = timer.state
        var object = JSONObject()
        object["state"] = .string(state.phase.rawValue)
        guard state.phase != .idle else { return .object(object) }
        object["kind"] = .string(state.kind.rawValue)
        object["label"] = .string(state.label)
        object["total_minutes"] = .double((state.totalDuration / 60 * 10).rounded() / 10)
        let remaining = timer.remaining(at: now)
        object["remaining_seconds"] = .int(Int(remaining.rounded()))
        object["remaining"] = .string(formatDuration(remaining))
        if let end = state.endDate, state.phase == .running { object["ends_at"] = date(end) }
        if let finished = state.finishedAt { object["finished_at"] = date(finished) }
        if let breakMinutes = state.breakMinutesAfter { object["break_minutes_after"] = .int(breakMinutes) }
        return .object(object)
    }

    static func event(_ event: CalendarEventInfo) -> JSONValue {
        var object = JSONObject()
        object["title"] = .string(event.title)
        object["start"] = date(event.start, hasTime: !event.isAllDay)
        object["end"] = date(event.end, hasTime: !event.isAllDay)
        if event.isAllDay { object["all_day"] = true }
        if let location = event.location?.nilIfBlank { object["location"] = .string(location) }
        if !event.calendarName.isEmpty { object["calendar"] = .string(event.calendarName) }
        if let notes = event.notes?.nilIfBlank { object["notes"] = .string(TextUtilities.truncate(notes, limit: 500)) }
        return .object(object)
    }

    static func formatDuration(_ seconds: TimeInterval) -> String {
        let total = Int(seconds.rounded())
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let secs = total % 60
        if hours > 0 { return String(format: "%d:%02d:%02d", hours, minutes, secs) }
        return String(format: "%d:%02d", minutes, secs)
    }

    static func bytes(_ value: UInt64) -> String {
        let gb = Double(value) / 1_073_741_824
        if gb >= 1 { return String(format: "%.1f GB", gb) }
        return String(format: "%.0f MB", Double(value) / 1_048_576)
    }
}
