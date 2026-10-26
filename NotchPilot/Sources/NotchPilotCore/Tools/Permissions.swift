import Foundation
import Observation

public enum PermissionDecision: Equatable, Sendable {
    case allow
    /// Ask the user, explaining why.
    case confirm(String)
    /// Refuse without asking, explaining why.
    case deny(String)
}

/// Decides whether a tool call may run, must be confirmed, or is refused.
///
/// The policy is enforced in code for every call, so nothing the model writes
/// (or that a web page, document or note tells it) can bypass it.
public enum PermissionPolicy {
    public static func evaluate(_ definition: ToolDefinition, settings: AppSettings) -> PermissionDecision {
        guard definition.feature.isEnabled(in: settings.features) else {
            return .deny("\(definition.feature.displayName) is turned off in Settings → Features.")
        }
        let mode = settings.agent.mode
        switch definition.risk {
        case .read:
            return .allow
        case .appWrite:
            if definition.feature == .memory, settings.agent.askBeforeSavingMemory {
                return .confirm("Saving a long-term memory needs your approval.")
            }
            return mode == .cautious ? .confirm("You asked to approve every change.") : .allow
        case .external:
            if mode == .cautious {
                return .confirm("You asked to approve every change.")
            }
            if (definition.feature == .calendar || definition.feature == .reminders), settings.agent.allowCalendarWritesWithoutAsking {
                return .allow
            }
            if definition.feature == .webLinks, settings.agent.allowOpeningLinksWithoutAsking {
                return .allow
            }
            if definition.lowImpact {
                return .allow
            }
            return .confirm("This acts outside NotchPilot.")
        case .destructive:
            return .confirm("This deletes data.")
        case .sensitive:
            return .confirm("This runs an automation or shares data with another app.")
        }
    }
}

public struct ConfirmationRequest: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let runID: UUID
    public let toolName: String
    public let title: String
    public let reason: String
    public let risk: ToolRisk
    public let createdAt: Date
}

public enum ConfirmationOutcome: Equatable, Sendable {
    case approved
    case declined
    case timedOut
    case cancelled
}

/// Holds pending confirmation prompts until the user answers.
@MainActor
@Observable
public final class ConfirmationCenter {
    public private(set) var pending: [ConfirmationRequest] = []

    @ObservationIgnored private var continuations: [UUID: CheckedContinuation<ConfirmationOutcome, Never>] = [:]
    @ObservationIgnored private var timeouts: [UUID: Task<Void, Never>] = [:]
    /// Notified when a new prompt appears (used to expand the notch).
    @ObservationIgnored public var onRequest: ((ConfirmationRequest) -> Void)?

    public init() {}

    /// Suspends until the user approves/declines, the timeout passes, or the run is cancelled.
    public func request(runID: UUID, toolName: String, title: String, reason: String, risk: ToolRisk, timeout: TimeInterval, now: Date = Date()) async -> ConfirmationOutcome {
        let request = ConfirmationRequest(id: UUID(), runID: runID, toolName: toolName, title: title, reason: reason, risk: risk, createdAt: now)
        return await withTaskCancellationHandler {
            await withCheckedContinuation { (continuation: CheckedContinuation<ConfirmationOutcome, Never>) in
                if Task.isCancelled {
                    continuation.resume(returning: .cancelled)
                    return
                }
                pending.append(request)
                continuations[request.id] = continuation
                timeouts[request.id] = Task { [weak self] in
                    try? await Task.sleep(nanoseconds: UInt64(max(1, timeout) * 1_000_000_000))
                    guard !Task.isCancelled else { return }
                    self?.finish(request.id, .timedOut)
                }
                onRequest?(request)
            }
        } onCancel: {
            Task { @MainActor [weak self] in self?.finish(request.id, .cancelled) }
        }
    }

    public func resolve(_ id: UUID, approved: Bool) {
        finish(id, approved ? .approved : .declined)
    }

    /// Cancels every prompt belonging to a run (or all prompts).
    public func cancelAll(runID: UUID? = nil) {
        for request in pending where runID == nil || request.runID == runID {
            finish(request.id, .cancelled)
        }
    }

    private func finish(_ id: UUID, _ outcome: ConfirmationOutcome) {
        timeouts.removeValue(forKey: id)?.cancel()
        pending.removeAll { $0.id == id }
        continuations.removeValue(forKey: id)?.resume(returning: outcome)
    }
}
