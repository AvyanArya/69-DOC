import AppKit
import NotchPilotCore
import SwiftUI

/// `NotchPilot --smoke-test [--screenshots <dir>]`
///
/// Launches the real app UI against a throw-away data directory, drives the
/// panel through every state and tab, checks basic invariants, optionally
/// writes PNG snapshots, and exits (0 = success). Used by CI to catch start-up
/// crashes and layout problems on a real macOS window server. The data it
/// creates is clearly labelled sample data and is deleted afterwards.
@MainActor
enum SmokeTest {
    static func run(model: AppModel, notch: NotchWindowController, settings: SettingsWindowController, screenshots: URL?) {
        var failures: [String] = []
        func check(_ condition: Bool, _ message: String) {
            if !condition { failures.append(message) }
            print(condition ? "✓ \(message)" : "✗ \(message)")
        }
        if let screenshots {
            try? FileManager.default.createDirectory(at: screenshots, withIntermediateDirectories: true)
        }
        func capture(_ name: String) {
            guard let screenshots, let rep = notch.snapshot(), let png = rep.representation(using: .png, properties: [:]) else { return }
            try? png.write(to: screenshots.appendingPathComponent("\(name).png"))
        }

        Task { @MainActor in
            func pause(_ seconds: Double = 0.7) async {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
            }
            await pause(1.0)
            check(notch.panel.isVisible || !model.notch.hasNotch, "notch panel is on screen")
            check(model.orchestrator.registry.specs.count >= 40, "tool allowlist registered (\(model.orchestrator.registry.specs.count) tools)")
            check(!model.isProviderConfigured, "no provider configured in a fresh data directory")
            capture("01-collapsed")

            // First-run state: setup card.
            model.expand(tab: .assistant)
            await pause()
            check(model.isExpanded, "panel expands")
            capture("02-setup")

            // Sample data (temporary directory) to exercise every view.
            seed(model)
            await pause(0.3)
            check(model.isProviderConfigured, "API key stored (in-memory store during smoke test)")
            model.collapse()
            await pause()
            check(!model.isExpanded, "panel collapses")
            check(model.liveActivity == .timer, "timer shows as a live activity")
            capture("03-collapsed-timer")

            model.expand(tab: .assistant)
            let pending = Task { @MainActor in
                await model.confirmations.request(runID: UUID(), toolName: "delete_task", title: "Delete task “Old draft”", reason: "This deletes data.", risk: .destructive, timeout: 30)
            }
            await pause()
            check(model.confirmations.pending.count == 1, "confirmation card is pending")
            capture("04-assistant")
            model.confirmations.cancelAll()
            _ = await pending.value

            for (index, tab) in [PanelTab.today, .tasks, .notes, .activity].enumerated() {
                model.select(tab)
                await pause(0.5)
                capture("0\(index + 5)-\(tab.rawValue)")
            }
            model.select(.assistant)
            model.showingHistory = true
            await pause(0.5)
            capture("09-history")
            model.showingHistory = false

            // Settings window renders every pane.
            settings.show(.ai)
            for pane in SettingsPane.allCases {
                model.settingsPane = pane
                await pause(0.35)
                if let screenshots, let window = settings.window {
                    let url = screenshots.appendingPathComponent("settings-\(pane.rawValue).png")
                    // AppKit-backed lists, forms and sidebar materials don't draw through
                    // cacheDisplay, so ask the window server first and fall back to it.
                    if !(await captureWindow(window, to: url)), let view = window.contentView,
                       let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) {
                        view.cacheDisplay(in: view.bounds, to: rep)
                        try? rep.representation(using: .png, properties: [:])?.write(to: url)
                    }
                }
            }
            check(settings.window?.isVisible == true, "settings window opens")
            settings.window?.close()

            // The agent refuses cleanly when the provider is unreachable (no network use in CI).
            model.services.settings.updateSettings { $0.provider.setBaseURL("http://127.0.0.1:9", for: .anthropic) }
            model.send("Hello")
            for _ in 0..<40 where model.orchestrator.isRunning { await pause(0.25) }
            check(model.orchestrator.currentRun?.errorMessage != nil, "unreachable provider reports an error: \(model.orchestrator.currentRun?.errorMessage ?? "none")")
            capture("10-error")

            model.collapse()
            await pause()
            try? FileManager.default.removeItem(at: model.fileStore.directory)
            print(failures.isEmpty ? "SMOKE TEST PASSED" : "SMOKE TEST FAILED: \(failures.joined(separator: "; "))")
            exit(failures.isEmpty ? 0 : 1)
        }
    }

    /// Captures a window as the window server composites it, using the system
    /// `screencapture` tool. Best effort: it needs screen-recording access, which
    /// CI runners normally have; returns false when nothing was written.
    private static func captureWindow(_ window: NSWindow, to url: URL) async -> Bool {
        try? FileManager.default.removeItem(at: url)
        let result = try? await ProcessRunner.run("/usr/sbin/screencapture", ["-x", "-o", "-l\(window.windowNumber)", url.path], timeout: 10)
        return result?.status == 0 && FileManager.default.fileExists(atPath: url.path)
    }

    /// Clearly labelled sample content for the smoke test's temporary directory.
    private static func seed(_ model: AppModel) {
        let services = model.services
        let calendar = Calendar.current
        let now = Date()
        model.saveAPIKey("sk-ant-smoke-test-placeholder", for: .anthropic)
        _ = try? services.tasks.create(title: "Finish economics essay", notes: "Sections 2 and 3", priority: .high, due: DateCoding.ParsedDate(date: calendar.date(bySettingHour: 17, minute: 0, second: 0, of: now)!, hasTime: true))
        _ = try? services.tasks.create(title: "Read chapter 4", priority: .medium, due: DateCoding.ParsedDate(date: calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))!, hasTime: false))
        _ = try? services.tasks.create(title: "Email tutor about extension", priority: .low, due: DateCoding.ParsedDate(date: calendar.date(byAdding: .day, value: -1, to: calendar.startOfDay(for: now))!, hasTime: false))
        if let done = try? services.tasks.create(title: "Book library room") { _ = try? services.tasks.setCompleted(done.id, true) }
        _ = try? services.notes.create(title: "Lecture 5 — Elasticity", body: "Price elasticity of demand measures responsiveness…\n- Elastic vs inelastic\n- Cross-price elasticity")
        _ = try? services.notes.create(title: "Essay outline", body: "1. Introduction\n2. Market failure\n3. Policy responses")
        _ = try? services.memory.add("Prefers short, direct answers", category: .preference, source: .user)
        model.startTimer(minutes: 25, kind: .focus, label: "Economics essay")

        // A finished sample exchange so the transcript renders messages and tool chips.
        let session = model.session
        let runID = UUID()
        let user = ConversationTurn(role: .user, blocks: [.context("<context>sample</context>"), .text("Give me 25 minutes to finish my economics essay, then remind me to take a break.")], createdAt: now)
        let assistant = ConversationTurn(role: .assistant, blocks: [
            .progress("Setting up a focus session and adding the essay to your tasks."),
            .toolUse(ToolUseBlock(id: "sample_1", name: "start_timer", input: ["minutes": 25])),
            .toolUse(ToolUseBlock(id: "sample_2", name: "create_task", input: ["title": "Finish economics essay"])),
        ], createdAt: now)
        let results = ConversationTurn(role: .user, blocks: [
            .toolResult(ToolResultBlock(toolUseID: "sample_1", toolName: "start_timer", content: "{}", isError: false)),
            .toolResult(ToolResultBlock(toolUseID: "sample_2", toolName: "create_task", content: "{}", isError: false)),
        ], createdAt: now)
        let answer = ConversationTurn(role: .assistant, blocks: [.text("Your **25-minute focus session** has started and *Finish economics essay* is on your list.\n\n- I'll suggest a 5-minute break when it ends\n- Ask me to pause or extend it any time")], createdAt: now)
        for turn in [user, assistant, results, answer] { session.appendForPreview(turn) }
        session.recordForPreview(ActionRecord(conversationID: session.id, runID: runID, toolUseID: "sample_1", toolName: "start_timer", title: "Start 25-minute timer for “Economics essay”", argumentsPreview: "", status: .succeeded, resultSummary: "Started 25-minute focus timer", startedAt: now, finishedAt: now))
        session.recordForPreview(ActionRecord(conversationID: session.id, runID: runID, toolUseID: "sample_2", toolName: "create_task", title: "Create task “Finish economics essay”", argumentsPreview: "", status: .succeeded, resultSummary: "Created task", startedAt: now, finishedAt: now))
        for record in session.conversation.actions { services.activity.upsert(record) }
    }
}
