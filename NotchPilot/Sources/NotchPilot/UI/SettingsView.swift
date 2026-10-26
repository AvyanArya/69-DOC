import AppKit
import NotchPilotCore
import ServiceManagement
import SwiftUI

extension AppModel {
    /// Two-way binding into persisted app settings.
    func binding<Value>(_ keyPath: WritableKeyPath<AppSettings, Value>) -> Binding<Value> {
        Binding(
            get: { self.services.settings.settings[keyPath: keyPath] },
            set: { value in self.services.settings.updateSettings { $0[keyPath: keyPath] = value } }
        )
    }

    /// Two-way binding into the assistant-visible preferences.
    func preferenceBinding<Value>(_ keyPath: WritableKeyPath<UserPreferences, Value>) -> Binding<Value> {
        Binding(
            get: { self.services.settings.preferences[keyPath: keyPath] },
            set: { value in _ = try? self.services.settings.updatePreferences { $0[keyPath: keyPath] = value } }
        )
    }

    /// Edits an "HH:mm" string with a time picker.
    func clockBinding(_ get: @escaping () -> String, _ set: @escaping (String) -> Void) -> Binding<Date> {
        Binding(
            get: {
                let parts = DateCoding.parseClockTime(get()) ?? (9, 0)
                return Calendar.current.date(bySettingHour: parts.hour, minute: parts.minute, second: 0, of: Date()) ?? Date()
            },
            set: { date in
                let c = Calendar.current.dateComponents([.hour, .minute], from: date)
                set(String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0))
            }
        )
    }
}

struct SettingsView: View {
    @Bindable var model: AppModel

    var body: some View {
        NavigationSplitView {
            List(selection: Binding<SettingsPane?>(
                get: { model.settingsPane },
                set: { if let pane = $0 { model.settingsPane = pane } }
            )) {
                ForEach(SettingsPane.allCases) { pane in
                    Label {
                        Text(pane.title)
                    } icon: {
                        SettingsIcon(symbol: pane.tileSymbol, color: pane.tint)
                    }
                    .tag(pane)
                }
            }
            .listStyle(.sidebar)
            .navigationSplitViewColumnWidth(min: 190, ideal: 210, max: 260)
            .toolbar(removing: .sidebarToggle)
        } detail: {
            Group {
                switch model.settingsPane {
                case .general: GeneralSettings(model: model)
                case .ai: AISettings(model: model)
                case .agent: AgentSettingsPane(model: model)
                case .features: FeatureSettings(model: model)
                case .memory: MemorySettings(model: model)
                case .privacy: PrivacySettings(model: model)
                case .appearance: AppearanceSettingsPane(model: model)
                case .about: AboutPane(model: model)
                }
            }
            .formStyle(.grouped)
            .navigationTitle(model.settingsPane.title)
        }
        .frame(minWidth: 700, minHeight: 480)
    }
}

/// A System Settings–style sidebar icon: a white symbol on a coloured rounded square.
struct SettingsIcon: View {
    let symbol: String
    let color: Color

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 20, height: 20)
            .background(RoundedRectangle(cornerRadius: 5, style: .continuous).fill(color.gradient))
    }
}

extension SettingsPane {
    var tileSymbol: String {
        switch self {
        case .general: return "gearshape.fill"
        case .ai: return "sparkles"
        case .agent: return "checkmark.shield.fill"
        case .features: return "switch.2"
        case .memory: return "memorychip.fill"
        case .privacy: return "hand.raised.fill"
        case .appearance: return "circle.lefthalf.filled"
        case .about: return "info.circle.fill"
        }
    }

    var tint: Color {
        switch self {
        case .general, .about: return .gray
        case .ai: return .purple
        case .agent, .privacy: return .blue
        case .features: return .orange
        case .memory: return .pink
        case .appearance: return .indigo
        }
    }
}

// MARK: - General

struct GeneralSettings: View {
    @Bindable var model: AppModel
    @State private var recording = false

    var body: some View {
        Form {
            Section("Startup") {
                Toggle("Launch NotchPilot at login", isOn: Binding(
                    get: { SMAppService.mainApp.status == .enabled },
                    set: { model.setLaunchAtLogin($0) }
                ))
                LabeledContent("Status", value: model.launchAtLoginStatus)
            }
            Section {
                Toggle("Keyboard shortcut to show or hide the panel", isOn: model.binding(\.toggleHotKeyEnabled))
                LabeledContent("Shortcut") {
                    ShortcutRecorder(setting: model.binding(\.toggleHotKey), recording: $recording)
                }
                LabeledContent("In the panel") {
                    Text("Esc close · ⌘N new chat · ⌘1–5 tabs · ⌘. stop · ⌘, settings")
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Keyboard")
            } footer: {
                Text("Uses a system hot key; NotchPilot does not need Accessibility access and never monitors your typing.")
            }
            Section("Behaviour") {
                Toggle("Expand when the pointer rests on the notch", isOn: model.binding(\.appearance.hoverToExpand))
                Toggle("Haptic feedback on trackpads", isOn: model.binding(\.appearance.hapticFeedback))
            }
        }
    }
}

/// Records a new global shortcut from the next key press.
struct ShortcutRecorder: View {
    @Binding var setting: HotKeySetting
    @Binding var recording: Bool
    @State private var monitor: Any?
    @State private var message: String?

    var body: some View {
        HStack {
            Button(recording ? "Press a shortcut…" : setting.display) {
                recording ? stop() : start()
            }
            .frame(minWidth: 120)
            if let message { Text(message).font(.caption).foregroundStyle(.orange) }
            Button("Reset") {
                setting = .defaultToggle
                stop()
            }
        }
        .onDisappear(perform: stop)
    }

    private func start() {
        recording = true
        message = nil
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            let flags = event.modifierFlags.intersection([.command, .option, .control, .shift])
            if event.keyCode == 53 && flags.isEmpty {
                stop()
                return nil
            }
            guard flags.contains(.command) || flags.contains(.control) || flags.contains(.option) else {
                message = "Include ⌘, ⌥ or ⌃"
                return nil
            }
            setting = HotKeySetting(
                keyCode: UInt32(event.keyCode), modifiers: HotKeyManager.carbonModifiers(flags),
                display: HotKeyManager.display(keyCode: event.keyCode, characters: event.charactersIgnoringModifiers, flags: flags)
            )
            stop()
            return nil
        }
    }

    private func stop() {
        recording = false
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
    }
}

// MARK: - AI

struct AISettings: View {
    @Bindable var model: AppModel
    @State private var keyDraft = ""

    var body: some View {
        let kind = model.settings.provider.kind
        Form {
            Section {
                Picker("Provider", selection: model.binding(\.provider.kind)) {
                    ForEach(ProviderKind.allCases) { Text($0.displayName).tag($0) }
                }
                LabeledContent("Model") {
                    HStack {
                        TextField("Model ID", text: Binding(
                            get: { model.settings.provider.model(for: kind) },
                            set: { value in model.services.settings.updateSettings { $0.provider.setModel(value, for: kind) } }
                        ))
                        .textFieldStyle(.roundedBorder)
                        Menu("Suggestions") {
                            ForEach(kind.suggestedModels, id: \.self) { id in
                                Button(id) { model.services.settings.updateSettings { $0.provider.setModel(id, for: kind) } }
                            }
                        }
                        .fixedSize()
                    }
                }
                LabeledContent("Endpoint") {
                    TextField(kind.defaultBaseURL, text: Binding(
                        get: { model.settings.provider.baseURLs[kind.rawValue] ?? "" },
                        set: { value in model.services.settings.updateSettings { $0.provider.setBaseURL(value, for: kind) } }
                    ))
                    .textFieldStyle(.roundedBorder)
                }
            } header: {
                Text("Provider")
            } footer: {
                Text(providerFooter(kind))
            }

            Section {
                if model.keyStatus[kind] == true {
                    LabeledContent("API key") {
                        HStack {
                            Label("Stored in Keychain", systemImage: "lock.fill").foregroundStyle(.green)
                            Spacer()
                            Button("Remove", role: .destructive) { model.removeAPIKey(for: kind) }
                        }
                    }
                }
                LabeledContent(model.keyStatus[kind] == true ? "Replace key" : "API key") {
                    HStack {
                        SecureField(kind.requiresAPIKey ? "Paste your key" : "Optional for local servers", text: $keyDraft)
                            .textFieldStyle(.roundedBorder)
                            .onSubmit(saveKey)
                        Button("Save", action: saveKey).disabled(keyDraft.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                HStack {
                    Button {
                        Task { await model.testConnection() }
                    } label: {
                        Label("Test connection", systemImage: "bolt.horizontal")
                    }
                    .disabled(model.connectionTest == .running || !model.isProviderConfigured)
                    switch model.connectionTest {
                    case .idle: EmptyView()
                    case .running: ProgressView().controlSize(.small)
                    case .success(let message): Label(message, systemImage: "checkmark.circle.fill").foregroundStyle(.green).font(.caption)
                    case .failure(let message): Label(message, systemImage: "xmark.octagon.fill").foregroundStyle(.red).font(.caption)
                    }
                }
            } header: {
                Text("Credentials")
            } footer: {
                Text("Keys are stored only in your macOS Keychain — never in settings files, logs or the app. Using an API directly is billed by the provider separately from any chat subscription. The test sends one tiny request.")
            }

            Section {
                Picker("Reasoning effort", selection: model.binding(\.provider.effort)) {
                    ForEach(ReasoningEffort.allCases, id: \.self) { Text($0.displayName).tag($0) }
                }
                Stepper("Max response tokens: \(model.settings.provider.maxOutputTokens)", value: model.binding(\.provider.maxOutputTokens), in: 4_000...64_000, step: 4_000)
                Toggle("Use newer optional API features", isOn: model.binding(\.provider.useOptionalAPIFeatures))
                if kind == .anthropic {
                    Toggle("Retry declined requests on a fallback model", isOn: model.binding(\.provider.refusalFallback))
                }
            } header: {
                Text("Behaviour")
            } footer: {
                Text("Lower effort answers faster and costs less; higher effort thinks longer on hard requests. Optional features include live progress notes, prompt caching and tolerant replay of reasoning; if an endpoint rejects them NotchPilot retries without them automatically.")
            }
        }
        .onChange(of: kind) { _, _ in model.connectionTest = .idle }
    }

    private func saveKey() {
        model.saveAPIKey(keyDraft, for: model.settings.provider.kind)
        keyDraft = ""
        model.connectionTest = .idle
    }

    private func providerFooter(_ kind: ProviderKind) -> String {
        switch kind {
        case .anthropic:
            return "Claude via the Anthropic Messages API (streaming, tool use). Default model: claude-opus-5-5 — Sonnet or Haiku are faster and cheaper. Get a key at console.anthropic.com."
        case .openAI:
            return "OpenAI via the Responses API (required for tool calling with current models). Requests use store=false. Get a key at platform.openai.com."
        case .openAICompatible:
            return "Any server implementing OpenAI Chat Completions with function calling, e.g. Ollama (http://localhost:11434/v1), LM Studio or OpenRouter. The model must support tool calling."
        }
    }
}

// MARK: - Agent

struct AgentSettingsPane: View {
    @Bindable var model: AppModel

    var body: some View {
        Form {
            Section("Mode") {
                Picker("Agent mode", selection: model.binding(\.agent.mode)) {
                    ForEach(AgentMode.allCases, id: \.self) { mode in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(mode.displayName)
                            Text(mode.explanation).font(.caption).foregroundStyle(.secondary)
                        }
                        .tag(mode)
                    }
                }
                .pickerStyle(.radioGroup)
                let limits = AgentLimits.forMode(model.settings.agent.mode)
                LabeledContent("Limits per request", value: "\(limits.maxToolCalls) actions · \(limits.maxModelCalls) model turns · \(Int(limits.maxActiveDuration / 60)) min")
            }
            Section {
                Toggle("Ask before saving long-term memories", isOn: model.binding(\.agent.askBeforeSavingMemory))
                Toggle("Add calendar events and reminders without asking", isOn: model.binding(\.agent.allowCalendarWritesWithoutAsking))
                Toggle("Open web links without asking", isOn: model.binding(\.agent.allowOpeningLinksWithoutAsking))
                Picker("Unanswered approvals expire after", selection: model.binding(\.agent.confirmationTimeout)) {
                    Text("1 minute").tag(60.0)
                    Text("5 minutes").tag(300.0)
                    Text("15 minutes").tag(900.0)
                }
            } header: {
                Text("Approvals")
            } footer: {
                Text("Deleting data, running Shortcuts and opening email drafts always ask, in every mode. The assistant cannot run shell commands, install software, send messages or make purchases — those tools do not exist.")
            }
        }
    }
}

// MARK: - Features

struct FeatureSettings: View {
    @Bindable var model: AppModel

    var body: some View {
        Form {
            Section {
                Toggle("Calendar (read events, find free time, add events)", isOn: model.binding(\.features.calendar))
                Toggle("Reminders", isOn: model.binding(\.features.reminders))
                Toggle("Music & Spotify", isOn: model.binding(\.features.media))
                Toggle("Open apps", isOn: model.binding(\.features.appLaunching))
                Toggle("Open web links", isOn: model.binding(\.features.webLinks))
                Toggle("Run Shortcuts", isOn: model.binding(\.features.shortcuts))
                Toggle("System information (battery, memory, disk)", isOn: model.binding(\.features.systemInfo))
                Toggle("Copy to clipboard", isOn: model.binding(\.features.clipboard))
                Toggle("Email drafts (opens your mail app; never sends)", isOn: model.binding(\.features.emailDrafts))
            } header: {
                Text("Integrations the assistant may use")
            } footer: {
                Text("Turning an integration off removes it from the assistant immediately; its tools refuse with an explanation.")
            }
            Section {
                Toggle("Morning briefing", isOn: model.binding(\.proactive.morningBriefing))
                if model.settings.proactive.morningBriefing {
                    DatePicker("Time", selection: model.clockBinding({ model.settings.proactive.morningBriefingTime }, { value in model.services.settings.updateSettings { $0.proactive.morningBriefingTime = value } }), displayedComponents: .hourAndMinute)
                    Toggle("Tapping it asks the assistant for a briefing", isOn: model.binding(\.proactive.briefingTapAsksAssistant))
                }
                Toggle("Deadline reminders for tasks", isOn: model.binding(\.proactive.deadlineReminders))
                if model.settings.proactive.deadlineReminders {
                    Stepper("Remind \(model.settings.proactive.deadlineLeadMinutes) minutes before", value: model.binding(\.proactive.deadlineLeadMinutes), in: 5...240, step: 5)
                }
                Toggle("Notify when a focus session ends", isOn: model.binding(\.proactive.focusSessionNotifications))
                Toggle("Start breaks automatically", isOn: model.binding(\.proactive.autoStartBreaks))
                Toggle("Prepare for upcoming calendar events", isOn: model.binding(\.proactive.eventPreparation))
                if model.settings.proactive.eventPreparation {
                    Stepper("\(model.settings.proactive.eventLeadMinutes) minutes before", value: model.binding(\.proactive.eventLeadMinutes), in: 5...60, step: 5)
                }
                Toggle("End-of-day summary of open tasks", isOn: model.binding(\.proactive.endOfDaySummary))
                if model.settings.proactive.endOfDaySummary {
                    DatePicker("Time", selection: model.clockBinding({ model.settings.proactive.endOfDayTime }, { value in model.services.settings.updateSettings { $0.proactive.endOfDayTime = value } }), displayedComponents: .hourAndMinute)
                }
            } header: {
                Text("Proactive assistance")
            } footer: {
                Text("Proactive features use local notifications computed on your Mac. Nothing is sent to an AI provider in the background; the briefing is only generated after you tap it.")
            }
        }
    }
}

// MARK: - Memory

struct MemorySettings: View {
    @Bindable var model: AppModel
    @State private var newMemory = ""
    @State private var newCategory: MemoryCategory = .fact
    @State private var confirmClearHistory = false
    @State private var confirmClearMemories = false

    var body: some View {
        Form {
            Section {
                Toggle("Use saved memories in requests", isOn: model.binding(\.features.memory))
                ForEach(model.services.memory.sortedItems) { item in
                    MemoryRow(item: item, model: model)
                }
                HStack {
                    TextField("Add something to remember", text: $newMemory).textFieldStyle(.roundedBorder)
                    Picker("", selection: $newCategory) {
                        ForEach(MemoryCategory.allCases, id: \.self) { Text($0.displayName).tag($0) }
                    }
                    .labelsHidden()
                    .frame(width: 150)
                    Button("Add") {
                        _ = try? model.services.memory.add(newMemory, category: newCategory, source: .user)
                        newMemory = ""
                    }
                    .disabled(newMemory.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                if !model.services.memory.items.isEmpty {
                    Button("Delete all memories…", role: .destructive) { confirmClearMemories = true }
                }
            } header: {
                Text("Long-term memory")
            } footer: {
                Text("Only these approved items persist between conversations. A few relevant ones are sent with each request; edit or delete anything here.")
            }

            Section("Assistant preferences") {
                TextField("What should I call you?", text: model.preferenceBinding(\.preferredName))
                Picker("Answer length", selection: model.preferenceBinding(\.answerLength)) {
                    ForEach(AnswerLength.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                Picker("Tone", selection: model.preferenceBinding(\.tone)) {
                    ForEach(AnswerTone.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                TextField("Custom instructions", text: model.preferenceBinding(\.customInstructions), axis: .vertical).lineLimit(2...4)
                Stepper("Focus length: \(model.services.settings.preferences.defaultFocusMinutes) min", value: model.preferenceBinding(\.defaultFocusMinutes), in: 5...180, step: 5)
                Stepper("Break length: \(model.services.settings.preferences.defaultBreakMinutes) min", value: model.preferenceBinding(\.defaultBreakMinutes), in: 1...60)
                DatePicker("Workday starts", selection: model.clockBinding({ model.services.settings.preferences.workdayStart }, { value in _ = try? model.services.settings.updatePreferences { $0.workdayStart = value } }), displayedComponents: .hourAndMinute)
                DatePicker("Workday ends", selection: model.clockBinding({ model.services.settings.preferences.workdayEnd }, { value in _ = try? model.services.settings.updatePreferences { $0.workdayEnd = value } }), displayedComponents: .hourAndMinute)
            }

            Section {
                Toggle("Save conversation history", isOn: model.binding(\.features.saveConversationHistory))
                Picker("Delete conversations after", selection: model.binding(\.features.conversationRetentionDays)) {
                    Text("Never").tag(0)
                    Text("7 days").tag(7)
                    Text("30 days").tag(30)
                    Text("90 days").tag(90)
                }
                LabeledContent("Saved conversations", value: "\(model.services.conversations.summaries.count)")
                Button("Delete all conversations…", role: .destructive) { confirmClearHistory = true }
            } header: {
                Text("Conversation history")
            } footer: {
                Text("History is stored only on this Mac and is separate from long-term memory. Turning it off removes saved conversations from disk.")
            }
        }
        .alert("Delete all conversations?", isPresented: $confirmClearHistory) {
            Button("Delete", role: .destructive) {
                model.services.conversations.deleteAll()
                model.newConversation()
            }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Delete all memories?", isPresented: $confirmClearMemories) {
            Button("Delete", role: .destructive) { _ = try? model.services.memory.deleteAll() }
            Button("Cancel", role: .cancel) {}
        }
    }
}

struct MemoryRow: View {
    let item: MemoryItem
    let model: AppModel
    @State private var text = ""
    @State private var category: MemoryCategory = .fact

    var body: some View {
        HStack {
            TextField("", text: $text)
                .textFieldStyle(.plain)
                .onSubmit(save)
            Picker("", selection: $category) {
                ForEach(MemoryCategory.allCases, id: \.self) { Text($0.displayName).tag($0) }
            }
            .labelsHidden()
            .frame(width: 140)
            .onChange(of: category) { _, _ in save() }
            if item.source == .assistant {
                Image(systemName: "sparkles").foregroundStyle(.secondary).help("Saved by the assistant with your approval")
            }
            Button(role: .destructive) {
                _ = try? model.services.memory.delete(item.id)
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.borderless)
            .help("Delete memory")
        }
        .onAppear {
            text = item.content
            category = item.category
        }
    }

    private func save() {
        guard text != item.content || category != item.category else { return }
        _ = try? model.services.memory.update(item.id, content: text, category: category)
    }
}

// MARK: - Privacy

struct PrivacySettings: View {
    @Bindable var model: AppModel
    @State private var notificationState: AuthorizationState = .notDetermined
    @State private var confirmDeleteAll = false

    var body: some View {
        Form {
            Section {
                Text("""
                When you send a message, NotchPilot sends your provider: your message and any documents you attach, the earlier messages of that conversation, the current date and time, your assistant preferences, a few relevant approved memories, and the results of tools the assistant runs for that request (for example the tasks it listed). Nothing is sent in the background.

                What the provider keeps, and for how long, depends on that provider's policies and your account settings. OpenAI requests are sent with store=false.
                """)
                .font(.callout)
                .foregroundStyle(.secondary)
            } header: {
                Text("What leaves your Mac")
            }
            Section("Permissions") {
                PermissionRow(title: "Calendars", state: model.calendarAuthorization, request: { Task { await model.requestCalendarAccess() } }, settings: { SystemSettingsLink.open(.calendars) })
                PermissionRow(title: "Reminders", state: model.calendarService.remindersAuthorization(), request: { Task { _ = await model.calendarService.requestRemindersAccess() } }, settings: { SystemSettingsLink.open(.reminders) })
                PermissionRow(title: "Notifications", state: notificationState, request: {
                    Task {
                        _ = await model.notifications.requestAuthorizationIfNeeded()
                        notificationState = await model.notifications.refreshAuthorization()
                    }
                }, settings: { SystemSettingsLink.open(.notifications) })
                LabeledContent("Automation (Music, Spotify)") {
                    HStack {
                        Text("Asked by macOS on first use").foregroundStyle(.secondary)
                        Button("Open Settings") { SystemSettingsLink.open(.automation) }
                    }
                }
                Text("NotchPilot never requests Accessibility, Full Disk Access, Screen Recording or microphone access.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Section("Your data") {
                LabeledContent("Stored at") {
                    HStack {
                        Text(model.fileStore.directory.path).font(.caption).textSelection(.enabled).lineLimit(1).truncationMode(.middle)
                        Button("Show in Finder") { NSWorkspace.shared.activateFileViewerSelecting([model.fileStore.directory]) }
                    }
                }
                Button("Delete all NotchPilot data…", role: .destructive) { confirmDeleteAll = true }
            }
        }
        .task { notificationState = await model.notifications.refreshAuthorization() }
        .alert("Delete all NotchPilot data?", isPresented: $confirmDeleteAll) {
            Button("Delete everything", role: .destructive) { model.deleteAllData() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Tasks, notes, memories, preferences, conversations and the activity log will be permanently deleted. Calendar events and reminders in Apple's apps are not touched.")
        }
    }
}

struct PermissionRow: View {
    let title: String
    let state: AuthorizationState
    let request: () -> Void
    let settings: () -> Void

    var body: some View {
        LabeledContent(title) {
            HStack {
                Label(state.displayName, systemImage: state == .authorized ? "checkmark.circle.fill" : state == .notDetermined ? "circle.dashed" : "exclamationmark.circle")
                    .foregroundStyle(state == .authorized ? Color.green : state == .notDetermined ? Color.secondary : Color.orange)
                if state == .notDetermined {
                    Button("Allow…", action: request)
                } else if state != .authorized {
                    Button("Open Settings", action: settings)
                }
            }
        }
    }
}

// MARK: - Appearance

struct AppearanceSettingsPane: View {
    @Bindable var model: AppModel

    var body: some View {
        Form {
            Section("Panel") {
                Picker("Theme", selection: model.binding(\.appearance.theme)) {
                    Text("Dark (blends with the notch)").tag(PanelTheme.dark)
                    Text("Match system").tag(PanelTheme.system)
                }
                Picker("Motion", selection: model.binding(\.appearance.motion)) {
                    Text("Follow system setting").tag(MotionPreference.system)
                    Text("Reduced").tag(MotionPreference.reduced)
                    Text("Full").tag(MotionPreference.full)
                }
                LabeledContent("Width") {
                    Slider(value: model.binding(\.appearance.expandedWidth), in: 520...820, step: 20)
                }
                LabeledContent("Height") {
                    Slider(value: model.binding(\.appearance.expandedHeight), in: 340...620, step: 20)
                }
                Toggle("Show timer, music and agent status beside the notch", isOn: model.binding(\.appearance.showLiveActivities))
            }
            Section("Displays") {
                Picker("Show on", selection: model.binding(\.appearance.display)) {
                    Text("Display with a notch (built-in)").tag(DisplayPreference.notchedDisplay)
                    Text("Main display").tag(DisplayPreference.mainDisplay)
                }
                Toggle("Show on displays without a notch", isOn: model.binding(\.appearance.showOnDisplaysWithoutNotch))
                LabeledContent("Current display", value: model.notch.hasNotch ? "Notch \(Int(model.notch.size.width))×\(Int(model.notch.size.height)) pt" : "No notch — island sits in the menu bar")
            }
        }
    }
}

// MARK: - About

struct AboutPane: View {
    let model: AppModel

    var body: some View {
        Form {
            Section {
                HStack(spacing: 14) {
                    Image(nsImage: NSApp.applicationIconImage)
                        .resizable()
                        .frame(width: 64, height: 64)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("NotchPilot").font(.title2.weight(.semibold))
                        Text("Version \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev") (\(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"))")
                            .foregroundStyle(.secondary)
                    }
                }
                Text("An AI assistant and agent in your Mac's notch: chat, focus timers, tasks, notes, calendar and Mac actions — with explicit permissions and local storage.")
                    .foregroundStyle(.secondary)
            }
            Section("Agent") {
                LabeledContent("Tools available", value: "\(model.orchestrator.registry.specs.count)")
                LabeledContent("Provider", value: "\(model.settings.provider.kind.displayName) · \(model.settings.provider.currentModel)")
            }
        }
    }
}
