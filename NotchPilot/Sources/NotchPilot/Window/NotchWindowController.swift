import AppKit
import NotchPilotCore
import SwiftUI

/// Owns the notch panel: positions it from real display geometry, passes
/// clicks through everywhere except the island itself, and turns hover,
/// clicks and keys into expand/collapse.
@MainActor
final class NotchWindowController: NSObject {
    private let model: AppModel
    let panel = NotchPanel()
    private var hosting: NSHostingView<NotchRootView>!
    private var monitors: [Any] = []
    private var observers: [NSObjectProtocol] = []
    private var pointerInside = false
    private var hoverWork: DispatchWorkItem?
    private var collapseWork: DispatchWorkItem?

    init(model: AppModel) {
        self.model = model
        super.init()
        hosting = NSHostingView(rootView: NotchRootView(model: model))
        hosting.sizingOptions = []
        panel.contentView = hosting
        model.panelLevel = panel.level
        model.onExpansionChanged = { [weak self] expanded, focus in
            self?.expansionChanged(expanded: expanded, focusComposer: focus)
        }
        model.onLayoutChanged = { [weak self] in
            self?.reposition()
        }
        reposition()
        installMonitors()
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: NSApplication.didChangeScreenParametersNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.reposition() }
        })
        observers.append(NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.model.services.timer.checkCompletion()
                self?.reposition()
            }
        })
        observers.append(NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.accessibilityDisplayOptionsDidChangeNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.model.reduceMotionSystem = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion }
        })
    }

    // MARK: Layout

    func reposition() {
        let appearance = model.services.settings.settings.appearance
        guard let screen = NotchGeometry.preferredScreen(appearance.display) else { return }
        let metrics = NotchGeometry.metrics(for: screen)
        model.notch = metrics
        let maxWidth = max(model.expandedSize.width, metrics.size.width + NotchLayout.wing * 2) + NotchLayout.earRadius(expanded: true) * 2 + NotchLayout.margin * 2
        let height = model.expandedSize.height + NotchLayout.margin
        let frame = NSRect(x: (screen.frame.midX - maxWidth / 2).rounded(), y: screen.frame.maxY - height, width: maxWidth.rounded(), height: height)
        panel.setFrame(frame, display: true)
        if !metrics.hasNotch && !appearance.showOnDisplaysWithoutNotch {
            panel.orderOut(nil)
        } else {
            panel.orderFrontRegardless()
        }
        updatePointer()
    }

    /// The island's current rectangle in screen coordinates.
    func islandRect() -> NSRect {
        let size = model.shapeSize
        let frame = panel.frame
        return NSRect(x: frame.midX - size.width / 2, y: frame.maxY - size.height, width: size.width, height: size.height)
    }

    // MARK: Pointer & keyboard

    private func installMonitors() {
        let moves: NSEvent.EventTypeMask = [.mouseMoved, .leftMouseDragged]
        if let global = NSEvent.addGlobalMonitorForEvents(matching: moves, handler: { [weak self] _ in
            MainActor.assumeIsolated { self?.updatePointer() }
        }) { monitors.append(global) }
        if let local = NSEvent.addLocalMonitorForEvents(matching: moves, handler: { [weak self] event in
            MainActor.assumeIsolated { self?.updatePointer() }
            return event
        }) { monitors.append(local) }
        // Clicking anywhere else collapses the panel (unless pinned or waiting for approval).
        if let outside = NSEvent.addGlobalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown], handler: { [weak self] _ in
            MainActor.assumeIsolated { self?.handleOutsideClick() }
        }) { monitors.append(outside) }
        if let keys = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { [weak self] event in
            guard let self else { return event }
            return MainActor.assumeIsolated { self.handleKey(event) ? nil : event }
        }) { monitors.append(keys) }
    }

    func updatePointer() {
        guard panel.isVisible else { return }
        let location = NSEvent.mouseLocation
        let rect = islandRect().insetBy(dx: model.isExpanded ? -2 : -10, dy: model.isExpanded ? -2 : -6)
        let inside = rect.contains(location) || (location.y >= rect.minY && location.y <= panel.frame.maxY + 2 && abs(location.x - rect.midX) <= rect.width / 2 && !model.isExpanded)
        panel.ignoresMouseEvents = !inside
        guard inside != pointerInside else { return }
        pointerInside = inside
        inside ? pointerEntered() : pointerExited()
    }

    private func pointerEntered() {
        collapseWork?.cancel()
        guard !model.isExpanded else { return }
        if model.services.settings.settings.appearance.hoverToExpand {
            let work = DispatchWorkItem { [weak self] in
                guard let self, self.pointerInside, !self.model.isExpanded else { return }
                self.model.expand()
            }
            hoverWork = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.18, execute: work)
        } else {
            model.setPeeking(true)
        }
    }

    private func pointerExited() {
        hoverWork?.cancel()
        model.setPeeking(false)
        guard model.isExpanded else { return }
        let work = DispatchWorkItem { [weak self] in
            guard let self, !self.pointerInside, self.canAutoCollapse else { return }
            self.model.collapse()
        }
        collapseWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.75, execute: work)
    }

    private var canAutoCollapse: Bool {
        guard !model.isPinned, !model.isModalOpen, model.confirmations.pending.isEmpty else { return false }
        if model.isComposerFocused && !model.composerText.isEmpty { return false }
        // Keep open while one of our menus or popovers is showing.
        let auxiliaryOpen = NSApp.windows.contains { window in
            window !== panel && window.isVisible && (window.className.contains("Menu") || window.className.contains("Popover"))
        }
        return !auxiliaryOpen
    }

    private func handleOutsideClick() {
        guard model.isExpanded, !islandRect().contains(NSEvent.mouseLocation) else { return }
        guard !model.isPinned, !model.isModalOpen, model.confirmations.pending.isEmpty else { return }
        model.collapse()
    }

    /// Returns true when the key was handled.
    private func handleKey(_ event: NSEvent) -> Bool {
        guard event.window === panel else { return false }
        let command = event.modifierFlags.contains(.command)
        switch event.keyCode {
        case 53:  // Escape
            if model.orchestrator.isRunning && !command { return false }
            model.collapse()
            return true
        default:
            break
        }
        guard command, let characters = event.charactersIgnoringModifiers else { return false }
        switch characters {
        case "n": model.newConversation(); return true
        case ",": model.openSettings(.general); return true
        case "1", "2", "3", "4", "5":
            let index = Int(characters)! - 1
            if index < PanelTab.allCases.count { model.select(PanelTab.allCases[index]) }
            return true
        case ".":
            model.stop()
            return true
        default:
            return false
        }
    }

    // MARK: Expansion

    private func expansionChanged(expanded: Bool, focusComposer: Bool) {
        if expanded {
            panel.ignoresMouseEvents = false
            if focusComposer {
                panel.makeKeyAndOrderFront(nil)
                model.composerFocusRequest += 1
            }
        } else {
            hoverWork?.cancel()
            collapseWork?.cancel()
            if panel.isKeyWindow {
                // Hand keyboard focus back to the app the user was using.
                panel.orderOut(nil)
                panel.orderFrontRegardless()
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            self?.pointerInside = false
            self?.updatePointer()
        }
    }

    // MARK: Snapshots (smoke test / documentation screenshots)

    func snapshot() -> NSBitmapImageRep? {
        hosting.layoutSubtreeIfNeeded()
        guard let rep = hosting.bitmapImageRepForCachingDisplay(in: hosting.bounds) else { return nil }
        hosting.cacheDisplay(in: hosting.bounds, to: rep)
        return rep
    }
}
