import Foundation
#if canImport(os)
import os
#endif

/// Central logger. All messages pass through `Redactor` so credentials never
/// reach the unified log or the console, even if an error message echoes them.
public enum AppLog {
    public enum Category: String {
        case app, agent, provider, tools, storage, ui, scheduler, integration
    }

    public static func info(_ message: @autoclosure () -> String, category: Category = .app) {
        emit(message(), category: category, level: "info")
    }

    public static func error(_ message: @autoclosure () -> String, category: Category = .app) {
        emit(message(), category: category, level: "error")
    }

    public static func debug(_ message: @autoclosure () -> String, category: Category = .app) {
        #if DEBUG
        emit(message(), category: category, level: "debug")
        #endif
    }

    /// Set to true by the CLI to mirror logs to stderr.
    nonisolated(unsafe) public static var mirrorToStandardError = false

    private static func emit(_ message: String, category: Category, level: String) {
        let safe = Redactor.redact(message)
        #if canImport(os)
        let logger = Logger(subsystem: "app.notchpilot", category: category.rawValue)
        switch level {
        case "error": logger.error("\(safe, privacy: .public)")
        case "debug": logger.debug("\(safe, privacy: .public)")
        default: logger.info("\(safe, privacy: .public)")
        }
        #endif
        if mirrorToStandardError {
            FileHandle.standardError.write(Data("[\(level)] [\(category.rawValue)] \(safe)\n".utf8))
        }
    }
}

/// Masks strings that look like API keys or bearer tokens.
public enum Redactor {
    private static let patterns: [NSRegularExpression] = {
        let sources = [
            #"sk-ant-[A-Za-z0-9_\-]{8,}"#,
            #"sk-(proj-)?[A-Za-z0-9_\-]{16,}"#,
            #"(?i)bearer\s+[A-Za-z0-9._\-]{12,}"#,
            #"(?i)(x-api-key|api[_-]?key|authorization)("?\s*[:=]\s*"?)[^\s",}]{8,}"#,
        ]
        return sources.compactMap { try? NSRegularExpression(pattern: $0) }
    }()

    public static func redact(_ text: String) -> String {
        var result = text
        for pattern in patterns {
            let range = NSRange(result.startIndex..., in: result)
            if pattern.numberOfCaptureGroups >= 2 {
                result = pattern.stringByReplacingMatches(in: result, range: range, withTemplate: "$1$2[REDACTED]")
            } else {
                result = pattern.stringByReplacingMatches(in: result, range: range, withTemplate: "[REDACTED]")
            }
        }
        return result
    }
}
