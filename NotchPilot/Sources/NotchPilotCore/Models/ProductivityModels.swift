import Foundation

public enum TaskPriority: String, Codable, CaseIterable, Sendable, Comparable {
    case low, medium, high

    private var rank: Int {
        switch self {
        case .low: return 0
        case .medium: return 1
        case .high: return 2
        }
    }

    public static func < (lhs: TaskPriority, rhs: TaskPriority) -> Bool { lhs.rank < rhs.rank }
}

/// Who created or last changed an item, shown in the UI for transparency.
public enum ItemSource: String, Codable, Sendable {
    case user
    case assistant
}

/// An app-owned task. These live only in NotchPilot's local store.
public struct TaskItem: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var notes: String
    public var priority: TaskPriority
    public var dueDate: Date?
    /// False when the due date is a whole day rather than a specific time.
    public var dueHasTime: Bool
    public var tags: [String]
    public var isCompleted: Bool
    public var completedAt: Date?
    public var createdAt: Date
    public var updatedAt: Date
    public var source: ItemSource

    public init(
        id: UUID = UUID(), title: String, notes: String = "", priority: TaskPriority = .medium,
        dueDate: Date? = nil, dueHasTime: Bool = false, tags: [String] = [], isCompleted: Bool = false,
        completedAt: Date? = nil, createdAt: Date, updatedAt: Date? = nil, source: ItemSource = .user
    ) {
        self.id = id
        self.title = title
        self.notes = notes
        self.priority = priority
        self.dueDate = dueDate
        self.dueHasTime = dueHasTime
        self.tags = tags
        self.isCompleted = isCompleted
        self.completedAt = completedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.source = source
    }

    public func isOverdue(at now: Date, calendar: Calendar = .current) -> Bool {
        guard !isCompleted, let dueDate else { return false }
        if dueHasTime { return dueDate < now }
        return calendar.startOfDay(for: dueDate) < calendar.startOfDay(for: now)
    }

    public func isDue(on day: Date, calendar: Calendar = .current) -> Bool {
        guard let dueDate else { return false }
        return calendar.isDate(dueDate, inSameDayAs: day)
    }
}

public struct Note: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var title: String
    public var body: String
    public var pinned: Bool
    public var createdAt: Date
    public var updatedAt: Date
    public var source: ItemSource

    public init(id: UUID = UUID(), title: String, body: String, pinned: Bool = false, createdAt: Date, updatedAt: Date? = nil, source: ItemSource = .user) {
        self.id = id
        self.title = title
        self.body = body
        self.pinned = pinned
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.source = source
    }
}

public enum MemoryCategory: String, Codable, CaseIterable, Sendable {
    case preference
    case fact
    case project
    case goal
    case summary

    public var displayName: String {
        switch self {
        case .preference: return "Preference"
        case .fact: return "Fact"
        case .project: return "Project"
        case .goal: return "Goal"
        case .summary: return "Conversation summary"
        }
    }
}

/// A long-term memory the user approved. Distinct from conversation history:
/// only these items are injected into future requests.
public struct MemoryItem: Codable, Identifiable, Equatable, Sendable {
    public var id: UUID
    public var content: String
    public var category: MemoryCategory
    public var createdAt: Date
    public var updatedAt: Date
    public var source: ItemSource

    public init(id: UUID = UUID(), content: String, category: MemoryCategory, createdAt: Date, updatedAt: Date? = nil, source: ItemSource = .user) {
        self.id = id
        self.content = content
        self.category = category
        self.createdAt = createdAt
        self.updatedAt = updatedAt ?? createdAt
        self.source = source
    }
}

/// A record of one tool invocation by the agent, shown in the Activity view.
public struct ActionRecord: Codable, Identifiable, Equatable, Sendable {
    public enum Status: String, Codable, Sendable {
        case running
        case succeeded
        case failed
        case denied
        case declined
        case cancelled
        case skipped
    }

    public var id: UUID
    public var conversationID: UUID?
    public var runID: UUID
    /// The provider's id for the tool call this record belongs to.
    public var toolUseID: String?
    public var toolName: String
    public var title: String
    public var argumentsPreview: String
    public var status: Status
    public var resultSummary: String
    public var startedAt: Date
    public var finishedAt: Date?
    public var requiredConfirmation: Bool

    public init(
        id: UUID = UUID(), conversationID: UUID?, runID: UUID, toolUseID: String? = nil, toolName: String, title: String,
        argumentsPreview: String, status: Status, resultSummary: String = "", startedAt: Date,
        finishedAt: Date? = nil, requiredConfirmation: Bool = false
    ) {
        self.id = id
        self.conversationID = conversationID
        self.runID = runID
        self.toolUseID = toolUseID
        self.toolName = toolName
        self.title = title
        self.argumentsPreview = argumentsPreview
        self.status = status
        self.resultSummary = resultSummary
        self.startedAt = startedAt
        self.finishedAt = finishedAt
        self.requiredConfirmation = requiredConfirmation
    }
}
