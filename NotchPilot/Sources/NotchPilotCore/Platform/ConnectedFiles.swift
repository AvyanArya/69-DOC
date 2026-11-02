import Foundation

public struct FileActivity: Sendable, Equatable {
    public var name: String
    public var path: String
    /// The connected folder the file is in.
    public var folder: String
    public var modified: Date
    public var size: Int
}

/// Read-only access to the folders the user connected in Settings → Briefing.
/// Everything is confined to those folders: paths are resolved (symlinks and
/// `..` included) and rejected unless they stay inside one of them. Hidden
/// files, app bundles and dependency or build folders are skipped, and scans
/// stop after a fixed number of entries so a huge folder can't stall the app.
public struct ConnectedFiles {
    public let folders: [URL]

    /// Extensions read as text (search inside, read_file).
    public static let textExtensions: Set<String> = [
        "txt", "md", "markdown", "csv", "tsv", "json", "yaml", "yml", "xml", "html", "htm", "css", "log", "ini", "toml",
        "swift", "py", "js", "ts", "tsx", "jsx", "java", "kt", "c", "h", "cpp", "m", "go", "rs", "rb", "php", "sh", "sql", "tex", "rtf",
    ]
    static let skippedFolders: Set<String> = ["node_modules", "Library", "build", "DerivedData", "Pods", "vendor", "__pycache__", "venv"]
    static let maxDepth = 6
    static let maxEntries = 20_000
    static let maxTextBytes = 2_000_000

    public init(paths: [String]) {
        folders = paths.map { URL(fileURLWithPath: ($0 as NSString).expandingTildeInPath).resolvingSymlinksInPath().standardizedFileURL }
    }

    public var isEmpty: Bool { folders.isEmpty }

    /// Whether `url` resolves to somewhere inside a connected folder.
    public func contains(_ url: URL) -> Bool {
        folder(containing: url) != nil
    }

    private func folder(containing url: URL) -> URL? {
        let path = url.resolvingSymlinksInPath().standardizedFileURL.path
        return folders.first { path == $0.path || path.hasPrefix($0.path.hasSuffix("/") ? $0.path : $0.path + "/") }
    }

    /// Files changed since `since`, newest first.
    public func recent(since: Date, limit: Int = 20) -> [FileActivity] {
        var found: [FileActivity] = []
        walk { activity in if activity.modified >= since { found.append(activity) } }
        return Array(found.sorted { $0.modified > $1.modified }.prefix(limit))
    }

    /// Files whose name — or, for text files, contents — contain `query`.
    public func search(_ query: String, limit: Int = 20) -> [(file: FileActivity, snippet: String?)] {
        let needle = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !needle.isEmpty else { return [] }
        var results: [(FileActivity, String?)] = []
        var contentReads = 0
        walk { activity in
            guard results.count < limit else { return }
            if activity.name.localizedCaseInsensitiveContains(needle) {
                results.append((activity, nil))
            } else if contentReads < 400, Self.isText(activity.name), activity.size <= 512_000,
                      let text = try? String(contentsOfFile: activity.path, encoding: .utf8) {
                contentReads += 1
                if let range = text.range(of: needle, options: .caseInsensitive) {
                    results.append((activity, Self.snippet(text, around: range)))
                }
            }
        }
        return results.map { (file: $0.0, snippet: $0.1) }
    }

    /// The text of a file inside a connected folder (first `maxCharacters`), and its full length.
    public func readText(_ path: String, maxCharacters: Int) throws -> (text: String, total: Int) {
        let url = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
        guard folder(containing: url) != nil else {
            throw ToolError.notAuthorized("That file isn't in a folder you've connected. Connect its folder in Settings → Briefing.")
        }
        guard Self.isText(url.lastPathComponent) else {
            throw ToolError.unsupported("Only text files can be read (for example .txt, .md, .csv or code).")
        }
        let size = ((try? FileManager.default.attributesOfItem(atPath: url.path)[.size]) as? NSNumber)?.intValue ?? 0
        guard size <= Self.maxTextBytes else { throw ToolError.failed("That file is too large to read (\(size / 1_000_000) MB).") }
        guard let text = (try? String(contentsOf: url, encoding: .utf8)) ?? (try? String(contentsOf: url, encoding: .isoLatin1)) else {
            throw ToolError.failed("Couldn't read \(url.lastPathComponent).")
        }
        return (String(text.prefix(maxCharacters)), text.count)
    }

    static func isText(_ name: String) -> Bool {
        textExtensions.contains((name as NSString).pathExtension.lowercased())
    }

    static func snippet(_ text: String, around range: Range<String.Index>) -> String {
        let start = text.index(range.lowerBound, offsetBy: -60, limitedBy: text.startIndex) ?? text.startIndex
        let end = text.index(range.upperBound, offsetBy: 60, limitedBy: text.endIndex) ?? text.endIndex
        return text[start..<end].replacingOccurrences(of: "\n", with: " ").trimmingCharacters(in: .whitespaces)
    }

    private func walk(_ visit: (FileActivity) -> Void) {
        let keys: [URLResourceKey] = [.isRegularFileKey, .isDirectoryKey, .contentModificationDateKey, .fileSizeKey]
        var seen = 0
        for folder in folders {
            guard let enumerator = FileManager.default.enumerator(at: folder, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles, .skipsPackageDescendants]) else { continue }
            let baseDepth = folder.pathComponents.count
            for case let url as URL in enumerator {
                seen += 1
                if seen > Self.maxEntries { return }
                let values = try? url.resourceValues(forKeys: Set(keys))
                if values?.isDirectory == true {
                    if Self.skippedFolders.contains(url.lastPathComponent) || url.pathComponents.count - baseDepth >= Self.maxDepth {
                        enumerator.skipDescendants()
                    }
                    continue
                }
                guard values?.isRegularFile == true, let modified = values?.contentModificationDate else { continue }
                visit(FileActivity(name: url.lastPathComponent, path: url.path, folder: folder.lastPathComponent, modified: modified, size: values?.fileSize ?? 0))
            }
        }
    }
}
