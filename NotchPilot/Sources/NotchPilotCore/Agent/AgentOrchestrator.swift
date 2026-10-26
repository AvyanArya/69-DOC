import Foundation
import Observation

/// Runs the agent loop:
///
/// 1. Append the user's message (with a per-turn context block).
/// 2. Ask the model, streaming its answer into the UI.
/// 3. For each requested tool call: check it is allow-listed, validate the
///    arguments against the schema, apply the permission policy (asking the
///    user when needed), execute with a timeout, cap the output size.
/// 4. Return all results to the model and repeat until it answers without
///    tools, the user cancels, or a limit is reached — in which case the model
///    is asked (with tools disabled) to summarise what was and was not done.
///
/// The history is strictly append-only so provider-side caches and replayed
/// reasoning stay valid.
@MainActor
@Observable
public final class AgentOrchestrator {
    public private(set) var currentRun: AgentRun?

    @ObservationIgnored public let services: AgentServices
    @ObservationIgnored public let registry: ToolRegistry
    @ObservationIgnored public let confirmations: ConfirmationCenter
    @ObservationIgnored private let makeProvider: @MainActor () throws -> AIProvider
    @ObservationIgnored private var task: Task<Void, Never>?
    /// Overrides the per-mode limits (tests, CLI).
    @ObservationIgnored public var limitsOverride: AgentLimits?
    /// Waits between retries; replaced in tests to avoid real delays.
    @ObservationIgnored public var retryDelay: @Sendable (TimeInterval) async throws -> Void = { seconds in
        try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
    }
    @ObservationIgnored public var onRunFinished: ((AgentRun, ConversationSession) -> Void)?

    public init(services: AgentServices, registry: ToolRegistry, confirmations: ConfirmationCenter, makeProvider: @escaping @MainActor () throws -> AIProvider) {
        self.services = services
        self.registry = registry
        self.confirmations = confirmations
        self.makeProvider = makeProvider
    }

    public var isRunning: Bool { currentRun?.isActive == true }

    // MARK: Public API

    /// Sends a message. Returns nil if a run is already active or the message is empty.
    /// If the provider is not configured, returns a failed run and leaves the
    /// conversation untouched, so nothing is sent without credentials.
    @discardableResult
    public func send(_ text: String, attachments: [DocumentAttachment] = [], session: ConversationSession) -> AgentRun? {
        guard !isRunning else { return nil }
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty || !attachments.isEmpty else { return nil }
        let settings = services.settings.settings
        let run = AgentRun(conversationID: session.id, mode: settings.agent.mode, startedAt: services.clock.now())
        currentRun = run

        let provider: AIProvider
        do {
            provider = try makeProvider()
        } catch {
            finish(run, session: session, phase: .failed(error.localizedDescription))
            return run
        }

        let now = services.clock.now()
        var blocks: [ContentBlock] = [.context(ContextBuilder.make(for: trimmed, services: services, now: now))]
        blocks += attachments.map(ContentBlock.attachment)
        if !trimmed.isEmpty { blocks.append(.text(trimmed)) }
        session.append(ConversationTurn(role: .user, blocks: blocks, createdAt: now))
        start(run, provider: provider, session: session)
        return run
    }

    /// Re-runs the loop when the conversation ends with an unanswered message
    /// (after an error or a stop). Nothing new is appended to the history.
    @discardableResult
    public func retry(session: ConversationSession) -> AgentRun? {
        guard !isRunning, session.conversation.contextTurns.last?.role == .user else { return nil }
        let run = AgentRun(conversationID: session.id, mode: services.settings.settings.agent.mode, startedAt: services.clock.now())
        currentRun = run
        do {
            let provider = try makeProvider()
            start(run, provider: provider, session: session)
        } catch {
            finish(run, session: session, phase: .failed(error.localizedDescription))
        }
        return run
    }

    public func canRetry(_ session: ConversationSession) -> Bool {
        !isRunning && session.conversation.contextTurns.last?.role == .user
    }

    /// Stops the current run. Pending confirmations are declined, running tools
    /// are cancelled, and the history is closed off consistently.
    public func cancel() {
        guard let run = currentRun, run.isActive else { return }
        confirmations.cancelAll(runID: run.id)
        task?.cancel()
    }

    /// Waits for the current run (tests and CLI).
    public func waitUntilFinished() async {
        await task?.value
    }

    // MARK: Loop

    private func start(_ run: AgentRun, provider: AIProvider, session: ConversationSession) {
        session.noteProvider(provider.kind, model: provider.model)
        task = Task { @MainActor [weak self] in
            guard let self else { return }
            await self.execute(run, provider: provider, session: session)
        }
    }

    private struct LoopState {
        var confirmationWait: TimeInterval = 0
        var consecutiveFailures = 0
        var forceFinalAnswer = false
        var finalAnswerRequested = false
        var limitReason: String?
        var maxTokensOverride: Int?
    }

    private func execute(_ run: AgentRun, provider: AIProvider, session: ConversationSession) async {
        let settings = services.settings.settings
        let limits = limitsOverride ?? AgentLimits.forMode(run.mode)
        var state = LoopState()

        while true {
            if Task.isCancelled { return finish(run, session: session, phase: .cancelled) }

            if run.modelCalls >= limits.maxModelCalls, !state.forceFinalAnswer {
                state.forceFinalAnswer = true
                state.limitReason = "it reached the limit of \(limits.maxModelCalls) model requests"
            }
            if state.forceFinalAnswer, state.finalAnswerRequested {
                return finish(run, session: session, phase: .stoppedAtLimit(state.limitReason ?? "limit reached"))
            }

            let request = ModelRequest(
                model: provider.model, systemPrompt: SystemPrompt.text, turns: session.conversation.contextTurns,
                tools: registry.specs, toolChoice: state.forceFinalAnswer ? .none : .auto,
                maxOutputTokens: state.maxTokensOverride ?? settings.provider.maxOutputTokens, effort: settings.provider.effort
            )
            if state.forceFinalAnswer { state.finalAnswerRequested = true }

            let response: ModelResponse
            do {
                response = try await callModel(provider, request: request, run: run, limits: limits)
            } catch {
                if Task.isCancelled || (error as? ProviderError) == .cancelled {
                    appendPartial(run, session: session)
                    return finish(run, session: session, phase: .cancelled)
                }
                appendPartial(run, session: session)
                return finish(run, session: session, phase: .failed(error.localizedDescription))
            }
            run.modelCalls += 1
            run.usage.inputTokens += response.usage.inputTokens
            run.usage.outputTokens += response.usage.outputTokens
            run.usage.cacheReadTokens += response.usage.cacheReadTokens

            switch response.stopReason {
            case .refusal(let category, let explanation):
                // Keep the partial answer visible, but never send it back.
                let partial = response.blocks.filter { if case .text = $0 { return true } else { return false } }
                if !partial.isEmpty {
                    session.append(ConversationTurn(role: .assistant, blocks: partial, createdAt: services.clock.now(), status: .refused, servedModel: response.servedModel, excludedFromContext: true))
                }
                var message = "The provider declined this request"
                if let category { message += " (\(category))" }
                if let explanation = explanation?.nilIfBlank { message += ": \(explanation)" }
                run.streamingText = ""
                return finish(run, session: session, phase: .failed(message + "."))
            case .contextWindowExceeded:
                run.streamingText = ""
                return finish(run, session: session, phase: .failed("This conversation is too long for the model. Start a new conversation."))
            case .maxTokens where !response.toolUses.isEmpty:
                // A tool call was cut off mid-input: never run it. Retry once with more room.
                run.streamingText = ""
                if state.maxTokensOverride == nil {
                    state.maxTokensOverride = min(max(request.maxOutputTokens * 2, 8_000), 64_000)
                    run.notices.append("The answer hit the length limit; retrying with more room.")
                    continue
                }
                return finish(run, session: session, phase: .failed("The model's answer was too long and was cut off."))
            default:
                break
            }

            session.append(ConversationTurn(
                role: .assistant, blocks: response.blocks, native: response.native, createdAt: services.clock.now(),
                status: response.stopReason == .maxTokens ? .interrupted : .complete, servedModel: response.servedModel
            ))
            run.streamingText = ""
            run.progressNote = ""
            if response.stopReason == .maxTokens {
                run.notices.append("The answer was cut off at the length limit.")
            }

            let toolUses = response.toolUses
            if toolUses.isEmpty {
                if response.text.isEmpty {
                    run.notices.append("The model returned an empty answer.")
                }
                if let reason = state.limitReason {
                    run.incompleteReason = "Stopped early because \(reason)."
                    return finish(run, session: session, phase: .stoppedAtLimit(reason))
                }
                return finish(run, session: session, phase: .finished)
            }

            // Execute every requested tool call, in order, and return all results together.
            var results: [ContentBlock] = []
            var roundSucceeded = false
            var roundFailed = false
            for use in toolUses {
                if Task.isCancelled {
                    results.append(.toolResult(ToolResultBlock(toolUseID: use.id, toolName: use.name, content: #"{"error":"Cancelled by the user before this ran."}"#, isError: true)))
                    continue
                }
                if state.forceFinalAnswer {
                    results.append(.toolResult(ToolResultBlock(toolUseID: use.id, toolName: use.name, content: #"{"error":"Not run: the step budget is used up."}"#, isError: true)))
                    continue
                }
                if run.toolCalls >= limits.maxToolCalls {
                    state.forceFinalAnswer = true
                    state.limitReason = "it reached the limit of \(limits.maxToolCalls) tool calls"
                    results.append(.toolResult(ToolResultBlock(toolUseID: use.id, toolName: use.name, content: #"{"error":"Not run: the tool-call budget for this request is used up."}"#, isError: true)))
                    continue
                }
                run.toolCalls += 1
                let (outcome, status) = await executeTool(use, malformedInput: response.malformedToolInputs[use.id], run: run, session: session, limits: limits, state: &state)
                results.append(.toolResult(outcome))
                switch status {
                case .succeeded, .declined: roundSucceeded = true
                case .failed, .denied: roundFailed = true
                default: break
                }
            }
            // A round in which every call failed counts toward the failure limit;
            // any success (or a deliberate decline by the user) resets it.
            if roundSucceeded {
                state.consecutiveFailures = 0
            } else if roundFailed {
                state.consecutiveFailures += 1
            }

            let activeTime = services.clock.now().timeIntervalSince(run.startedAt) - state.confirmationWait
            if !state.forceFinalAnswer, activeTime > limits.maxActiveDuration {
                state.forceFinalAnswer = true
                state.limitReason = "it reached the \(Int(limits.maxActiveDuration))-second time limit"
            }
            if !state.forceFinalAnswer, state.consecutiveFailures >= limits.maxConsecutiveFailures {
                state.forceFinalAnswer = true
                state.limitReason = "tool calls failed in \(state.consecutiveFailures) rounds in a row"
            }
            if state.forceFinalAnswer, let reason = state.limitReason, !Task.isCancelled {
                results.append(.context("<context>\nNotchPilot stopped tool use because \(reason). Do not call more tools. Tell the user briefly what was completed, what was not, and what they could do next.\n</context>"))
            }
            session.append(ConversationTurn(role: .user, blocks: results, createdAt: services.clock.now()))

            if Task.isCancelled { return finish(run, session: session, phase: .cancelled) }
        }
    }

    /// Streams one model request into the run, retrying transient failures
    /// that happen before any output arrived.
    private func callModel(_ provider: AIProvider, request: ModelRequest, run: AgentRun, limits: AgentLimits) async throws -> ModelResponse {
        var attempt = 0
        while true {
            run.phase = .waitingForModel
            run.streamingText = ""
            run.progressNote = ""
            var receivedOutput = false
            do {
                for try await event in provider.stream(request) {
                    switch event {
                    case .started:
                        break
                    case .textDelta(let text):
                        receivedOutput = true
                        run.phase = .streaming
                        run.streamingText += text
                    case .progressDelta(let text):
                        receivedOutput = true
                        run.progressNote += text
                    case .toolCallStarted(_, let name):
                        receivedOutput = true
                        run.phase = .runningTool(name)
                    case .notice(let message):
                        run.notices.append(message)
                    case .completed(let response):
                        return response
                    }
                }
                if Task.isCancelled { throw ProviderError.cancelled }
                throw ProviderError.invalidResponse("The stream ended without a final message.")
            } catch let error as ProviderError where error.isRetryable && !receivedOutput && attempt < limits.maxRetries && !Task.isCancelled {
                attempt += 1
                var delay: TimeInterval = attempt == 1 ? 1.5 : 4
                if case .rateLimited(let retryAfter, _) = error, let retryAfter { delay = min(max(retryAfter, 1), 20) }
                run.phase = .retrying(error.localizedDescription)
                run.notices.append("Retrying after: \(error.localizedDescription)")
                try await retryDelay(delay)
            }
        }
    }

    private func executeTool(_ use: ToolUseBlock, malformedInput: String?, run: AgentRun, session: ConversationSession, limits: AgentLimits, state: inout LoopState) async -> (ToolResultBlock, ActionRecord.Status) {
        let started = services.clock.now()
        var record = ActionRecord(conversationID: session.id, runID: run.id, toolUseID: use.id, toolName: use.name, title: use.name, argumentsPreview: TextUtilities.preview(use.input.serialized(), limit: 160), status: .running, startedAt: started)

        func result(_ status: ActionRecord.Status, summary: String, content: String, isError: Bool) -> (ToolResultBlock, ActionRecord.Status) {
            record.status = status
            record.resultSummary = summary
            record.finishedAt = services.clock.now()
            store(record, run: run, session: session)
            return (ToolResultBlock(toolUseID: use.id, toolName: use.name, content: content, isError: isError), status)
        }
        func errorJSON(_ message: String) -> String {
            JSONValue.object(JSONObject([("error", .string(message))])).serialized()
        }

        // 1. Allowlist.
        guard let tool = registry.tool(named: use.name) else {
            return result(.denied, summary: "Unknown tool", content: errorJSON("There is no tool named \(use.name)."), isError: true)
        }
        record.title = tool.definition.name
        // 2. Arguments must be valid JSON matching the schema exactly.
        if let malformedInput {
            return result(.failed, summary: "Invalid arguments", content: JSONValue.object(JSONObject([("INVALID_JSON", .string(malformedInput))])).serialized(), isError: true)
        }
        guard let object = use.input.objectValue else {
            return result(.failed, summary: "Invalid arguments", content: errorJSON("Arguments must be a JSON object."), isError: true)
        }
        do {
            try tool.definition.schema.validate(use.input)
        } catch {
            return result(.failed, summary: "Invalid arguments", content: errorJSON("Invalid arguments: \(error)"), isError: true)
        }
        let args = ToolArguments(object)
        record.title = tool.describe(args)
        store(record, run: run, session: session)

        // 3. Permission policy, enforced in code.
        switch PermissionPolicy.evaluate(tool.definition, settings: services.settings.settings) {
        case .deny(let reason):
            return result(.denied, summary: reason, content: errorJSON("Not permitted: \(reason)"), isError: true)
        case .confirm(let reason):
            record.requiredConfirmation = true
            store(record, run: run, session: session)
            run.phase = .awaitingConfirmation
            let waitStart = services.clock.now()
            let outcome = await confirmations.request(
                runID: run.id, toolName: tool.definition.name, title: record.title, reason: reason,
                risk: tool.definition.risk, timeout: services.settings.settings.agent.confirmationTimeout, now: waitStart
            )
            state.confirmationWait += services.clock.now().timeIntervalSince(waitStart)
            switch outcome {
            case .approved:
                break
            case .declined:
                return result(.declined, summary: "You declined", content: errorJSON("The user declined this action. Do not retry it; offer an alternative if useful."), isError: true)
            case .timedOut:
                return result(.declined, summary: "No answer — not run", content: errorJSON("The user did not respond to the confirmation, so the action was not run."), isError: true)
            case .cancelled:
                return result(.cancelled, summary: "Cancelled", content: errorJSON("Cancelled by the user before this ran."), isError: true)
            }
        case .allow:
            break
        }
        if Task.isCancelled {
            return result(.cancelled, summary: "Cancelled", content: errorJSON("Cancelled by the user before this ran."), isError: true)
        }

        // 4. Execute with a timeout; 5. cap the output.
        run.phase = .runningTool(tool.definition.name)
        let context = ToolContext(services: services, conversationID: session.id, attachments: session.attachments) { [weak run] steps in
            run?.plan = steps
        }
        do {
            let output = try await Self.withTimeout(tool.definition.timeout, name: tool.definition.name) {
                try await tool.run(args, context)
            }
            let content = TextUtilities.truncate(output.data.serialized(), limit: limits.maxToolOutputCharacters)
            return result(.succeeded, summary: output.summary, content: content, isError: false)
        } catch is CancellationError {
            return result(.cancelled, summary: "Cancelled", content: errorJSON("Cancelled by the user while running."), isError: true)
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? String(describing: error)
            return result(.failed, summary: message, content: errorJSON(message), isError: true)
        }
    }

    static func withTimeout(_ seconds: TimeInterval, name: String, _ operation: @escaping @MainActor () async throws -> ToolOutput) async throws -> ToolOutput {
        try await withThrowingTaskGroup(of: ToolOutput.self) { group in
            group.addTask { @MainActor in try await operation() }
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw ToolError.timeout("\(name) took longer than \(Int(seconds)) seconds.")
            }
            defer { group.cancelAll() }
            guard let first = try await group.next() else { throw CancellationError() }
            return first
        }
    }

    private func store(_ record: ActionRecord, run: AgentRun, session: ConversationSession) {
        session.upsertAction(record)
        services.activity.upsert(record)
        let step = AgentStep(
            id: record.id, toolName: record.toolName, title: record.title, status: record.status, resultSummary: record.resultSummary,
            needsConfirmation: record.requiredConfirmation, startedAt: record.startedAt, finishedAt: record.finishedAt
        )
        if let index = run.steps.firstIndex(where: { $0.id == step.id }) {
            run.steps[index] = step
        } else {
            run.steps.append(step)
        }
    }

    /// Keeps text that streamed before a cancellation or failure, without any
    /// partial provider blocks (which could not be replayed).
    private func appendPartial(_ run: AgentRun, session: ConversationSession) {
        let partial = run.streamingText.trimmingCharacters(in: .whitespacesAndNewlines)
        run.streamingText = ""
        run.progressNote = ""
        guard !partial.isEmpty else { return }
        session.append(ConversationTurn(role: .assistant, blocks: [.text(partial)], createdAt: services.clock.now(), status: .interrupted))
    }

    private func finish(_ run: AgentRun, session: ConversationSession, phase: AgentRun.Phase) {
        guard run.isActive else { return }
        // Tool calls left without results would make the next request invalid.
        closeDanglingToolUses(session)
        run.phase = phase
        run.finishedAt = services.clock.now()
        if case .stoppedAtLimit(let reason) = phase, run.incompleteReason == nil {
            run.incompleteReason = "Stopped early because \(reason)."
        }
        for index in run.steps.indices where run.steps[index].status == .running {
            run.steps[index].status = .cancelled
        }
        confirmations.cancelAll(runID: run.id)
        onRunFinished?(run, session)
    }

    private func closeDanglingToolUses(_ session: ConversationSession) {
        guard let last = session.conversation.contextTurns.last, last.role == .assistant else { return }
        let uses = last.toolUses
        guard !uses.isEmpty else { return }
        let results = uses.map { use in
            ContentBlock.toolResult(ToolResultBlock(toolUseID: use.id, toolName: use.name, content: #"{"error":"Not run: the request was stopped."}"#, isError: true))
        }
        session.append(ConversationTurn(role: .user, blocks: results, createdAt: services.clock.now()))
    }
}
