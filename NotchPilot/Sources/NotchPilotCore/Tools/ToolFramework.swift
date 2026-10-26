import Foundation

/// How consequential a tool call is. Drives the permission policy.
public enum ToolRisk: Int, Codable, Comparable, Sendable {
    /// Reads data (app-owned or basic system information).
    case read = 0
    /// Changes NotchPilot's own data (tasks, notes, timers, preferences).
    case appWrite = 1
    /// Changes something outside the app (opens apps/links, calendar, clipboard).
    case external = 2
    /// Deletes user data.
    case destructive = 3
    /// Runs automations or hands personal data to another app.
    case sensitive = 4

    public static func < (lhs: ToolRisk, rhs: ToolRisk) -> Bool { lhs.rawValue < rhs.rawValue }

    public var label: String {
        switch self {
        case .read: return "Read"
        case .appWrite: return "Changes NotchPilot data"
        case .external: return "Acts outside NotchPilot"
        case .destructive: return "Deletes data"
        case .sensitive: return "Sensitive action"
        }
    }
}

/// Settings area that can switch a group of tools off.
public enum FeatureArea: String, Sendable, CaseIterable {
    case core, tasks, notes, timer, memory, preferences, conversations
    case calendar, reminders, media, appLaunching, webLinks, shortcuts, systemInfo, clipboard, emailDrafts, documents

    public var displayName: String {
        switch self {
        case .core: return "Core"
        case .tasks: return "Tasks"
        case .notes: return "Notes"
        case .timer: return "Timer"
        case .memory: return "Memory"
        case .preferences: return "Preferences"
        case .conversations: return "Conversation history"
        case .calendar: return "Calendar"
        case .reminders: return "Reminders"
        case .media: return "Music & media"
        case .appLaunching: return "Opening apps"
        case .webLinks: return "Opening links"
        case .shortcuts: return "Shortcuts"
        case .systemInfo: return "System information"
        case .clipboard: return "Clipboard"
        case .emailDrafts: return "Email drafts"
        case .documents: return "Attached documents"
        }
    }

    /// Whether the user's feature toggles allow this area.
    public func isEnabled(in toggles: FeatureToggles) -> Bool {
        switch self {
        case .core, .tasks, .notes, .timer, .preferences, .documents: return true
        case .memory: return toggles.memory
        case .conversations: return toggles.saveConversationHistory
        case .calendar: return toggles.calendar
        case .reminders: return toggles.reminders
        case .media: return toggles.media
        case .appLaunching: return toggles.appLaunching
        case .webLinks: return toggles.webLinks
        case .shortcuts: return toggles.shortcuts
        case .systemInfo: return toggles.systemInfo
        case .clipboard: return toggles.clipboard
        case .emailDrafts: return toggles.emailDrafts
        }
    }
}

public struct ToolDefinition: Sendable {
    public let name: String
    public let description: String
    public let schema: JSONSchema
    public let risk: ToolRisk
    public let feature: FeatureArea
    /// External actions that are easy to undo and private to the user
    /// (open an app, pause music). They run without asking outside Cautious mode.
    public let lowImpact: Bool
    public let timeout: TimeInterval

    public init(name: String, description: String, schema: JSONSchema, risk: ToolRisk, feature: FeatureArea, lowImpact: Bool = false, timeout: TimeInterval = 15) {
        self.name = name
        self.description = description
        self.schema = schema
        self.risk = risk
        self.feature = feature
        self.lowImpact = lowImpact
        self.timeout = timeout
    }

    public var spec: ToolSpec {
        ToolSpec(name: name, description: description, inputSchema: schema.toJSON())
    }
}

/// Validated tool arguments with typed accessors.
public struct ToolArguments: Sendable {
    public let object: JSONObject

    public init(_ object: JSONObject) {
        self.object = object
    }

    private func value(_ key: String) -> JSONValue? {
        guard let value = object[key], !value.isNull else { return nil }
        return value
    }

    public func string(_ key: String) throws -> String {
        guard let text = value(key)?.stringValue else { throw ToolError.invalidArguments("\(key) is required") }
        return text
    }

    public func optionalString(_ key: String) -> String? {
        value(key)?.stringValue
    }

    public func int(_ key: String) -> Int? {
        value(key)?.intValue
    }

    public func double(_ key: String) -> Double? {
        value(key)?.doubleValue
    }

    public func bool(_ key: String) -> Bool? {
        value(key)?.boolValue
    }

    public func strings(_ key: String) -> [String] {
        value(key)?.arrayValue?.compactMap(\.stringValue) ?? []
    }

    public func objects(_ key: String) -> [ToolArguments] {
        value(key)?.arrayValue?.compactMap(\.objectValue).map(ToolArguments.init) ?? []
    }

    public func date(_ key: String) throws -> DateCoding.ParsedDate? {
        guard let raw = optionalString(key) else { return nil }
        guard let parsed = DateCoding.parseFlexible(raw) else {
            throw ToolError.invalidArguments("\(key) must be an ISO 8601 date or date-time")
        }
        return parsed
    }

    public var preview: String {
        TextUtilities.preview(JSONValue.object(object).serialized(), limit: 160)
    }
}

/// What a tool hands back: structured data for the model, a short line for people.
public struct ToolOutput: Sendable {
    public var data: JSONValue
    public var summary: String

    public init(_ data: JSONValue, summary: String) {
        self.data = data
        self.summary = summary
    }
}

/// One allow-listed tool: definition plus handlers.
public struct RegisteredTool {
    public let definition: ToolDefinition
    /// Plain-language description of a specific call ("Create task “Draft essay”, due Tue 15:00").
    public let describe: @MainActor (ToolArguments) -> String
    public let run: @MainActor (ToolArguments, ToolContext) async throws -> ToolOutput

    public init(
        _ definition: ToolDefinition,
        describe: @escaping @MainActor (ToolArguments) -> String,
        run: @escaping @MainActor (ToolArguments, ToolContext) async throws -> ToolOutput
    ) {
        self.definition = definition
        self.describe = describe
        self.run = run
    }
}

/// The explicit allowlist of tools the model may call.
@MainActor
public final class ToolRegistry {
    private var tools: [String: RegisteredTool] = [:]
    private var order: [String] = []

    public init(_ tools: [RegisteredTool] = []) {
        tools.forEach(register)
    }

    public func register(_ tool: RegisteredTool) {
        precondition(tools[tool.definition.name] == nil, "Duplicate tool \(tool.definition.name)")
        tools[tool.definition.name] = tool
        order.append(tool.definition.name)
    }

    public func tool(named name: String) -> RegisteredTool? {
        tools[name]
    }

    public var allTools: [RegisteredTool] {
        order.compactMap { tools[$0] }
    }

    /// Stable, ordered specs so the request prefix (and its cache) never changes.
    public var specs: [ToolSpec] {
        allTools.map(\.definition.spec)
    }
}

/// The services tools operate on.
@MainActor
public final class AgentServices {
    public let tasks: TaskStore
    public let notes: NoteStore
    public let memory: MemoryStore
    public let settings: SettingsStore
    public let conversations: ConversationStore
    public let timer: FocusTimer
    public let activity: ActionLogStore
    public let calendar: CalendarService
    public let media: MediaController
    public let apps: AppLauncher
    public let urls: URLOpener
    public let system: SystemInfoProvider
    public let shortcuts: ShortcutsRunner
    public let clipboard: ClipboardWriter
    public let dateExtractor: DateExtracting
    public let clock: AppClock

    public init(
        tasks: TaskStore, notes: NoteStore, memory: MemoryStore, settings: SettingsStore, conversations: ConversationStore,
        timer: FocusTimer, activity: ActionLogStore, calendar: CalendarService, media: MediaController, apps: AppLauncher,
        urls: URLOpener, system: SystemInfoProvider, shortcuts: ShortcutsRunner, clipboard: ClipboardWriter,
        dateExtractor: DateExtracting, clock: AppClock
    ) {
        self.tasks = tasks
        self.notes = notes
        self.memory = memory
        self.settings = settings
        self.conversations = conversations
        self.timer = timer
        self.activity = activity
        self.calendar = calendar
        self.media = media
        self.apps = apps
        self.urls = urls
        self.system = system
        self.shortcuts = shortcuts
        self.clipboard = clipboard
        self.dateExtractor = dateExtractor
        self.clock = clock
    }

    /// Wires portable stores with the "unavailable" platform services.
    public static func portable(fileStore: FileStore, clock: AppClock = SystemClock(), timerScheduler: TimerScheduling = TaskTimerScheduler()) -> AgentServices {
        let settings = SettingsStore(fileStore: fileStore)
        let launcher = UnavailableAppLauncher()
        return AgentServices(
            tasks: TaskStore(fileStore: fileStore, clock: clock),
            notes: NoteStore(fileStore: fileStore, clock: clock),
            memory: MemoryStore(fileStore: fileStore, clock: clock),
            settings: settings,
            conversations: ConversationStore(fileStore: fileStore, persistenceEnabled: settings.settings.features.saveConversationHistory),
            timer: FocusTimer(clock: clock, scheduler: timerScheduler, fileStore: fileStore),
            activity: ActionLogStore(fileStore: fileStore),
            calendar: UnavailableCalendarService(), media: UnavailableMediaController(), apps: launcher, urls: launcher,
            system: BasicSystemInfoProvider(), shortcuts: launcher, clipboard: launcher,
            dateExtractor: RuleBasedDateExtractor(), clock: clock
        )
    }
}

/// Per-call context handed to tool handlers.
@MainActor
public final class ToolContext {
    public let services: AgentServices
    public let conversationID: UUID?
    public let attachments: [DocumentAttachment]
    /// Updates the visible plan for the current run.
    public let updatePlan: ([PlanStep]) -> Void

    public init(services: AgentServices, conversationID: UUID?, attachments: [DocumentAttachment], updatePlan: @escaping ([PlanStep]) -> Void) {
        self.services = services
        self.conversationID = conversationID
        self.attachments = attachments
        self.updatePlan = updatePlan
    }

    public var now: Date { services.clock.now() }
}

public struct PlanStep: Codable, Equatable, Sendable, Identifiable {
    public enum Status: String, Codable, Sendable, CaseIterable {
        case pending
        case inProgress = "in_progress"
        case done
        case skipped
        case failed
    }

    public var id: Int
    public var title: String
    public var status: Status

    public init(id: Int, title: String, status: Status) {
        self.id = id
        self.title = title
        self.status = status
    }
}
