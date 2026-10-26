import AppKit
import NotchPilotCore

// Temporary stub used to validate the macOS build pipeline.
if CommandLine.arguments.contains("--smoke-test") {
    print("NotchPilot stub launched; tools: \(MainActor.assumeIsolated { BuiltinTools.makeRegistry().specs.count })")
    exit(0)
}
NSApplication.shared.run()
