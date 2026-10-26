import Foundation
import Observation

public enum TimerKind: String, Codable, Sendable, CaseIterable {
    case focus
    case shortBreak = "break"
    case custom

    public var displayName: String {
        switch self {
        case .focus: return "Focus"
        case .shortBreak: return "Break"
        case .custom: return "Timer"
        }
    }
}

public enum TimerPhase: String, Codable, Sendable {
    case idle, running, paused, finished
}

public struct TimerState: Codable, Equatable, Sendable {
    public var sessionID: UUID
    public var phase: TimerPhase
    public var kind: TimerKind
    public var label: String
    public var totalDuration: TimeInterval
    /// Wall-clock end while running. Using an absolute end date keeps the timer
    /// correct across app restarts and system sleep.
    public var endDate: Date?
    public var remainingWhenPaused: TimeInterval?
    public var startedAt: Date?
    public var finishedAt: Date?
    /// Suggest (or auto-start) a break of this length when a focus session ends.
    public var breakMinutesAfter: Int?
    public var completionMessage: String?

    public static let idle = TimerState(
        sessionID: UUID(), phase: .idle, kind: .focus, label: "", totalDuration: 0, endDate: nil,
        remainingWhenPaused: nil, startedAt: nil, finishedAt: nil, breakMinutesAfter: nil, completionMessage: nil
    )
}

/// Something that can run a callback at a wall-clock date.
public protocol TimerScheduling: AnyObject {
    @MainActor func schedule(at date: Date, _ action: @escaping @MainActor () -> Void) -> TimerCancellation
}

public final class TimerCancellation {
    private let onCancel: () -> Void
    public init(_ onCancel: @escaping () -> Void) { self.onCancel = onCancel }
    public func cancel() { onCancel() }
}

/// Production scheduler: a single sleeping task, no polling.
public final class TaskTimerScheduler: TimerScheduling {
    public init() {}

    @MainActor
    public func schedule(at date: Date, _ action: @escaping @MainActor () -> Void) -> TimerCancellation {
        let task = Task { @MainActor in
            let delay = max(0, date.timeIntervalSinceNow)
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard !Task.isCancelled else { return }
            action()
        }
        return TimerCancellation { task.cancel() }
    }
}

public enum TimerError: Error, LocalizedError, Equatable {
    case invalidDuration
    case notRunning
    case notPaused

    public var errorDescription: String? {
        switch self {
        case .invalidDuration: return "Timer duration must be between 1 minute and 8 hours."
        case .notRunning: return "No timer is running."
        case .notPaused: return "The timer is not paused."
        }
    }
}

@MainActor
@Observable
public final class FocusTimer {
    public private(set) var state: TimerState
    /// End times of focus sessions completed today (for summaries).
    public private(set) var completedFocusSessions: [Date] = []

    @ObservationIgnored private let clock: AppClock
    @ObservationIgnored private let scheduler: TimerScheduling
    @ObservationIgnored private let fileStore: FileStore?
    @ObservationIgnored private var pending: TimerCancellation?
    @ObservationIgnored private let fileName = "timer.json"

    /// Called when a timer reaches zero (notification, auto-break, UI).
    @ObservationIgnored public var onFinish: ((TimerState) -> Void)?
    /// Called on every state change (used to (re)schedule the system notification).
    @ObservationIgnored public var onStateChange: ((TimerState) -> Void)?

    public static let maximumDuration: TimeInterval = 8 * 3600

    private struct Persisted: Codable {
        var state: TimerState
        var completedFocusSessions: [Date]
    }

    public init(clock: AppClock = SystemClock(), scheduler: TimerScheduling = TaskTimerScheduler(), fileStore: FileStore? = nil) {
        self.clock = clock
        self.scheduler = scheduler
        self.fileStore = fileStore
        let persisted = fileStore?.load(Persisted.self, from: fileName)
        state = persisted?.state ?? .idle
        completedFocusSessions = persisted?.completedFocusSessions ?? []
    }

    /// Call once callbacks are wired: finishes timers that expired while the
    /// app was not running and schedules the next completion.
    public func activate() {
        pruneSessionHistory()
        checkCompletion()
        scheduleCompletion()
    }

    public func remaining(at date: Date? = nil) -> TimeInterval {
        let now = date ?? clock.now()
        switch state.phase {
        case .running:
            guard let end = state.endDate else { return 0 }
            return max(0, end.timeIntervalSince(now))
        case .paused:
            return max(0, state.remainingWhenPaused ?? 0)
        case .idle, .finished:
            return 0
        }
    }

    /// Fraction complete, 0…1.
    public func progress(at date: Date? = nil) -> Double {
        guard state.totalDuration > 0, state.phase != .idle else { return 0 }
        if state.phase == .finished { return 1 }
        return min(1, max(0, 1 - remaining(at: date) / state.totalDuration))
    }

    public var isActive: Bool { state.phase == .running || state.phase == .paused }

    @discardableResult
    public func start(duration: TimeInterval, label: String, kind: TimerKind, breakMinutesAfter: Int? = nil, completionMessage: String? = nil) throws -> TimerState {
        guard duration >= 60, duration <= Self.maximumDuration else { throw TimerError.invalidDuration }
        let now = clock.now()
        state = TimerState(
            sessionID: UUID(), phase: .running, kind: kind,
            label: label.nilIfBlank ?? kind.displayName, totalDuration: duration,
            endDate: now.addingTimeInterval(duration), remainingWhenPaused: nil, startedAt: now,
            finishedAt: nil, breakMinutesAfter: breakMinutesAfter, completionMessage: completionMessage?.nilIfBlank
        )
        didChange()
        return state
    }

    @discardableResult
    public func pause() throws -> TimerState {
        guard state.phase == .running else { throw TimerError.notRunning }
        let left = remaining()
        state.phase = .paused
        state.remainingWhenPaused = left
        state.endDate = nil
        didChange()
        return state
    }

    @discardableResult
    public func resume() throws -> TimerState {
        guard state.phase == .paused, let left = state.remainingWhenPaused else { throw TimerError.notPaused }
        state.phase = .running
        state.endDate = clock.now().addingTimeInterval(left)
        state.remainingWhenPaused = nil
        didChange()
        return state
    }

    @discardableResult
    public func reset() -> TimerState {
        state = .idle
        didChange()
        return state
    }

    /// Adds time to a running or paused timer.
    @discardableResult
    public func extend(by seconds: TimeInterval) throws -> TimerState {
        switch state.phase {
        case .running:
            state.endDate = state.endDate?.addingTimeInterval(seconds)
        case .paused:
            state.remainingWhenPaused = (state.remainingWhenPaused ?? 0) + seconds
        default:
            throw TimerError.notRunning
        }
        state.totalDuration += seconds
        didChange()
        return state
    }

    /// Finishes the timer if its end date has passed. Safe to call any time
    /// (scheduler fire, system wake, app launch).
    public func checkCompletion() {
        guard state.phase == .running, let end = state.endDate, end <= clock.now() else { return }
        state.phase = .finished
        state.finishedAt = end
        state.endDate = end
        if state.kind == .focus {
            completedFocusSessions.append(end)
            pruneSessionHistory()
        }
        let finished = state
        didChange()
        onFinish?(finished)
    }

    public func focusSessionsCompleted(on day: Date, calendar: Calendar = .current) -> Int {
        completedFocusSessions.filter { calendar.isDate($0, inSameDayAs: day) }.count
    }

    private func didChange() {
        scheduleCompletion()
        persist()
        onStateChange?(state)
    }

    private func scheduleCompletion() {
        pending?.cancel()
        pending = nil
        guard state.phase == .running, let end = state.endDate else { return }
        pending = scheduler.schedule(at: end) { [weak self] in
            self?.checkCompletion()
        }
    }

    private func pruneSessionHistory() {
        let cutoff = clock.now().addingTimeInterval(-7 * 86_400)
        completedFocusSessions.removeAll { $0 < cutoff }
    }

    private func persist() {
        guard let fileStore else { return }
        do {
            try fileStore.save(Persisted(state: state, completedFocusSessions: completedFocusSessions), to: fileName)
        } catch {
            AppLog.error("Saving timer failed: \(error)", category: .storage)
        }
    }
}
