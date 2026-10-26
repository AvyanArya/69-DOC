import AppKit
import NotchPilotCore
import Observation
import ServiceManagement
import SwiftUI

enum PanelTab: String, CaseIterable, Identifiable {
    case assistant, today, tasks, notes, activity

    var id: String { rawValue }

    var title: String {
        switch self {
        case .assistant: return "Assistant"
        case .today: return "Today"
        case .tasks: return "Tasks"
        case .notes: return "Notes"
        case .activity: return "Activity"
        }
    }

    var symbol: String {
        switch self {
        case .assistant: return "sparkles"
        case .today: return "sun.max"
        case .tasks: return "checklist"
        case .notes: return "note.text"
        case .activity: return "clock.arrow.circlepath"
        }
    }
}

enum SettingsPane: String, CaseIterable, Identifiable {
    case general, ai, agent, features, memory, privacy, appearance, about

    var id: String { rawValue }

    var title: String {
        switch self {
        case .general: return "General"
        case .ai: return "AI Provider"
        case .agent: return "Agent"
        case .features: return "Features"
        case .memory: return "Memory"
        case .privacy: return "Privacy"
        case .appearance: return "Appearance"
        case .about: return "About"
        }
    }

    var symbol: String {
        switch self {
        case .general: return "gearshape"
        case .ai: return "brain"
        case .agent: return "person.badge.shield.checkmark"
        case .features: return "switch.2"
        case .memory: return "memorychip"
        case .privacy: return "hand.raised"
        case .appearance: return "paintbrush"
        case .about: return "info.circle"
        }
    }
}

/// What the collapsed island shows on either side of the notch.
enum LiveActivity: Equatable {
    case none
    case working
    case needsApproval
    case done
    case timer
    case media
}

enum ConnectionTestState: Equatable {
    case idle
    case running
    case success(String)
    case failure(String)
}

@MainActor
@Observable
final class AppModel {
    // MARK: Services

    let isSmokeTest: Bool
    let fileStore: FileStore
    let services: AgentServices
    let confirmations: ConfirmationCenter
    let orchestrator: AgentOrchestrator
    let secrets: SecretStore
    let notifications: NotificationService
    let media: MediaService
    let calendarService: EventKitCalendarService
    let workspace: WorkspaceActions
    @ObservationIgnored private(set) var proactive: ProactiveScheduler!

    // MARK: Conversation

    private(set) var session: ConversationSession

    // MARK: Panel state

    private(set) var isExpanded = false
    private(set) var isPeeking = false
    var isPinned = false
    private(set) var selectedTab: PanelTab = .assistant
    var showingHistory = false
    var composerText = ""
    var pendingAttachments: [DocumentAttachment] = []
    var composerFocusRequest = 0
    var isComposerFocused = false
    var isModalOpen = false
    var toast: String?
    var notch = NotchMetrics.fallback
    var reduceMotionSystem = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
    private(set) var showDoneBadge = false
    private(set) var keyStatus: [ProviderKind: Bool] = [:]
    var connectionTest: ConnectionTestState = .idle
    private(set) var calendarAuthorization: AuthorizationState = .notDetermined
    private(set) var upcomingEvents: [CalendarEventInfo] = []
    var settingsPane: SettingsPane = .general

    // MARK: Hooks set by controllers

    @ObservationIgnored var onExpansionChanged: ((Bool, Bool) -> Void)?
    @ObservationIgnored var onLayoutChanged: (() -> Void)?
    @ObservationIgnored var onHotKeyChanged: (() -> Void)?
    @ObservationIgnored var openSettingsHandler: ((SettingsPane) -> Void)?
    @ObservationIgnored var panelLevel: NSWindow.Level = .statusBar
    @ObservationIgnored private var toastTask: Task<Void, Never>?
    @ObservationIgnored private var doneTask: Task<Void, Never>?

    init(smokeTest: Bool) throws {
        isSmokeTest = smokeTest
        let directory = smokeTest
            ? FileManager.default.temporaryDirectory.appendingPathComponent("NotchPilot-smoke-\(UUID().uuidString)")
            : FileStore.defaultDirectory()
        fileStore = try FileStore(directory: directory)
        let settingsStore = SettingsStore(fileStore: fileStore)
        calendarService = EventKitCalendarService()
        media = MediaService()
        workspace = WorkspaceActions()
        let clock = SystemClock()
        services = AgentServices(
            tasks: TaskStore(fileStore: fileStore, clock: clock),
            notes: NoteStore(fileStore: fileStore, clock: clock),
            memory: MemoryStore(fileStore: fileStore, clock: clock),
            settings: settingsStore,
            conversations: ConversationStore(fileStore: fileStore, persistenceEnabled: settingsStore.settings.features.saveConversationHistory),
            timer: FocusTimer(clock: clock, fileStore: fileStore),
            activity: ActionLogStore(fileStore: fileStore),
            calendar: calendarService, media: media, apps: workspace, urls: workspace,
            system: MacSystemInfoProvider(), shortcuts: ShortcutsService(), clipboard: workspace,
            dateExtractor: MacDateExtractor(), clock: clock
        )
        let secretStore: SecretStore = smokeTest ? InMemorySecretStore() : KeychainSecretStore()
        secrets = secretStore
        confirmations = ConfirmationCenter()
        notifications = NotificationService()
        notifications.isDisabled = smokeTest
        session = ConversationSession(conversation: Conversation(createdAt: Date()), store: services.conversations)
        orchestrator = AgentOrchestrator(services: services, registry: BuiltinTools.makeRegistry(), confirmations: confirmations) {
            let providerSettings = settingsStore.settings.provider
            let key = try secretStore.read(account: providerSettings.kind.keychainAccount)
            let configuration = try ProviderConfiguration.resolve(settings: providerSettings, apiKey: key)
            return ProviderFactory.make(configuration)
        }
        proactive = ProactiveScheduler(services: services, notifications: notifications)
        calendarAuthorization = calendarService.eventsAuthorization()
        refreshKeyStatus()
        wire()
    }

    private func wire() {
        let settings = services.settings
        media.isEnabled = settings.settings.features.media
        services.timer.onFinish = { [weak self] state in self?.timerFinished(state) }
        services.timer.onStateChange = { [weak self] state in self?.proactive.timerChanged(state) }
        services.tasks.onChange = { [weak self] in self?.proactive.scheduleRefresh() }
        calendarService.onChange = { [weak self] in
            guard let self else { return }
            Task { await self.refreshUpcoming() }
            self.proactive.scheduleRefresh()
        }
        confirmations.onRequest = { [weak self] _ in
            guard let self else { return }
            if !self.isExpanded { self.expand(tab: .assistant) } else { self.select(.assistant) }
        }
        orchestrator.onRunFinished = { [weak self] run, _ in self?.runFinished(run) }
        notifications.onAction = { [weak self] action in self?.handle(action) }
        settings.onSettingsChange = { [weak self] updated in self?.settingsChanged(updated) }

        if !isSmokeTest {
            notifications.configure()
            services.timer.activate()
            proactive.start()
            let removed = services.conversations.applyRetention(days: settings.settings.features.conversationRetentionDays, now: Date())
            if removed > 0 { AppLog.info("Removed \(removed) expired conversations", category: .storage) }
            Task { await refreshUpcoming() }
        } else {
            services.timer.activate()
        }
    }

    // MARK: Derived state

    var settings: AppSettings { services.settings.settings }

    var reduceMotion: Bool {
        switch settings.appearance.motion {
        case .system: return reduceMotionSystem
        case .reduced: return true
        case .full: return false
        }
    }

    var animation: Animation {
        reduceMotion ? .easeInOut(duration: 0.16) : .spring(response: 0.42, dampingFraction: 0.82)
    }

    var expandedSize: CGSize {
        CGSize(width: max(480, settings.appearance.expandedWidth), height: max(320, settings.appearance.expandedHeight) + notch.size.height)
    }

    var liveActivity: LiveActivity {
        if !confirmations.pending.isEmpty { return .needsApproval }
        if orchestrator.isRunning { return .working }
        if showDoneBadge { return .done }
        guard settings.appearance.showLiveActivities else { return .none }
        if services.timer.isActive || services.timer.state.phase == .finished && services.timer.state.finishedAt.map({ Date().timeIntervalSince($0) < 60 }) == true {
            return .timer
        }
        if media.nowPlaying?.isPlaying == true { return .media }
        return .none
    }

    /// The island's outer size (including the concave top ears).
    var shapeSize: CGSize {
        let ear = NotchLayout.earRadius(expanded: isExpanded)
        if isExpanded {
            return CGSize(width: expandedSize.width + ear * 2, height: expandedSize.height)
        }
        var width = notch.size.width
        var height = notch.size.height
        if liveActivity != .none { width += NotchLayout.wing * 2 }
        if isPeeking {
            width += NotchLayout.peekGrowth.width
            height += NotchLayout.peekGrowth.height
        }
        if collapsedPreview != nil {
            width = max(width, 400)
            height += NotchLayout.previewHeight
        }
        return CGSize(width: width + ear * 2, height: height)
    }

    /// A one-line preview of the latest answer, shown under the collapsed
    /// island right after a task finishes in the background.
    var collapsedPreview: String? {
        guard showDoneBadge, !isExpanded else { return nil }
        return lastAssistantPreview.map { TextUtilities.preview($0, limit: 90) }
    }

    var isProviderConfigured: Bool {
        let kind = settings.provider.kind
        return !kind.requiresAPIKey || keyStatus[kind] == true
    }

    // MARK: Panel

    func expand(focusComposer: Bool = false, tab: PanelTab? = nil) {
        if let tab { selectedTab = tab }
        if !isExpanded {
            withAnimation(animation) {
                isExpanded = true
                isPeeking = false
            }
            if settings.appearance.hapticFeedback && !isSmokeTest {
                NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .now)
            }
        }
        onExpansionChanged?(true, focusComposer)
        onLayoutChanged?()
    }

    func collapse() {
        guard isExpanded else { return }
        withAnimation(animation) {
            isExpanded = false
            showingHistory = false
        }
        isComposerFocused = false
        onExpansionChanged?(false, false)
    }

    func toggle() {
        isExpanded ? collapse() : expand(focusComposer: selectedTab == .assistant)
    }

    func setPeeking(_ peeking: Bool) {
        guard peeking != isPeeking, !isExpanded else { return }
        withAnimation(animation) { isPeeking = peeking }
    }

    func select(_ tab: PanelTab) {
        withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.18)) {
            selectedTab = tab
            if tab != .assistant { showingHistory = false }
        }
        if tab == .today { Task { await refreshUpcoming() } }
    }

    func showToast(_ message: String) {
        toast = message
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 3_500_000_000)
            guard !Task.isCancelled else { return }
            withAnimation { self?.toast = nil }
        }
    }

    func openSettings(_ pane: SettingsPane) {
        settingsPane = pane
        openSettingsHandler?(pane)
    }

    // MARK: Assistant

    func send(_ text: String? = nil) {
        let message = (text ?? composerText).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty || !pendingAttachments.isEmpty, !orchestrator.isRunning else { return }
        let attachments = pendingAttachments
        let turnsBefore = session.conversation.turns.count
        orchestrator.send(message, attachments: attachments, session: session)
        // Keep the draft if nothing was sent (e.g. no API key yet).
        if session.conversation.turns.count > turnsBefore {
            composerText = ""
            pendingAttachments = []
        }
        select(.assistant)
        showingHistory = false
    }

    /// Sends a prompt from elsewhere in the UI (Today, Notes, notifications).
    func ask(_ prompt: String) {
        expand(tab: .assistant)
        if orchestrator.isRunning {
            showToast("Wait for the current task to finish, or stop it first.")
            return
        }
        send(prompt)
    }

    func stop() {
        orchestrator.cancel()
    }

    func retry() {
        orchestrator.retry(session: session)
    }

    func approve(_ request: ConfirmationRequest) {
        confirmations.resolve(request.id, approved: true)
    }

    func decline(_ request: ConfirmationRequest) {
        confirmations.resolve(request.id, approved: false)
    }

    func newConversation() {
        guard !orchestrator.isRunning else {
            showToast("Stop the current task before starting a new conversation.")
            return
        }
        session = ConversationSession(conversation: Conversation(createdAt: Date()), store: services.conversations)
        showingHistory = false
        composerFocusRequest += 1
    }

    func openConversation(_ id: UUID) {
        guard !orchestrator.isRunning, let conversation = services.conversations.conversation(id) else { return }
        session = ConversationSession(conversation: conversation, store: services.conversations)
        showingHistory = false
    }

    func deleteConversation(_ id: UUID) {
        services.conversations.delete(id)
        if session.id == id { newConversation() }
    }

    func attachDocuments() {
        isModalOpen = true
        defer { isModalOpen = false }
        for url in DocumentImporter.choose(level: panelLevel) {
            do {
                let attachment = try DocumentImporter.load(url)
                pendingAttachments.append(attachment)
                if attachment.isTruncated {
                    showToast("\(attachment.fileName) is long; only the first \(DocumentImporter.maximumCharacters / 1000)k characters are available.")
                }
            } catch {
                showToast(error.localizedDescription)
            }
        }
        expand(focusComposer: true, tab: .assistant)
    }

    private func runFinished(_ run: AgentRun) {
        guard !isExpanded || selectedTab != .assistant else { return }
        // Briefly show a check mark in the collapsed island.
        showDoneBadge = true
        doneTask?.cancel()
        doneTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            guard !Task.isCancelled else { return }
            withAnimation(self?.animation) { self?.showDoneBadge = false }
        }
    }

    var lastAssistantPreview: String? {
        session.conversation.turns.last(where: { $0.role == .assistant && !$0.visibleText.isEmpty })
            .map { String($0.visibleText.prefix(160)) }
    }

    // MARK: Timer

    func startTimer(minutes: Int, kind: TimerKind, label: String = "") {
        do {
            try services.timer.start(duration: TimeInterval(minutes * 60), label: label, kind: kind,
                                     breakMinutesAfter: kind == .focus ? services.settings.preferences.defaultBreakMinutes : nil)
        } catch {
            showToast(error.localizedDescription)
        }
    }

    private func timerFinished(_ state: TimerState) {
        if state.kind == .focus, let minutes = state.breakMinutesAfter, settings.proactive.autoStartBreaks {
            startTimer(minutes: minutes, kind: .shortBreak, label: "Break")
            showToast("Focus done — \(minutes)-minute break started.")
        } else if state.kind == .focus {
            showToast("Focus session complete. Nice work.")
        } else {
            showToast("\(state.label) finished.")
        }
        if !isExpanded {
            setPeeking(true)
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                self?.setPeeking(false)
            }
        }
    }

    // MARK: Notifications

    private func handle(_ action: NotificationService.Action) {
        switch action {
        case .openAssistant(let prompt):
            if let prompt, settings.proactive.briefingTapAsksAssistant, isProviderConfigured {
                ask(prompt)
            } else {
                expand(focusComposer: true, tab: .assistant)
            }
        case .startBreak(let minutes):
            startTimer(minutes: minutes, kind: .shortBreak, label: "Break")
        case .openTab(let raw):
            expand(tab: PanelTab(rawValue: raw) ?? .today)
        }
    }

    // MARK: Settings

    private func settingsChanged(_ updated: AppSettings) {
        media.isEnabled = updated.features.media
        let persist = updated.features.saveConversationHistory
        if services.conversations.persistenceEnabled != persist {
            services.conversations.persistenceEnabled = persist
            if persist { services.conversations.save(session.conversation) } else { services.conversations.purgeDisk() }
        }
        onLayoutChanged?()
        onHotKeyChanged?()
        proactive.scheduleRefresh()
        refreshKeyStatus()
    }

    func refreshKeyStatus() {
        var status: [ProviderKind: Bool] = [:]
        for kind in ProviderKind.allCases {
            status[kind] = ((try? secrets.read(account: kind.keychainAccount)) ?? nil)?.isEmpty == false
        }
        keyStatus = status
    }

    func saveAPIKey(_ key: String, for kind: ProviderKind) {
        let trimmed = key.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            try secrets.write(trimmed, account: kind.keychainAccount)
            refreshKeyStatus()
            showToast("API key saved to your Keychain.")
        } catch {
            showToast(error.localizedDescription)
        }
    }

    func removeAPIKey(for kind: ProviderKind) {
        do {
            try secrets.delete(account: kind.keychainAccount)
        } catch {
            showToast(error.localizedDescription)
        }
        refreshKeyStatus()
    }

    /// Sends one tiny request to confirm the provider, model and key work.
    func testConnection() async {
        connectionTest = .running
        do {
            let providerSettings = settings.provider
            let key = try secrets.read(account: providerSettings.kind.keychainAccount)
            let provider = ProviderFactory.make(try ProviderConfiguration.resolve(settings: providerSettings, apiKey: key))
            let started = Date()
            let request = ModelRequest(
                model: provider.model, systemPrompt: "You are a connectivity check. Reply with exactly: OK",
                turns: [ConversationTurn(role: .user, blocks: [.text("Reply with OK.")], createdAt: Date())],
                tools: [], maxOutputTokens: 2_000, effort: .low
            )
            var reply = ""
            var servedModel: String?
            for try await event in provider.stream(request) {
                if case .completed(let response) = event {
                    reply = response.text
                    servedModel = response.servedModel
                }
            }
            let latency = Date().timeIntervalSince(started)
            connectionTest = .success("Connected to \(servedModel ?? provider.model) in \(String(format: "%.1f", latency)) s — replied “\(reply.prefix(40))”.")
        } catch {
            connectionTest = .failure(error.localizedDescription)
        }
    }

    // MARK: Calendar

    func requestCalendarAccess() async {
        calendarAuthorization = await calendarService.requestEventsAccess()
        await refreshUpcoming()
    }

    func refreshUpcoming() async {
        calendarAuthorization = calendarService.eventsAuthorization()
        guard settings.features.calendar, calendarAuthorization == .authorized else {
            upcomingEvents = []
            return
        }
        let now = Date()
        let end = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now.addingTimeInterval(86_400)
        upcomingEvents = ((try? await calendarService.events(from: now, to: end)) ?? []).filter { !$0.isAllDay || Calendar.current.isDateInToday($0.start) }
    }

    // MARK: Launch at login

    var launchAtLoginStatus: String {
        switch SMAppService.mainApp.status {
        case .enabled: return "On"
        case .requiresApproval: return "Needs approval in System Settings › General › Login Items"
        case .notRegistered: return "Off"
        case .notFound: return "Unavailable (move NotchPilot to /Applications)"
        @unknown default: return "Unknown"
        }
    }

    func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled {
                try SMAppService.mainApp.register()
            } else {
                try SMAppService.mainApp.unregister()
            }
            services.settings.updateSettings { $0.launchAtLogin = enabled }
        } catch {
            showToast("Launch at login: \(error.localizedDescription)")
        }
    }

    // MARK: Data

    func deleteAllData() {
        orchestrator.cancel()
        try? services.tasks.deleteAll()
        try? services.notes.deleteAll()
        try? services.memory.deleteAll()
        try? services.settings.resetPreferences()
        services.conversations.deleteAll()
        services.activity.clear()
        services.timer.reset()
        newConversation()
        showToast("All NotchPilot data was deleted. API keys remain in your Keychain until removed in Settings → AI.")
    }
}
