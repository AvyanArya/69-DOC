import Foundation

/// Errors tools report back to the model (and the user) verbatim.
public enum ToolError: Error, LocalizedError, Equatable {
    case unsupported(String)
    case notAuthorized(String)
    case invalidArguments(String)
    case timeout(String)
    case failed(String)

    public var errorDescription: String? {
        switch self {
        case .unsupported(let message): return "Not supported: \(message)"
        case .notAuthorized(let message): return "Permission needed: \(message)"
        case .invalidArguments(let message): return "Invalid arguments: \(message)"
        case .timeout(let message): return "Timed out: \(message)"
        case .failed(let message): return message
        }
    }
}

public enum AuthorizationState: String, Sendable, Codable {
    case notDetermined
    case authorized
    /// Calendar write-only access: events can be created but not read.
    case writeOnly
    case denied
    case restricted
    /// The integration does not exist on this platform/build.
    case unavailable

    public var displayName: String {
        switch self {
        case .notDetermined: return "Not requested"
        case .authorized: return "Allowed"
        case .writeOnly: return "Add-only"
        case .denied: return "Denied"
        case .restricted: return "Restricted"
        case .unavailable: return "Unavailable"
        }
    }
}

// MARK: - Calendar & reminders

public struct CalendarEventInfo: Sendable, Equatable {
    public var id: String
    public var title: String
    public var start: Date
    public var end: Date
    public var isAllDay: Bool
    public var location: String?
    public var calendarName: String
    public var notes: String?

    public init(id: String, title: String, start: Date, end: Date, isAllDay: Bool = false, location: String? = nil, calendarName: String = "", notes: String? = nil) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.isAllDay = isAllDay
        self.location = location
        self.calendarName = calendarName
        self.notes = notes
    }
}

public struct ReminderInfo: Sendable, Equatable {
    public var id: String
    public var title: String
    public var due: Date?
    public var listName: String

    public init(id: String, title: String, due: Date?, listName: String) {
        self.id = id
        self.title = title
        self.due = due
        self.listName = listName
    }
}

@MainActor
public protocol CalendarService: AnyObject {
    func eventsAuthorization() -> AuthorizationState
    func remindersAuthorization() -> AuthorizationState
    /// Shows the system permission prompt if not yet decided.
    func requestEventsAccess() async -> AuthorizationState
    func requestRemindersAccess() async -> AuthorizationState
    func events(from start: Date, to end: Date) async throws -> [CalendarEventInfo]
    func createEvent(title: String, start: Date, end: Date, notes: String?, location: String?) async throws -> CalendarEventInfo
    func createReminder(title: String, due: DateCoding.ParsedDate?, notes: String?) async throws -> ReminderInfo
}

// MARK: - Media

public struct NowPlayingInfo: Sendable, Equatable {
    public var player: String
    public var title: String
    public var artist: String
    public var album: String
    public var isPlaying: Bool
    public var duration: TimeInterval?
    public var position: TimeInterval?
    /// Artwork bytes for display only; never sent to the model.
    public var artwork: Data?

    public init(player: String, title: String, artist: String, album: String, isPlaying: Bool, duration: TimeInterval? = nil, position: TimeInterval? = nil, artwork: Data? = nil) {
        self.player = player
        self.title = title
        self.artist = artist
        self.album = album
        self.isPlaying = isPlaying
        self.duration = duration
        self.position = position
        self.artwork = artwork
    }
}

public enum MediaAction: String, Sendable, CaseIterable {
    case play, pause, toggle, next, previous
}

@MainActor
public protocol MediaController: AnyObject {
    var nowPlaying: NowPlayingInfo? { get }
    /// Players this build can control (e.g. Music, Spotify).
    var supportedPlayers: [String] { get }
    func refresh() async -> NowPlayingInfo?
    func perform(_ action: MediaAction, player: String?) async throws -> NowPlayingInfo?
}

// MARK: - Mac actions

@MainActor
public protocol AppLauncher: AnyObject {
    /// Opens an installed application by name; returns the resolved app name.
    func openApplication(named name: String) async throws -> String
    func installedApplications(matching query: String?) -> [String]
}

@MainActor
public protocol URLOpener: AnyObject {
    func open(_ url: URL) async throws
}

public struct SystemSnapshot: Sendable, Equatable {
    public var operatingSystem: String
    public var hardwareModel: String?
    public var processorCount: Int
    public var physicalMemoryBytes: UInt64
    public var memoryUsedBytes: UInt64?
    public var memoryPressure: String?
    public var uptimeSeconds: TimeInterval
    public var thermalState: String
    public var diskFreeBytes: Int64?
    public var diskTotalBytes: Int64?

    public init(operatingSystem: String, hardwareModel: String?, processorCount: Int, physicalMemoryBytes: UInt64, memoryUsedBytes: UInt64?, memoryPressure: String?, uptimeSeconds: TimeInterval, thermalState: String, diskFreeBytes: Int64?, diskTotalBytes: Int64?) {
        self.operatingSystem = operatingSystem
        self.hardwareModel = hardwareModel
        self.processorCount = processorCount
        self.physicalMemoryBytes = physicalMemoryBytes
        self.memoryUsedBytes = memoryUsedBytes
        self.memoryPressure = memoryPressure
        self.uptimeSeconds = uptimeSeconds
        self.thermalState = thermalState
        self.diskFreeBytes = diskFreeBytes
        self.diskTotalBytes = diskTotalBytes
    }
}

public struct ProcessMemoryInfo: Sendable, Equatable {
    public var pid: Int32
    public var name: String
    public var memoryBytes: UInt64

    public init(pid: Int32, name: String, memoryBytes: UInt64) {
        self.pid = pid
        self.name = name
        self.memoryBytes = memoryBytes
    }
}

public struct BatteryInfo: Sendable, Equatable {
    public var percentage: Int
    public var isCharging: Bool
    public var isPluggedIn: Bool
    public var minutesRemaining: Int?
    public var condition: String?

    public init(percentage: Int, isCharging: Bool, isPluggedIn: Bool, minutesRemaining: Int?, condition: String? = nil) {
        self.percentage = percentage
        self.isCharging = isCharging
        self.isPluggedIn = isPluggedIn
        self.minutesRemaining = minutesRemaining
        self.condition = condition
    }
}

@MainActor
public protocol SystemInfoProvider: AnyObject {
    func snapshot() -> SystemSnapshot
    /// Processes owned by the current user, largest memory footprint first.
    func topMemoryProcesses(limit: Int) throws -> [ProcessMemoryInfo]
    /// nil on Macs without a battery.
    func battery() -> BatteryInfo?
}

@MainActor
public protocol ShortcutsRunner: AnyObject {
    func listShortcuts() async throws -> [String]
    func runShortcut(named name: String, input: String?) async throws -> String
}

@MainActor
public protocol ClipboardWriter: AnyObject {
    func write(_ text: String) throws
}

public struct ExtractedDate: Sendable, Equatable {
    public var matchedText: String
    public var date: Date
    public var hasTime: Bool

    public init(matchedText: String, date: Date, hasTime: Bool) {
        self.matchedText = matchedText
        self.date = date
        self.hasTime = hasTime
    }
}

public protocol DateExtracting: Sendable {
    func extractDates(from text: String, reference: Date) -> [ExtractedDate]
}

// MARK: - Unavailable implementations

/// Used where an integration does not exist (Linux CLI, tests). Every call
/// reports that honestly instead of pretending to succeed.
@MainActor
public final class UnavailableCalendarService: CalendarService {
    public init() {}
    public func eventsAuthorization() -> AuthorizationState { .unavailable }
    public func remindersAuthorization() -> AuthorizationState { .unavailable }
    public func requestEventsAccess() async -> AuthorizationState { .unavailable }
    public func requestRemindersAccess() async -> AuthorizationState { .unavailable }
    public func events(from start: Date, to end: Date) async throws -> [CalendarEventInfo] {
        throw ToolError.unsupported("Calendar access is only available in the macOS app.")
    }
    public func createEvent(title: String, start: Date, end: Date, notes: String?, location: String?) async throws -> CalendarEventInfo {
        throw ToolError.unsupported("Calendar access is only available in the macOS app.")
    }
    public func createReminder(title: String, due: DateCoding.ParsedDate?, notes: String?) async throws -> ReminderInfo {
        throw ToolError.unsupported("Reminders access is only available in the macOS app.")
    }
}

@MainActor
public final class UnavailableMediaController: MediaController {
    public init() {}
    public var nowPlaying: NowPlayingInfo? { nil }
    public var supportedPlayers: [String] { [] }
    public func refresh() async -> NowPlayingInfo? { nil }
    public func perform(_ action: MediaAction, player: String?) async throws -> NowPlayingInfo? {
        throw ToolError.unsupported("Media control is only available in the macOS app.")
    }
}

@MainActor
public final class UnavailableAppLauncher: AppLauncher, URLOpener, ShortcutsRunner, ClipboardWriter {
    public init() {}
    public func openApplication(named name: String) async throws -> String {
        throw ToolError.unsupported("Opening applications is only available in the macOS app.")
    }
    public func installedApplications(matching query: String?) -> [String] { [] }
    public func open(_ url: URL) async throws {
        throw ToolError.unsupported("Opening links is only available in the macOS app.")
    }
    public func listShortcuts() async throws -> [String] {
        throw ToolError.unsupported("Shortcuts are only available in the macOS app.")
    }
    public func runShortcut(named name: String, input: String?) async throws -> String {
        throw ToolError.unsupported("Shortcuts are only available in the macOS app.")
    }
    public func write(_ text: String) throws {
        throw ToolError.unsupported("The clipboard is only available in the macOS app.")
    }
}

/// Portable system information from `ProcessInfo` (no per-process or battery data).
@MainActor
public final class BasicSystemInfoProvider: SystemInfoProvider {
    public init() {}

    public func snapshot() -> SystemSnapshot {
        let info = ProcessInfo.processInfo
        #if canImport(Darwin)
        let thermal: String
        switch info.thermalState {
        case .nominal: thermal = "nominal"
        case .fair: thermal = "fair"
        case .serious: thermal = "serious"
        case .critical: thermal = "critical"
        @unknown default: thermal = "unknown"
        }
        #else
        let thermal = "unknown"
        #endif
        var free: Int64?
        var total: Int64?
        if let attributes = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory()) {
            free = (attributes[.systemFreeSize] as? NSNumber)?.int64Value
            total = (attributes[.systemSize] as? NSNumber)?.int64Value
        }
        return SystemSnapshot(
            operatingSystem: info.operatingSystemVersionString, hardwareModel: nil,
            processorCount: info.activeProcessorCount, physicalMemoryBytes: info.physicalMemory,
            memoryUsedBytes: nil, memoryPressure: nil, uptimeSeconds: info.systemUptime,
            thermalState: thermal, diskFreeBytes: free, diskTotalBytes: total
        )
    }

    public func topMemoryProcesses(limit: Int) throws -> [ProcessMemoryInfo] {
        throw ToolError.unsupported("Per-process memory usage is only available in the macOS app.")
    }

    public func battery() -> BatteryInfo? { nil }
}
