import Foundation
import NotchPilotCore

// notchpilot-cli — drives the same agent, tools and stores as the app from a
// terminal. Useful for scripting, testing a provider configuration, and on
// machines without a notch. API keys come from environment variables only.

struct CLIOptions {
    var dataDirectory = FileStore.defaultDirectory()
    var provider: ProviderKind?
    var model: String?
    var baseURL: String?
    var mode: AgentMode?
    var effort: ReasoningEffort?
    var autoApprove = false
    var verbose = false
    var conversationID: UUID?
    var command = "help"
    var arguments: [String] = []
}

func usage() -> String {
    """
    notchpilot-cli — NotchPilot's agent in the terminal

    USAGE
      notchpilot-cli [options] chat "<message>"     Send one message (continues --conversation if given)
      notchpilot-cli [options] repl                 Interactive conversation
      notchpilot-cli [options] tasks|notes|memories|timer|activity|conversations
      notchpilot-cli tools                          List the tool allowlist with risk levels

    OPTIONS
      --data-dir <path>       Data directory (default: \(FileStore.defaultDirectory().path))
      --provider <name>       anthropic | openai | compatible
      --model <id>            Model identifier
      --base-url <url>        Override the provider endpoint
      --mode <mode>           cautious | standard | autonomous
      --effort <level>        low | medium | high
      --conversation <uuid>   Continue an existing conversation
      --yes                   Approve confirmation prompts automatically
      --verbose               Log provider activity to stderr

    API KEYS (never stored by the CLI)
      NOTCHPILOT_API_KEY, or ANTHROPIC_API_KEY / OPENAI_API_KEY for the chosen provider.
    """
}

func parseOptions() -> CLIOptions {
    var options = CLIOptions()
    var args = Array(CommandLine.arguments.dropFirst())
    while !args.isEmpty {
        let arg = args.removeFirst()
        func value() -> String {
            guard !args.isEmpty else {
                FileHandle.standardError.write(Data("Missing value for \(arg)\n".utf8))
                exit(2)
            }
            return args.removeFirst()
        }
        switch arg {
        case "--data-dir": options.dataDirectory = URL(fileURLWithPath: (value() as NSString).expandingTildeInPath)
        case "--provider":
            switch value().lowercased() {
            case "anthropic", "claude": options.provider = .anthropic
            case "openai": options.provider = .openAI
            case "compatible", "openai-compatible", "ollama": options.provider = .openAICompatible
            default: FileHandle.standardError.write(Data("Unknown provider\n".utf8)); exit(2)
            }
        case "--model": options.model = value()
        case "--base-url": options.baseURL = value()
        case "--mode": options.mode = AgentMode(rawValue: value().lowercased())
        case "--effort": options.effort = ReasoningEffort(rawValue: value().lowercased())
        case "--conversation": options.conversationID = UUID(uuidString: value())
        case "--yes", "-y": options.autoApprove = true
        case "--verbose", "-v": options.verbose = true
        case "--help", "-h": options.command = "help"
        default:
            if options.command == "help" && !arg.hasPrefix("-") && options.arguments.isEmpty && ["chat", "repl", "tasks", "notes", "memories", "timer", "activity", "conversations", "tools"].contains(arg) {
                options.command = arg
            } else {
                options.arguments.append(arg)
            }
        }
    }
    return options
}

func apiKey(for kind: ProviderKind) -> String? {
    let env = ProcessInfo.processInfo.environment
    if let key = env["NOTCHPILOT_API_KEY"]?.trimmingCharacters(in: .whitespacesAndNewlines), !key.isEmpty { return key }
    switch kind {
    case .anthropic: return env["ANTHROPIC_API_KEY"]
    case .openAI: return env["OPENAI_API_KEY"]
    case .openAICompatible: return env["OPENAI_API_KEY"]
    }
}

func write(_ text: String) {
    FileHandle.standardOutput.write(Data(text.utf8))
}

@MainActor
final class CLI {
    let options: CLIOptions
    let services: AgentServices
    let orchestrator: AgentOrchestrator
    let confirmations = ConfirmationCenter()

    init(options: CLIOptions) throws {
        self.options = options
        let fileStore = try FileStore(directory: options.dataDirectory)
        services = AgentServices.portable(fileStore: fileStore)
        services.settings.updateSettings { settings in
            if let provider = options.provider { settings.provider.kind = provider }
            if let model = options.model { settings.provider.setModel(model, for: settings.provider.kind) }
            if let url = options.baseURL { settings.provider.setBaseURL(url, for: settings.provider.kind) }
            if let mode = options.mode { settings.agent.mode = mode }
            if let effort = options.effort { settings.provider.effort = effort }
        }
        let settingsStore = services.settings
        orchestrator = AgentOrchestrator(services: services, registry: BuiltinTools.makeRegistry(), confirmations: confirmations) {
            let providerSettings = settingsStore.settings.provider
            let configuration = try ProviderConfiguration.resolve(settings: providerSettings, apiKey: apiKey(for: providerSettings.kind))
            return ProviderFactory.make(configuration)
        }
        confirmations.onRequest = { [weak self] request in
            self?.ask(request)
        }
        services.timer.onFinish = { state in
            write("\n⏰ Timer finished: \(state.label)\n")
        }
        services.timer.activate()
    }

    func ask(_ request: ConfirmationRequest) {
        if options.autoApprove {
            write("  ✓ auto-approved: \(request.title)\n")
            confirmations.resolve(request.id, approved: true)
            return
        }
        write("\n  ⚠️  \(request.title)\n     \(request.reason) Approve? [y/N] ")
        let answer = readLine()?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
        confirmations.resolve(request.id, approved: answer == "y" || answer == "yes")
    }

    func session() -> ConversationSession {
        if let id = options.conversationID, let existing = services.conversations.conversation(id) {
            return ConversationSession(conversation: existing, store: services.conversations)
        }
        return ConversationSession(conversation: Conversation(createdAt: services.clock.now()), store: services.conversations)
    }

    func chat(_ message: String, session: ConversationSession) async {
        guard let run = orchestrator.send(message, session: session) else {
            write("Nothing to send.\n")
            return
        }
        var printedText = ""
        var printedProgress = ""
        var reportedSteps: [UUID: ActionRecord.Status] = [:]
        var printedNotices = 0
        var lastTurnCount = session.conversation.turns.count

        func flush() {
            if run.progressNote.count > printedProgress.count, run.progressNote.hasPrefix(printedProgress) {
                if printedProgress.isEmpty { write("  … ") }
                write(String(run.progressNote.dropFirst(printedProgress.count)))
                printedProgress = run.progressNote
            }
            if run.streamingText.count > printedText.count, run.streamingText.hasPrefix(printedText) {
                if printedText.isEmpty, !printedProgress.isEmpty { write("\n") }
                write(String(run.streamingText.dropFirst(printedText.count)))
                printedText = run.streamingText
            }
            // A completed assistant turn resets the streaming buffers.
            if session.conversation.turns.count != lastTurnCount {
                for turn in session.conversation.turns.dropFirst(lastTurnCount) where turn.role == .assistant {
                    if printedProgress.isEmpty {
                        for case .progress(let note) in turn.blocks { write("  … \(note)\n") }
                    }
                    let text = turn.visibleText
                    if text.count > printedText.count, text.hasPrefix(printedText) {
                        write(String(text.dropFirst(printedText.count)))
                    }
                    if !text.isEmpty || !printedProgress.isEmpty { write("\n") }
                    printedText = ""
                    printedProgress = ""
                }
                lastTurnCount = session.conversation.turns.count
            }
            for step in run.steps where reportedSteps[step.id] != step.status && step.status != .running {
                reportedSteps[step.id] = step.status
                let icon: String
                switch step.status {
                case .succeeded: icon = "✓"
                case .declined, .denied: icon = "⊘"
                case .cancelled, .skipped: icon = "–"
                default: icon = "✗"
                }
                write("  \(icon) \(step.title) — \(step.resultSummary)\n")
            }
            while printedNotices < run.notices.count {
                write("  ℹ︎ \(run.notices[printedNotices])\n")
                printedNotices += 1
            }
        }

        while run.isActive {
            flush()
            try? await Task.sleep(nanoseconds: 40_000_000)
        }
        await orchestrator.waitUntilFinished()
        flush()
        switch run.phase {
        case .failed(let message): write("\n⚠️  \(message)\n")
        case .cancelled: write("\n(cancelled)\n")
        case .stoppedAtLimit(let reason): write("\n(stopped: \(reason))\n")
        default: break
        }
        if options.verbose {
            write("  [model calls: \(run.modelCalls), tool calls: \(run.toolCalls), tokens in/out: \(run.usage.inputTokens)/\(run.usage.outputTokens), cache read: \(run.usage.cacheReadTokens)]\n")
        }
    }

    func list(_ what: String) {
        let now = services.clock.now()
        switch what {
        case "tasks":
            let tasks = services.tasks.sortedTasks
            if tasks.isEmpty { write("No tasks.\n") }
            for task in tasks {
                let due = task.dueDate.map { " · due \(DateCoding.friendly($0, includeTime: task.dueHasTime))" } ?? ""
                write("\(task.isCompleted ? "☑" : "☐") [\(ShortID.make(task.id))] \(task.title) (\(task.priority.rawValue))\(due)\(task.isOverdue(at: now) ? " · OVERDUE" : "")\n")
            }
        case "notes":
            let notes = services.notes.sortedNotes
            if notes.isEmpty { write("No notes.\n") }
            for note in notes { write("[\(ShortID.make(note.id))] \(note.title) — \(TextUtilities.preview(note.body, limit: 70))\n") }
        case "memories":
            let items = services.memory.sortedItems
            if items.isEmpty { write("No memories.\n") }
            for item in items { write("[\(ShortID.make(item.id))] (\(item.category.rawValue)) \(item.content)\n") }
        case "timer":
            let timer = services.timer
            write("Timer: \(timer.state.phase.rawValue)")
            if timer.state.phase != .idle {
                write(" — \(timer.state.label) (\(timer.state.kind.rawValue)), remaining \(Int(timer.remaining()))s")
            }
            write("\n")
        case "activity":
            for record in services.activity.records.prefix(30) {
                write("\(DateCoding.friendly(record.startedAt)) \(record.status.rawValue.padding(toLength: 9, withPad: " ", startingAt: 0)) \(record.title) — \(record.resultSummary)\n")
            }
        case "conversations":
            for summary in services.conversations.summaries {
                write("\(summary.id.uuidString)  \(DateCoding.friendly(summary.updatedAt))  \(summary.title)\n")
            }
        case "tools":
            for tool in orchestrator.registry.allTools {
                let def = tool.definition
                write("\(def.name.padding(toLength: 26, withPad: " ", startingAt: 0)) \(def.risk.label.padding(toLength: 26, withPad: " ", startingAt: 0)) [\(def.feature.displayName)]\(def.lowImpact ? " (low impact)" : "")\n")
            }
        default:
            write(usage() + "\n")
        }
    }

    func run() async -> Int32 {
        switch options.command {
        case "chat":
            let message = options.arguments.joined(separator: " ")
            guard !message.isEmpty else { write("Usage: notchpilot-cli chat \"message\"\n"); return 2 }
            let session = session()
            await chat(message, session: session)
            write("conversation: \(session.id.uuidString)\n")
            return orchestrator.currentRun?.errorMessage == nil ? 0 : 1
        case "repl":
            let session = session()
            write("NotchPilot (\(services.settings.settings.provider.kind.displayName), \(services.settings.settings.provider.currentModel)). Type /quit to exit.\n")
            while true {
                write("\n› ")
                guard let line = readLine() else { break }
                if line == "/quit" || line == "/exit" { break }
                if line.trimmingCharacters(in: .whitespaces).isEmpty { continue }
                await chat(line, session: session)
            }
            return 0
        case "help":
            write(usage() + "\n")
            return 0
        default:
            list(options.command)
            return 0
        }
    }
}

let options = parseOptions()
AppLog.mirrorToStandardError = options.verbose
do {
    let cli = try await MainActor.run { try CLI(options: options) }
    let code = await cli.run()
    exit(code)
} catch {
    FileHandle.standardError.write(Data("Error: \(error.localizedDescription)\n".utf8))
    exit(1)
}
