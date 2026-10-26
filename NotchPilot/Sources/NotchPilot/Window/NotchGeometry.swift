import AppKit
import NotchPilotCore

/// Physical notch metrics for a display, from public NSScreen APIs.
struct NotchMetrics: Equatable {
    /// Width and height of the camera housing (or a virtual pill on displays without one).
    var size: CGSize
    var hasNotch: Bool

    static let fallback = NotchMetrics(size: CGSize(width: 190, height: 32), hasNotch: false)
}

enum NotchGeometry {
    /// Width of the virtual island on displays without a notch.
    static let virtualWidth: CGFloat = 170

    static func metrics(for screen: NSScreen) -> NotchMetrics {
        let top = screen.safeAreaInsets.top
        if top > 0, let left = screen.auxiliaryTopLeftArea, let right = screen.auxiliaryTopRightArea {
            let width = screen.frame.width - left.width - right.width
            if width > 40 {
                return NotchMetrics(size: CGSize(width: width, height: top), hasNotch: true)
            }
        }
        // No notch: sit inside the menu bar.
        let menuBar = screen.frame.maxY - screen.visibleFrame.maxY
        let height = menuBar > 10 ? menuBar : NSStatusBar.system.thickness
        return NotchMetrics(size: CGSize(width: virtualWidth, height: max(22, height)), hasNotch: false)
    }

    static func preferredScreen(_ preference: DisplayPreference) -> NSScreen? {
        switch preference {
        case .notchedDisplay:
            return NSScreen.screens.first { $0.safeAreaInsets.top > 0 } ?? NSScreen.screens.first
        case .mainDisplay:
            return NSScreen.screens.first
        }
    }
}

/// Sizes shared by the window controller (hit testing) and SwiftUI (drawing).
enum NotchLayout {
    /// Concave "ear" radius where the island meets the top edge.
    static func earRadius(expanded: Bool) -> CGFloat { expanded ? 14 : 7 }
    static func bottomRadius(expanded: Bool, height: CGFloat) -> CGFloat { expanded ? 34 : min(12, height / 2.4) }
    /// Width added on each side for live activities in the collapsed state.
    static let wing: CGFloat = 78
    static let peekGrowth = CGSize(width: 18, height: 6)
    static let previewHeight: CGFloat = 30
    /// Transparent margin kept around the island inside the window for shadows.
    static let margin: CGFloat = 26
}

/// A borderless, non-activating panel that floats above the menu bar.
final class NotchPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }

    static func make() -> NotchPanel {
        let panel = NotchPanel(contentRect: NSRect(x: 0, y: 0, width: 400, height: 200), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isFloatingPanel = true
        panel.level = notchLevel
        panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary, .ignoresCycle]
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.isMovable = false
        panel.isMovableByWindowBackground = false
        panel.hidesOnDeactivate = false
        panel.becomesKeyOnlyIfNeeded = true
        panel.acceptsMouseMovedEvents = true
        panel.isReleasedWhenClosed = false
        panel.animationBehavior = .none
        panel.ignoresMouseEvents = true
        return panel
    }

    /// Just above the menu bar so the island can cover the notch area.
    static var notchLevel: NSWindow.Level {
        NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.mainMenuWindow)) + 3)
    }
}
