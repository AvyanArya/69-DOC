import XCTest
@testable import NotchPilotCore

@MainActor
final class BriefingTests: XCTestCase {
    var env: TestEnvironment!
    var folder: URL!
    var outside: URL!

    override func setUp() async throws {
        env = try TestEnvironment.make()
        let base = FileManager.default.temporaryDirectory.appendingPathComponent("np-briefing-\(UUID().uuidString)")
        folder = base.appendingPathComponent("Documents")
        outside = base.appendingPathComponent("Private")
        let fm = FileManager.default
        try fm.createDirectory(at: folder.appendingPathComponent("Course"), withIntermediateDirectories: true)
        try fm.createDirectory(at: folder.appendingPathComponent("node_modules"), withIntermediateDirectories: true)
        try fm.createDirectory(at: outside, withIntermediateDirectories: true)
        try "Agenda: quarterly budget review with Sam".write(to: folder.appendingPathComponent("meeting.txt"), atomically: true, encoding: .utf8)
        try "# Essay\\nMarket failure draft".write(to: folder.appendingPathComponent("Course/essay.md"), atomically: true, encoding: .utf8)
        try "secret".write(to: folder.appendingPathComponent(".hidden.txt"), atomically: true, encoding: .utf8)
        try "dependency".write(to: folder.appendingPathComponent("node_modules/lib.js"), atomically: true, encoding: .utf8)
        try "do not read".write(to: outside.appendingPathComponent("diary.txt"), atomically: true, encoding: .utf8)
        try fm.createSymbolicLink(at: folder.appendingPathComponent("escape.txt"), withDestinationURL: outside.appendingPathComponent("diary.txt"))
    }

    override func tearDown() async throws {
        try? FileManager.default.removeItem(at: folder.deletingLastPathComponent())
        env.cleanUp()
    }

    func testRecentFilesSkipHiddenAndDependencyFolders() async {
        let files = ConnectedFiles(paths: [folder.path])
        let names = Set(files.recent(since: Date().addingTimeInterval(-3600)).map(\.name))
        XCTAssertTrue(names.contains("meeting.txt"))
        XCTAssertTrue(names.contains("essay.md"))
        XCTAssertFalse(names.contains(".hidden.txt"))
        XCTAssertFalse(names.contains("lib.js"))
    }

    func testSearchMatchesNamesAndText() async {
        let files = ConnectedFiles(paths: [folder.path])
        let byText = files.search("budget")
        XCTAssertEqual(byText.first?.file.name, "meeting.txt")
        XCTAssertTrue(byText.first?.snippet?.contains("quarterly budget review") ?? false)
        XCTAssertEqual(files.search("essay").first?.file.name, "essay.md")
    }

    func testReadingIsConfinedToConnectedFolders() async throws {
        let files = ConnectedFiles(paths: [folder.path])
        XCTAssertEqual(try files.readText(folder.appendingPathComponent("meeting.txt").path, maxCharacters: 100).text, "Agenda: quarterly budget review with Sam")
        XCTAssertThrowsError(try files.readText(outside.appendingPathComponent("diary.txt").path, maxCharacters: 100))
        XCTAssertThrowsError(try files.readText(folder.path + "/../Private/diary.txt", maxCharacters: 100))
        XCTAssertThrowsError(try files.readText(folder.appendingPathComponent("escape.txt").path, maxCharacters: 100), "a symlink out of the folder must not be followed")
    }

    func testBriefingGathersEveryChosenSource() async throws {
        let now = env.clock.now()
        env.calendar.events = [CalendarEventInfo(id: "e1", title: "Seminar", start: now.addingTimeInterval(3600), end: now.addingTimeInterval(7200))]
        env.calendar.openRemindersList = [ReminderInfo(id: "r1", title: "Pay rent", due: now.addingTimeInterval(-3600), listName: "Home")]
        let mail = FakeMail()
        mail.messages = [MailMessageSummary(sender: "Tutor", subject: "Extension approved", received: "today 09:12")]
        env.services.mail = mail
        env.services.settings.updateSettings {
            $0.briefing.connectedFolders = [self.folder.path]
            $0.briefing.includeMail = true
        }
        let provider = ScriptedProvider([
            ScriptedProvider.toolCalls([("toolu_1", "get_daily_overview", [:])]),
            ScriptedProvider.answer("Pay rent first, then the seminar at 11."),
        ])
        let orchestrator = env.makeOrchestrator(provider, confirmations: nil)
        let session = env.newSession()
        orchestrator.send("Brief me", session: session)
        await orchestrator.waitUntilFinished()
        let result = session.conversation.turns.flatMap(\.blocks).compactMap { block -> String? in
            if case .toolResult(let r) = block { return r.content } else { return nil }
        }.joined()
        XCTAssertTrue(result.contains("Seminar"))
        XCTAssertTrue(result.contains("Pay rent"))
        XCTAssertTrue(result.contains("meeting.txt"))
        XCTAssertTrue(result.contains("Extension approved"))
    }

    func testUnattendedRunsCanOnlyRead() async throws {
        let provider = ScriptedProvider([
            ScriptedProvider.toolCalls([("toolu_1", "create_task", ["title": "Should not exist"])]),
            ScriptedProvider.answer("Done."),
        ])
        let orchestrator = env.makeOrchestrator(provider, confirmations: nil)
        let run = orchestrator.send("Brief me", session: env.newSession(), readOnly: true)!
        await orchestrator.waitUntilFinished()
        XCTAssertEqual(run.steps.first?.status, .denied)
        XCTAssertTrue(env.services.tasks.tasks.isEmpty)
    }
}
