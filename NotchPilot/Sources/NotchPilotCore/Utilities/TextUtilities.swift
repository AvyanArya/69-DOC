import Foundation

public enum TextUtilities {
    /// Truncates to `limit` characters, appending a marker that tells the reader
    /// (human or model) how much was omitted.
    public static func truncate(_ text: String, limit: Int) -> String {
        guard text.count > limit, limit > 0 else { return text }
        let kept = text.prefix(limit)
        return "\(kept)\n…[truncated \(text.count - limit) characters]"
    }

    /// One-line preview for lists and logs.
    public static func preview(_ text: String, limit: Int = 80) -> String {
        let collapsed = text.split(whereSeparator: \.isNewline).joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard collapsed.count > limit else { return collapsed }
        return String(collapsed.prefix(limit - 1)) + "…"
    }

    /// Lower-cased word tokens used for lightweight relevance scoring.
    public static func tokens(_ text: String) -> Set<String> {
        let lowered = text.lowercased()
        var words = Set<String>()
        var current = ""
        for character in lowered {
            if character.isLetter || character.isNumber {
                current.append(character)
            } else if !current.isEmpty {
                if current.count > 2, !stopWords.contains(current) { words.insert(current) }
                current = ""
            }
        }
        if current.count > 2, !stopWords.contains(current) { words.insert(current) }
        return words
    }

    /// Case- and diacritic-insensitive substring match across several fields.
    public static func matches(_ query: String, in fields: [String]) -> Bool {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return true }
        let terms = trimmed.split(separator: " ").map(String.init)
        let haystack = fields.joined(separator: "\n")
        return terms.allSatisfy { term in
            haystack.range(of: term, options: [.caseInsensitive, .diacriticInsensitive]) != nil
        }
    }

    private static let stopWords: Set<String> = [
        "the", "and", "for", "that", "with", "this", "you", "are", "was", "but", "not", "have", "has",
        "can", "what", "when", "will", "your", "from", "please", "about", "into", "then", "than", "them",
        "they", "there", "their", "would", "could", "should", "just", "like", "make", "give", "tell",
    ]
}

extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }
}

extension NSLock {
    /// Scoped locking that is safe to call from async code.
    func sync<T>(_ body: () throws -> T) rethrows -> T {
        lock()
        defer { unlock() }
        return try body()
    }
}
