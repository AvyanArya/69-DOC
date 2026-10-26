import Foundation

/// OpenAI via the Responses API, which current OpenAI models require for tool calling.
///
/// Requests use `store: false` and ask for encrypted reasoning so the full
/// conversation (including reasoning items) is replayed from local history
/// instead of being kept server-side.
public final class OpenAIResponsesProvider: AIProvider, @unchecked Sendable {
    public let kind: ProviderKind = .openAI
    public var model: String { configuration.model }

    private let configuration: ProviderConfiguration
    private let transport: HTTPStreamingTransport
    private let lock = NSLock()
    private var compatibilityMode = false

    public init(configuration: ProviderConfiguration, transport: HTTPStreamingTransport) {
        self.configuration = configuration
        self.transport = transport
    }

    static func isReasoningModel(_ model: String) -> Bool {
        let id = model.lowercased()
        return id.hasPrefix("gpt-5") || id.hasPrefix("gpt-6") || id.hasPrefix("o1") || id.hasPrefix("o3") || id.hasPrefix("o4")
    }

    public func stream(_ request: ModelRequest) -> AsyncThrowingStream<ModelStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    try await self.run(request, continuation: continuation)
                    continuation.finish()
                } catch is CancellationError {
                    continuation.finish(throwing: ProviderError.cancelled)
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func run(_ request: ModelRequest, continuation: AsyncThrowingStream<ModelStreamEvent, Error>.Continuation) async throws {
        var compat = lock.sync { compatibilityMode } || !configuration.useOptionalFeatures
        while true {
            let (spec, usedOptional) = try buildRequest(request, compatibility: compat)
            let response = try await transport.open(spec)
            guard (200..<300).contains(response.status) else {
                let body = try await response.collectBody()
                let error = ProviderHTTP.error(status: response.status, headers: response.headers, body: body)
                if case .badRequest(let message) = error, usedOptional, !compat {
                    let lowered = message.lowercased()
                    if ["reasoning", "include", "encrypted", "not supported", "unsupported", "unknown parameter"].contains(where: lowered.contains) {
                        lock.sync { compatibilityMode = true }
                        compat = true
                        continue
                    }
                }
                throw error
            }
            try await consume(response, continuation: continuation)
            return
        }
    }

    func buildRequest(_ request: ModelRequest, compatibility: Bool) throws -> (HTTPRequestSpec, Bool) {
        guard let apiKey = configuration.apiKey else { throw ProviderError.missingAPIKey(.openAI) }
        var usedOptional = false
        var body = JSONObject()
        body["model"] = .string(request.model)
        body["instructions"] = .string(request.systemPrompt)
        body["input"] = .array(Self.inputItems(from: request.turns))
        if !request.tools.isEmpty {
            body["tools"] = .array(request.tools.map { tool in
                [
                    "type": "function", "name": .string(tool.name), "description": .string(tool.description),
                    "parameters": tool.inputSchema, "strict": false,
                ]
            })
            body["tool_choice"] = request.toolChoice == .none ? "none" : "auto"
        }
        body["stream"] = true
        body["store"] = false
        body["max_output_tokens"] = .int(request.maxOutputTokens)
        if !compatibility, Self.isReasoningModel(request.model) {
            body["reasoning"] = ["effort": .string(request.effort.rawValue)]
            body["include"] = ["reasoning.encrypted_content"]
            usedOptional = true
        }
        let spec = HTTPRequestSpec(
            url: ProviderHTTP.endpoint(configuration.baseURL, appending: "/responses"),
            headers: [
                "content-type": "application/json",
                "accept": "text/event-stream",
                "authorization": "Bearer \(apiKey)",
            ],
            body: JSONValue.object(body).serializedData(), idleTimeout: configuration.idleTimeout
        )
        return (spec, usedOptional)
    }

    static func inputItems(from turns: [ConversationTurn]) -> [JSONValue] {
        var items: [JSONValue] = []
        for turn in turns {
            switch turn.role {
            case .user:
                var parts: [JSONValue] = []
                for block in turn.blocks {
                    switch block {
                    case .text(let text) where !text.isEmpty:
                        parts.append(["type": "input_text", "text": .string(text)])
                    case .context(let text):
                        parts.append(["type": "input_text", "text": .string(text)])
                    case .attachment(let attachment):
                        parts.append(["type": "input_text", "text": .string(PromptFormatting.attachmentText(attachment))])
                    case .toolResult(let result):
                        let output = result.isError ? "ERROR: \(result.content)" : result.content
                        items.append(["type": "function_call_output", "call_id": .string(result.toolUseID), "output": .string(output)])
                    default:
                        break
                    }
                }
                if !parts.isEmpty {
                    items.append(["role": "user", "content": .array(parts)])
                }
            case .assistant:
                if let native = turn.native, native.format == .openAIResponses {
                    items.append(contentsOf: native.items)
                } else {
                    for block in turn.blocks {
                        switch block {
                        case .text(let text) where !text.isEmpty:
                            items.append(["role": "assistant", "content": .string(text)])
                        case .toolUse(let use):
                            items.append([
                                "type": "function_call", "call_id": .string(use.id), "name": .string(use.name),
                                "arguments": .string(use.input.serialized()),
                            ])
                        default:
                            break
                        }
                    }
                }
            }
        }
        return items
    }

    private func consume(_ response: HTTPStreamResponse, continuation: AsyncThrowingStream<ModelStreamEvent, Error>.Continuation) async throws {
        var items: [Int: JSONObject] = [:]
        var argumentBuffers: [Int: String] = [:]
        var finalOutput: [JSONValue]?
        var servedModel: String?
        var usage = TokenUsage()
        var incompleteReason: String?
        var finished = false

        for try await event in response.events() {
            try Task.checkCancellation()
            if event.data == "[DONE]" { break }
            let json = try ProviderHTTP.parseJSON(event.data)
            let type = json["type"]?.stringValue ?? event.event ?? ""
            switch type {
            case "response.created", "response.in_progress":
                if servedModel == nil {
                    servedModel = json["response"]?["model"]?.stringValue
                    continuation.yield(.started(model: servedModel))
                }
            case "response.output_item.added":
                guard let index = json["output_index"]?.intValue, let item = json["item"]?.objectValue else { continue }
                items[index] = item
                if item["type"]?.stringValue == "function_call" {
                    continuation.yield(.toolCallStarted(id: item["call_id"]?.stringValue ?? "", name: item["name"]?.stringValue ?? ""))
                }
            case "response.output_text.delta":
                if let delta = json["delta"]?.stringValue { continuation.yield(.textDelta(delta)) }
            case "response.refusal.delta":
                if let delta = json["delta"]?.stringValue { continuation.yield(.textDelta(delta)) }
            case "response.function_call_arguments.delta":
                if let index = json["output_index"]?.intValue {
                    argumentBuffers[index, default: ""] += json["delta"]?.stringValue ?? ""
                }
            case "response.output_item.done":
                if let index = json["output_index"]?.intValue, let item = json["item"]?.objectValue {
                    items[index] = item
                }
            case "response.completed":
                finished = true
                finalOutput = json["response"]?["output"]?.arrayValue
                servedModel = json["response"]?["model"]?.stringValue ?? servedModel
                usage.inputTokens = json["response"]?["usage"]?["input_tokens"]?.intValue ?? 0
                usage.outputTokens = json["response"]?["usage"]?["output_tokens"]?.intValue ?? 0
                usage.cacheReadTokens = json["response"]?["usage"]?["input_tokens_details"]?["cached_tokens"]?.intValue ?? 0
            case "response.incomplete":
                finished = true
                finalOutput = json["response"]?["output"]?.arrayValue
                incompleteReason = json["response"]?["incomplete_details"]?["reason"]?.stringValue ?? "incomplete"
            case "response.failed":
                let message = Redactor.redact(json["response"]?["error"]?["message"]?.stringValue ?? "The response failed.")
                let code = json["response"]?["error"]?["code"]?.stringValue ?? ""
                if code.contains("rate_limit") { throw ProviderError.rateLimited(retryAfter: nil, message: message) }
                if code.contains("server") { throw ProviderError.server(status: 500, message: message) }
                throw ProviderError.badRequest(message)
            case "error":
                let message = Redactor.redact(json["message"]?.stringValue ?? json["error"]?["message"]?.stringValue ?? "Stream error")
                let code = json["code"]?.stringValue ?? json["error"]?["code"]?.stringValue ?? ""
                if code.contains("rate_limit") { throw ProviderError.rateLimited(retryAfter: nil, message: message) }
                throw ProviderError.server(status: 500, message: message)
            default:
                break
            }
        }
        guard finished else { throw ProviderError.network("The response ended unexpectedly.") }

        // Prefer the authoritative output from response.completed; fall back to streamed items.
        var output: [JSONValue] = finalOutput ?? []
        if output.isEmpty {
            for index in items.keys.sorted() {
                var item = items[index]!
                if item["type"]?.stringValue == "function_call", (item["arguments"]?.stringValue ?? "").isEmpty, let buffered = argumentBuffers[index] {
                    item["arguments"] = .string(buffered)
                }
                output.append(.object(item))
            }
        }

        var neutral: [ContentBlock] = []
        var malformed: [String: String] = [:]
        var refusalText: String?
        for item in output {
            switch item["type"]?.stringValue {
            case "message":
                for part in item["content"]?.arrayValue ?? [] {
                    if part["type"]?.stringValue == "output_text", let text = part["text"]?.stringValue, !text.isEmpty {
                        neutral.append(.text(text))
                    } else if part["type"]?.stringValue == "refusal", let text = part["refusal"]?.stringValue {
                        refusalText = text
                        neutral.append(.text(text))
                    }
                }
            case "function_call":
                let callID = item["call_id"]?.stringValue ?? item["id"]?.stringValue ?? UUID().uuidString
                let raw = item["arguments"]?.stringValue ?? "{}"
                var input: JSONValue = .object(JSONObject())
                if raw.trimmingCharacters(in: .whitespaces).isEmpty {
                    input = .object(JSONObject())
                } else if let parsed = try? JSONParser.parse(raw), parsed.objectValue != nil {
                    input = parsed
                } else {
                    malformed[callID] = raw
                }
                neutral.append(.toolUse(ToolUseBlock(id: callID, name: item["name"]?.stringValue ?? "", input: input)))
            case "reasoning":
                for summary in item["summary"]?.arrayValue ?? [] {
                    if let text = summary["text"]?.stringValue?.nilIfBlank { neutral.append(.progress(text)) }
                }
            default:
                break
            }
        }

        let hasToolCalls = neutral.contains { if case .toolUse = $0 { return true } else { return false } }
        let stop: StopReason
        if let refusalText {
            stop = .refusal(category: nil, explanation: refusalText)
        } else if let incompleteReason {
            stop = incompleteReason == "content_filter" ? .refusal(category: "content_filter", explanation: nil) : .maxTokens
        } else {
            stop = hasToolCalls ? .toolUse : .endTurn
        }
        continuation.yield(.completed(ModelResponse(
            blocks: neutral, native: NativeContent(format: .openAIResponses, items: output),
            stopReason: stop, servedModel: servedModel, usage: usage, malformedToolInputs: malformed
        )))
    }
}

/// Any server implementing OpenAI Chat Completions with function calling.
public final class OpenAIChatProvider: AIProvider, @unchecked Sendable {
    public let kind: ProviderKind = .openAICompatible
    public var model: String { configuration.model }

    private let configuration: ProviderConfiguration
    private let transport: HTTPStreamingTransport

    public init(configuration: ProviderConfiguration, transport: HTTPStreamingTransport) {
        self.configuration = configuration
        self.transport = transport
    }

    public func stream(_ request: ModelRequest) -> AsyncThrowingStream<ModelStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let response = try await self.transport.open(self.buildRequest(request))
                    guard (200..<300).contains(response.status) else {
                        let body = try await response.collectBody()
                        throw ProviderHTTP.error(status: response.status, headers: response.headers, body: body)
                    }
                    try await self.consume(response, continuation: continuation)
                    continuation.finish()
                } catch is CancellationError {
                    continuation.finish(throwing: ProviderError.cancelled)
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    func buildRequest(_ request: ModelRequest) -> HTTPRequestSpec {
        var body = JSONObject()
        body["model"] = .string(request.model)
        var messages: [JSONValue] = [["role": "system", "content": .string(request.systemPrompt)]]
        messages.append(contentsOf: Self.messages(from: request.turns))
        body["messages"] = .array(messages)
        if !request.tools.isEmpty {
            body["tools"] = .array(request.tools.map { tool in
                ["type": "function", "function": ["name": .string(tool.name), "description": .string(tool.description), "parameters": tool.inputSchema]]
            })
            body["tool_choice"] = request.toolChoice == .none ? "none" : "auto"
        }
        body["stream"] = true
        body["max_tokens"] = .int(min(request.maxOutputTokens, 16_384))
        var headers = ["content-type": "application/json", "accept": "text/event-stream"]
        if let key = configuration.apiKey { headers["authorization"] = "Bearer \(key)" }
        return HTTPRequestSpec(
            url: ProviderHTTP.endpoint(configuration.baseURL, appending: "/chat/completions"),
            headers: headers, body: JSONValue.object(body).serializedData(), idleTimeout: configuration.idleTimeout
        )
    }

    static func messages(from turns: [ConversationTurn]) -> [JSONValue] {
        var messages: [JSONValue] = []
        for turn in turns {
            switch turn.role {
            case .user:
                var texts: [String] = []
                for block in turn.blocks {
                    switch block {
                    case .text(let text) where !text.isEmpty: texts.append(text)
                    case .context(let text): texts.append(text)
                    case .attachment(let attachment): texts.append(PromptFormatting.attachmentText(attachment))
                    case .toolResult(let result):
                        let content = result.isError ? "ERROR: \(result.content)" : result.content
                        messages.append(["role": "tool", "tool_call_id": .string(result.toolUseID), "content": .string(content)])
                    default: break
                    }
                }
                if !texts.isEmpty {
                    messages.append(["role": "user", "content": .string(texts.joined(separator: "\n\n"))])
                }
            case .assistant:
                if let native = turn.native, native.format == .openAIChat, let message = native.items.first {
                    messages.append(message)
                    continue
                }
                let text = turn.blocks.compactMap(\.text).joined()
                let calls: [JSONValue] = turn.toolUses.map { use in
                    ["id": .string(use.id), "type": "function", "function": ["name": .string(use.name), "arguments": .string(use.input.serialized())]]
                }
                var message = JSONObject()
                message["role"] = "assistant"
                message["content"] = text.isEmpty ? .null : .string(text)
                if !calls.isEmpty { message["tool_calls"] = .array(calls) }
                if text.isEmpty && calls.isEmpty { continue }
                messages.append(.object(message))
            }
        }
        return messages
    }

    private struct PartialCall {
        var id: String = ""
        var name: String = ""
        var arguments: String = ""
    }

    private func consume(_ response: HTTPStreamResponse, continuation: AsyncThrowingStream<ModelStreamEvent, Error>.Continuation) async throws {
        var text = ""
        var calls: [Int: PartialCall] = [:]
        var finishReason: String?
        var servedModel: String?
        var usage = TokenUsage()
        var started = false
        var sawDone = false

        for try await event in response.events() {
            try Task.checkCancellation()
            if event.data == "[DONE]" {
                sawDone = true
                break
            }
            let json = try ProviderHTTP.parseJSON(event.data)
            if let error = json["error"] {
                throw ProviderError.server(status: 500, message: Redactor.redact(error["message"]?.stringValue ?? error.serialized()))
            }
            if !started {
                started = true
                servedModel = json["model"]?.stringValue
                continuation.yield(.started(model: servedModel))
            }
            if let promptTokens = json["usage"]?["prompt_tokens"]?.intValue { usage.inputTokens = promptTokens }
            if let completionTokens = json["usage"]?["completion_tokens"]?.intValue { usage.outputTokens = completionTokens }
            guard let choice = json["choices"]?.arrayValue?.first else { continue }
            if let delta = choice["delta"] {
                if let content = delta["content"]?.stringValue, !content.isEmpty {
                    text += content
                    continuation.yield(.textDelta(content))
                }
                for call in delta["tool_calls"]?.arrayValue ?? [] {
                    let index = call["index"]?.intValue ?? calls.count
                    var partial = calls[index] ?? PartialCall()
                    if let id = call["id"]?.stringValue, !id.isEmpty { partial.id = id }
                    if let name = call["function"]?["name"]?.stringValue, !name.isEmpty {
                        let isNew = partial.name.isEmpty
                        partial.name = name
                        if isNew { continuation.yield(.toolCallStarted(id: partial.id, name: name)) }
                    }
                    partial.arguments += call["function"]?["arguments"]?.stringValue ?? ""
                    calls[index] = partial
                }
            }
            if let reason = choice["finish_reason"]?.stringValue {
                finishReason = reason
            }
        }
        guard sawDone || finishReason != nil else { throw ProviderError.network("The response ended unexpectedly.") }

        var neutral: [ContentBlock] = []
        if !text.isEmpty { neutral.append(.text(text)) }
        var nativeCalls: [JSONValue] = []
        var malformed: [String: String] = [:]
        for index in calls.keys.sorted() {
            var call = calls[index]!
            if call.id.isEmpty { call.id = "call_\(index)_\(UUID().uuidString.prefix(8))" }
            let raw = call.arguments.trimmingCharacters(in: .whitespacesAndNewlines)
            var input: JSONValue = .object(JSONObject())
            if !raw.isEmpty {
                if let parsed = try? JSONParser.parse(raw), parsed.objectValue != nil {
                    input = parsed
                } else {
                    malformed[call.id] = raw
                }
            }
            neutral.append(.toolUse(ToolUseBlock(id: call.id, name: call.name, input: input)))
            nativeCalls.append(["id": .string(call.id), "type": "function", "function": ["name": .string(call.name), "arguments": .string(raw.isEmpty ? "{}" : raw)]])
        }
        var message = JSONObject()
        message["role"] = "assistant"
        message["content"] = text.isEmpty ? .null : .string(text)
        if !nativeCalls.isEmpty { message["tool_calls"] = .array(nativeCalls) }

        let stop: StopReason
        switch finishReason {
        case "length": stop = .maxTokens
        case "content_filter": stop = .refusal(category: "content_filter", explanation: nil)
        default: stop = calls.isEmpty ? .endTurn : .toolUse
        }
        continuation.yield(.completed(ModelResponse(
            blocks: neutral, native: NativeContent(format: .openAIChat, items: [.object(message)]),
            stopReason: stop, servedModel: servedModel, usage: usage, malformedToolInputs: malformed
        )))
    }
}
