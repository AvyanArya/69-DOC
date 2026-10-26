import Foundation
import NotchPilotCore
import UserNotifications

/// Local notifications via UserNotifications. Permission is requested only
/// when a feature that needs notifications is used or switched on.
@MainActor
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    enum Action {
        case openAssistant(prompt: String?)
        case startBreak(minutes: Int)
        case openTab(String)
    }

    enum Category: String {
        case timer = "timer"
        case briefing = "briefing"
        case deadline = "deadline"
        case event = "event"
        case summary = "summary"
    }

    /// Disabled during the automated smoke test so no permission prompt appears.
    var isDisabled = false

    private var center: UNUserNotificationCenter? {
        // UserNotifications requires a bundled app; skip when run unbundled (e.g. tests).
        isDisabled || Bundle.main.bundleIdentifier == nil ? nil : UNUserNotificationCenter.current()
    }

    var onAction: ((Action) -> Void)?
    private(set) var authorization: AuthorizationState = .notDetermined

    func configure() {
        guard let center else { return }
        center.delegate = self
        let startBreak = UNNotificationAction(identifier: "start-break", title: "Start break", options: [])
        let open = UNNotificationAction(identifier: "open", title: "Open NotchPilot", options: [.foreground])
        center.setNotificationCategories([
            UNNotificationCategory(identifier: Category.timer.rawValue, actions: [startBreak, open], intentIdentifiers: []),
            UNNotificationCategory(identifier: Category.briefing.rawValue, actions: [open], intentIdentifiers: []),
            UNNotificationCategory(identifier: Category.deadline.rawValue, actions: [open], intentIdentifiers: []),
            UNNotificationCategory(identifier: Category.event.rawValue, actions: [open], intentIdentifiers: []),
            UNNotificationCategory(identifier: Category.summary.rawValue, actions: [open], intentIdentifiers: []),
        ])
        Task { await refreshAuthorization() }
    }

    @discardableResult
    func refreshAuthorization() async -> AuthorizationState {
        guard let center else {
            authorization = .unavailable
            return authorization
        }
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral: authorization = .authorized
        case .denied: authorization = .denied
        case .notDetermined: authorization = .notDetermined
        @unknown default: authorization = .denied
        }
        return authorization
    }

    /// Shows the system prompt if notifications were never requested.
    @discardableResult
    func requestAuthorizationIfNeeded() async -> Bool {
        guard let center else { return false }
        if await refreshAuthorization() == .notDetermined {
            _ = try? await center.requestAuthorization(options: [.alert, .sound])
            await refreshAuthorization()
        }
        return authorization == .authorized
    }

    /// Schedules a notification at `date` (or immediately when nil), replacing any with the same id.
    func schedule(id: String, title: String, body: String, at date: Date?, category: Category, userInfo: [String: String] = [:]) {
        guard let center else { return }
        Task {
            guard await requestAuthorizationIfNeeded() else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            content.categoryIdentifier = category.rawValue
            content.userInfo = userInfo
            var trigger: UNNotificationTrigger?
            if let date {
                let interval = date.timeIntervalSinceNow
                guard interval > -1 else { return }
                trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, interval), repeats: false)
            }
            center.removePendingNotificationRequests(withIdentifiers: [id])
            do {
                try await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            } catch {
                AppLog.error("Scheduling notification failed: \(error.localizedDescription)", category: .scheduler)
            }
        }
    }

    func cancel(ids: [String]) {
        center?.removePendingNotificationRequests(withIdentifiers: ids)
    }

    /// Removes every pending notification whose id starts with `prefix`.
    func cancel(prefix: String) async {
        guard let center else { return }
        let pending = await center.pendingNotificationRequests()
        center.removePendingNotificationRequests(withIdentifiers: pending.map(\.identifier).filter { $0.hasPrefix(prefix) })
    }

    // MARK: UNUserNotificationCenterDelegate

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let actionID = response.actionIdentifier
        let category = response.notification.request.content.categoryIdentifier
        let info = response.notification.request.content.userInfo
        let prompt = info["prompt"] as? String
        let breakMinutes = Int(info["break"] as? String ?? "") ?? 5
        let tab = info["tab"] as? String
        DispatchQueue.main.async {
            MainActor.assumeIsolated {
                if actionID == "start-break" {
                    self.onAction?(.startBreak(minutes: breakMinutes))
                } else if category == Category.briefing.rawValue {
                    self.onAction?(.openAssistant(prompt: prompt))
                } else if let tab {
                    self.onAction?(.openTab(tab))
                } else {
                    self.onAction?(.openAssistant(prompt: nil))
                }
            }
        }
        completionHandler()
    }
}
