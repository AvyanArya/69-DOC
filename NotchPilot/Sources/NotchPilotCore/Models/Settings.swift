import Foundation

// MARK: - AI provider

public enum ProviderKind: String, Codable, CaseIterable, Sendable, Identifiable {
    /// Anthropic Messages API (Claude).
    case anthropic
    /// OpenAI Responses API.
    case openAI
    /// Any server implementing OpenAI's Chat Completions API with tool calling
    /// (Ollama, LM Studio, OpenRouter, vLLM, …).
    case openAICompatible

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .anthropic: return "Anthropic (Claude)"
        case .openAI: return "OpenAI"
        case .openAICompatible: return "OpenAI-compatible server"
        }
    }

    public var defaultModel: String {
        switch self {
        case .anthropic: return "claude-opus-5-5"
        case .openAI: return "gpt-6.1-sol"
        case .openAICompatible: return "llama3.1"
        }
    }

    public var defaultBaseURL: String {
        switch self {
        case .anthropic: return "https://api.anthropic.com"
        case .openAI: return "https://api.openai.com/v1"
        case .openAICompatible: return "http://localhost:11434/v1"
        }
    }

    /// Model IDs offered as suggestions in Settings; any ID can be typed.
    public var suggestedModels: [String] {
        switch self {
        case .anthropic: return ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"]
        case .openAI: return ["gpt-6.1-sol", "gpt-6-astra", "gpt-6-sol", "gpt-6-luna"]
        case .openAICompatible: return ["llama3.1", "qwen2.5", "mistral-nemo"]
        }
    }

    /// Whether an API key is mandatory. Local OpenAI-compatible servers often need none.
    public var requiresAPIKey: Bool { self != .openAICompatible }

    /// Keychain account used to store this provider's key.
    public var keychainAccount: String { "api-key.\(rawValue)" }
}

public enum ReasoningEffort: String, Codable, CaseIterable, Sendable {
    case low, medium, high

    public var displayName: String { rawValue.capitalized }
}

public struct ProviderSettings: Codable, Equatable, Sendable {
    public var kind: ProviderKind = .anthropic
    /// Model per provider, so switching providers keeps each choice.
    public var models: [String: String] = [:]
    /// Base URL overrides per provider (empty = provider default).
    public var baseURLs: [String: String] = [:]
    public var effort: ReasoningEffort = .medium
    public var maxOutputTokens: Int = 32_000
    /// Send newer optional API features (progress updates, refusal fallback,
    /// tolerant thinking replay). The app retries without them automatically if
    /// an endpoint rejects them.
    public var useOptionalAPIFeatures: Bool = true
    /// Anthropic: ask the API to retry policy refusals on a fallback model.
    public var refusalFallback: Bool = true
    /// Seconds without any data before a streaming request is abandoned.
    public var idleTimeout: Double = 90

    public init() {}

    public func model(for kind: ProviderKind) -> String {
        models[kind.rawValue]?.nilIfBlank ?? kind.defaultModel
    }

    public mutating func setModel(_ model: String, for kind: ProviderKind) {
        models[kind.rawValue] = model.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public func baseURL(for kind: ProviderKind) -> String {
        baseURLs[kind.rawValue]?.nilIfBlank ?? kind.defaultBaseURL
    }

    public mutating func setBaseURL(_ url: String, for kind: ProviderKind) {
        baseURLs[kind.rawValue] = url.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    public var currentModel: String { model(for: kind) }
}

// MARK: - Agent

public enum AgentMode: String, Codable, CaseIterable, Sendable {
    /// Every action that changes anything asks first.
    case cautious
    /// Reads and app-owned changes run directly; anything outside the app asks.
    case standard
    /// Multi-step tasks with a larger budget; low-impact actions run without
    /// asking. Consequential actions still always ask.
    case autonomous

    public var displayName: String {
        switch self {
        case .cautious: return "Ask before every change"
        case .standard: return "Standard"
        case .autonomous: return "Autonomous"
        }
    }

    public var explanation: String {
        switch self {
        case .cautious:
            return "Reading is automatic. Every change — tasks, timers, apps, anything — asks for approval first."
        case .standard:
            return "Tasks, notes, timers, opening apps and media controls run directly. Calendar changes, links, Shortcuts, email drafts and deletions ask first."
        case .autonomous:
            return "For multi-step requests: a larger step and time budget with a live plan. Approval rules are the same as Standard — consequential actions always ask."
        }
    }
}

public struct AgentSettings: Codable, Equatable, Sendable {
    public var mode: AgentMode = .standard
    /// Saving long-term memories requires approval unless turned off.
    public var askBeforeSavingMemory: Bool = true
    public var allowCalendarWritesWithoutAsking: Bool = false
    public var allowOpeningLinksWithoutAsking: Bool = false
    /// Seconds a confirmation card waits before it is treated as declined.
    public var confirmationTimeout: Double = 300

    public init() {}
}

// MARK: - Features & privacy

public struct FeatureToggles: Codable, Equatable, Sendable {
    public var calendar: Bool = true
    public var reminders: Bool = true
    public var media: Bool = true
    public var appLaunching: Bool = true
    public var webLinks: Bool = true
    public var shortcuts: Bool = false
    public var systemInfo: Bool = true
    public var clipboard: Bool = true
    public var emailDrafts: Bool = true
    /// Inject approved memories into requests.
    public var memory: Bool = true
    /// Persist conversations to disk. When off, conversations exist only until quit.
    public var saveConversationHistory: Bool = true
    /// Delete conversations older than this many days (0 = keep).
    public var conversationRetentionDays: Int = 0

    public init() {}
}

public struct ProactiveSettings: Codable, Equatable, Sendable {
    public var morningBriefing: Bool = false
    public var morningBriefingTime: String = "08:30"
    public var deadlineReminders: Bool = true
    public var deadlineLeadMinutes: Int = 60
    public var focusSessionNotifications: Bool = true
    public var autoStartBreaks: Bool = false
    public var eventPreparation: Bool = false
    public var eventLeadMinutes: Int = 10
    public var endOfDaySummary: Bool = false
    public var endOfDayTime: String = "18:00"

    public init() {}
}

public enum PanelTheme: String, Codable, CaseIterable, Sendable {
    /// Black and charcoal, blending with the hardware notch.
    case dark
    /// Follows the system appearance for the expanded panel.
    case system
}

public enum MotionPreference: String, Codable, CaseIterable, Sendable {
    case system
    case reduced
    case full
}

public enum DisplayPreference: String, Codable, CaseIterable, Sendable {
    /// Prefer the display with a camera housing (built-in MacBook display).
    case notchedDisplay
    /// Always the main display.
    case mainDisplay
}

public struct AppearanceSettings: Codable, Equatable, Sendable {
    public var theme: PanelTheme = .dark
    public var motion: MotionPreference = .system
    public var hoverToExpand: Bool = true
    public var expandedWidth: Double = 640
    public var expandedHeight: Double = 420
    public var showOnDisplaysWithoutNotch: Bool = true
    public var display: DisplayPreference = .notchedDisplay
    public var showLiveActivities: Bool = true
    public var hapticFeedback: Bool = true

    public init() {}
}

public struct HotKeySetting: Codable, Equatable, Sendable {
    /// Carbon virtual key code.
    public var keyCode: UInt32
    /// Carbon modifier mask (cmdKey, optionKey, controlKey, shiftKey).
    public var modifiers: UInt32
    public var display: String

    public init(keyCode: UInt32, modifiers: UInt32, display: String) {
        self.keyCode = keyCode
        self.modifiers = modifiers
        self.display = display
    }

    /// ⇧⌘Space — kVK_Space = 49, cmdKey = 0x100, shiftKey = 0x200.
    public static let defaultToggle = HotKeySetting(keyCode: 49, modifiers: 0x100 | 0x200, display: "⇧⌘Space")
}

public struct AppSettings: Codable, Equatable, Sendable {
    public var provider = ProviderSettings()
    public var agent = AgentSettings()
    public var features = FeatureToggles()
    public var proactive = ProactiveSettings()
    public var appearance = AppearanceSettings()
    public var toggleHotKeyEnabled = true
    public var toggleHotKey: HotKeySetting = .defaultToggle
    public var launchAtLogin = false
    public var onboardingCompleted = false

    public init() {}
}

// MARK: - Assistant-visible preferences

public enum AnswerLength: String, Codable, CaseIterable, Sendable {
    case short, balanced, detailed
}

public enum AnswerTone: String, Codable, CaseIterable, Sendable {
    case friendly, direct, professional
}

/// Preferences the assistant reads on every request and may update via tools.
public struct UserPreferences: Codable, Equatable, Sendable {
    public var preferredName: String = ""
    public var answerLength: AnswerLength = .balanced
    public var tone: AnswerTone = .friendly
    public var customInstructions: String = ""
    public var favoriteApps: [String] = []
    public var defaultFocusMinutes: Int = 25
    public var defaultBreakMinutes: Int = 5
    public var workdayStart: String = "09:00"
    public var workdayEnd: String = "18:00"

    public init() {}
}

// MARK: - Forward-compatible decoding

public enum DefaultsMerging {
    /// Decodes `T` from `data`, filling any keys missing from older files with
    /// the values in `defaults`. Unknown keys are ignored.
    public static func decode<T: Codable>(_ type: T.Type, from data: Data, defaults: T) throws -> T {
        let stored = try JSONParser.parse(data)
        let base = try JSONValue.encode(defaults)
        let merged = merge(base: base, overlay: stored)
        return try StorageCoding.makeDecoder().decode(T.self, from: merged.serializedData())
    }

    static func merge(base: JSONValue, overlay: JSONValue) -> JSONValue {
        guard case .object(let baseObject) = base, case .object(let overlayObject) = overlay else {
            return overlay
        }
        var result = baseObject
        for (key, value) in overlayObject {
            if let existing = result[key] {
                result[key] = merge(base: existing, overlay: value)
            } else {
                result[key] = value
            }
        }
        return .object(result)
    }
}
