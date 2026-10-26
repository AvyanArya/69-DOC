import Foundation

/// Shared JSON coding configuration for everything NotchPilot writes to disk.
public enum StorageCoding {
    public static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .custom { date, encoder in
            var container = encoder.singleValueContainer()
            try container.encode(storageString(date))
        }
        return encoder
    }

    public static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let text = try container.decode(String.self)
            if let date = parseStorageString(text) { return date }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date: \(text)")
        }
        return decoder
    }

    /// ISO 8601 in UTC with milliseconds, so timer end dates survive restarts precisely.
    public static func storageString(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: date)
    }

    public static func parseStorageString(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: text) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: text) { return date }
        return DateCoding.parseFlexible(text)?.date
    }
}

/// Atomic JSON file persistence rooted at the app's data directory.
///
/// Writes go to a temporary file and are moved into place, so a crash never
/// leaves a half-written file. A file that cannot be decoded is moved aside
/// (`name.corrupt-<timestamp>.json`) rather than silently overwritten.
public final class FileStore: @unchecked Sendable {
    public let directory: URL
    private let lock = NSLock()

    public init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    /// `~/Library/Application Support/NotchPilot` on macOS, `~/.notchpilot` elsewhere.
    public static func defaultDirectory() -> URL {
        #if os(macOS)
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("NotchPilot", isDirectory: true)
        #else
        return URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent(".notchpilot", isDirectory: true)
        #endif
    }

    public func url(for name: String) -> URL {
        directory.appendingPathComponent(name)
    }

    public func exists(_ name: String) -> Bool {
        FileManager.default.fileExists(atPath: url(for: name).path)
    }

    /// Loads and decodes a file. Returns nil if it does not exist; quarantines it if corrupt.
    public func load<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = url(for: name)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        do {
            return try StorageCoding.makeDecoder().decode(T.self, from: data)
        } catch {
            quarantine(fileURL, error: error)
            return nil
        }
    }

    /// Loads settings-like values, filling keys added in newer versions from `defaults`.
    public func loadMerging<T: Codable>(_ type: T.Type, from name: String, defaults: T) -> T {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = url(for: name)
        guard let data = try? Data(contentsOf: fileURL) else { return defaults }
        do {
            return try DefaultsMerging.decode(T.self, from: data, defaults: defaults)
        } catch {
            quarantine(fileURL, error: error)
            return defaults
        }
    }

    public func save<T: Encodable>(_ value: T, to name: String) throws {
        let data = try StorageCoding.makeEncoder().encode(value)
        try write(data, to: name)
    }

    public func write(_ data: Data, to name: String) throws {
        lock.lock()
        defer { lock.unlock() }
        let fileURL = url(for: name)
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: fileURL, options: [.atomic])
    }

    public func delete(_ name: String) {
        lock.lock()
        defer { lock.unlock() }
        try? FileManager.default.removeItem(at: url(for: name))
    }

    /// File names (relative to `subdirectory`) with the given extension.
    public func list(_ subdirectory: String, extension ext: String = "json") -> [String] {
        let dir = url(for: subdirectory)
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.filter { $0.hasSuffix(".\(ext)") }.sorted()
    }

    private func quarantine(_ fileURL: URL, error: Error) {
        let stamp = Int(Date().timeIntervalSince1970)
        let target = fileURL.deletingPathExtension().appendingPathExtension("corrupt-\(stamp).json")
        try? FileManager.default.moveItem(at: fileURL, to: target)
        AppLog.error("Could not decode \(fileURL.lastPathComponent); moved to \(target.lastPathComponent): \(error)", category: .storage)
    }
}
