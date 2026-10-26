import Foundation

/// Which optional request features a Claude model accepts.
struct AnthropicModelCapabilities: Equatable {
    /// Send `thinking: {type: "adaptive", …}` explicitly.
    var sendAdaptiveThinking = false
    /// Supports `display: "updates"` (progress notes between tool calls).
    var progressUpdates = false
    /// Supports `thinking.block_binding` (tolerant replay of thinking blocks).
    var blockBinding = false
    /// Supports `output_config.effort`.
    var effort = false
    /// Supports server-side `fallbacks: "default"` for refusals.
    var refusalFallback = false

    static func forModel(_ model: String) -> AnthropicModelCapabilities {
        let id = model.lowercased()
        func has(_ prefixes: [String]) -> Bool { prefixes.contains { id.hasPrefix($0) } }

        if has(["claude-fable-5", "claude-mythos-5", "claude-opus-5-5", "claude-sonnet-5-5"]) {
            return AnthropicModelCapabilities(
                sendAdaptiveThinking: true, progressUpdates: true, blockBinding: true, effort: true,
                refusalFallback: has(["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5"])
            )
        }
        if has(["claude-opus-5", "claude-sonnet-5", "claude-haiku-5"]) {
            // Thinking is on by default for these; omit the parameter.
            return AnthropicModelCapabilities(effort: true, refusalFallback: id.hasPrefix("claude-opus-5"))
        }
        if has(["claude-opus-4-6", "claude-opus-4-7", "claude-opus-4-8", "claude-sonnet-4-6"]) {
            return AnthropicModelCapabilities(sendAdaptiveThinking: true, effort: true)
        }
        if has(["claude-opus-4-5"]) {
            return AnthropicModelCapabilities(effort: true)
        }
        return AnthropicModelCapabilities()
    }
}

/// Claude via the Anthropic Messages API (raw HTTP + SSE; Swift has no official SDK).
public final class AnthropicProvider: AIProvider, @unchecked Sendable {
    public let kind: ProviderKind = .anthropic
    public var model: String { configuration.model }

    static let apiVersion = "2026-10-21"
    static let betaProgressUpdates = "thinking-display-updates-2026-08-18"
    static let betaBlockBinding = "thinking-binding-controls-2026-08-01"
    static let betaFallbackDefault = "server-side-fallback-2026-07-01"

    private let configuration: ProviderConfiguration
    private let transport: HTTPStreamingTransport
    private let lock = NSLock()
    /// Set after the endpoint rejects an optional feature; later requests omit them.
    private var compatibilityMode = false

    public init(configuration: ProviderConfiguration, transport: HTTPStreamingTransport) {
        self.configuration = configuration
        self.transport = transport
    }

    var isFirstParty: Bool {
        configuration.baseURL.host?.lowercased() == "api.anthropic.com"
    }

    private var inCompatibilityMode: Bool {
        lock.lock()
        defer { lock.unlock() }
        return compatibilityMode
    }

    private func enterCompatibilityMode() {
        lock.lock()
        compatibilityMode = true
        lock.unlock()
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
        var compat = inCompatibilityMode || !configuration.useOptionalFeatures
        while true {
            let (spec, usedOptional) = try buildRequest(request, compatibility: compat)
            let response = try await transport.open(spec)
            guard (200..<300).contains(response.status) else {
                let body = try await response.collectBody()
                let error = ProviderHTTP.error(status: response.status, headers: response.headers, body: body)
                if case .badRequest(let message) = error, usedOptional, !compat, Self.looksLikeFeatureRejection(message) {
                    AppLog.info("Anthropic endpoint rejected an optional feature; retrying in compatibility mode", category: .provider)
                    enterCompatibilityMode()
                    compat = true
                    continue
                }
                throw error
            }
            try await consume(response, request: request, continuation: continuation)
            return
        }
    }

    static func looksLikeFeatureRejection(_ message: String) -> Bool {
        let lowered = message.lowercased()
        let markers = [
            "beta", "anthropic-beta", "thinking", "display", "block_binding", "fallbacks", "eager_input_streaming",
            "cache_control", "output_config", "effort", "extra inputs", "not supported", "unknown", "unrecognized",
        ]
        return markers.contains { lowered.contains($0) }
    }

    // MARK: Request

    func buildRequest(_ request: ModelRequest, compatibility: Bool) throws -> (HTTPRequestSpec, Bool) {
        guard let apiKey = configuration.apiKey else { throw ProviderError.missingAPIKey(.anthropic) }
        let caps = AnthropicModelCapabilities.forModel(request.model)
        let firstParty = isFirstParty
        var betas: [String] = []
        var usedOptional = false

        var body = JSONObject()
        body["model"] = .string(request.model)
        body["max_tokens"] = .int(request.maxOutputTokens)
        body["stream"] = true
        body["system"] = .array([["type": "text", "text": .string(request.systemPrompt)]])
        body["messages"] = .array(Self.messages(from: request.turns))

        if !request.tools.isEmpty {
            body["tools"] = .array(request.tools.map { tool in
                var object = JSONObject()
                object["name"] = .string(tool.name)
                object["description"] = .string(tool.description)
                object["input_schema"] = tool.inputSchema
                if firstParty, !compatibility {
                    // Inputs stream as generated; NotchPilot validates every input itself.
                    object["eager_input_streaming"] = true
                    usedOptional = true
                }
                return .object(object)
            })
            if request.toolChoice == .none {
                body["tool_choice"] = ["type": "none"]
            }
        }

        if caps.sendAdaptiveThinking {
            var thinking = JSONObject()
            thinking["type"] = "adaptive"
            if !compatibility, caps.progressUpdates {
                thinking["display"] = "updates"
                betas.append(Self.betaProgressUpdates)
                usedOptional = true
            }
            if !compatibility, caps.blockBinding {
                // Degrade instead of failing if a replayed thinking block no longer matches.
                thinking["block_binding"] = ["prefix_mismatch_behavior": "drop_block"]
                betas.append(Self.betaBlockBinding)
                usedOptional = true
            }
            body["thinking"] = .object(thinking)
        }
        if caps.effort {
            body["output_config"] = ["effort": .string(request.effort.rawValue)]
        }
        if firstParty, !compatibility, caps.refusalFallback, configuration.refusalFallback {
            body["fallbacks"] = "default"
            betas.append(Self.betaFallbackDefault)
            usedOptional = true
        }
        if firstParty, !compatibility {
            // Automatic prompt caching of the stable prefix (system, tools, history).
            body["cache_control"] = ["type": "ephemeral"]
            usedOptional = true
        }

        var headers = [
            "content-type": "application/json",
            "accept": "text/event-stream",
            "x-api-key": apiKey,
            "anthropic-version": Self.apiVersion,
        ]
        if !betas.isEmpty {
            headers["anthropic-beta"] = betas.joined(separator: ",")
        }
        let spec = HTTPRequestSpec(
            url: ProviderHTTP.endpoint(configuration.baseURL, appending: "/v1/messages"),
            headers: headers, body: JSONValue.object(body).serializedData(), idleTimeout: configuration.idleTimeout
        )
        return (spec, usedOptional)
    }

    /// Converts history to Messages API format. Assistant turns produced by this
    /// API are replayed verbatim (thinking blocks included); others are converted.
    static func messages(from turns: [ConversationTurn]) -> [JSONValue] {
        var messages: [JSONValue] = []
        for turn in turns {
            var content: [JSONValue] = []
            switch turn.role {
            case .user:
                for block in turn.blocks {
                    switch block {
                    case .text(let text):
                        if !text.isEmpty { content.append(["type": "text", "text": .string(text)]) }
                    case .context(let text):
                        content.append(["type": "text", "text": .string(text)])
                    case .attachment(let attachment):
                        content.append(["type": "text", "text": .string(PromptFormatting.attachmentText(attachment))])
                    case .toolResult(let result):
                        var object = JSONObject()
                        object["type"] = "tool_result"
                        object["tool_use_id"] = .string(sanitizeToolID(result.toolUseID))
                        object["content"] = .string(result.content)
                        if result.isError { object["is_error"] = true }
                        content.append(.object(object))
                    case .toolUse, .progress:
                        break
                    }
                }
            case .assistant:
                if let native = turn.native, native.format == .anthropicMessages {
                    content = native.items
                } else {
                    for block in turn.blocks {
                        switch block {
                        case .text(let text) where !text.isEmpty:
                            content.append(["type": "text", "text": .string(text)])
                        case .toolUse(let use):
                            content.append([
                                "type": "tool_use", "id": .string(sanitizeToolID(use.id)), "name": .string(use.name),
                                "input": use.input.objectValue != nil ? use.input : .object(JSONObject()),
                            ])
                        default:
                            break
                        }
                    }
                }
            }
            guard !content.isEmpty else { continue }
            messages.append(["role": .string(turn.role.rawValue), "content": .array(content)])
        }
        return messages
    }

    static func sanitizeToolID(_ id: String) -> String {
        let allowed = id.unicodeScalars.map { scalar -> Character in
            CharacterSet.alphanumerics.contains(scalar) || scalar == "_" || scalar == "-" ? Character(scalar) : "_"
        }
        let result = String(allowed)
        return result.isEmpty ? "tool" : result
    }

    // MARK: Response

    private struct BlockState {
        var object: JSONObject
        var partialJSON = ""
    }

    private func consume(_ response: HTTPStreamResponse, request: ModelRequest, continuation: AsyncThrowingStream<ModelStreamEvent, Error>.Continuation) async throws {
        var blocks: [Int: BlockState] = [:]
        var order: [Int] = []
        var stopReason: StopReason?
        var servedModel: String?
        var usage = TokenUsage()
        var malformed: [String: String] = [:]
        /// Index of the latest `fallback` block: model-internal blocks before it are not echoed back.
        var fallbackBoundary: Int?
        var sawMessageStop = false

        for try await event in response.events() {
            try Task.checkCancellation()
            let json = try ProviderHTTP.parseJSON(event.data)
            let type = json["type"]?.stringValue ?? event.event ?? ""
            switch type {
            case "message_start":
                servedModel = json["message"]?["model"]?.stringValue
                if let input = json["message"]?["usage"]?["input_tokens"]?.intValue { usage.inputTokens = input }
                usage.cacheReadTokens = json["message"]?["usage"]?["cache_read_input_tokens"]?.intValue ?? 0
                usage.cacheWriteTokens = json["message"]?["usage"]?["cache_creation_input_tokens"]?.intValue ?? 0
                continuation.yield(.started(model: servedModel))
            case "content_block_start":
                guard let index = json["index"]?.intValue, let block = json["content_block"]?.objectValue else { continue }
                blocks[index] = BlockState(object: block)
                order.append(index)
                switch block["type"]?.stringValue {
                case "tool_use":
                    continuation.yield(.toolCallStarted(id: block["id"]?.stringValue ?? "", name: block["name"]?.stringValue ?? ""))
                case "fallback":
                    fallbackBoundary = index
                    let from = block["from"]?["model"]?.stringValue ?? "the requested model"
                    let to = block["to"]?["model"]?.stringValue ?? "a fallback model"
                    continuation.yield(.notice("\(from) declined part of this request; \(to) continued."))
                case "text":
                    if let text = block["text"]?.stringValue, !text.isEmpty { continuation.yield(.textDelta(text)) }
                default:
                    break
                }
            case "content_block_delta":
                guard let index = json["index"]?.intValue, var state = blocks[index], let delta = json["delta"] else { continue }
                switch delta["type"]?.stringValue {
                case "text_delta":
                    let text = delta["text"]?.stringValue ?? ""
                    state.object["text"] = .string((state.object["text"]?.stringValue ?? "") + text)
                    continuation.yield(.textDelta(text))
                case "thinking_delta":
                    let text = delta["thinking"]?.stringValue ?? ""
                    state.object["thinking"] = .string((state.object["thinking"]?.stringValue ?? "") + text)
                    if !text.isEmpty { continuation.yield(.progressDelta(text)) }
                case "signature_delta":
                    let signature = delta["signature"]?.stringValue ?? ""
                    state.object["signature"] = .string((state.object["signature"]?.stringValue ?? "") + signature)
                case "input_json_delta":
                    state.partialJSON += delta["partial_json"]?.stringValue ?? ""
                case "citations_delta":
                    if let citation = delta["citation"] {
                        var citations = state.object["citations"]?.arrayValue ?? []
                        citations.append(citation)
                        state.object["citations"] = .array(citations)
                    }
                default:
                    break
                }
                blocks[index] = state
            case "content_block_stop":
                guard let index = json["index"]?.intValue, var state = blocks[index] else { continue }
                if state.object["type"]?.stringValue == "tool_use" {
                    let raw = state.partialJSON.trimmingCharacters(in: .whitespacesAndNewlines)
                    if raw.isEmpty {
                        if state.object["input"] == nil { state.object["input"] = .object(JSONObject()) }
                    } else if let parsed = try? JSONParser.parse(raw), parsed.objectValue != nil {
                        state.object["input"] = parsed
                    } else {
                        malformed[state.object["id"]?.stringValue ?? ""] = raw
                        state.object["input"] = .object(JSONObject())
                    }
                }
                blocks[index] = state
            case "message_delta":
                if let reason = json["delta"]?["stop_reason"]?.stringValue {
                    let details = json["delta"]?["stop_details"] ?? json["stop_details"]
                    stopReason = Self.stopReason(reason, details: details)
                }
                if let output = json["usage"]?["output_tokens"]?.intValue { usage.outputTokens = output }
            case "message_stop":
                sawMessageStop = true
            case "ping":
                break
            case "error":
                let errorType = json["error"]?["type"]?.stringValue ?? ""
                let message = Redactor.redact(json["error"]?["message"]?.stringValue ?? "Stream error")
                switch errorType {
                case "overloaded_error": throw ProviderError.overloaded(message)
                case "rate_limit_error": throw ProviderError.rateLimited(retryAfter: nil, message: message)
                case "authentication_error": throw ProviderError.authentication(message)
                case "invalid_request_error": throw ProviderError.badRequest(message)
                default: throw ProviderError.server(status: 500, message: message)
                }
            default:
                break
            }
        }

        guard sawMessageStop || stopReason != nil else {
            throw ProviderError.network("The response ended unexpectedly.")
        }

        var native: [JSONValue] = []
        var neutral: [ContentBlock] = []
        for index in order {
            guard let state = blocks[index] else { continue }
            let object = state.object
            let type = object["type"]?.stringValue ?? ""
            if type == "fallback" { continue }
            if let boundary = fallbackBoundary, index < boundary,
               ["thinking", "redacted_thinking", "tool_use", "server_tool_use"].contains(type) {
                // Echo rule after a mid-output fallback: drop model-internal blocks before the switch.
                continue
            }
            native.append(.object(object))
            switch type {
            case "text":
                if let text = object["text"]?.stringValue, !text.isEmpty { neutral.append(.text(text)) }
            case "thinking":
                if let text = object["thinking"]?.stringValue?.nilIfBlank { neutral.append(.progress(text)) }
            case "tool_use":
                neutral.append(.toolUse(ToolUseBlock(
                    id: object["id"]?.stringValue ?? "", name: object["name"]?.stringValue ?? "",
                    input: object["input"] ?? .object(JSONObject())
                )))
            default:
                break
            }
        }

        continuation.yield(.completed(ModelResponse(
            blocks: neutral, native: NativeContent(format: .anthropicMessages, items: native),
            stopReason: stopReason ?? .endTurn, servedModel: servedModel, usage: usage, malformedToolInputs: malformed
        )))
    }

    static func stopReason(_ raw: String, details: JSONValue?) -> StopReason {
        switch raw {
        case "end_turn": return .endTurn
        case "tool_use": return .toolUse
        case "max_tokens": return .maxTokens
        case "stop_sequence": return .stopSequence
        case "refusal": return .refusal(category: details?["category"]?.stringValue, explanation: details?["explanation"]?.stringValue)
        case "model_context_window_exceeded": return .contextWindowExceeded
        default: return .other(raw)
        }
    }
}
