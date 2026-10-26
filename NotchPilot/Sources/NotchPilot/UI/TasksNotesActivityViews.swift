import NotchPilotCore
import SwiftUI

// MARK: - Tasks

struct TasksView: View {
    @Bindable var model: AppModel
    @State private var newTitle = ""
    @State private var newPriority: TaskPriority = .medium
    @State private var hasDue = false
    @State private var newDue = Calendar.current.date(bySettingHour: 17, minute: 0, second: 0, of: Date()) ?? Date()
    @State private var filter: TaskStore.StatusFilter = .open
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill").foregroundStyle(palette.accent)
                TextField("Add a task", text: $newTitle)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .onSubmit(add)
                Picker("", selection: $newPriority) {
                    ForEach(TaskPriority.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                .labelsHidden()
                .frame(width: 86)
                Toggle("Due", isOn: $hasDue).toggleStyle(.checkbox).font(.system(size: 12))
                if hasDue {
                    DatePicker("", selection: $newDue, displayedComponents: [.date, .hourAndMinute])
                        .labelsHidden()
                        .datePickerStyle(.field)
                        .frame(width: 150)
                }
            }
            .padding(9)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.surface))

            HStack {
                Picker("", selection: $filter) {
                    Text("Open").tag(TaskStore.StatusFilter.open)
                    Text("Done").tag(TaskStore.StatusFilter.completed)
                    Text("All").tag(TaskStore.StatusFilter.all)
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .frame(width: 180)
                Spacer()
                if model.isProviderConfigured {
                    PanelButton(title: "Plan with AI", symbol: "sparkles") {
                        model.ask("Help me plan my week around my deadlines.")
                    }
                }
            }

            let tasks = model.services.tasks.search(status: filter, limit: 500)
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 2) {
                    ForEach(tasks) { task in
                        TaskRow(task: task, model: model, compact: false)
                    }
                    if tasks.isEmpty {
                        VStack(spacing: 6) {
                            Image(systemName: filter == .completed ? "checkmark.seal" : "tray")
                                .font(.system(size: 22))
                                .foregroundStyle(palette.tertiary)
                            Text(filter == .completed ? "No completed tasks yet." : "You're all clear.")
                                .font(.system(size: 13))
                                .foregroundStyle(palette.secondary)
                        }
                        .padding(.top, 30)
                    }
                }
            }
        }
    }

    private func add() {
        let title = newTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !title.isEmpty else { return }
        do {
            try model.services.tasks.create(title: title, priority: newPriority, due: hasDue ? DateCoding.ParsedDate(date: newDue, hasTime: true) : nil)
            newTitle = ""
        } catch {
            model.showToast(error.localizedDescription)
        }
    }
}

struct TaskRow: View {
    let task: TaskItem
    let model: AppModel
    var compact: Bool
    @Environment(\.palette) private var palette
    @State private var hovering = false
    @State private var editing = false
    @State private var confirmDelete = false

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Button {
                _ = try? model.services.tasks.setCompleted(task.id, !task.isCompleted)
            } label: {
                Image(systemName: task.isCompleted ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 15))
                    .foregroundStyle(task.isCompleted ? palette.success : task.priority.color(palette))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(task.isCompleted ? "Mark as not done" : "Mark as done")
            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .font(.system(size: 13))
                    .foregroundStyle(task.isCompleted ? palette.tertiary : palette.primary)
                    .strikethrough(task.isCompleted)
                    .lineLimit(compact ? 1 : 2)
                HStack(spacing: 6) {
                    if let due = Formatters.due(task) {
                        Label(due, systemImage: "calendar")
                            .foregroundStyle(task.isOverdue(at: Date()) ? palette.danger : palette.secondary)
                    }
                    if !compact && !task.notes.isEmpty {
                        Text(task.notes).lineLimit(1).foregroundStyle(palette.tertiary)
                    }
                    if task.source == .assistant {
                        Image(systemName: "sparkles").foregroundStyle(palette.tertiary).help("Created by the assistant")
                    }
                }
                .font(.system(size: 11))
            }
            Spacer(minLength: 0)
            if hovering && !compact {
                IconButton(symbol: "pencil", help: "Edit", size: 11) { editing = true }
                IconButton(symbol: "trash", help: "Delete", size: 11, tint: palette.danger) { confirmDelete = true }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(hovering ? palette.surface : .clear))
        .onHover { hovering = $0 }
        .popover(isPresented: $editing, arrowEdge: .bottom) {
            TaskEditor(task: task, model: model) { editing = false }
        }
        .alert("Delete “\(task.title)”?", isPresented: $confirmDelete) {
            Button("Delete", role: .destructive) { _ = try? model.services.tasks.delete(task.id) }
            Button("Cancel", role: .cancel) {}
        }
    }
}

struct TaskEditor: View {
    let task: TaskItem
    let model: AppModel
    let done: () -> Void
    @State private var title = ""
    @State private var notes = ""
    @State private var priority: TaskPriority = .medium
    @State private var hasDue = false
    @State private var due = Date()

    var body: some View {
        Form {
            TextField("Title", text: $title)
            TextField("Notes", text: $notes, axis: .vertical).lineLimit(2...5)
            Picker("Priority", selection: $priority) {
                ForEach(TaskPriority.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
            }
            Toggle("Due date", isOn: $hasDue)
            if hasDue {
                DatePicker("Due", selection: $due)
            }
            HStack {
                Spacer()
                Button("Cancel", action: done)
                Button("Save") {
                    _ = try? model.services.tasks.update(task.id) { item in
                        item.title = title
                        item.notes = notes
                        item.priority = priority
                        item.dueDate = hasDue ? due : nil
                        item.dueHasTime = hasDue
                    }
                    done()
                }
                .keyboardShortcut(.defaultAction)
            }
        }
        .padding(16)
        .frame(width: 340)
        .onAppear {
            title = task.title
            notes = task.notes
            priority = task.priority
            hasDue = task.dueDate != nil
            due = task.dueDate ?? Date()
        }
    }
}

// MARK: - Notes

struct NotesView: View {
    @Bindable var model: AppModel
    @State private var selection: UUID?
    @State private var query = ""
    @State private var draftTitle = ""
    @State private var draftBody = ""
    @State private var confirmDelete = false
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(spacing: 10) {
            VStack(spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").foregroundStyle(palette.tertiary)
                    TextField("Search", text: $query).textFieldStyle(.plain).font(.system(size: 12))
                    IconButton(symbol: "square.and.pencil", help: "New note", size: 12) { newNote() }
                }
                .padding(7)
                .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(palette.surface))
                ScrollView(showsIndicators: false) {
                    LazyVStack(spacing: 2) {
                        ForEach(model.services.notes.search(query, limit: 200)) { note in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(note.title).font(.system(size: 13, weight: .medium)).foregroundStyle(palette.primary).lineLimit(1)
                                Text(TextUtilities.preview(note.body, limit: 60)).font(.system(size: 11)).foregroundStyle(palette.secondary).lineLimit(1)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                            .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(selection == note.id ? palette.surfaceHover : .clear))
                            .contentShape(Rectangle())
                            .onTapGesture { select(note) }
                        }
                    }
                }
            }
            .frame(width: 190)

            if let note = selectedNote {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        TextField("Title", text: $draftTitle)
                            .textFieldStyle(.plain)
                            .font(.system(size: 15, weight: .semibold))
                            .onSubmit(save)
                        Spacer()
                        IconButton(symbol: "trash", help: "Delete note", size: 11, tint: palette.danger) { confirmDelete = true }
                    }
                    TextEditor(text: $draftBody)
                        .font(.system(size: 13))
                        .scrollContentBackground(.hidden)
                        .padding(6)
                        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(palette.surface))
                        .onChange(of: draftBody) { _, _ in scheduleSave() }
                    HStack(spacing: 6) {
                        Text("Edited \(note.updatedAt.formatted(.relative(presentation: .named)))")
                            .font(.system(size: 11))
                            .foregroundStyle(palette.tertiary)
                        Spacer()
                        if model.isProviderConfigured {
                            PanelButton(title: "Summarise", symbol: "text.append") {
                                save()
                                model.ask("Summarise my note “\(note.title)” (id \(ShortID.make(note.id))) in a few bullet points.")
                            }
                            PanelButton(title: "Make tasks", symbol: "checklist") {
                                save()
                                model.ask("Turn my note “\(note.title)” (id \(ShortID.make(note.id))) into three tasks for tomorrow.")
                            }
                        }
                    }
                }
                .alert("Delete “\(note.title)”?", isPresented: $confirmDelete) {
                    Button("Delete", role: .destructive) {
                        _ = try? model.services.notes.delete(note.id)
                        selection = nil
                    }
                    Button("Cancel", role: .cancel) {}
                }
            } else {
                VStack(spacing: 8) {
                    Image(systemName: "note.text").font(.system(size: 26)).foregroundStyle(palette.tertiary)
                    Text("Select a note or create one.").font(.system(size: 13)).foregroundStyle(palette.secondary)
                    PanelButton(title: "New note", symbol: "plus", prominent: true) { newNote() }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onDisappear(perform: save)
        .onAppear {
            if selection == nil, let first = model.services.notes.sortedNotes.first { select(first) }
        }
    }

    @State private var saveTask: Task<Void, Never>?

    private var selectedNote: Note? {
        guard let selection else { return nil }
        return model.services.notes.notes.first { $0.id == selection }
    }

    private func select(_ note: Note) {
        save()
        selection = note.id
        draftTitle = note.title
        draftBody = note.body
    }

    private func newNote() {
        save()
        if let note = try? model.services.notes.create(title: "New note", body: "") {
            select(note)
        }
    }

    private func scheduleSave() {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 600_000_000)
            guard !Task.isCancelled else { return }
            save()
        }
    }

    private func save() {
        guard let note = selectedNote, note.title != draftTitle || note.body != draftBody else { return }
        _ = try? model.services.notes.update(note.id) { item in
            item.title = draftTitle
            item.body = draftBody
        }
    }
}

// MARK: - Activity

struct ActivityView: View {
    @Bindable var model: AppModel
    @State private var confirmClear = false
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Everything the assistant did, newest first.")
                    .font(.system(size: 12))
                    .foregroundStyle(palette.secondary)
                Spacer()
                if !model.services.activity.records.isEmpty {
                    PanelButton(title: "Clear", symbol: "trash") { confirmClear = true }
                }
            }
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 2) {
                    ForEach(model.services.activity.records) { record in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: record.status.symbol)
                                .foregroundStyle(record.status.color(palette))
                                .font(.system(size: 12))
                                .frame(width: 16)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(record.title).font(.system(size: 13, weight: .medium)).foregroundStyle(palette.primary).lineLimit(2)
                                HStack(spacing: 6) {
                                    Text(record.status.rawValue.capitalized)
                                    if !record.resultSummary.isEmpty { Text("· \(record.resultSummary)").lineLimit(1) }
                                    if record.requiredConfirmation { Text("· approved by you") }
                                }
                                .font(.system(size: 11))
                                .foregroundStyle(palette.secondary)
                            }
                            Spacer()
                            Text(record.startedAt, style: .relative)
                                .font(.system(size: 11))
                                .foregroundStyle(palette.tertiary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                    }
                    if model.services.activity.records.isEmpty {
                        VStack(spacing: 6) {
                            Image(systemName: "clock.arrow.circlepath").font(.system(size: 22)).foregroundStyle(palette.tertiary)
                            Text("No actions yet.").font(.system(size: 13)).foregroundStyle(palette.secondary)
                        }
                        .padding(.top, 30)
                    }
                }
            }
        }
        .alert("Clear the activity log?", isPresented: $confirmClear) {
            Button("Clear", role: .destructive) { model.services.activity.clear() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes the log only; it does not undo any actions.")
        }
    }
}
