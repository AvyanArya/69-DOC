import Foundation
import Observation

/// App-owned tasks.
@MainActor
@Observable
public final class TaskStore {
    public private(set) var tasks: [TaskItem] = []

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored private let clock: AppClock
    @ObservationIgnored private let fileName = "tasks.json"
    /// Called after every successful change (used to reschedule deadline reminders).
    @ObservationIgnored public var onChange: (() -> Void)?

    public init(fileStore: FileStore, clock: AppClock = SystemClock()) {
        self.fileStore = fileStore
        self.clock = clock
        tasks = fileStore.load([TaskItem].self, from: fileName) ?? []
    }

    public enum StatusFilter: String, Sendable {
        case open, completed, all
    }

    /// Open tasks first (overdue, then by due date, then priority), then completed.
    public var sortedTasks: [TaskItem] {
        tasks.sorted(by: TaskStore.ordering)
    }

    public var openTasks: [TaskItem] {
        sortedTasks.filter { !$0.isCompleted }
    }

    nonisolated static func ordering(_ a: TaskItem, _ b: TaskItem) -> Bool {
        if a.isCompleted != b.isCompleted { return !a.isCompleted }
        switch (a.dueDate, b.dueDate) {
        case let (x?, y?) where x != y: return x < y
        case (.some, nil): return true
        case (nil, .some): return false
        default: break
        }
        if a.priority != b.priority { return a.priority > b.priority }
        return a.createdAt < b.createdAt
    }

    public func task(_ rawID: String) throws -> TaskItem {
        try ShortID.resolve(rawID, in: tasks, id: \.id, kind: "task")
    }

    @discardableResult
    public func create(
        title: String, notes: String = "", priority: TaskPriority = .medium,
        due: DateCoding.ParsedDate? = nil, tags: [String] = [], source: ItemSource = .user
    ) throws -> TaskItem {
        guard let cleanTitle = title.nilIfBlank else { throw StoreError.invalid("A task needs a title.") }
        let item = TaskItem(
            title: cleanTitle, notes: notes, priority: priority, dueDate: due?.date, dueHasTime: due?.hasTime ?? false,
            tags: tags, createdAt: clock.now(), source: source
        )
        try commit { $0.append(item) }
        return item
    }

    @discardableResult
    public func update(_ id: UUID, _ change: (inout TaskItem) -> Void) throws -> TaskItem {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "task", id: ShortID.make(id))
        }
        var item = tasks[index]
        change(&item)
        guard item.title.nilIfBlank != nil else { throw StoreError.invalid("A task needs a title.") }
        item.updatedAt = clock.now()
        try commit { $0[index] = item }
        return item
    }

    @discardableResult
    public func setCompleted(_ id: UUID, _ completed: Bool) throws -> TaskItem {
        let now = clock.now()
        return try update(id) { item in
            item.isCompleted = completed
            item.completedAt = completed ? now : nil
        }
    }

    @discardableResult
    public func delete(_ id: UUID) throws -> TaskItem {
        guard let index = tasks.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "task", id: ShortID.make(id))
        }
        let removed = tasks[index]
        try commit { $0.remove(at: index) }
        return removed
    }

    public func deleteAll() throws {
        try commit { $0.removeAll() }
    }

    public func search(query: String? = nil, status: StatusFilter = .open, dueBefore: Date? = nil, limit: Int = 50) -> [TaskItem] {
        sortedTasks.filter { item in
            switch status {
            case .open where item.isCompleted: return false
            case .completed where !item.isCompleted: return false
            default: break
            }
            if let dueBefore {
                guard let due = item.dueDate, due <= dueBefore else { return false }
            }
            if let query, !query.isEmpty {
                return TextUtilities.matches(query, in: [item.title, item.notes] + item.tags)
            }
            return true
        }
        .prefix(limit)
        .map { $0 }
    }

    private func commit(_ mutation: (inout [TaskItem]) -> Void) throws {
        var updated = tasks
        mutation(&updated)
        do {
            try fileStore.save(updated, to: fileName)
        } catch {
            throw StoreError.persistenceFailed(error.localizedDescription)
        }
        tasks = updated
        onChange?()
    }
}

/// App-owned notes.
@MainActor
@Observable
public final class NoteStore {
    public private(set) var notes: [Note] = []

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored private let clock: AppClock
    @ObservationIgnored private let fileName = "notes.json"

    public init(fileStore: FileStore, clock: AppClock = SystemClock()) {
        self.fileStore = fileStore
        self.clock = clock
        notes = fileStore.load([Note].self, from: fileName) ?? []
    }

    /// Pinned first, then most recently edited.
    public var sortedNotes: [Note] {
        notes.sorted { a, b in
            if a.pinned != b.pinned { return a.pinned }
            return a.updatedAt > b.updatedAt
        }
    }

    public func note(_ rawID: String) throws -> Note {
        try ShortID.resolve(rawID, in: notes, id: \.id, kind: "note")
    }

    @discardableResult
    public func create(title: String, body: String, source: ItemSource = .user) throws -> Note {
        let cleanTitle = title.nilIfBlank ?? TextUtilities.preview(body, limit: 40).nilIfBlank ?? "Untitled note"
        let note = Note(title: cleanTitle, body: body, createdAt: clock.now(), source: source)
        try commit { $0.append(note) }
        return note
    }

    @discardableResult
    public func update(_ id: UUID, _ change: (inout Note) -> Void) throws -> Note {
        guard let index = notes.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "note", id: ShortID.make(id))
        }
        var note = notes[index]
        change(&note)
        if note.title.nilIfBlank == nil { note.title = "Untitled note" }
        note.updatedAt = clock.now()
        try commit { $0[index] = note }
        return note
    }

    @discardableResult
    public func delete(_ id: UUID) throws -> Note {
        guard let index = notes.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "note", id: ShortID.make(id))
        }
        let removed = notes[index]
        try commit { $0.remove(at: index) }
        return removed
    }

    public func deleteAll() throws {
        try commit { $0.removeAll() }
    }

    public func search(_ query: String?, limit: Int = 30) -> [Note] {
        sortedNotes.filter { note in
            guard let query, !query.isEmpty else { return true }
            return TextUtilities.matches(query, in: [note.title, note.body])
        }
        .prefix(limit)
        .map { $0 }
    }

    private func commit(_ mutation: (inout [Note]) -> Void) throws {
        var updated = notes
        mutation(&updated)
        do {
            try fileStore.save(updated, to: fileName)
        } catch {
            throw StoreError.persistenceFailed(error.localizedDescription)
        }
        notes = updated
    }
}

/// User-approved long-term memories.
@MainActor
@Observable
public final class MemoryStore {
    public private(set) var items: [MemoryItem] = []

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored private let clock: AppClock
    @ObservationIgnored private let fileName = "memories.json"

    public init(fileStore: FileStore, clock: AppClock = SystemClock()) {
        self.fileStore = fileStore
        self.clock = clock
        items = fileStore.load([MemoryItem].self, from: fileName) ?? []
    }

    public var sortedItems: [MemoryItem] {
        items.sorted { $0.updatedAt > $1.updatedAt }
    }

    public func item(_ rawID: String) throws -> MemoryItem {
        try ShortID.resolve(rawID, in: items, id: \.id, kind: "memory")
    }

    @discardableResult
    public func add(_ content: String, category: MemoryCategory, source: ItemSource) throws -> MemoryItem {
        guard let clean = content.nilIfBlank else { throw StoreError.invalid("A memory cannot be empty.") }
        // Avoid storing exact duplicates.
        if let existing = items.first(where: { $0.content.caseInsensitiveCompare(clean) == .orderedSame }) {
            return existing
        }
        let item = MemoryItem(content: clean, category: category, createdAt: clock.now(), source: source)
        try commit { $0.append(item) }
        return item
    }

    @discardableResult
    public func update(_ id: UUID, content: String, category: MemoryCategory) throws -> MemoryItem {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "memory", id: ShortID.make(id))
        }
        guard let clean = content.nilIfBlank else { throw StoreError.invalid("A memory cannot be empty.") }
        var item = items[index]
        item.content = clean
        item.category = category
        item.updatedAt = clock.now()
        try commit { $0[index] = item }
        return item
    }

    @discardableResult
    public func delete(_ id: UUID) throws -> MemoryItem {
        guard let index = items.firstIndex(where: { $0.id == id }) else {
            throw StoreError.notFound(kind: "memory", id: ShortID.make(id))
        }
        let removed = items[index]
        try commit { $0.remove(at: index) }
        return removed
    }

    public func deleteAll() throws {
        try commit { $0.removeAll() }
    }

    public func search(_ query: String?, category: MemoryCategory? = nil, limit: Int = 20) -> [MemoryItem] {
        sortedItems.filter { item in
            if let category, item.category != category { return false }
            guard let query, !query.isEmpty else { return true }
            return TextUtilities.matches(query, in: [item.content])
                || !TextUtilities.tokens(query).isDisjoint(with: TextUtilities.tokens(item.content))
        }
        .prefix(limit)
        .map { $0 }
    }

    /// Memories worth sending with a request: all preferences plus the items
    /// that share words with the message, capped by count and size so only
    /// relevant context leaves the device.
    public func relevant(to text: String, limit: Int = 10, characterBudget: Int = 2_000) -> [MemoryItem] {
        let queryTokens = TextUtilities.tokens(text)
        let scored: [(MemoryItem, Int)] = sortedItems.map { item in
            let overlap = TextUtilities.tokens(item.content).intersection(queryTokens).count
            let base = item.category == .preference ? 100 : 0
            return (item, base + overlap * 10)
        }
        var selected: [MemoryItem] = []
        var used = 0
        for (item, score) in scored.sorted(by: { $0.1 > $1.1 }) where score > 0 {
            guard selected.count < limit, used + item.content.count <= characterBudget else { break }
            selected.append(item)
            used += item.content.count
        }
        return selected
    }

    private func commit(_ mutation: (inout [MemoryItem]) -> Void) throws {
        var updated = items
        mutation(&updated)
        do {
            try fileStore.save(updated, to: fileName)
        } catch {
            throw StoreError.persistenceFailed(error.localizedDescription)
        }
        items = updated
    }
}

/// App settings and assistant-visible preferences.
@MainActor
@Observable
public final class SettingsStore {
    public private(set) var settings: AppSettings
    public private(set) var preferences: UserPreferences

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored public var onSettingsChange: ((AppSettings) -> Void)?

    public init(fileStore: FileStore) {
        self.fileStore = fileStore
        settings = fileStore.loadMerging(AppSettings.self, from: "settings.json", defaults: AppSettings())
        preferences = fileStore.loadMerging(UserPreferences.self, from: "preferences.json", defaults: UserPreferences())
    }

    public func updateSettings(_ change: (inout AppSettings) -> Void) {
        var updated = settings
        change(&updated)
        guard updated != settings else { return }
        settings = updated
        do {
            try fileStore.save(updated, to: "settings.json")
        } catch {
            AppLog.error("Saving settings failed: \(error)", category: .storage)
        }
        onSettingsChange?(updated)
    }

    @discardableResult
    public func updatePreferences(_ change: (inout UserPreferences) -> Void) throws -> UserPreferences {
        var updated = preferences
        change(&updated)
        do {
            try fileStore.save(updated, to: "preferences.json")
        } catch {
            throw StoreError.persistenceFailed(error.localizedDescription)
        }
        preferences = updated
        return updated
    }

    public func resetPreferences() throws {
        try updatePreferences { $0 = UserPreferences() }
    }
}

/// Persistent record of agent actions across conversations.
@MainActor
@Observable
public final class ActionLogStore {
    public private(set) var records: [ActionRecord] = []

    @ObservationIgnored private let fileStore: FileStore
    @ObservationIgnored private let fileName = "activity.json"
    @ObservationIgnored public let maximumRecords: Int

    public init(fileStore: FileStore, maximumRecords: Int = 500) {
        self.fileStore = fileStore
        self.maximumRecords = maximumRecords
        records = fileStore.load([ActionRecord].self, from: fileName) ?? []
    }

    public func upsert(_ record: ActionRecord) {
        if let index = records.firstIndex(where: { $0.id == record.id }) {
            records[index] = record
        } else {
            records.insert(record, at: 0)
            if records.count > maximumRecords { records.removeLast(records.count - maximumRecords) }
        }
        persist()
    }

    public func clear() {
        records.removeAll()
        persist()
    }

    private func persist() {
        do {
            try fileStore.save(records, to: fileName)
        } catch {
            AppLog.error("Saving activity log failed: \(error)", category: .storage)
        }
    }
}
