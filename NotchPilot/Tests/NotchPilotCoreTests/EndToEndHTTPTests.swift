import Foundation
import XCTest
@testable import NotchPilotCore

/// Runs the real agent loop over real HTTP (URLSession) against a local mock
/// server that speaks the providers' streaming wire formats. Skipped when
/// python3 is not available.
@MainActor
final class EndToEndHTTPTests: XCTestCase {
    var server: Process?
    var port = 0
    var logURL: URL!
    var env: TestEnvironment!

    override func setUp() async throws {
        env = try TestEnvironment.make()
        logURL = env.directory.appendingPathComponent("requests.jsonl")
        let script = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Fixtures/mock_llm_server.py")
        let python = ["/usr/bin/python3", "/usr/local/bin/python3", "/opt/homebrew/bin/python3"].first { FileManager.default.isExecutableFile(atPath: $0) }
        guard let python else { throw XCTSkip("python3 is not available") }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: python)
        process.arguments = [script.path, logURL.path]
        let output = Pipe()
        process.standardOutput = output
        try process.run()
        server = process
        // The server prints its port on the first line.
        let handle = output.fileHandleForReading
        var line = ""
        let deadline = Date().addingTimeInterval(10)
        while !line.contains("\n"), Date() < deadline {
            let data = handle.availableData
            if data.isEmpty { break }
            line += String(decoding: data, as: UTF8.self)
        }
        port = Int(line.trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0
        guard port > 0 else { throw XCTSkip("mock server did not start") }
    }

    override func tearDown() async throws {
        server?.terminate()
        server?.waitUntilExit()
        env.cleanUp()
    }

    func loggedRequests() throws -> [JSONValue] {
        let text = try String(contentsOf: logURL, encoding: .utf8)
        return try text.split(separator: "\n").map { try JSONParser.parse(String($0)) }
    }

    func testAnthropicMultiStepWorkflowOverHTTP() async throws {
        var settings = ProviderSettings()
        settings.kind = .anthropic
        settings.setBaseURL("http://127.0.0.1:\(port)", for: .anthropic)
        let configuration = try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-ant-mock-key-123456")
        let provider = ProviderFactory.make(configuration)
        let orchestrator = AgentOrchestrator(services: env.services, registry: BuiltinTools.makeRegistry(), confirmations: ConfirmationCenter()) { provider }
        let session = env.newSession()

        let run = try XCTUnwrap(orchestrator.send("Give me 25 minutes to finish my economics essay, then remind me to take a break.", session: session))
        await orchestrator.waitUntilFinished()

        XCTAssertEqual(run.phase, .finished, "run failed: \(run.errorMessage ?? "")")
        XCTAssertEqual(run.modelCalls, 3)
        XCTAssertEqual(run.steps.map(\.toolName), ["start_timer", "create_task", "get_timer_status"])
        XCTAssertTrue(run.steps.allSatisfy { $0.status == .succeeded })

        // Real effects.
        XCTAssertEqual(env.services.timer.state.phase, .running)
        XCTAssertEqual(env.services.timer.state.label, "Economics essay")
        XCTAssertEqual(env.services.timer.state.breakMinutesAfter, 5)
        XCTAssertEqual(env.services.tasks.tasks.map(\.title), ["Finish economics essay"])

        // The final answer was built from the verified tool result.
        XCTAssertEqual(session.conversation.turns.last?.visibleText, "Done: the timer is running with 25:00 left, and the essay task is saved.")
        // Progress notes (thinking display text) are kept for display.
        XCTAssertEqual(session.conversation.turns[1].blocks.first, .progress("Setting up a focus session and a task."))

        // Wire-level checks: three requests, correct headers, no sampling params,
        // thinking replayed verbatim (the server rejects anything else).
        let requests = try loggedRequests()
        XCTAssertEqual(requests.count, 3)
        for request in requests {
            XCTAssertEqual(request["headers"]?["anthropic-version"], "2026-10-21")
            XCTAssertEqual(request["has_key"], true)
            XCTAssertNil(request["body"]?["temperature"])
            XCTAssertEqual(request["body"]?["stream"], true)
            XCTAssertEqual(request["body"]?["tools"]?.arrayValue?.count, orchestrator.registry.specs.count)
        }
        let lastMessages = try XCTUnwrap(requests[2]["body"]?["messages"]?.arrayValue)
        XCTAssertEqual(lastMessages.map { $0["role"]?.stringValue }, ["user", "assistant", "user", "assistant", "user"])
        XCTAssertEqual(lastMessages[1]["content"]?.arrayValue?.first?["signature"], "c2lnLXJvdW5kLTE=")
        // The system prompt and tools are byte-identical across requests (cache-friendly, replay-safe).
        XCTAssertEqual(requests[0]["body"]?["system"], requests[2]["body"]?["system"])
        XCTAssertEqual(requests[0]["body"]?["tools"], requests[2]["body"]?["tools"])
        // Restart: the stored conversation replays identically.
        let restored = try XCTUnwrap(ConversationStore(fileStore: env.fileStore).conversation(session.id))
        XCTAssertEqual(AnthropicProvider.messages(from: restored.contextTurns), AnthropicProvider.messages(from: session.conversation.contextTurns))
    }

    func testAnthropicInvalidKeyIsReported() async throws {
        var settings = ProviderSettings()
        settings.setBaseURL("http://127.0.0.1:\(port)", for: .anthropic)
        let provider = ProviderFactory.make(try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-ant-wrong"))
        let orchestrator = AgentOrchestrator(services: env.services, registry: BuiltinTools.makeRegistry(), confirmations: ConfirmationCenter()) { provider }
        let run = try XCTUnwrap(orchestrator.send("Hello", session: env.newSession()))
        await orchestrator.waitUntilFinished()
        XCTAssertTrue(run.errorMessage?.contains("API key was rejected") ?? false, run.errorMessage ?? "")
        XCTAssertEqual(try loggedRequests().count, 1, "authentication errors are not retried")
    }

    func testOpenAIResponsesWorkflowOverHTTP() async throws {
        var settings = ProviderSettings()
        settings.kind = .openAI
        settings.setBaseURL("http://127.0.0.1:\(port)/v1", for: .openAI)
        let provider = ProviderFactory.make(try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-proj-mock-key-123456"))
        let orchestrator = AgentOrchestrator(services: env.services, registry: BuiltinTools.makeRegistry(), confirmations: ConfirmationCenter()) { provider }
        let session = env.newSession()
        let run = try XCTUnwrap(orchestrator.send("Summarise this text and save the important points to my notes: demand curves slope down; elasticity matters.", session: session))
        await orchestrator.waitUntilFinished()
        XCTAssertEqual(run.phase, .finished, run.errorMessage ?? "")
        XCTAssertEqual(env.services.notes.notes.map(\.title), ["Key points"])
        XCTAssertEqual(session.conversation.turns.last?.visibleText, "Saved your note \"Key points\".")
        let requests = try loggedRequests()
        XCTAssertEqual(requests.count, 2)
        XCTAssertEqual(requests[0]["body"]?["store"], false)
        XCTAssertEqual(requests[1]["body"]?["input"]?.arrayValue?.compactMap { $0["type"]?.stringValue ?? $0["role"]?.stringValue }, ["user", "reasoning", "function_call", "function_call_output"])
    }
}
