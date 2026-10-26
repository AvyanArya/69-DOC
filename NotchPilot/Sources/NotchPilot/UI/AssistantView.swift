import NotchPilotCore
import SwiftUI

struct AssistantView: View {
    @Bindable var model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(spacing: 8) {
            if model.showingHistory {
                ConversationHistoryView(model: model)
                    .transition(.opacity)
            } else {
                if !model.isProviderConfigured {
                    ProviderSetupCard(model: model)
                }
                TranscriptView(model: model)
                if let run = model.orchestrator.currentRun, run.isActive, run.conversationID == model.session.id {
                    RunStatusBar(run: run, model: model)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                ComposerView(model: model)
            }
        }
    }
}

// MARK: - Transcript

struct TranscriptView: View {
    @Bindable var model: AppModel
    @Environment(\.palette) private var palette

    private var run: AgentRun? {
        guard let run = model.orchestrator.currentRun, run.conversationID == model.session.id else { return nil }
        return run
    }

    /// Changes whenever new content should scroll into view.
    private var scrollKey: String {
        let conversation = model.session.conversation
        return "\(conversation.turns.count)-\(conversation.actions.count)-\((run?.streamingText.count ?? 0) / 80)-\(run?.progressNote.count ?? 0)-\(model.confirmations.pending.count)-\(run?.phase == .finished)"
    }

    var body: some View {
        let conversation = model.session.conversation
        ScrollViewReader { proxy in
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 10) {
                    if conversation.turns.isEmpty && run == nil {
                        EmptyAssistantView(model: model)
                    }
                    ForEach(conversation.turns) { turn in
                        TurnView(turn: turn, actions: conversation.actions, model: model)
                    }
                    if let run, run.isActive {
                        LiveRunView(run: run, model: model)
                    }
                    ForEach(model.confirmations.pending) { request in
                        ConfirmationCard(request: request, model: model)
                    }
                    if let run, !run.isActive {
                        RunOutcomeView(run: run, model: model)
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.vertical, 6)
            }
            .onChange(of: scrollKey) { _, _ in
                withAnimation(model.reduceMotion ? nil : .easeOut(duration: 0.2)) {
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
            .onAppear { proxy.scrollTo("bottom", anchor: .bottom) }
        }
    }
}

struct TurnView: View {
    let turn: ConversationTurn
    let actions: [ActionRecord]
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        switch turn.role {
        case .user:
            if !turn.isToolResultTurn {
                UserMessageView(turn: turn)
            }
        case .assistant:
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(turn.blocks.enumerated()), id: \.offset) { _, block in
                    switch block {
                    case .progress(let note):
                        ProgressNoteView(text: note)
                    case .toolUse(let use):
                        ToolChip(use: use, record: actions.last { $0.toolUseID == use.id })
                    case .text(let text):
                        AssistantMessageView(text: text, status: turn.status, servedModel: turn.servedModel)
                    default:
                        EmptyView()
                    }
                }
            }
        }
    }
}

struct UserMessageView: View {
    let turn: ConversationTurn
    @Environment(\.palette) private var palette

    var body: some View {
        HStack {
            Spacer(minLength: 60)
            VStack(alignment: .trailing, spacing: 4) {
                ForEach(attachments) { attachment in
                    Label(attachment.fileName, systemImage: "doc.text")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(palette.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(palette.surface))
                }
                if !turn.visibleText.isEmpty {
                    Text(turn.visibleText)
                        .font(.system(size: 13))
                        .foregroundStyle(palette.primary)
                        .textSelection(.enabled)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(palette.userBubble))
                }
            }
        }
    }

    private var attachments: [DocumentAttachment] {
        turn.blocks.compactMap { if case .attachment(let a) = $0 { return a } else { return nil } }
    }
}

struct AssistantMessageView: View {
    let text: String
    let status: TurnStatus
    let servedModel: String?
    @Environment(\.palette) private var palette
    @State private var hovering = false
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            MarkdownText(text: text)
                .opacity(status == .refused ? 0.6 : 1)
            HStack(spacing: 8) {
                switch status {
                case .interrupted:
                    Label("Stopped", systemImage: "stop.circle").foregroundStyle(palette.tertiary)
                case .refused:
                    Label("Declined by the provider — not kept in context", systemImage: "exclamationmark.shield").foregroundStyle(palette.warning)
                default:
                    EmptyView()
                }
                if hovering {
                    Button {
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(text, forType: .string)
                        copied = true
                    } label: {
                        Label(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc")
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(palette.secondary)
                }
            }
            .font(.system(size: 10.5, weight: .medium))
            .frame(height: 14)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .onHover { inside in
            hovering = inside
            if !inside { copied = false }
        }
    }
}

struct ProgressNoteView: View {
    let text: String
    var live = false
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Image(systemName: "sparkle")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(palette.accent)
                .symbolEffect(.pulse, isActive: live)
            Text(text)
                .font(.system(size: 12))
                .italic()
                .foregroundStyle(palette.secondary)
        }
    }
}

struct ToolChip: View {
    let use: ToolUseBlock
    let record: ActionRecord?
    @Environment(\.palette) private var palette

    var body: some View {
        let status = record?.status ?? .running
        HStack(spacing: 8) {
            Group {
                if status == .running {
                    ProgressView().controlSize(.mini)
                } else {
                    Image(systemName: status.symbol).foregroundStyle(status.color(palette))
                }
            }
            .frame(width: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(record?.title ?? use.name.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(palette.primary)
                    .lineLimit(1)
                if let summary = record?.resultSummary, !summary.isEmpty, status != .running {
                    Text(summary)
                        .font(.system(size: 11))
                        .foregroundStyle(palette.secondary)
                        .lineLimit(2)
                }
            }
            Spacer(minLength: 0)
            if record?.requiredConfirmation == true {
                Image(systemName: "person.fill.checkmark").font(.system(size: 10)).foregroundStyle(palette.tertiary).help("Required your approval")
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(palette.surface))
        .accessibilityElement(children: .combine)
    }
}

/// Streaming text, progress and plan for the active run.
struct LiveRunView: View {
    let run: AgentRun
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !run.plan.isEmpty {
                PlanChecklist(plan: run.plan)
            }
            if !run.progressNote.isEmpty {
                ProgressNoteView(text: run.progressNote, live: true)
            }
            if !run.streamingText.isEmpty {
                HStack(alignment: .lastTextBaseline, spacing: 0) {
                    MarkdownText(text: run.streamingText)
                    Caret(reduceMotion: model.reduceMotion)
                }
            } else if run.phase == .waitingForModel && run.progressNote.isEmpty {
                HStack(spacing: 8) {
                    AssistantOrb(size: 14, active: true, reduceMotion: model.reduceMotion)
                    Text(run.modelCalls == 0 ? "Thinking…" : "Working…")
                        .font(.system(size: 12))
                        .foregroundStyle(palette.secondary)
                }
            }
        }
    }
}

struct Caret: View {
    let reduceMotion: Bool
    @State private var visible = true

    var body: some View {
        Rectangle()
            .frame(width: 2, height: 13)
            .opacity(visible ? 0.8 : 0)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.55).repeatForever()) { visible = false }
            }
    }
}

struct PlanChecklist: View {
    let plan: [PlanStep]
    @Environment(\.palette) private var palette

    var body: some View {
        Card(padding: 10) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    SectionLabel(title: "Plan", symbol: "list.bullet.clipboard")
                    Spacer()
                    Text("\(plan.filter { $0.status == .done }.count) of \(plan.count)")
                        .font(.system(size: 10.5, weight: .medium))
                        .foregroundStyle(palette.tertiary)
                }
                ProgressView(value: Double(plan.filter { $0.status == .done || $0.status == .skipped }.count), total: Double(max(1, plan.count)))
                    .tint(palette.accent)
                    .controlSize(.mini)
                ForEach(plan) { step in
                    HStack(spacing: 8) {
                        Image(systemName: icon(step.status))
                            .foregroundStyle(color(step.status))
                            .font(.system(size: 11))
                            .frame(width: 14)
                        Text(step.title)
                            .font(.system(size: 12))
                            .foregroundStyle(step.status == .done ? palette.secondary : palette.primary)
                            .strikethrough(step.status == .skipped)
                    }
                }
            }
        }
    }

    private func icon(_ status: PlanStep.Status) -> String {
        switch status {
        case .pending: return "circle"
        case .inProgress: return "circle.dotted.circle"
        case .done: return "checkmark.circle.fill"
        case .skipped: return "minus.circle"
        case .failed: return "xmark.circle.fill"
        }
    }

    private func color(_ status: PlanStep.Status) -> Color {
        switch status {
        case .pending: return palette.tertiary
        case .inProgress: return palette.accent
        case .done: return palette.success
        case .skipped: return palette.tertiary
        case .failed: return palette.danger
        }
    }
}

struct ConfirmationCard: View {
    let request: ConfirmationRequest
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        let destructive = request.risk >= .destructive
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(destructive ? palette.danger : palette.warning)
                    .frame(width: 22)
                VStack(alignment: .leading, spacing: 3) {
                    Text(request.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(palette.primary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(request.reason) · \(request.risk.label)")
                        .font(.system(size: 11))
                        .foregroundStyle(palette.secondary)
                }
            }
            HStack(spacing: 8) {
                Spacer()
                PillButton(title: "Don’t allow", symbol: "xmark") { model.decline(request) }
                    .keyboardShortcut(.cancelAction)
                PillButton(title: destructive ? "Allow" : "Approve", symbol: "checkmark", prominent: true, destructive: destructive) { model.approve(request) }
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(12)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill((destructive ? palette.danger : palette.warning).opacity(0.1)))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder((destructive ? palette.danger : palette.warning).opacity(0.35), lineWidth: 1))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Approval needed: \(request.title)")
    }

    private var symbol: String {
        switch request.risk {
        case .destructive: return "trash"
        case .sensitive: return "bolt.shield"
        case .external: return "arrow.up.forward.app"
        case .appWrite: return "pencil"
        case .read: return "eye"
        }
    }
}

/// Error, limit and incomplete-work notices after a run.
struct RunOutcomeView: View {
    let run: AgentRun
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(run.notices.suffix(3).enumerated()), id: \.offset) { _, notice in
                Label(notice, systemImage: "info.circle")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.tertiary)
            }
            if let error = run.errorMessage {
                Card(padding: 10) {
                    VStack(alignment: .leading, spacing: 8) {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(palette.danger)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: 8) {
                            if model.orchestrator.canRetry(model.session) {
                                PillButton(title: "Retry", symbol: "arrow.clockwise") { model.retry() }
                            }
                            if !model.isProviderConfigured || error.contains("API key") || error.contains("Settings") {
                                PillButton(title: "AI Settings", symbol: "gearshape") { model.openSettings(.ai) }
                            }
                        }
                    }
                }
            } else if let reason = run.incompleteReason {
                Label(reason + (model.orchestrator.canRetry(model.session) ? " You can ask me to continue." : ""), systemImage: "pause.circle")
                    .font(.system(size: 11.5))
                    .foregroundStyle(palette.warning)
            } else if run.phase == .cancelled {
                Label("Stopped. Completed steps were kept.", systemImage: "stop.circle")
                    .font(.system(size: 11.5))
                    .foregroundStyle(palette.secondary)
            }
        }
    }
}

struct RunStatusBar: View {
    let run: AgentRun
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        HStack(spacing: 8) {
            AssistantOrb(size: 14, active: true, reduceMotion: model.reduceMotion)
            VStack(alignment: .leading, spacing: 1) {
                Text(phaseText).font(.system(size: 11.5, weight: .medium)).foregroundStyle(palette.primary).lineLimit(1)
                TimelineView(.periodic(from: .now, by: 1)) { context in
                    Text("\(run.mode == .autonomous ? "Autonomous · " : "")\(run.toolCalls) step\(run.toolCalls == 1 ? "" : "s") · \(Int(context.date.timeIntervalSince(run.startedAt)))s")
                        .font(.system(size: 10.5))
                        .foregroundStyle(palette.tertiary)
                }
            }
            Spacer()
            PillButton(title: "Stop", symbol: "stop.fill") { model.stop() }
                .keyboardShortcut(".", modifiers: .command)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.surface))
    }

    private var phaseText: String {
        switch run.phase {
        case .starting, .waitingForModel: return run.modelCalls == 0 ? "Thinking…" : "Reviewing results…"
        case .streaming: return "Writing…"
        case .runningTool(let name): return "Running \(name.replacingOccurrences(of: "_", with: " "))…"
        case .awaitingConfirmation: return "Waiting for your approval"
        case .retrying: return "Connection hiccup — retrying…"
        default: return "Finishing…"
        }
    }
}

// MARK: - Empty state & setup

struct EmptyAssistantView: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    private struct Suggestion: Identifiable {
        let symbol: String
        let title: String
        let prompt: String
        var id: String { title }
    }

    private let suggestions = [
        Suggestion(symbol: "sun.max", title: "Summarise my day", prompt: "Summarise my day and tell me what I need to prioritise."),
        Suggestion(symbol: "timer", title: "Focus for 25 minutes", prompt: "Give me 25 minutes to focus on my most important task, then remind me to take a break."),
        Suggestion(symbol: "calendar", title: "Find study time", prompt: "Find a suitable time for a 90-minute study session today based on my calendar."),
        Suggestion(symbol: "calendar.badge.clock", title: "Plan my week", prompt: "Help me plan my week around my deadlines."),
        Suggestion(symbol: "memorychip", title: "What’s using memory?", prompt: "Explain what is using the most memory on my Mac."),
        Suggestion(symbol: "text.badge.checkmark", title: "Notes → tasks", prompt: "Turn my most recent note into three tasks for tomorrow."),
    ]

    var body: some View {
        VStack(spacing: 14) {
            AssistantOrb(size: 38, active: false, reduceMotion: model.reduceMotion)
                .padding(.top, 10)
            VStack(spacing: 4) {
                Text(greeting).font(.system(size: 16, weight: .semibold)).foregroundStyle(palette.primary)
                Text("Ask anything, or let me take care of a task.")
                    .font(.system(size: 12))
                    .foregroundStyle(palette.secondary)
            }
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(suggestions) { suggestion in
                    SuggestionButton(symbol: suggestion.symbol, title: suggestion.title) { model.ask(suggestion.prompt) }
                        .disabled(!model.isProviderConfigured)
                }
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let name = model.services.settings.preferences.preferredName
        let base = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
        return name.isEmpty ? base : "\(base), \(name)"
    }
}

struct SuggestionButton: View {
    let symbol: String
    let title: String
    let action: () -> Void
    @Environment(\.palette) private var palette
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: symbol).foregroundStyle(palette.accent).frame(width: 16)
                Text(title).foregroundStyle(palette.primary).lineLimit(1)
                Spacer(minLength: 0)
            }
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(hovering ? palette.surfaceHover : palette.surface))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
    }
}

struct ProviderSetupCard: View {
    @Bindable var model: AppModel
    @State private var key = ""
    @Environment(\.palette) private var palette

    var body: some View {
        let kind = model.settings.provider.kind
        Card(padding: 12) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("Connect an AI provider", systemImage: "key.horizontal")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(palette.primary)
                    Spacer()
                    Picker("", selection: model.binding(\.provider.kind)) {
                        ForEach(ProviderKind.allCases) { Text($0.displayName).tag($0) }
                    }
                    .labelsHidden()
                    .frame(width: 190)
                }
                Text("Paste your \(kind.displayName) API key. It is stored in your Mac’s Keychain and only sent to \(model.settings.provider.baseURL(for: kind)). Direct API use is billed by the provider. Tasks, notes, timers and everything else work without a key.")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    SecureField(kind == .anthropic ? "sk-ant-…" : "API key", text: $key)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit(save)
                    PillButton(title: "Save", symbol: "lock.fill", prominent: true, action: save)
                    PillButton(title: "More…", symbol: nil) { model.openSettings(.ai) }
                }
            }
        }
    }

    private func save() {
        model.saveAPIKey(key, for: model.settings.provider.kind)
        key = ""
    }
}

// MARK: - Composer

struct ComposerView: View {
    @Bindable var model: AppModel
    @FocusState private var focused: Bool
    @Environment(\.palette) private var palette

    var body: some View {
        let running = model.orchestrator.isRunning
        VStack(alignment: .leading, spacing: 6) {
            if !model.pendingAttachments.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(model.pendingAttachments) { attachment in
                            HStack(spacing: 4) {
                                Image(systemName: "doc.text")
                                Text(attachment.fileName).lineLimit(1)
                                Button {
                                    model.pendingAttachments.removeAll { $0.id == attachment.id }
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                }
                                .buttonStyle(.plain)
                                .help("Remove attachment")
                            }
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(palette.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(palette.surface))
                        }
                    }
                }
            }
            HStack(alignment: .bottom, spacing: 8) {
                IconButton(symbol: "paperclip", help: "Attach documents (their text is sent with your next message)", size: 13) {
                    model.attachDocuments()
                }
                .disabled(running)
                TextField(model.isProviderConfigured ? "Ask NotchPilot…" : "Add an API key to chat — or use the other tabs", text: $model.composerText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.system(size: 13))
                    .lineLimit(1...5)
                    .focused($focused)
                    .onSubmit { model.send() }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(palette.surface))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(focused ? palette.accent.opacity(0.6) : palette.stroke, lineWidth: 1))
                    .accessibilityLabel("Message")
                ModeMenu(model: model)
                if running {
                    IconButton(symbol: "stop.circle.fill", help: "Stop (⌘.)", size: 18, tint: palette.danger) { model.stop() }
                } else {
                    IconButton(symbol: "arrow.up.circle.fill", help: "Send (Return)", size: 18, tint: canSend ? palette.accent : palette.tertiary) { model.send() }
                        .disabled(!canSend)
                }
            }
        }
        .onChange(of: model.composerFocusRequest) { _, _ in focused = true }
        .onChange(of: focused) { _, value in model.isComposerFocused = value }
    }

    private var canSend: Bool {
        model.isProviderConfigured && (!model.composerText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !model.pendingAttachments.isEmpty)
    }
}

/// Quick switch between agent modes.
struct ModeMenu: View {
    let model: AppModel
    @Environment(\.palette) private var palette

    var body: some View {
        Menu {
            ForEach(AgentMode.allCases, id: \.self) { mode in
                Button {
                    model.services.settings.updateSettings { $0.agent.mode = mode }
                } label: {
                    if model.settings.agent.mode == mode {
                        Label(mode.displayName, systemImage: "checkmark")
                    } else {
                        Text(mode.displayName)
                    }
                }
            }
            Divider()
            Button("Agent settings…") { model.openSettings(.agent) }
        } label: {
            Image(systemName: modeSymbol)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(model.settings.agent.mode == .autonomous ? palette.accent : palette.secondary)
        }
        .menuStyle(.button)
        .buttonStyle(.plain)
        .menuIndicator(.hidden)
        .fixedSize()
        .help("Agent mode: \(model.settings.agent.mode.displayName)")
    }

    private var modeSymbol: String {
        switch model.settings.agent.mode {
        case .cautious: return "hand.raised"
        case .standard: return "person.crop.circle.badge.checkmark"
        case .autonomous: return "bolt.circle"
        }
    }
}

// MARK: - History

struct ConversationHistoryView: View {
    @Bindable var model: AppModel
    @State private var query = ""
    @State private var pendingDelete: ConversationSummary?
    @Environment(\.palette) private var palette

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(palette.tertiary)
                TextField("Search conversations", text: $query).textFieldStyle(.plain).font(.system(size: 12.5))
                PillButton(title: "New", symbol: "square.and.pencil") { model.newConversation() }
            }
            .padding(8)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(palette.surface))
            if !model.settings.features.saveConversationHistory {
                Label("History is off: conversations are kept only until NotchPilot quits.", systemImage: "eye.slash")
                    .font(.system(size: 11))
                    .foregroundStyle(palette.tertiary)
            }
            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: 4) {
                    ForEach(results) { summary in
                        HistoryRow(summary: summary, isCurrent: summary.id == model.session.id, onOpen: { model.openConversation(summary.id) }, onDelete: { pendingDelete = summary })
                    }
                    if results.isEmpty {
                        Text(query.isEmpty ? "No conversations yet." : "No matches.")
                            .font(.system(size: 12))
                            .foregroundStyle(palette.tertiary)
                            .padding(.top, 20)
                    }
                }
            }
        }
        .alert("Delete this conversation?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }), presenting: pendingDelete) { summary in
            Button("Delete", role: .destructive) { model.deleteConversation(summary.id) }
            Button("Cancel", role: .cancel) {}
        } message: { summary in
            Text("“\(summary.title)” will be permanently removed. Saved memories are not affected.")
        }
    }

    private var results: [ConversationSummary] {
        let summaries = model.services.conversations.summaries
        guard !query.isEmpty else { return summaries }
        let matches = Set(model.services.conversations.search(query, limit: 50).map(\.conversationID))
        return summaries.filter { matches.contains($0.id) || $0.title.localizedCaseInsensitiveContains(query) }
    }
}

struct HistoryRow: View {
    let summary: ConversationSummary
    let isCurrent: Bool
    let onOpen: () -> Void
    let onDelete: () -> Void
    @Environment(\.palette) private var palette
    @State private var hovering = false

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(summary.title).font(.system(size: 12.5, weight: .medium)).foregroundStyle(palette.primary).lineLimit(1)
                Text(summary.preview).font(.system(size: 11)).foregroundStyle(palette.secondary).lineLimit(1)
            }
            Spacer()
            Text(summary.updatedAt, style: .relative).font(.system(size: 10.5)).foregroundStyle(palette.tertiary)
            if hovering {
                IconButton(symbol: "trash", help: "Delete conversation", size: 11, tint: palette.danger, action: onDelete)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(isCurrent || hovering ? palette.surfaceHover : .clear))
        .contentShape(Rectangle())
        .onTapGesture(perform: onOpen)
        .onHover { hovering = $0 }
    }
}
