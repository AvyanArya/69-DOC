import XCTest
@testable import NotchPilotCore

/// Builds SSE bodies in the Anthropic Messages streaming format.
enum AnthropicSSE {
    static func event(_ name: String, _ json: String) -> String {
        "event: \(name)\ndata: \(json)\n"
    }

    static func toolTurn(thinking: String = "Checking your tasks first.", toolID: String = "toolu_01", tool: String = "list_tasks", inputChunks: [String] = [#"{"sta"#, #"tus":"open"}"#]) -> String {
        var lines = [
            event("message_start", #"{"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"usage":{"input_tokens":120,"output_tokens":1,"cache_read_input_tokens":100}}}"#),
            event("content_block_start", #"{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}"#),
            event("content_block_delta", #"{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"\#(thinking)"}}"#),
            event("content_block_delta", #"{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"c2lnbmF0dXJl"}}"#),
            event("content_block_stop", #"{"type":"content_block_stop","index":0}"#),
            event("ping", #"{"type":"ping"}"#),
            event("content_block_start", #"{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"\#(toolID)","name":"\#(tool)","input":{}}}"#),
        ]
        for chunk in inputChunks {
            let escaped = chunk.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
            lines.append(event("content_block_delta", #"{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"\#(escaped)"}}"#))
        }
        lines += [
            event("content_block_stop", #"{"type":"content_block_stop","index":1}"#),
            event("message_delta", #"{"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":42}}"#),
            event("message_stop", #"{"type":"message_stop"}"#),
        ]
        return lines.joined(separator: "\n")
    }

    static func textTurn(_ parts: [String], stopReason: String = "end_turn", stopDetails: String = "null") -> String {
        var lines = [
            event("message_start", #"{"type":"message_start","message":{"id":"msg_2","type":"message","role":"assistant","model":"claude-opus-5-5","content":[],"usage":{"input_tokens":200,"output_tokens":1}}}"#),
            event("content_block_start", #"{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}"#),
        ]
        for part in parts {
            lines.append(event("content_block_delta", #"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"\#(part)"}}"#))
        }
        lines += [
            event("content_block_stop", #"{"type":"content_block_stop","index":0}"#),
            event("message_delta", #"{"type":"message_delta","delta":{"stop_reason":"\#(stopReason)","stop_details":\#(stopDetails)},"usage":{"output_tokens":12}}"#),
            event("message_stop", #"{"type":"message_stop"}"#),
        ]
        return lines.joined(separator: "\n")
    }
}

final class SSEParserTests: XCTestCase {
    func testParsesEventsCommentsAndMultilineData() {
        var parser = SSEParser()
        var events: [SSEEvent] = []
        for line in [": keep-alive", "event: a", "data: one", "data: two", "", "data: {\"x\":1}", "", "event: b", "data: tail"] {
            if let event = parser.feed(line) { events.append(event) }
        }
        if let event = parser.finish() { events.append(event) }
        XCTAssertEqual(events, [
            SSEEvent(event: "a", data: "one\ntwo"),
            SSEEvent(event: nil, data: "{\"x\":1}"),
            SSEEvent(event: "b", data: "tail"),
        ])
    }

    func testToleratesMissingBlankLines() {
        var parser = SSEParser()
        var events: [SSEEvent] = []
        for line in ["event: a", "data: 1", "event: b", "data: 2"] {
            if let event = parser.feed(line) { events.append(event) }
        }
        if let event = parser.finish() { events.append(event) }
        XCTAssertEqual(events.map(\.data), ["1", "2"])
    }

    func testLineSplitterHandlesChunkBoundariesAndCRLF() {
        var splitter = LineSplitter()
        var lines: [String] = []
        lines += splitter.append(Data("data: he".utf8))
        lines += splitter.append(Data(Array("llo\r\n\r\ndata: é".utf8).prefix(14)))
        lines += splitter.append(Data(Array("data: é\n".utf8)[7...]))
        XCTAssertEqual(lines, ["data: hello", "", "data: é"])
    }
}

final class AnthropicProviderTests: XCTestCase {
    func configuration(_ base: String = "https://api.anthropic.com", model: String = "claude-opus-5-5") -> ProviderConfiguration {
        ProviderConfiguration(kind: .anthropic, model: model, baseURL: URL(string: base)!, apiKey: "sk-ant-test-key-0000000000")
    }

    func request(model: String = "claude-opus-5-5", turns: [ConversationTurn]? = nil) -> ModelRequest {
        ModelRequest(
            model: model, systemPrompt: SystemPrompt.text,
            turns: turns ?? [ConversationTurn(role: .user, blocks: [.context("<context>now</context>"), .text("What's open?")], createdAt: Date())],
            tools: [ToolSpec(name: "list_tasks", description: "List tasks", inputSchema: JSONSchema.empty.toJSON())],
            maxOutputTokens: 32_000, effort: .medium
        )
    }

    func collect(_ provider: AIProvider, _ request: ModelRequest) async throws -> (events: [ModelStreamEvent], response: ModelResponse) {
        var events: [ModelStreamEvent] = []
        var response: ModelResponse?
        for try await event in provider.stream(request) {
            events.append(event)
            if case .completed(let r) = event { response = r }
        }
        return (events, try XCTUnwrap(response))
    }

    func testRequestShapeForCurrentModels() async throws {
        let transport = ScriptedTransport(replies: [.init(body: AnthropicSSE.textTurn(["Hi"]))])
        let provider = AnthropicProvider(configuration: configuration(), transport: transport)
        _ = try await collect(provider, request())

        let spec = try XCTUnwrap(transport.requests.first)
        XCTAssertEqual(spec.url.absoluteString, "https://api.anthropic.com/v1/messages")
        XCTAssertEqual(spec.headers["anthropic-version"], "2026-10-21")
        XCTAssertEqual(spec.headers["x-api-key"], "sk-ant-test-key-0000000000")
        let betas = Set((spec.headers["anthropic-beta"] ?? "").split(separator: ",").map(String.init))
        XCTAssertEqual(betas, ["thinking-display-updates-2026-08-18", "thinking-binding-controls-2026-08-01", "server-side-fallback-2026-07-01"])

        let body = try XCTUnwrap(transport.requestBodies.first)
        XCTAssertEqual(body["model"], "claude-opus-5-5")
        XCTAssertEqual(body["stream"], true)
        XCTAssertEqual(body["thinking"]?["type"], "adaptive")
        XCTAssertEqual(body["thinking"]?["display"], "updates")
        XCTAssertEqual(body["thinking"]?["block_binding"]?["prefix_mismatch_behavior"], "drop_block")
        XCTAssertEqual(body["output_config"]?["effort"], "medium")
        XCTAssertEqual(body["fallbacks"], "default")
        XCTAssertEqual(body["cache_control"]?["type"], "ephemeral")
        XCTAssertEqual(body["tools"]?.arrayValue?.first?["eager_input_streaming"], true)
        XCTAssertNil(body["tool_choice"], "auto is the default and is not sent")
        for removed in ["temperature", "top_p", "top_k"] {
            XCTAssertNil(body[removed], "\(removed) must not be sent on API version 2026-10-21")
        }
        // Context and user text go in the same user message, in order.
        let content = try XCTUnwrap(body["messages"]?.arrayValue?.first?["content"]?.arrayValue)
        XCTAssertEqual(content.map { $0["text"]?.stringValue }, ["<context>now</context>", "What's open?"])
    }

    func testCustomEndpointAndOlderModelsOmitOptionalFeatures() async throws {
        let transport = ScriptedTransport(replies: [.init(body: AnthropicSSE.textTurn(["Hi"]))])
        let provider = AnthropicProvider(configuration: configuration("https://gateway.example.com/anthropic", model: "claude-haiku-4-5"), transport: transport)
        _ = try await collect(provider, request(model: "claude-haiku-4-5"))
        let spec = try XCTUnwrap(transport.requests.first)
        XCTAssertEqual(spec.url.absoluteString, "https://gateway.example.com/anthropic/v1/messages")
        XCTAssertNil(spec.headers["anthropic-beta"])
        let body = try XCTUnwrap(transport.requestBodies.first)
        for key in ["thinking", "output_config", "fallbacks", "cache_control"] { XCTAssertNil(body[key], key) }
        XCTAssertNil(body["tools"]?.arrayValue?.first?["eager_input_streaming"])
    }

    func testParsesThinkingAndChunkedToolInputAndPreservesBlocksVerbatim() async throws {
        let transport = ScriptedTransport(replies: [.init(body: AnthropicSSE.toolTurn())])
        let provider = AnthropicProvider(configuration: configuration(), transport: transport)
        let (events, response) = try await collect(provider, request())

        XCTAssertTrue(events.contains(.progressDelta("Checking your tasks first.")))
        XCTAssertTrue(events.contains(.toolCallStarted(id: "toolu_01", name: "list_tasks")))
        XCTAssertEqual(response.stopReason, .toolUse)
        XCTAssertEqual(response.servedModel, "claude-opus-5-5")
        XCTAssertEqual(response.usage.inputTokens, 120)
        XCTAssertEqual(response.usage.cacheReadTokens, 100)
        XCTAssertEqual(response.usage.outputTokens, 42)
        XCTAssertEqual(response.toolUses, [ToolUseBlock(id: "toolu_01", name: "list_tasks", input: ["status": "open"])])
        XCTAssertEqual(response.blocks.first, .progress("Checking your tasks first."))

        let native = try XCTUnwrap(response.native)
        XCTAssertEqual(native.format, .anthropicMessages)
        XCTAssertEqual(native.items[0].serialized(), #"{"type":"thinking","thinking":"Checking your tasks first.","signature":"c2lnbmF0dXJl"}"#)
        XCTAssertEqual(native.items[1].serialized(), #"{"type":"tool_use","id":"toolu_01","name":"list_tasks","input":{"status":"open"}}"#)

        // Replaying the turn sends those exact blocks back.
        let turns = [
            ConversationTurn(role: .user, blocks: [.text("What's open?")], createdAt: Date()),
            ConversationTurn(role: .assistant, blocks: response.blocks, native: native, createdAt: Date()),
            ConversationTurn(role: .user, blocks: [.toolResult(ToolResultBlock(toolUseID: "toolu_01", toolName: "list_tasks", content: "{}", isError: false))], createdAt: Date()),
        ]
        let messages = AnthropicProvider.messages(from: turns)
        XCTAssertEqual(messages.count, 3)
        XCTAssertEqual(messages[1]["content"], .array(native.items))
        XCTAssertEqual(messages[2]["content"]?.arrayValue?.first?.serialized(), #"{"type":"tool_result","tool_use_id":"toolu_01","content":"{}"}"#)
    }

    func testMalformedToolInputIsReportedNotExecuted() async throws {
        let transport = ScriptedTransport(replies: [.init(body: AnthropicSSE.toolTurn(inputChunks: [#"{"status":"op"#]))])
        let provider = AnthropicProvider(configuration: configuration(), transport: transport)
        let (_, response) = try await collect(provider, request())
        XCTAssertEqual(response.malformedToolInputs["toolu_01"], #"{"status":"op"#)
        XCTAssertEqual(response.native?.items[1]["input"], .object(JSONObject()))
    }

    func testRefusalStopReason() async throws {
        let body = AnthropicSSE.textTurn(["Partial"], stopReason: "refusal", stopDetails: #"{"type":"refusal","category":"cyber","explanation":null}"#)
        let provider = AnthropicProvider(configuration: configuration(), transport: ScriptedTransport(replies: [.init(body: body)]))
        let (_, response) = try await collect(provider, request())
        XCTAssertEqual(response.stopReason, .refusal(category: "cyber", explanation: nil))
    }

    func testFallbackBlockDropsEarlierModelInternalBlocks() async throws {
        let body = [
            AnthropicSSE.event("message_start", #"{"type":"message_start","message":{"model":"claude-opus-5","usage":{"input_tokens":5}}}"#),
            AnthropicSSE.event("content_block_start", #"{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":"a"}}"#),
            AnthropicSSE.event("content_block_stop", #"{"type":"content_block_stop","index":0}"#),
            AnthropicSSE.event("content_block_start", #"{"type":"content_block_start","index":1,"content_block":{"type":"text","text":"Part one. "}}"#),
            AnthropicSSE.event("content_block_stop", #"{"type":"content_block_stop","index":1}"#),
            AnthropicSSE.event("content_block_start", #"{"type":"content_block_start","index":2,"content_block":{"type":"fallback","from":{"model":"claude-opus-5-5"},"to":{"model":"claude-opus-5"}}}"#),
            AnthropicSSE.event("content_block_stop", #"{"type":"content_block_stop","index":2}"#),
            AnthropicSSE.event("content_block_start", #"{"type":"content_block_start","index":3,"content_block":{"type":"text","text":"Part two."}}"#),
            AnthropicSSE.event("content_block_stop", #"{"type":"content_block_stop","index":3}"#),
            AnthropicSSE.event("message_delta", #"{"type":"message_delta","delta":{"stop_reason":"end_turn"}}"#),
            AnthropicSSE.event("message_stop", #"{"type":"message_stop"}"#),
        ].joined(separator: "\n")
        let provider = AnthropicProvider(configuration: configuration(), transport: ScriptedTransport(replies: [.init(body: body)]))
        let (events, response) = try await collect(provider, request())
        XCTAssertTrue(events.contains { if case .notice = $0 { return true } else { return false } })
        XCTAssertEqual(response.native?.items.compactMap { $0["type"]?.stringValue }, ["text", "text"])
        XCTAssertEqual(response.text, "Part one. Part two.")
    }

    func testHTTPErrorsAreTyped() async throws {
        let cases: [(Int, [String: String], ProviderError)] = [
            (401, [:], .authentication("invalid x-api-key")),
            (429, ["retry-after": "7"], .rateLimited(retryAfter: 7, message: "invalid x-api-key")),
            (529, [:], .overloaded("invalid x-api-key")),
            (500, [:], .server(status: 500, message: "invalid x-api-key")),
        ]
        for (status, headers, expected) in cases {
            let body = #"{"type":"error","error":{"type":"x","message":"invalid x-api-key"}}"#
            let provider = AnthropicProvider(configuration: configuration(), transport: ScriptedTransport(replies: [.init(status: status, headers: headers, body: body)]))
            do {
                _ = try await collect(provider, request())
                XCTFail("expected error for \(status)")
            } catch let error as ProviderError {
                XCTAssertEqual(error, expected)
                XCTAssertEqual(error.isRetryable, status != 401)
            }
        }
    }

    func testRetriesInCompatibilityModeWhenAnOptionalFeatureIsRejected() async throws {
        let rejection = #"{"type":"error","error":{"type":"invalid_request_error","message":"thinking.display: Input should be 'summarized' or 'omitted'"}}"#
        let transport = ScriptedTransport(replies: [
            .init(status: 400, body: rejection),
            .init(body: AnthropicSSE.textTurn(["OK"])),
            .init(body: AnthropicSSE.textTurn(["Again"])),
        ])
        let provider = AnthropicProvider(configuration: configuration(), transport: transport)
        let (_, response) = try await collect(provider, request())
        XCTAssertEqual(response.text, "OK")
        _ = try await collect(provider, request())
        XCTAssertEqual(transport.requests.count, 3)
        for body in transport.requestBodies.dropFirst() {
            XCTAssertNil(body["fallbacks"])
            XCTAssertNil(body["thinking"]?["display"])
            XCTAssertNil(body["cache_control"])
            XCTAssertEqual(body["thinking"]?["type"], "adaptive", "thinking itself is still requested")
        }
        XCTAssertNil(transport.requests[2].headers["anthropic-beta"], "later requests stay in compatibility mode")
    }

    func testUnrelatedBadRequestIsNotRetried() async throws {
        let transport = ScriptedTransport(replies: [.init(status: 400, body: #"{"error":{"type":"invalid_request_error","message":"prompt is too long"}}"#)])
        let provider = AnthropicProvider(configuration: configuration(), transport: transport)
        do {
            _ = try await collect(provider, request())
            XCTFail("expected failure")
        } catch {
            XCTAssertEqual(error as? ProviderError, .badRequest("prompt is too long"))
        }
        XCTAssertEqual(transport.requests.count, 1)
    }

    func testStreamErrorsAndTruncation() async throws {
        let overloaded = AnthropicSSE.event("error", #"{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}"#)
        let provider = AnthropicProvider(configuration: configuration(), transport: ScriptedTransport(replies: [.init(body: overloaded)]))
        do {
            _ = try await collect(provider, request())
            XCTFail("expected error")
        } catch {
            XCTAssertEqual(error as? ProviderError, .overloaded("Overloaded"))
        }

        let cutOff = AnthropicSSE.textTurn(["Hel"]).components(separatedBy: "\n").prefix(6).joined(separator: "\n")
        let truncated = AnthropicProvider(configuration: configuration(), transport: ScriptedTransport(replies: [.init(body: cutOff)]))
        do {
            _ = try await collect(truncated, request())
            XCTFail("expected error")
        } catch {
            XCTAssertEqual(error as? ProviderError, .network("The response ended unexpectedly."))
        }
    }

    func testConfigurationValidation() {
        var settings = ProviderSettings()
        XCTAssertThrowsError(try ProviderConfiguration.resolve(settings: settings, apiKey: nil)) { error in
            XCTAssertEqual(error as? ProviderError, .missingAPIKey(.anthropic))
        }
        XCTAssertThrowsError(try ProviderConfiguration.resolve(settings: settings, apiKey: "   "))
        XCTAssertNoThrow(try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-ant-x"))

        settings.setBaseURL("http://example.com", for: .anthropic)
        XCTAssertThrowsError(try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-ant-x"), "keys never go over plain HTTP to remote hosts")
        settings.setBaseURL("not a url", for: .anthropic)
        XCTAssertThrowsError(try ProviderConfiguration.resolve(settings: settings, apiKey: "sk-ant-x"))

        settings.kind = .openAICompatible
        XCTAssertNoThrow(try ProviderConfiguration.resolve(settings: settings, apiKey: nil), "local servers need no key")
    }

    func testModelCapabilityTable() {
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-opus-5-5"), .init(sendAdaptiveThinking: true, progressUpdates: true, blockBinding: true, effort: true, refusalFallback: true))
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-sonnet-5-5").refusalFallback, true)
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-fable-5").refusalFallback, false)
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-haiku-5-5"), .init(effort: true))
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-opus-4-8"), .init(sendAdaptiveThinking: true, effort: true))
        XCTAssertEqual(AnthropicModelCapabilities.forModel("claude-haiku-4-5"), .init())
    }
}

final class OpenAIProviderTests: XCTestCase {
    func config(_ kind: ProviderKind, _ base: String, model: String, key: String? = "sk-proj-testtesttesttest") -> ProviderConfiguration {
        ProviderConfiguration(kind: kind, model: model, baseURL: URL(string: base)!, apiKey: key)
    }

    func request(_ model: String, turns: [ConversationTurn]) -> ModelRequest {
        ModelRequest(model: model, systemPrompt: "system", turns: turns,
                     tools: [ToolSpec(name: "start_timer", description: "Start", inputSchema: JSONSchema.empty.toJSON())],
                     maxOutputTokens: 4_000, effort: .low)
    }

    func data(_ json: String) -> String { "data: \(json)\n" }

    func testResponsesAPIStreamingFunctionCall() async throws {
        let body = [
            "event: response.created\n" + data(#"{"type":"response.created","response":{"id":"resp_1","model":"gpt-6.1-sol"}}"#),
            data(#"{"type":"response.output_item.added","output_index":0,"item":{"type":"reasoning","id":"rs_1","summary":[],"encrypted_content":"enc"}}"#),
            data(#"{"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"start_timer","arguments":""}}"#),
            data(#"{"type":"response.function_call_arguments.delta","output_index":1,"delta":"{\"minutes\":"}"#),
            data(#"{"type":"response.function_call_arguments.delta","output_index":1,"delta":"25}"}"#),
            data(#"{"type":"response.completed","response":{"model":"gpt-6.1-sol","status":"completed","output":[{"type":"reasoning","id":"rs_1","summary":[],"encrypted_content":"enc"},{"type":"function_call","id":"fc_1","call_id":"call_1","name":"start_timer","arguments":"{\"minutes\":25}","status":"completed"}],"usage":{"input_tokens":50,"output_tokens":9}}}"#),
        ].joined(separator: "\n")
        let transport = ScriptedTransport(replies: [.init(body: body)])
        let provider = OpenAIResponsesProvider(configuration: config(.openAI, "https://api.openai.com/v1", model: "gpt-6.1-sol"), transport: transport)
        var response: ModelResponse?
        for try await event in provider.stream(request("gpt-6.1-sol", turns: [ConversationTurn(role: .user, blocks: [.text("Focus 25")], createdAt: Date())])) {
            if case .completed(let r) = event { response = r }
        }
        let result = try XCTUnwrap(response)
        XCTAssertEqual(result.stopReason, .toolUse)
        XCTAssertEqual(result.toolUses, [ToolUseBlock(id: "call_1", name: "start_timer", input: ["minutes": 25])])
        XCTAssertEqual(result.native?.items.count, 2, "reasoning items are kept for replay")

        let spec = try XCTUnwrap(transport.requests.first)
        XCTAssertEqual(spec.url.absoluteString, "https://api.openai.com/v1/responses")
        XCTAssertEqual(spec.headers["authorization"], "Bearer sk-proj-testtesttesttest")
        let sent = try XCTUnwrap(transport.requestBodies.first)
        XCTAssertEqual(sent["store"], false)
        XCTAssertEqual(sent["include"], ["reasoning.encrypted_content"])
        XCTAssertEqual(sent["reasoning"]?["effort"], "low")
        XCTAssertEqual(sent["instructions"], "system")
        XCTAssertNil(sent["temperature"])

        // Tool results are sent back as function_call_output items after the replayed output.
        let turns = [
            ConversationTurn(role: .user, blocks: [.text("Focus 25")], createdAt: Date()),
            ConversationTurn(role: .assistant, blocks: result.blocks, native: result.native, createdAt: Date()),
            ConversationTurn(role: .user, blocks: [.toolResult(ToolResultBlock(toolUseID: "call_1", toolName: "start_timer", content: "{\"ok\":true}", isError: false))], createdAt: Date()),
        ]
        let items = OpenAIResponsesProvider.inputItems(from: turns)
        XCTAssertEqual(items.map { $0["type"]?.stringValue ?? $0["role"]?.stringValue }, ["user", "reasoning", "function_call", "function_call_output"])
        XCTAssertEqual(items.last?["call_id"], "call_1")
    }

    func testChatCompletionsCompatibleStreaming() async throws {
        let body = [
            data(#"{"model":"llama3.1","choices":[{"index":0,"delta":{"role":"assistant","content":"Starting "}}]}"#),
            data(#"{"model":"llama3.1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_a","type":"function","function":{"name":"start_timer","arguments":"{\"min"}}]}}]}"#),
            data(#"{"model":"llama3.1","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"utes\":25}"}}]}}]}"#),
            data(#"{"model":"llama3.1","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}"#),
            data("[DONE]"),
        ].joined(separator: "\n")
        let transport = ScriptedTransport(replies: [.init(body: body)])
        let provider = OpenAIChatProvider(configuration: config(.openAICompatible, "http://localhost:11434/v1", model: "llama3.1", key: nil), transport: transport)
        var response: ModelResponse?
        for try await event in provider.stream(request("llama3.1", turns: [ConversationTurn(role: .user, blocks: [.text("Focus")], createdAt: Date())])) {
            if case .completed(let r) = event { response = r }
        }
        let result = try XCTUnwrap(response)
        XCTAssertEqual(result.text, "Starting ")
        XCTAssertEqual(result.toolUses, [ToolUseBlock(id: "call_a", name: "start_timer", input: ["minutes": 25])])
        let spec = try XCTUnwrap(transport.requests.first)
        XCTAssertEqual(spec.url.absoluteString, "http://localhost:11434/v1/chat/completions")
        XCTAssertNil(spec.headers["authorization"], "no key configured, none sent")
        let messages = try XCTUnwrap(transport.requestBodies.first?["messages"]?.arrayValue)
        XCTAssertEqual(messages.first?["role"], "system")
    }

    func testCrossProviderHistoryConversion() {
        // A conversation started with Claude continues on a Chat Completions server.
        let turns = [
            ConversationTurn(role: .user, blocks: [.context("<context/>"), .text("Plan")], createdAt: Date()),
            ConversationTurn(role: .assistant, blocks: [.progress("thinking"), .text("Sure."), .toolUse(ToolUseBlock(id: "toolu_9", name: "list_tasks", input: [:]))],
                             native: NativeContent(format: .anthropicMessages, items: [["type": "thinking", "thinking": "x", "signature": "s"]]), createdAt: Date()),
            ConversationTurn(role: .user, blocks: [.toolResult(ToolResultBlock(toolUseID: "toolu_9", toolName: "list_tasks", content: "[]", isError: true))], createdAt: Date()),
        ]
        let messages = OpenAIChatProvider.messages(from: turns)
        XCTAssertEqual(messages.map { $0["role"]?.stringValue }, ["user", "assistant", "tool"])
        XCTAssertEqual(messages[1]["tool_calls"]?.arrayValue?.first?["id"], "toolu_9")
        XCTAssertNil(messages[1].serialized().range(of: "signature"), "Anthropic thinking blocks are never sent to other providers")
        XCTAssertEqual(messages[2]["content"], "ERROR: []")
    }
}
