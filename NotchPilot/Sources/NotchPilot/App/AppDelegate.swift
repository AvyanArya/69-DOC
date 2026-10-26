import AppKit
import NotchPilotCore
import SwiftUI

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var model: AppModel?
    private var notchController: NotchWindowController?
    private var statusItem: StatusItemController?
    private var settingsController: SettingsWindowController?
    private let hotKeys = HotKeyManager()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let arguments = CommandLine.arguments
        let smokeTest = arguments.contains("--smoke-test")
        let model: AppModel
        do {
            model = try AppModel(smokeTest: smokeTest)
        } catch {
            let alert = NSAlert()
            alert.messageText = "NotchPilot could not start"
            alert.informativeText = "Its data folder could not be created: \(error.localizedDescription)"
            alert.runModal()
            NSApp.terminate(nil)
            return
        }
        self.model = model
        let notch = NotchWindowController(model: model)
        notchController = notch
        statusItem = StatusItemController(model: model)
        let settings = SettingsWindowController(model: model)
        settingsController = settings
        model.openSettingsHandler = { [weak settings] pane in settings?.show(pane) }
        model.onHotKeyChanged = { [weak self] in self?.registerHotKey() }
        registerHotKey()

        if smokeTest {
            let screenshotDirectory = arguments.firstIndex(of: "--screenshots").flatMap { index in
                index + 1 < arguments.count ? URL(fileURLWithPath: arguments[index + 1]) : nil
            }
            SmokeTest.run(model: model, notch: notch, settings: settings, screenshots: screenshotDirectory)
            return
        }

        if !model.settings.onboardingCompleted {
            // First launch: show the assistant with the provider setup card.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                model.expand(tab: .assistant)
                model.isPinned = true
                model.services.settings.updateSettings { $0.onboardingCompleted = true }
            }
        }
    }

    private var registeredHotKey: HotKeySetting?
    private var registeredHotKeyEnabled = false

    private func registerHotKey() {
        guard let model else { return }
        let settings = model.settings
        guard settings.toggleHotKey != registeredHotKey || settings.toggleHotKeyEnabled != registeredHotKeyEnabled else { return }
        registeredHotKey = settings.toggleHotKey
        registeredHotKeyEnabled = settings.toggleHotKeyEnabled
        hotKeys.unregister()
        guard settings.toggleHotKeyEnabled else { return }
        let ok = hotKeys.register(settings.toggleHotKey) { [weak model] in
            model?.toggle()
        }
        if !ok {
            model.showToast("\(settings.toggleHotKey.display) is used by another app. Choose a different shortcut in Settings.")
        }
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        model?.expand(focusComposer: true, tab: .assistant)
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        model?.orchestrator.cancel()
        hotKeys.unregister()
    }
}

/// Hosts the SwiftUI settings in a normal window.
@MainActor
final class SettingsWindowController {
    private let model: AppModel
    private(set) var window: NSWindow?

    init(model: AppModel) {
        self.model = model
    }

    func show(_ pane: SettingsPane) {
        model.settingsPane = pane
        if window == nil {
            let window = NSWindow(
                contentRect: NSRect(x: 0, y: 0, width: 760, height: 560),
                styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                backing: .buffered, defer: false
            )
            window.title = "NotchPilot Settings"
            window.titlebarAppearsTransparent = true
            window.isReleasedWhenClosed = false
            window.minSize = NSSize(width: 680, height: 480)
            window.contentView = NSHostingView(rootView: SettingsView(model: model))
            window.center()
            self.window = window
        }
        NSApp.activate(ignoringOtherApps: true)
        window?.makeKeyAndOrderFront(nil)
    }
}
