import Foundation
import XCTest
@testable import NotchPilotCore

/// A scheduler that only fires when the test says so.
final class ManualTimerScheduler: TimerScheduling {
    private(set) var scheduled: [(date: Date, action: @MainActor () -> Void, cancelled: Bool)] = []

    @MainActor
    func schedule(at date: Date, _ action: @escaping @MainActor () -> Void) -> TimerCancellation {
        let index = scheduled.count
        scheduled.append((date, action, false))
        return TimerCancellation { [weak self] in self?.scheduled[index].cancelled = true }
    }

    var activeDates: [Date] {
        scheduled.filter { !$0.cancelled }.map(\.date)
    }

    @MainActor
    func fireDue(at now: Date) {
        for index in scheduled.indices where !scheduled[index].cancelled && scheduled[index].date <= now {
            scheduled[index].cancelled = true
            scheduled[index].action()
        }
    }
}

@MainActor
final class FakeCalendarService: CalendarService {
    var authorization: AuthorizationState = .authorized
    var accessAfterRequest: AuthorizationState = .authorized
    var events: [CalendarEventInfo] = []
    var createdEvents: [CalendarEventInfo] = []
    var createdReminders: [ReminderInfo] = []
    var accessRequests = 0

    func eventsAuthorization() -> AuthorizationState { authorization }
    func remindersAuthorization() -> AuthorizationState { authorization }
    func requestEventsAccess() async -> AuthorizationState {
        accessRequests += 1
        authorization = accessAfterRequest
        return authorization
    }
    func requestRemindersAccess() async -> AuthorizationState { await requestEventsAccess() }
    func events(from start: Date, to end: Date) async throws -> [CalendarEventInfo] {
        events.filter { $0.end > start && $0.start < end }.sorted { $0.start < $1.start }
    }
    func createEvent(title: String, start: Date, end: Date, notes: String?, location: String?) async throws -> CalendarEventInfo {
        let event = CalendarEventInfo(id: UUID().uuidString, title: title, start: start, end: end, location: location, calendarName: "Home", notes: notes)
        createdEvents.append(event)
        events.append(event)
        return event
    }
    func createReminder(title: String, due: DateCoding.ParsedDate?, notes: String?) async throws -> ReminderInfo {
        let reminder = ReminderInfo(id: UUID().uuidString, title: title, due: due?.date, listName: "Reminders")
        createdReminders.append(reminder)
        return reminder
    }
}

/// A provider that replays scripted model turns and records every request.
final class ScriptedProvider: AIProvider, @unchecked Sendable {
    enum Step {
        case respond([ModelStreamEvent])
        case fail(ProviderError)
        /// Streams the events, then waits until cancelled.
        case hang([ModelStreamEvent])
    }

    let kind: ProviderKind = .anthropic
    let model = "test-model"
    private let lock = NSLock()
    private var steps: [Step]
    private(set) var requests: [ModelRequest] = []

    init(_ steps: [Step]) {
        self.steps = steps
    }

    func stream(_ request: ModelRequest) -> AsyncThrowingStream<ModelStreamEvent, Error> {
        let step: Step? = lock.sync {
            requests.append(request)
            return steps.isEmpty ? nil : steps.removeFirst()
        }
        return AsyncThrowingStream { continuation in
            let task = Task {
                switch step {
                case .respond(let events):
                    for event in events { continuation.yield(event) }
                    continuation.finish()
                case .fail(let error):
                    continuation.finish(throwing: error)
                case .hang(let events):
                    for event in events { continuation.yield(event) }
                    while !Task.isCancelled { try? await Task.sleep(nanoseconds: 5_000_000) }
                    continuation.finish(throwing: ProviderError.cancelled)
                case nil:
                    continuation.finish(throwing: ProviderError.invalidResponse("script exhausted"))
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    var recordedRequests: [ModelRequest] { lock.sync { requests } }

    // MARK: Builders

    static func toolCalls(_ calls: [(id: String, name: String, input: JSONValue)], text: String = "") -> Step {
        var blocks: [ContentBlock] = []
        if !text.isEmpty { blocks.append(.text(text)) }
        blocks += calls.map { .toolUse(ToolUseBlock(id: $0.id, name: $0.name, input: $0.input)) }
        var events: [ModelStreamEvent] = [.started(model: "test-model")]
        if !text.isEmpty { events.append(.textDelta(text)) }
        events += calls.map { .toolCallStarted(id: $0.id, name: $0.name) }
        events.append(.completed(ModelResponse(blocks: blocks, native: nil, stopReason: .toolUse, servedModel: "test-model", usage: TokenUsage(inputTokens: 10, outputTokens: 5))))
        return .respond(events)
    }

    static func answer(_ text: String) -> Step {
        .respond([
            .started(model: "test-model"),
            .textDelta(text),
            .completed(ModelResponse(blocks: [.text(text)], native: nil, stopReason: .endTurn, servedModel: "test-model", usage: TokenUsage(inputTokens: 10, outputTokens: 5))),
        ])
    }
}

@MainActor
struct TestEnvironment {
    let directory: URL
    let fileStore: FileStore
    let clock: ManualClock
    let scheduler: ManualTimerScheduler
    let calendar: FakeCalendarService
    let services: AgentServices

    static func make(start: Date = TestEnvironment.referenceDate) throws -> TestEnvironment {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("notchpilot-tests-\(UUID().uuidString)")
        let fileStore = try FileStore(directory: directory)
        let clock = ManualClock(start)
        let scheduler = ManualTimerScheduler()
        let calendar = FakeCalendarService()
        let base = AgentServices.portable(fileStore: fileStore, clock: clock, timerScheduler: scheduler)
        let services = AgentServices(
            tasks: base.tasks, notes: base.notes, memory: base.memory, settings: base.settings, conversations: base.conversations,
            timer: base.timer, activity: base.activity, calendar: calendar, media: base.media, apps: base.apps, urls: base.urls,
            system: base.system, shortcuts: base.shortcuts, clipboard: base.clipboard, dateExtractor: base.dateExtractor, clock: clock
        )
        return TestEnvironment(directory: directory, fileStore: fileStore, clock: clock, scheduler: scheduler, calendar: calendar, services: services)
    }

    /// Tuesday 27 October 2026, 10:00 local time.
    nonisolated static var referenceDate: Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 10
        components.day = 27
        components.hour = 10
        return Calendar.current.date(from: components)!
    }

    func makeOrchestrator(_ provider: AIProvider, confirmations: ConfirmationCenter? = nil) -> AgentOrchestrator {
        let orchestrator = AgentOrchestrator(services: services, registry: BuiltinTools.makeRegistry(), confirmations: confirmations ?? ConfirmationCenter()) { provider }
        orchestrator.retryDelay = { _ in }
        return orchestrator
    }

    func newSession() -> ConversationSession {
        ConversationSession(conversation: Conversation(createdAt: clock.now()), store: services.conversations)
    }

    func cleanUp() {
        try? FileManager.default.removeItem(at: directory)
    }
}

extension XCTestCase {
    /// Polls (on the main actor) until the condition holds or the timeout passes.
    @MainActor
    func waitUntil(timeout: TimeInterval = 5, _ condition: @MainActor () -> Bool, file: StaticString = #filePath, line: UInt = #line) async {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            if Date() > deadline {
                XCTFail("Timed out waiting for condition", file: file, line: line)
                return
            }
            try? await Task.sleep(nanoseconds: 5_000_000)
        }
    }
}
