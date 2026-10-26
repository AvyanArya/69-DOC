import Foundation

/// A tool as advertised to a model provider.
public struct ToolSpec: Sendable, Equatable {
    public let name: String
    public let description: String
    public let inputSchema: JSONValue

    public init(name: String, description: String, inputSchema: JSONValue) {
        self.name = name
        self.description = description
        self.inputSchema = inputSchema
    }
}

public enum ToolChoice: Sendable, Equatable {
    case auto
    /// Tools stay declared (so the request prefix is unchanged) but may not be called.
    case none
}

public struct ModelRequest: Sendable {
    public var model: String
    public var systemPrompt: String
    public var turns: [ConversationTurn]
    public var tools: [ToolSpec]
    public var toolChoice: ToolChoice
    public var maxOutputTokens: Int
    public var effort: ReasoningEffort

    public init(model: String, systemPrompt: String, turns: [ConversationTurn], tools: [ToolSpec], toolChoice: ToolChoice = .auto, maxOutputTokens: Int, effort: ReasoningEffort) {
        self.model = model
        self.systemPrompt = systemPrompt
        self.turns = turns
        self.tools = tools
        self.toolChoice = toolChoice
        self.maxOutputTokens = maxOutputTokens
        self.effort = effort
    }
}

public enum StopReason: Equatable, Sendable {
    case endTurn
    case toolUse
    case maxTokens
    case stopSequence
    /// The provider's safety system declined. `category` is informational.
    case refusal(category: String?, explanation: String?)
    case contextWindowExceeded
    case other(String)
}

public struct TokenUsage: Equatable, Sendable {
    public var inputTokens: Int = 0
    public var outputTokens: Int = 0
    public var cacheReadTokens: Int = 0
    public var cacheWriteTokens: Int = 0

    public init(inputTokens: Int = 0, outputTokens: Int = 0, cacheReadTokens: Int = 0, cacheWriteTokens: Int = 0) {
        self.inputTokens = inputTokens
        self.outputTokens = outputTokens
        self.cacheReadTokens = cacheReadTokens
        self.cacheWriteTokens = cacheWriteTokens
    }
}

public struct ModelResponse: Sendable, Equatable {
    /// Provider-neutral blocks in the order produced (progress, text, tool uses).
    public var blocks: [ContentBlock]
    /// Exact provider content for replay.
    public var native: NativeContent?
    public var stopReason: StopReason
    public var servedModel: String?
    public var usage: TokenUsage
    /// Tool-use ids whose arguments were not valid JSON, mapped to the raw text.
    public var malformedToolInputs: [String: String]

    public init(blocks: [ContentBlock], native: NativeContent?, stopReason: StopReason, servedModel: String?, usage: TokenUsage, malformedToolInputs: [String: String] = [:]) {
        self.blocks = blocks
        self.native = native
        self.stopReason = stopReason
        self.servedModel = servedModel
        self.usage = usage
        self.malformedToolInputs = malformedToolInputs
    }

    public var toolUses: [ToolUseBlock] {
        blocks.compactMap { if case .toolUse(let use) = $0 { return use } else { return nil } }
    }

    public var text: String {
        blocks.compactMap(\.text).joined()
    }
}

public enum ModelStreamEvent: Sendable, Equatable {
    case started(model: String?)
    case textDelta(String)
    /// Text of a progress note the model writes between tool calls.
    case progressDelta(String)
    case toolCallStarted(id: String, name: String)
    /// Something the user should know (e.g. a fallback model answered).
    case notice(String)
    case completed(ModelResponse)
}

public protocol AIProvider: AnyObject, Sendable {
    var kind: ProviderKind { get }
    var model: String { get }
    func stream(_ request: ModelRequest) -> AsyncThrowingStream<ModelStreamEvent, Error>
}

public enum ProviderError: Error, LocalizedError, Equatable {
    case missingAPIKey(ProviderKind)
    case invalidConfiguration(String)
    case authentication(String)
    case permission(String)
    case notFound(String)
    case rateLimited(retryAfter: TimeInterval?, message: String)
    case overloaded(String)
    case server(status: Int, message: String)
    case badRequest(String)
    case network(String)
    case timeout
    case invalidResponse(String)
    case cancelled

    /// Errors worth retrying automatically (before any output was received).
    public var isRetryable: Bool {
        switch self {
        case .rateLimited, .overloaded, .server, .network, .timeout: return true
        default: return false
        }
    }

    public var errorDescription: String? {
        switch self {
        case .missingAPIKey(let kind):
            return "No API key is set for \(kind.displayName). Add one in Settings → AI."
        case .invalidConfiguration(let message):
            return "The AI provider settings are invalid: \(message)"
        case .authentication(let message):
            return "The API key was rejected (\(message)). Check it in Settings → AI."
        case .permission(let message):
            return "The API key does not have permission for this request: \(message)"
        case .notFound(let message):
            return "The provider could not find that model or endpoint: \(message)"
        case let .rateLimited(retryAfter, message):
            if let retryAfter { return "Rate limited by the provider; try again in \(Int(retryAfter.rounded(.up))) s. \(message)" }
            return "Rate limited by the provider. \(message)"
        case .overloaded(let message):
            return "The provider is temporarily overloaded. \(message)"
        case let .server(status, message):
            return "The provider returned an error (\(status)). \(message)"
        case .badRequest(let message):
            return "The provider rejected the request: \(message)"
        case .network(let message):
            return "Network problem: \(message)"
        case .timeout:
            return "The provider stopped responding (timed out)."
        case .invalidResponse(let message):
            return "Received an unexpected response from the provider: \(message)"
        case .cancelled:
            return "Cancelled."
        }
    }
}

/// Everything a provider adapter needs, resolved from settings and the keychain.
public struct ProviderConfiguration: Sendable {
    public var kind: ProviderKind
    public var model: String
    public var baseURL: URL
    public var apiKey: String?
    public var useOptionalFeatures: Bool
    public var refusalFallback: Bool
    public var idleTimeout: TimeInterval

    public init(kind: ProviderKind, model: String, baseURL: URL, apiKey: String?, useOptionalFeatures: Bool = true, refusalFallback: Bool = true, idleTimeout: TimeInterval = 90) {
        self.kind = kind
        self.model = model
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.useOptionalFeatures = useOptionalFeatures
        self.refusalFallback = refusalFallback
        self.idleTimeout = idleTimeout
    }

    /// Builds a configuration, validating the URL and the presence of a key.
    public static func resolve(settings: ProviderSettings, apiKey: String?) throws -> ProviderConfiguration {
        let kind = settings.kind
        let rawURL = settings.baseURL(for: kind)
        guard let url = URL(string: rawURL), let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http", url.host != nil else {
            throw ProviderError.invalidConfiguration("“\(rawURL)” is not a valid http(s) URL.")
        }
        // Keys must never travel over plain HTTP to a remote host.
        if url.scheme?.lowercased() == "http", let host = url.host, !Self.isLocalHost(host), apiKey?.nilIfBlank != nil {
            throw ProviderError.invalidConfiguration("Refusing to send an API key over unencrypted HTTP to \(host). Use https.")
        }
        let key = apiKey?.nilIfBlank
        if kind.requiresAPIKey, key == nil {
            throw ProviderError.missingAPIKey(kind)
        }
        let model = settings.model(for: kind)
        guard !model.isEmpty else { throw ProviderError.invalidConfiguration("No model is selected.") }
        return ProviderConfiguration(
            kind: kind, model: model, baseURL: url, apiKey: key,
            useOptionalFeatures: settings.useOptionalAPIFeatures, refusalFallback: settings.refusalFallback,
            idleTimeout: settings.idleTimeout
        )
    }

    static func isLocalHost(_ host: String) -> Bool {
        let lowered = host.lowercased()
        return lowered == "localhost" || lowered == "127.0.0.1" || lowered == "::1" || lowered.hasSuffix(".local")
    }
}

/// Where API keys live. The macOS app uses the Keychain; tests use memory.
public protocol SecretStore: AnyObject, Sendable {
    func read(account: String) throws -> String?
    func write(_ secret: String, account: String) throws
    func delete(account: String) throws
}

public final class InMemorySecretStore: SecretStore, @unchecked Sendable {
    private let lock = NSLock()
    private var values: [String: String]

    public init(_ values: [String: String] = [:]) { self.values = values }

    public func read(account: String) throws -> String? {
        lock.lock()
        defer { lock.unlock() }
        return values[account]
    }

    public func write(_ secret: String, account: String) throws {
        lock.lock()
        values[account] = secret
        lock.unlock()
    }

    public func delete(account: String) throws {
        lock.lock()
        values[account] = nil
        lock.unlock()
    }
}

public enum ProviderFactory {
    public static func make(_ configuration: ProviderConfiguration, transport: HTTPStreamingTransport = URLSessionStreamingTransport()) -> AIProvider {
        switch configuration.kind {
        case .anthropic: return AnthropicProvider(configuration: configuration, transport: transport)
        case .openAI: return OpenAIResponsesProvider(configuration: configuration, transport: transport)
        case .openAICompatible: return OpenAIChatProvider(configuration: configuration, transport: transport)
        }
    }
}
