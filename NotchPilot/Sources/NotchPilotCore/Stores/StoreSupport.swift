import Foundation

public enum StoreError: Error, LocalizedError, Equatable {
    case notFound(kind: String, id: String)
    case ambiguous(kind: String, id: String)
    case invalid(String)
    case persistenceFailed(String)

    public var errorDescription: String? {
        switch self {
        case let .notFound(kind, id): return "No \(kind) with id \"\(id)\" exists."
        case let .ambiguous(kind, id): return "The id \"\(id)\" matches more than one \(kind); use the full id."
        case let .invalid(message): return message
        case let .persistenceFailed(message): return "Could not save: \(message)"
        }
    }
}

/// Short, model-friendly identifiers: the first 8 hex characters of the UUID.
public enum ShortID {
    public static func make(_ id: UUID) -> String {
        String(id.uuidString.lowercased().prefix(8))
    }

    /// Resolves a full UUID or a unique prefix (≥ 6 characters).
    public static func resolve<T>(_ raw: String, in items: [T], id: KeyPath<T, UUID>, kind: String) throws -> T {
        let needle = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if let uuid = UUID(uuidString: needle), let match = items.first(where: { $0[keyPath: id] == uuid }) {
            return match
        }
        guard needle.count >= 6 else { throw StoreError.notFound(kind: kind, id: raw) }
        let matches = items.filter { $0[keyPath: id].uuidString.lowercased().hasPrefix(needle) }
        if matches.count > 1 { throw StoreError.ambiguous(kind: kind, id: raw) }
        guard let match = matches.first else { throw StoreError.notFound(kind: kind, id: raw) }
        return match
    }
}
