import Foundation
import Observation

/// Bounds that keep every run finite.
public struct AgentLimits: Equatable, Sendable {
    /// Model requests per user message (each tool round is one request).
    public var maxModelCalls: Int
    public var maxToolCalls: Int
    /// Wall time spent working, excluding time waiting for the user to confirm.
    public var maxActiveDuration: TimeInterval
    /// Consecutive tool rounds in which every call failed before the agent must stop and report.
    public var maxConsecutiveFailures: Int
    public var maxToolOutputCharacters: Int
    /// Automatic retries of a model request after transient errors.
    public var maxRetries: Int

    public init(maxModelCalls: Int, maxToolCalls: Int, maxActiveDuration: TimeInterval, maxConsecutiveFailures: Int, maxToolOutputCharacters: Int = 16_000, maxRetries: Int = 2) {
        self.maxModelCalls = maxModelCalls
        self.maxToolCalls = maxToolCalls
        self.maxActiveDuration = maxActiveDuration
        self.maxConsecutiveFailures = maxConsecutiveFailures
        self.maxToolOutputCharacters = maxToolOutputCharacters
        self.maxRetries = maxRetries
    }

    public static func forMode(_ mode: AgentMode) -> AgentLimits {
        switch mode {
        case .cautious, .standard:
            return AgentLimits(maxModelCalls: 10, maxToolCalls: 14, maxActiveDuration: 180, maxConsecutiveFailures: 3)
        case .autonomous:
            return AgentLimits(maxModelCalls: 20, maxToolCalls: 32, maxActiveDuration: 420, maxConsecutiveFailures: 4)
        }
    }
}

public struct AgentStep: Identifiable, Equatable, Sendable {
    public var id: UUID
    public var toolName: String
    public var title: String
    public var status: ActionRecord.Status
    public var resultSummary: String
    public var needsConfirmation: Bool
    public var startedAt: Date
    public var finishedAt: Date?
}

/// Live state of one agent run, observed by the notch UI.
@MainActor
@Observable
public final class AgentRun: Identifiable {
    public enum Phase: Equatable, Sendable {
        case starting
        case waitingForModel
        case streaming
        case runningTool(String)
        case awaitingConfirmation
        case retrying(String)
        case finished
        case failed(String)
        case cancelled
        case stoppedAtLimit(String)

        public var isTerminal: Bool {
            switch self {
            case .finished, .failed, .cancelled, .stoppedAtLimit: return true
            default: return false
            }
        }
    }

    public nonisolated let id = UUID()
    public let conversationID: UUID
    public let mode: AgentMode
    public let startedAt: Date
    public internal(set) var phase: Phase = .starting
    /// Assistant text streaming for the current model call.
    public internal(set) var streamingText = ""
    /// Progress note streaming for the current model call.
    public internal(set) var progressNote = ""
    public internal(set) var steps: [AgentStep] = []
    public internal(set) var plan: [PlanStep] = []
    public internal(set) var modelCalls = 0
    public internal(set) var toolCalls = 0
    public internal(set) var notices: [String] = []
    public internal(set) var usage = TokenUsage()
    public internal(set) var finishedAt: Date?
    /// Set when the run stopped early (limit, failure) to explain what was left undone.
    public internal(set) var incompleteReason: String?

    init(conversationID: UUID, mode: AgentMode, startedAt: Date) {
        self.conversationID = conversationID
        self.mode = mode
        self.startedAt = startedAt
    }

    public var isActive: Bool { !phase.isTerminal }

    public var errorMessage: String? {
        if case .failed(let message) = phase { return message }
        return nil
    }

    public var completedSteps: Int { steps.filter { $0.status == .succeeded }.count }
    public var failedSteps: Int { steps.filter { [.failed, .denied, .declined].contains($0.status) }.count }
}

/// The active conversation; appends are persisted immediately.
@MainActor
@Observable
public final class ConversationSession {
    public private(set) var conversation: Conversation
    @ObservationIgnored private let store: ConversationStore

    public init(conversation: Conversation, store: ConversationStore) {
        self.conversation = conversation
        self.store = store
    }

    public var id: UUID { conversation.id }

    /// Attachments from every user turn, for read_attachment.
    public var attachments: [DocumentAttachment] {
        conversation.turns.flatMap { turn in
            turn.blocks.compactMap { if case .attachment(let a) = $0 { return a } else { return nil } }
        }
    }

    func append(_ turn: ConversationTurn) {
        conversation.turns.append(turn)
        conversation.updatedAt = turn.createdAt
        if conversation.title == "New conversation", turn.role == .user, let text = turn.visibleText.nilIfBlank {
            conversation.title = TextUtilities.preview(text, limit: 48)
        }
        store.save(conversation)
    }

    func upsertAction(_ record: ActionRecord) {
        if let index = conversation.actions.firstIndex(where: { $0.id == record.id }) {
            conversation.actions[index] = record
        } else {
            conversation.actions.append(record)
        }
        store.save(conversation)
    }

    func noteProvider(_ kind: ProviderKind, model: String) {
        conversation.lastProvider = kind
        conversation.lastModel = model
    }

    public func rename(_ title: String) {
        guard let clean = title.nilIfBlank else { return }
        conversation.title = clean
        store.save(conversation)
    }
}
