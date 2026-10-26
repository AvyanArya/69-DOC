import EventKit
import Foundation
import NotchPilotCore

/// Calendar and Reminders through EventKit. Access is requested with the
/// system prompt the first time it is needed; nothing is read before that.
@MainActor
final class EventKitCalendarService: CalendarService {
    private let store = EKEventStore()
    private var observer: NSObjectProtocol?
    /// Called when calendar data changes (used to refresh the UI and reschedule notifications).
    var onChange: (() -> Void)?

    init() {
        observer = NotificationCenter.default.addObserver(forName: .EKEventStoreChanged, object: store, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.onChange?() }
        }
    }

    private static func map(_ status: EKAuthorizationStatus) -> AuthorizationState {
        switch status {
        case .fullAccess: return .authorized
        case .writeOnly: return .writeOnly
        case .denied: return .denied
        case .restricted: return .restricted
        case .notDetermined: return .notDetermined
        @unknown default: return .authorized
        }
    }

    func eventsAuthorization() -> AuthorizationState {
        Self.map(EKEventStore.authorizationStatus(for: .event))
    }

    func remindersAuthorization() -> AuthorizationState {
        Self.map(EKEventStore.authorizationStatus(for: .reminder))
    }

    func requestEventsAccess() async -> AuthorizationState {
        do {
            _ = try await store.requestFullAccessToEvents()
        } catch {
            AppLog.error("Calendar access request failed: \(error.localizedDescription)", category: .integration)
        }
        return eventsAuthorization()
    }

    func requestRemindersAccess() async -> AuthorizationState {
        do {
            _ = try await store.requestFullAccessToReminders()
        } catch {
            AppLog.error("Reminders access request failed: \(error.localizedDescription)", category: .integration)
        }
        return remindersAuthorization()
    }

    func events(from start: Date, to end: Date) async throws -> [CalendarEventInfo] {
        guard eventsAuthorization() == .authorized else {
            throw ToolError.notAuthorized("Calendar access is off. Allow NotchPilot in System Settings › Privacy & Security › Calendars.")
        }
        let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
        return store.events(matching: predicate)
            .sorted { $0.startDate < $1.startDate }
            .map { event in
                CalendarEventInfo(
                    id: event.eventIdentifier ?? UUID().uuidString, title: event.title ?? "Untitled event",
                    start: event.startDate, end: event.endDate, isAllDay: event.isAllDay, location: event.location,
                    calendarName: event.calendar?.title ?? "", notes: event.notes
                )
            }
    }

    func createEvent(title: String, start: Date, end: Date, notes: String?, location: String?) async throws -> CalendarEventInfo {
        let state = eventsAuthorization()
        guard state == .authorized || state == .writeOnly else {
            throw ToolError.notAuthorized("Calendar access is off. Allow NotchPilot in System Settings › Privacy & Security › Calendars.")
        }
        guard let calendar = store.defaultCalendarForNewEvents else {
            throw ToolError.failed("No default calendar is set up on this Mac.")
        }
        let event = EKEvent(eventStore: store)
        event.title = title
        event.startDate = start
        event.endDate = end
        event.notes = notes
        event.location = location
        event.calendar = calendar
        do {
            try store.save(event, span: .thisEvent, commit: true)
        } catch {
            throw ToolError.failed("Calendar refused the event: \(error.localizedDescription)")
        }
        return CalendarEventInfo(id: event.eventIdentifier ?? "", title: title, start: start, end: end, location: location, calendarName: calendar.title, notes: notes)
    }

    func createReminder(title: String, due: DateCoding.ParsedDate?, notes: String?) async throws -> ReminderInfo {
        let state = remindersAuthorization()
        guard state == .authorized || state == .writeOnly else {
            throw ToolError.notAuthorized("Reminders access is off. Allow NotchPilot in System Settings › Privacy & Security › Reminders.")
        }
        guard let list = store.defaultCalendarForNewReminders() else {
            throw ToolError.failed("No default Reminders list is set up on this Mac.")
        }
        let reminder = EKReminder(eventStore: store)
        reminder.title = title
        reminder.notes = notes
        reminder.calendar = list
        if let due {
            var components: Set<Calendar.Component> = [.year, .month, .day]
            if due.hasTime { components.formUnion([.hour, .minute]) }
            reminder.dueDateComponents = Calendar.current.dateComponents(components, from: due.date)
            if due.hasTime { reminder.addAlarm(EKAlarm(absoluteDate: due.date)) }
        }
        do {
            try store.save(reminder, commit: true)
        } catch {
            throw ToolError.failed("Reminders refused the item: \(error.localizedDescription)")
        }
        return ReminderInfo(id: reminder.calendarItemIdentifier, title: title, due: due?.date, listName: list.title)
    }
}
