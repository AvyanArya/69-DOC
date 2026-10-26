import XCTest
@testable import NotchPilotCore

@MainActor
final class PersistenceTests: XCTestCase {
    var env: TestEnvironment!

    override func setUp() async throws {
        env = try TestEnvironment.make()
    }

    override func tearDown() async throws {
        env.cleanUp()
    }

    func testTasksPersistAcrossRestart() async throws {
        let due = DateCoding.parseFlexible("2026-10-28T15:00")
        let created = try env.services.tasks.create(title: "Economics essay", notes: "intro + 2 sections", priority: .high, due: due, tags: ["uni"], source: .assistant)
        try env.services.tasks.setCompleted(created.id, true)

        // A fresh store reading the same directory simulates an app restart.
        let reloaded = TaskStore(fileStore: env.fileStore, clock: env.clock)
        XCTAssertEqual(reloaded.tasks.count, 1)
        let task = try XCTUnwrap(reloaded.tasks.first)
        XCTAssertEqual(task.title, "Economics essay")
        XCTAssertEqual(task.priority, .high)
        XCTAssertEqual(task.dueDate, due?.date)
        XCTAssertTrue(task.dueHasTime)
        XCTAssertTrue(task.isCompleted)
        XCTAssertEqual(task.source, .assistant)
        XCTAssertEqual(try reloaded.task(ShortID.make(task.id)).id, task.id)
    }

    func testTaskValidationAndOrdering() async throws {
        XCTAssertThrowsError(try env.services.tasks.create(title: "   "))
        let later = try env.services.tasks.create(title: "Later", due: DateCoding.parseFlexible("2026-11-05"))
        let sooner = try env.services.tasks.create(title: "Sooner", due: DateCoding.parseFlexible("2026-10-29"))
        let undated = try env.services.tasks.create(title: "Someday", priority: .high)
        XCTAssertEqual(env.services.tasks.openTasks.map(\.id), [sooner.id, later.id, undated.id])
        XCTAssertEqual(env.services.tasks.search(query: "soon").map(\.id), [sooner.id])
        XCTAssertThrowsError(try env.services.tasks.task("zzzzzz"))
    }

    func testOverdueComputation() async throws {
        let now = env.clock.now()
        let yesterday = TaskItem(title: "a", dueDate: now.addingTimeInterval(-86_400), createdAt: now)
        let earlierToday = TaskItem(title: "b", dueDate: now.addingTimeInterval(-3600), dueHasTime: true, createdAt: now)
        let todayAllDay = TaskItem(title: "c", dueDate: Calendar.current.startOfDay(for: now), createdAt: now)
        XCTAssertTrue(yesterday.isOverdue(at: now))
        XCTAssertTrue(earlierToday.isOverdue(at: now))
        XCTAssertFalse(todayAllDay.isOverdue(at: now))
    }

    func testNotesAndMemoriesPersist() async throws {
        let note = try env.services.notes.create(title: "Lecture 5", body: "Elasticity of demand…")
        try env.services.notes.update(note.id) { $0.body += "\nCross-price elasticity" }
        try env.services.memory.add("Prefers short, direct answers", category: .preference, source: .user)
        try env.services.memory.add("Studying economics at university", category: .project, source: .assistant)
        // Duplicates are not stored twice.
        try env.services.memory.add("prefers short, direct answers", category: .preference, source: .user)

        let notes = NoteStore(fileStore: env.fileStore, clock: env.clock)
        XCTAssertEqual(notes.notes.first?.body, "Elasticity of demand…\nCross-price elasticity")
        let memories = MemoryStore(fileStore: env.fileStore, clock: env.clock)
        XCTAssertEqual(memories.items.count, 2)
        XCTAssertEqual(memories.search("economics").count, 1)

        // Relevance: preferences always included; project memory only when related.
        let relevant = memories.relevant(to: "help me plan my economics revision")
        XCTAssertEqual(Set(relevant.map(\.category)), [.preference, .project])
        let unrelated = memories.relevant(to: "what's the weather like")
        XCTAssertEqual(unrelated.map(\.category), [.preference])
    }

    func testMemoryEditAndDelete() async throws {
        let item = try env.services.memory.add("Works at Acme", category: .fact, source: .user)
        try env.services.memory.update(item.id, content: "Works at Acme Corp", category: .fact)
        XCTAssertEqual(MemoryStore(fileStore: env.fileStore).items.first?.content, "Works at Acme Corp")
        try env.services.memory.delete(item.id)
        XCTAssertTrue(MemoryStore(fileStore: env.fileStore).items.isEmpty)
    }

    func testSettingsAndPreferencesPersist() async throws {
        env.services.settings.updateSettings {
            $0.agent.mode = .autonomous
            $0.provider.setModel("claude-sonnet-5-5", for: .anthropic)
            $0.features.shortcuts = true
        }
        try env.services.settings.updatePreferences { $0.answerLength = .short }
        let reloaded = SettingsStore(fileStore: env.fileStore)
        XCTAssertEqual(reloaded.settings.agent.mode, .autonomous)
        XCTAssertEqual(reloaded.settings.provider.currentModel, "claude-sonnet-5-5")
        XCTAssertTrue(reloaded.settings.features.shortcuts)
        XCTAssertEqual(reloaded.preferences.answerLength, .short)
    }

    func testCorruptFileIsQuarantinedNotLost() async throws {
        try Data("{ not json".utf8).write(to: env.fileStore.url(for: "tasks.json"))
        let store = TaskStore(fileStore: env.fileStore)
        XCTAssertTrue(store.tasks.isEmpty)
        let files = try FileManager.default.contentsOfDirectory(atPath: env.directory.path)
        XCTAssertTrue(files.contains { $0.hasPrefix("tasks.corrupt-") }, "corrupt file is kept for recovery: \(files)")
    }

    func testConversationPersistenceSearchAndRetention() async throws {
        let store = env.services.conversations
        var conversation = Conversation(createdAt: env.clock.now())
        conversation.title = "Essay planning"
        conversation.turns = [
            ConversationTurn(role: .user, blocks: [.context("<context>hidden</context>"), .text("Plan my economics essay")], createdAt: env.clock.now()),
            ConversationTurn(role: .assistant, blocks: [.text("Start with the introduction on elasticity.")], native: NativeContent(format: .anthropicMessages, items: [["type": "thinking", "thinking": "", "signature": "sig=="]]), createdAt: env.clock.now()),
        ]
        store.save(conversation)

        let reloaded = ConversationStore(fileStore: env.fileStore)
        XCTAssertEqual(reloaded.summaries.map(\.id), [conversation.id])
        let loaded = try XCTUnwrap(reloaded.conversation(conversation.id))
        XCTAssertEqual(loaded, conversation, "native blocks survive a round trip exactly")
        XCTAssertEqual(reloaded.search("elasticity").first?.conversationID, conversation.id)
        XCTAssertTrue(reloaded.search("hidden").isEmpty, "context blocks are not searchable text")

        env.clock.advance(by: 40 * 86_400)
        XCTAssertEqual(reloaded.applyRetention(days: 30, now: env.clock.now()), 1)
        XCTAssertTrue(ConversationStore(fileStore: env.fileStore).summaries.isEmpty)
    }

    func testConversationDeleteAndHistoryOff() async throws {
        let store = ConversationStore(fileStore: env.fileStore, persistenceEnabled: false)
        let conversation = Conversation(createdAt: env.clock.now())
        store.save(conversation)
        XCTAssertNotNil(store.conversation(conversation.id), "kept in memory for this session")
        XCTAssertTrue(ConversationStore(fileStore: env.fileStore).summaries.isEmpty, "nothing written to disk")

        let persistent = ConversationStore(fileStore: env.fileStore)
        persistent.save(conversation)
        persistent.delete(conversation.id)
        XCTAssertTrue(ConversationStore(fileStore: env.fileStore).summaries.isEmpty)
    }
}

@MainActor
final class FocusTimerTests: XCTestCase {
    func makeTimer(_ clock: ManualClock, _ scheduler: ManualTimerScheduler, store: FileStore? = nil) -> FocusTimer {
        FocusTimer(clock: clock, scheduler: scheduler, fileStore: store)
    }

    func testCountdownPauseResumeAndCompletion() async throws {
        let clock = ManualClock()
        let scheduler = ManualTimerScheduler()
        let timer = makeTimer(clock, scheduler)
        var finished: [TimerState] = []
        timer.onFinish = { finished.append($0) }

        try timer.start(duration: 25 * 60, label: "Essay", kind: .focus, breakMinutesAfter: 5)
        XCTAssertEqual(timer.remaining(), 1500, accuracy: 0.001)
        XCTAssertEqual(scheduler.activeDates, [clock.now().addingTimeInterval(1500)])

        clock.advance(by: 600)
        XCTAssertEqual(timer.remaining(), 900, accuracy: 0.001)
        XCTAssertEqual(timer.progress(), 0.4, accuracy: 0.0001)

        try timer.pause()
        XCTAssertTrue(scheduler.activeDates.isEmpty, "no completion is scheduled while paused")
        clock.advance(by: 3600)
        XCTAssertEqual(timer.remaining(), 900, accuracy: 0.001, "paused time does not count")

        try timer.resume()
        XCTAssertEqual(timer.remaining(), 900, accuracy: 0.001)
        try timer.extend(by: 60)
        XCTAssertEqual(timer.remaining(), 960, accuracy: 0.001)

        clock.advance(by: 959)
        scheduler.fireDue(at: clock.now())
        XCTAssertTrue(finished.isEmpty)
        XCTAssertEqual(timer.remaining(), 1, accuracy: 0.001)

        clock.advance(by: 1)
        scheduler.fireDue(at: clock.now())
        XCTAssertEqual(finished.count, 1)
        XCTAssertEqual(finished.first?.breakMinutesAfter, 5)
        XCTAssertEqual(timer.state.phase, .finished)
        XCTAssertEqual(timer.focusSessionsCompleted(on: clock.now()), 1)
        XCTAssertEqual(timer.remaining(), 0)
    }

    func testInvalidOperations() async {
        let timer = makeTimer(ManualClock(), ManualTimerScheduler())
        XCTAssertThrowsError(try timer.start(duration: 30, label: "", kind: .custom))
        XCTAssertThrowsError(try timer.start(duration: 9 * 3600, label: "", kind: .custom))
        XCTAssertThrowsError(try timer.pause())
        XCTAssertThrowsError(try timer.resume())
    }

    func testTimerSurvivesRestartAndCompletesIfExpiredWhileClosed() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("timer-\(UUID())")
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = try FileStore(directory: directory)
        let clock = ManualClock()
        let first = makeTimer(clock, ManualTimerScheduler(), store: store)
        try first.start(duration: 600, label: "Reading", kind: .focus)
        clock.advance(by: 120)

        // Restart while still running: remaining time is exact and a completion is re-scheduled.
        let scheduler = ManualTimerScheduler()
        let second = makeTimer(clock, scheduler, store: store)
        second.activate()
        XCTAssertEqual(second.state.phase, .running)
        XCTAssertEqual(second.remaining(), 480, accuracy: 0.01)
        XCTAssertEqual(scheduler.activeDates.count, 1)

        // Restart after it should have ended: it finishes on activation, at the right time.
        clock.advance(by: 3600)
        let third = makeTimer(clock, ManualTimerScheduler(), store: store)
        var finishedAt: Date?
        third.onFinish = { finishedAt = $0.finishedAt }
        third.activate()
        XCTAssertEqual(third.state.phase, .finished)
        XCTAssertEqual(try XCTUnwrap(finishedAt).timeIntervalSince(clock.now()), -3600 + 480, accuracy: 0.01)
    }

    func testRealSchedulerFires() async throws {
        let timer = FocusTimer(clock: SystemClock(), scheduler: TaskTimerScheduler())
        let expectation = expectation(description: "finished")
        timer.onFinish = { _ in expectation.fulfill() }
        try timer.start(duration: 60, label: "x", kind: .custom)
        // Shorten the run by rewinding the end date via extend(-59.9).
        try timer.extend(by: -59.8)
        await fulfillment(of: [expectation], timeout: 3)
        XCTAssertEqual(timer.state.phase, .finished)
    }
}

final class DateParsingTests: XCTestCase {
    func testFlexibleParsing() throws {
        let calendar = Calendar.current
        let day = try XCTUnwrap(DateCoding.parseFlexible("2026-10-27"))
        XCTAssertFalse(day.hasTime)
        XCTAssertEqual(calendar.dateComponents([.year, .month, .day, .hour], from: day.date), DateComponents(year: 2026, month: 10, day: 27, hour: 0))

        let local = try XCTUnwrap(DateCoding.parseFlexible("2026-10-27T15:30"))
        XCTAssertTrue(local.hasTime)
        XCTAssertEqual(calendar.dateComponents([.hour, .minute], from: local.date), DateComponents(hour: 15, minute: 30))
        XCTAssertEqual(DateCoding.parseFlexible("2026-10-27 15:30")?.date, local.date)

        let utc = try XCTUnwrap(DateCoding.parseFlexible("2026-10-27T15:30:00Z"))
        XCTAssertEqual(utc.date.timeIntervalSince1970, 1_793_115_000)
        let offset = try XCTUnwrap(DateCoding.parseFlexible("2026-10-27T16:30:00.250+01:00"))
        XCTAssertEqual(offset.date.timeIntervalSince1970, 1_793_115_000)

        for bad in ["27/10/2026", "2026-13-01", "2026-02-30", "2026-10-27T25:00", "2026-10-27Tnoon", "soon"] {
            XCTAssertNil(DateCoding.parseFlexible(bad), bad)
        }
    }

    func testStorageDatesKeepMilliseconds() throws {
        let date = Date(timeIntervalSince1970: 1_793_115_000.123)
        let parsed = try XCTUnwrap(StorageCoding.parseStorageString(StorageCoding.storageString(date)))
        XCTAssertEqual(parsed.timeIntervalSince1970, date.timeIntervalSince1970, accuracy: 0.001)
    }

    func testRuleBasedExtraction() throws {
        let calendar = Calendar.current
        let reference = TestEnvironmentDates.tuesday10am  // Tue 27 Oct 2026 10:00
        let extractor = RuleBasedDateExtractor(calendar: calendar)
        func find(_ text: String) -> [ExtractedDate] { extractor.extractDates(from: text, reference: reference) }
        func ymd(_ date: Date) -> String { DateCoding.dayString(date, calendar: calendar) }

        XCTAssertEqual(find("Essay due tomorrow at 3pm").map { ymd($0.date) }, ["2026-10-28"])
        let tomorrow = try XCTUnwrap(find("Essay due tomorrow at 3pm").first)
        XCTAssertTrue(tomorrow.hasTime)
        XCTAssertEqual(calendar.component(.hour, from: tomorrow.date), 15)

        XCTAssertEqual(find("Submit by Friday").map { ymd($0.date) }, ["2026-10-30"])
        XCTAssertEqual(find("Meet next Monday").map { ymd($0.date) }, ["2026-11-02"])
        XCTAssertEqual(find("Due next Friday").map { ymd($0.date) }, ["2026-11-06"])
        XCTAssertEqual(find("Exam on 30th of November and quiz Nov 3").map { ymd($0.date) }, ["2026-11-30", "2026-11-03"])
        XCTAssertEqual(find("Deadline 2026-12-01 17:00").map { ymd($0.date) }, ["2026-12-01"])
        XCTAssertEqual(find("Follow up in 3 days").map { ymd($0.date) }, ["2026-10-30"])
        XCTAssertEqual(find("Review next week").map { ymd($0.date) }, ["2026-11-02"])
        XCTAssertEqual(find("Paper due January 5").map { ymd($0.date) }, ["2027-01-05"], "past month/day rolls into next year")

        let call = try XCTUnwrap(find("Call the bank at 14:30").first)
        XCTAssertEqual(ymd(call.date), "2026-10-27")
        XCTAssertEqual(calendar.dateComponents([.hour, .minute], from: call.date), DateComponents(hour: 14, minute: 30))
        XCTAssertTrue(find("Nothing to see here.").isEmpty)
    }

    func testFreeTimeFinder() throws {
        let calendar = Calendar.current
        let day = calendar.startOfDay(for: TestEnvironmentDates.tuesday10am)
        func at(_ hour: Int, _ minute: Int = 0) -> Date { calendar.date(bySettingHour: hour, minute: minute, second: 0, of: day)! }
        let events = [
            CalendarEventInfo(id: "1", title: "Lecture", start: at(11), end: at(12, 30)),
            CalendarEventInfo(id: "2", title: "Lunch", start: at(13), end: at(14)),
            CalendarEventInfo(id: "3", title: "Overlap", start: at(13, 30), end: at(15)),
            CalendarEventInfo(id: "4", title: "Holiday", start: day, end: at(23, 59), isAllDay: true),
        ]
        let slots = FreeTimeFinder.findSlots(events: events, from: day, days: 1, earliest: (9, 0), latest: (18, 0), duration: 45 * 60, notBefore: at(10, 2))
        XCTAssertEqual(slots, [
            FreeTimeFinder.Slot(start: at(10, 5), end: at(11)),
            FreeTimeFinder.Slot(start: at(15), end: at(18)),
        ])
    }
}

enum TestEnvironmentDates {
    static var tuesday10am: Date { TestEnvironment.referenceDate }
}
