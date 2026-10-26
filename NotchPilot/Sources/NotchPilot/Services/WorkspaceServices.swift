import AppKit
import Foundation
import NotchPilotCore
import PDFKit
import UniformTypeIdentifiers

/// Opening apps and links, and writing to the clipboard, via NSWorkspace/NSPasteboard.
@MainActor
final class WorkspaceActions: AppLauncher, URLOpener, ClipboardWriter {
    private static let searchDirectories: [URL] = {
        let fm = FileManager.default
        var dirs = [
            URL(fileURLWithPath: "/Applications"),
            URL(fileURLWithPath: "/Applications/Utilities"),
            URL(fileURLWithPath: "/System/Applications"),
            URL(fileURLWithPath: "/System/Applications/Utilities"),
        ]
        if let home = fm.urls(for: .applicationDirectory, in: .userDomainMask).first { dirs.append(home) }
        return dirs
    }()

    private static let aliases: [String: String] = [
        "vscode": "Visual Studio Code", "vs code": "Visual Studio Code", "code": "Visual Studio Code",
        "chrome": "Google Chrome", "word": "Microsoft Word", "excel": "Microsoft Excel", "powerpoint": "Microsoft PowerPoint",
        "outlook": "Microsoft Outlook", "teams": "Microsoft Teams", "settings": "System Settings", "system preferences": "System Settings",
        "itunes": "Music", "apple music": "Music", "mail app": "Mail", "app store": "App Store", "facetime": "FaceTime",
    ]

    func installedApplications(matching query: String?) -> [String] {
        var names = Set<String>()
        for directory in Self.searchDirectories {
            let items = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
            for item in items where item.pathExtension == "app" {
                names.insert(item.deletingPathExtension().lastPathComponent)
            }
        }
        let sorted = names.sorted()
        guard let query, !query.isEmpty else { return sorted }
        return sorted.filter { $0.localizedCaseInsensitiveContains(query) }
    }

    func resolveApplication(named rawName: String) throws -> URL {
        let name = rawName.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ".app", with: "")
        let lowered = name.lowercased()
        if ["browser", "web browser", "default browser", "my browser"].contains(lowered),
           let url = NSWorkspace.shared.urlForApplication(toOpen: URL(string: "https://example.com")!) {
            return url
        }
        let target = (Self.aliases[lowered] ?? name).lowercased()
        var candidates: [URL] = []
        for directory in Self.searchDirectories {
            let items = (try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []
            candidates += items.filter { $0.pathExtension == "app" }
        }
        func appName(_ url: URL) -> String { url.deletingPathExtension().lastPathComponent.lowercased() }
        if let exact = candidates.first(where: { appName($0) == target }) { return exact }
        if let prefix = candidates.filter({ appName($0).hasPrefix(target) }).min(by: { appName($0).count < appName($1).count }) { return prefix }
        if let contains = candidates.filter({ appName($0).contains(target) }).min(by: { appName($0).count < appName($1).count }) { return contains }
        let suggestions = installedApplications(matching: String(target.prefix(3))).prefix(5)
        throw ToolError.failed("No installed app named “\(rawName)” was found." + (suggestions.isEmpty ? "" : " Similar: \(suggestions.joined(separator: ", "))."))
    }

    func openApplication(named name: String) async throws -> String {
        let url = try resolveApplication(named: name)
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        do {
            let app = try await NSWorkspace.shared.openApplication(at: url, configuration: configuration)
            return app.localizedName ?? url.deletingPathExtension().lastPathComponent
        } catch {
            throw ToolError.failed("macOS could not open \(url.deletingPathExtension().lastPathComponent): \(error.localizedDescription)")
        }
    }

    func open(_ url: URL) async throws {
        guard NSWorkspace.shared.open(url) else {
            throw ToolError.failed("macOS could not open \(url.absoluteString).")
        }
    }

    func write(_ text: String) throws {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        guard pasteboard.setString(text, forType: .string) else { throw ToolError.failed("Could not write to the clipboard.") }
    }
}

/// The Shortcuts app's command-line interface (`/usr/bin/shortcuts`).
@MainActor
final class ShortcutsService: ShortcutsRunner {
    private let executable = "/usr/bin/shortcuts"

    func listShortcuts() async throws -> [String] {
        guard FileManager.default.isExecutableFile(atPath: executable) else { throw ToolError.unsupported("The Shortcuts command-line tool is not available.") }
        let result = try await ProcessRunner.run(executable, ["list"], timeout: 20)
        guard result.status == 0 else { throw ToolError.failed(result.error.isEmpty ? "shortcuts list failed" : result.error) }
        return result.output.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
    }

    func runShortcut(named name: String, input: String?) async throws -> String {
        guard FileManager.default.isExecutableFile(atPath: executable) else { throw ToolError.unsupported("The Shortcuts command-line tool is not available.") }
        let available = try await listShortcuts()
        guard available.contains(name) else {
            throw ToolError.failed("There is no Shortcut named “\(name)”.")
        }
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("notchpilot-shortcut-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let outputURL = directory.appendingPathComponent("output.txt")
        var arguments = ["run", name, "--output-path", outputURL.path, "--output-type", "public.plain-text"]
        if let input {
            let inputURL = directory.appendingPathComponent("input.txt")
            try input.write(to: inputURL, atomically: true, encoding: .utf8)
            arguments += ["--input-path", inputURL.path]
        }
        let result = try await ProcessRunner.run(executable, arguments, timeout: 110)
        guard result.status == 0 else {
            throw ToolError.failed(result.error.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty ?? "The Shortcut failed.")
        }
        return (try? String(contentsOf: outputURL, encoding: .utf8)) ?? result.output
    }
}

/// Apple's NSDataDetector combined with the portable rule-based extractor.
struct MacDateExtractor: DateExtracting {
    func extractDates(from text: String, reference: Date) -> [ExtractedDate] {
        var results: [ExtractedDate] = []
        if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue) {
            for match in detector.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
                guard let date = match.date, let range = Range(match.range, in: text) else { continue }
                let matched = String(text[range])
                let hasTime = matched.range(of: #"\d:\d\d|\d\s?(am|pm)|noon|midnight|tonight"#, options: [.regularExpression, .caseInsensitive]) != nil
                results.append(ExtractedDate(matchedText: matched, date: date, hasTime: hasTime))
            }
        }
        // Add phrases the system detector does not resolve (e.g. "next week", "in 3 days").
        for item in RuleBasedDateExtractor().extractDates(from: text, reference: reference)
        where !results.contains(where: { $0.matchedText.localizedCaseInsensitiveContains(item.matchedText) || item.matchedText.localizedCaseInsensitiveContains($0.matchedText) }) {
            results.append(item)
        }
        return results
    }
}

/// Reads documents the user explicitly picks.
enum DocumentImporter {
    static let maximumCharacters = 200_000

    static var allowedTypes: [UTType] {
        var types: [UTType] = [.plainText, .text, .pdf, .rtf, .rtfd, .html, .commaSeparatedText, .json, .sourceCode, .xml]
        for identifier in ["net.daringfireball.markdown", "org.openxmlformats.wordprocessingml.document", "org.oasis-open.opendocument.text", "com.microsoft.word.doc"] {
            if let type = UTType(identifier) { types.append(type) }
        }
        return types
    }

    @MainActor
    static func choose(level: NSWindow.Level) -> [URL] {
        let panel = NSOpenPanel()
        panel.title = "Attach documents for NotchPilot"
        panel.message = "The text of the selected documents is sent to your AI provider with your next message."
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.allowedContentTypes = allowedTypes
        panel.level = NSWindow.Level(rawValue: level.rawValue + 1)
        NSApp.activate()
        return panel.runModal() == .OK ? panel.urls : []
    }

    static func load(_ url: URL) throws -> DocumentAttachment {
        let text: String
        let type = UTType(filenameExtension: url.pathExtension)
        if type?.conforms(to: .pdf) == true {
            guard let document = PDFDocument(url: url), let string = document.string else {
                throw ToolError.failed("Could not read text from \(url.lastPathComponent) (it may be a scanned PDF).")
            }
            text = string
        } else if let type, type.conforms(to: .rtf) || type.conforms(to: .rtfd) || type.conforms(to: .html) || ["docx", "doc", "odt"].contains(url.pathExtension.lowercased()) {
            let attributed = try NSAttributedString(url: url, options: [:], documentAttributes: nil)
            text = attributed.string
        } else {
            if let utf8 = try? String(contentsOf: url, encoding: .utf8) {
                text = utf8
            } else {
                text = try String(contentsOf: url, encoding: .isoLatin1)
            }
        }
        let clean = text.replacingOccurrences(of: "\r\n", with: "\n")
        guard !clean.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ToolError.failed("\(url.lastPathComponent) has no readable text.")
        }
        return DocumentAttachment(fileName: url.lastPathComponent, text: String(clean.prefix(maximumCharacters)), totalCharacters: clean.count)
    }
}
