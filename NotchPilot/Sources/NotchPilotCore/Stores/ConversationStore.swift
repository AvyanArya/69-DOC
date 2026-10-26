import Foundation
import Observation

/// Conversation history. Each conversation is stored in its own file under
/// `conversations/`, with a lightweight index for the history list.
///
/// History is separate from long-term memory: nothing here is injected into
/// other conversations unless the user saves it as a memory.
@MainActor
@Observable
public final class ConversationStore {
    public private(set) var summaries: [ConversationSummary] = []

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored private var cache: [UUID: Conversation] = [:]
    @ObservationIgnored private let directory = "conversations"
    @ObservationIgnored private let indexName = "conversations/index.json"
    /// When false, conversations live only in memory for this session.
    @ObservationIgnored public var persistenceEnabled: Bool

    public init(fileStore: FileStore, persistenceEnabled: Bool = true) {
        self.fileStore = fileStore
        self.persistenceEnabled = persistenceEnabled
        if let index = fileStore.load([ConversationSummary].self, from: indexName) {
            summaries = index
        } else {
            rebuildIndex()
        }
        sortSummaries()
    }

    private func fileName(_ id: UUID) -> String {
        "\(directory)/\(id.uuidString).json"
    }

    public func conversation(_ id: UUID) -> Conversation? {
        if let cached = cache[id] { return cached }
        guard let loaded = fileStore.load(Conversation.self, from: fileName(id)) else { return nil }
        cache[id] = loaded
        return loaded
    }

    public func save(_ conversation: Conversation) {
        cache[conversation.id] = conversation
        let summary = ConversationSummary(conversation)
        if let index = summaries.firstIndex(where: { $0.id == conversation.id }) {
            summaries[index] = summary
        } else {
            summaries.append(summary)
        }
        sortSummaries()
        guard persistenceEnabled else { return }
        do {
            try fileStore.save(conversation, to: fileName(conversation.id))
            try fileStore.save(summaries, to: indexName)
        } catch {
            AppLog.error("Saving conversation failed: \(error)", category: .storage)
        }
    }

    public func delete(_ id: UUID) {
        cache[id] = nil
        summaries.removeAll { $0.id == id }
        fileStore.delete(fileName(id))
        persistIndex()
    }

    public func deleteAll() {
        for summary in summaries {
            fileStore.delete(fileName(summary.id))
        }
        cache.removeAll()
        summaries.removeAll()
        persistIndex()
    }

    /// Removes on-disk copies when the user turns history off; the current
    /// session's conversations stay available until quit.
    public func purgeDisk() {
        for name in fileStore.list(directory) {
            fileStore.delete("\(directory)/\(name)")
        }
    }

    /// Deletes conversations whose last update is older than `days`.
    @discardableResult
    public func applyRetention(days: Int, now: Date) -> Int {
        guard days > 0 else { return 0 }
        let cutoff = now.addingTimeInterval(-Double(days) * 86_400)
        let expired = summaries.filter { $0.updatedAt < cutoff }
        for summary in expired {
            cache[summary.id] = nil
            fileStore.delete(fileName(summary.id))
        }
        summaries.removeAll { $0.updatedAt < cutoff }
        if !expired.isEmpty { persistIndex() }
        return expired.count
    }

    public struct SearchHit: Equatable, Sendable {
        public let conversationID: UUID
        public let title: String
        public let updatedAt: Date
        public let snippet: String
    }

    /// Full-text search over titles and visible messages.
    public func search(_ query: String, limit: Int = 10, excluding excluded: UUID? = nil) -> [SearchHit] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }
        var hits: [SearchHit] = []
        for summary in summaries where summary.id != excluded {
            guard let conversation = conversation(summary.id) else { continue }
            guard TextUtilities.matches(trimmed, in: [conversation.searchableText]) else { continue }
            let snippet = Self.snippet(for: trimmed, in: conversation)
            hits.append(SearchHit(conversationID: summary.id, title: summary.title, updatedAt: summary.updatedAt, snippet: snippet))
            if hits.count >= limit { break }
        }
        return hits
    }

    private static func snippet(for query: String, in conversation: Conversation) -> String {
        let firstTerm = query.split(separator: " ").first.map(String.init) ?? query
        for turn in conversation.turns {
            let text = turn.visibleText
            if let range = text.range(of: firstTerm, options: [.caseInsensitive, .diacriticInsensitive]) {
                let start = text.index(range.lowerBound, offsetBy: -60, limitedBy: text.startIndex) ?? text.startIndex
                let end = text.index(range.upperBound, offsetBy: 100, limitedBy: text.endIndex) ?? text.endIndex
                let prefix = start == text.startIndex ? "" : "…"
                let suffix = end == text.endIndex ? "" : "…"
                return prefix + TextUtilities.preview(String(text[start..<end]), limit: 200) + suffix
            }
        }
        return TextUtilities.preview(conversation.title)
    }

    private func rebuildIndex() {
        var rebuilt: [ConversationSummary] = []
        for name in fileStore.list(directory) where name != "index.json" {
            if let conversation = fileStore.load(Conversation.self, from: "\(directory)/\(name)") {
                rebuilt.append(ConversationSummary(conversation))
            }
        }
        summaries = rebuilt
        if !rebuilt.isEmpty { persistIndex() }
    }

    private func sortSummaries() {
        summaries.sort { $0.updatedAt > $1.updatedAt }
    }

    private func persistIndex() {
        guard persistenceEnabled else { return }
        do {
            try fileStore.save(summaries, to: indexName)
        } catch {
            AppLog.error("Saving conversation index failed: \(error)", category: .storage)
        }
    }
}
