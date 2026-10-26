import AppKit
import Carbon.HIToolbox
import NotchPilotCore

/// A system-wide keyboard shortcut via Carbon's RegisterEventHotKey, which does
/// not require Accessibility permission (unlike monitoring all key presses).
final class HotKeyManager {
    private var hotKeyRef: EventHotKeyRef?
    private var handlerRef: EventHandlerRef?
    private var action: (@MainActor () -> Void)?

    deinit {
        unregister()
    }

    /// Registers the shortcut; returns false if another app already owns it.
    @discardableResult
    func register(_ setting: HotKeySetting, action: @escaping @MainActor () -> Void) -> Bool {
        unregister()
        self.action = action
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let installStatus = InstallEventHandler(GetApplicationEventTarget(), { _, _, userData in
            guard let userData else { return noErr }
            let manager = Unmanaged<HotKeyManager>.fromOpaque(userData).takeUnretainedValue()
            // Carbon delivers hot-key events on the main thread.
            MainActor.assumeIsolated { manager.action?() }
            return noErr
        }, 1, &spec, Unmanaged.passUnretained(self).toOpaque(), &handlerRef)
        guard installStatus == noErr else { return false }
        let identifier = EventHotKeyID(signature: OSType(0x4E504C54), id: 1)  // 'NPLT'
        let status = RegisterEventHotKey(setting.keyCode, setting.modifiers, identifier, GetApplicationEventTarget(), 0, &hotKeyRef)
        if status != noErr {
            AppLog.error("Could not register shortcut \(setting.display) (status \(status))", category: .ui)
            unregister()
            return false
        }
        return true
    }

    func unregister() {
        if let hotKeyRef { UnregisterEventHotKey(hotKeyRef) }
        if let handlerRef { RemoveEventHandler(handlerRef) }
        hotKeyRef = nil
        handlerRef = nil
    }

    // MARK: Recording helpers

    static func carbonModifiers(_ flags: NSEvent.ModifierFlags) -> UInt32 {
        var mask: UInt32 = 0
        if flags.contains(.command) { mask |= UInt32(cmdKey) }
        if flags.contains(.option) { mask |= UInt32(optionKey) }
        if flags.contains(.control) { mask |= UInt32(controlKey) }
        if flags.contains(.shift) { mask |= UInt32(shiftKey) }
        return mask
    }

    static func display(keyCode: UInt16, characters: String?, flags: NSEvent.ModifierFlags) -> String {
        var text = ""
        if flags.contains(.control) { text += "⌃" }
        if flags.contains(.option) { text += "⌥" }
        if flags.contains(.shift) { text += "⇧" }
        if flags.contains(.command) { text += "⌘" }
        let names: [UInt16: String] = [49: "Space", 36: "Return", 48: "Tab", 51: "Delete", 53: "Esc", 123: "←", 124: "→", 125: "↓", 126: "↑", 122: "F1", 120: "F2", 99: "F3", 118: "F4", 96: "F5", 97: "F6", 98: "F7", 100: "F8", 101: "F9", 109: "F10", 103: "F11", 111: "F12"]
        text += names[keyCode] ?? (characters ?? "?").uppercased()
        return text
    }
}

/// Builds the menu-bar item: an entry point that works even when the notch
/// is collapsed or hidden.
@MainActor
final class StatusItemController: NSObject, NSMenuDelegate {
    private let model: AppModel
    private let item: NSStatusItem
    private let menu: NSMenu

    init(model: AppModel) {
        self.model = model
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        menu = NSMenu()
        super.init()
        if let button = item.button {
            let image = NSImage(systemSymbolName: "sparkles", accessibilityDescription: "NotchPilot")
            image?.isTemplate = true
            button.image = image
            button.toolTip = "NotchPilot"
        }
        menu.delegate = self
        menu.autoenablesItems = false
        item.menu = menu
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        ActionMenuItem.prune()
        let settings = model.services.settings.settings
        let shortcut = settings.toggleHotKeyEnabled ? "  (\(settings.toggleHotKey.display))" : ""
        menu.addItem(ActionMenuItem.make("Open Assistant\(shortcut)", symbol: "sparkles") { [model] in model.expand(focusComposer: true, tab: .assistant) })
        menu.addItem(ActionMenuItem.make("Today", symbol: "sun.max") { [model] in model.expand(tab: .today) })
        menu.addItem(ActionMenuItem.make("New Conversation", symbol: "square.and.pencil") { [model] in
            model.newConversation()
            model.expand(focusComposer: true, tab: .assistant)
        })
        if model.orchestrator.isRunning {
            menu.addItem(ActionMenuItem.make("Stop Current Task", symbol: "stop.circle") { [model] in model.stop() })
        }
        menu.addItem(.separator())
        let timer = model.services.timer
        switch timer.state.phase {
        case .running:
            menu.addItem(ActionMenuItem.make("Pause Timer", symbol: "pause.circle") { _ = try? timer.pause() })
            menu.addItem(ActionMenuItem.make("Reset Timer", symbol: "arrow.counterclockwise") { _ = timer.reset() })
        case .paused:
            menu.addItem(ActionMenuItem.make("Resume Timer", symbol: "play.circle") { _ = try? timer.resume() })
            menu.addItem(ActionMenuItem.make("Reset Timer", symbol: "arrow.counterclockwise") { _ = timer.reset() })
        default:
            let minutes = model.services.settings.preferences.defaultFocusMinutes
            menu.addItem(ActionMenuItem.make("Start \(minutes)-min Focus", symbol: "timer") { [model] in model.startTimer(minutes: minutes, kind: .focus) })
        }
        menu.addItem(.separator())
        menu.addItem(ActionMenuItem.make("Settings…", symbol: "gearshape", key: ",") { [model] in model.openSettings(.general) })
        menu.addItem(ActionMenuItem.make("Quit NotchPilot", symbol: nil, key: "q") { NSApp.terminate(nil) })
    }
}

/// Builds NSMenuItems that run closures, without subclassing NSMenuItem.
@MainActor
enum ActionMenuItem {
    private final class Handler: NSObject {
        let action: @MainActor () -> Void

        init(_ action: @escaping @MainActor () -> Void) {
            self.action = action
        }

        @objc func fire(_ sender: Any?) {
            MainActor.assumeIsolated { action() }
        }
    }

    /// Menu items do not retain their target, so handlers are kept here.
    private static var handlers: [NSMenuItem: Handler] = [:]

    static func make(_ title: String, symbol: String?, key: String = "", handler: @escaping @MainActor () -> Void) -> NSMenuItem {
        let target = Handler(handler)
        let item = NSMenuItem(title: title, action: #selector(Handler.fire(_:)), keyEquivalent: key)
        item.target = target
        if let symbol { item.image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil) }
        handlers[item] = target
        return item
    }

    /// Drops handlers for items that were removed from their menu.
    static func prune() {
        handlers = handlers.filter { $0.key.menu != nil }
    }
}
