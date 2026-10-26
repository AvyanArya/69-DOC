# Architecture

NotchPilot is a Swift package with three targets:

| Target | Platform | Purpose |
|---|---|---|
| `NotchPilotCore` | macOS + Linux | Agent loop, AI provider adapters, tool registry and tools, permission policy, persistence, timer engine. Foundation only — no AppKit — so it is unit-tested everywhere. |
| `NotchPilot` | macOS 14+ | The app: notch panel (AppKit), SwiftUI views, and the macOS implementations of the core's platform protocols (EventKit, Keychain, NSWorkspace, IOKit, libproc, UserNotifications, ServiceManagement). |
| `notchpilot-cli` | macOS + Linux | The same agent and stores in a terminal (for scripting, testing a provider, or Macs without a notch). |

```
Sources/
  NotchPilotCore/
    JSON/          order-preserving JSON parser/serialiser (exact replay of provider blocks)
    Schema/        JSON-Schema subset: tool definitions + strict argument validation
    Models/        tasks, notes, memories, settings, conversations (provider-native content)
    Persistence/   atomic JSON file store, corrupt-file quarantine, forward-compatible settings
    Stores/        @Observable stores (tasks, notes, memory, settings, conversations, activity)
    Timer/         focus timer (wall-clock end dates, injectable clock/scheduler)
    AI/            transport (URLSession streaming), SSE parser, Anthropic / OpenAI Responses / Chat Completions adapters
    Agent/         orchestrator (tool loop), run state, system prompt + per-turn context
    Tools/         tool framework, permission policy, confirmation centre, 40 built-in tools
    Platform/      protocols for OS integrations + honest "unavailable" implementations, date extraction
  NotchPilot/
    App/           AppDelegate, AppModel (composition root), smoke test
    Window/        notch geometry, NSPanel, window controller (hover/click-through), hot key, menu-bar item
    UI/            SwiftUI: island, assistant, today, tasks, notes, activity, settings, theme
    Services/      Keychain, EventKit, media, workspace, Shortcuts, system info, notifications, proactive scheduler
  NotchPilotCLI/   terminal front end
```

## The agent loop

`AgentOrchestrator` (`Sources/NotchPilotCore/Agent/AgentOrchestrator.swift`) runs one request:

```
user message ──► append user turn  [<context> time · preferences · relevant memories · timer] + attachments + text
                    │
                    ▼
            ┌── model request (streamed) ◄──────────────────────────────┐
            │      text → UI · progress notes → UI · tool calls          │
            ▼                                                            │
   stop reason?  refusal → show, never replay · context full → stop      │
            │  max_tokens during a tool call → retry once with more room │
            ▼                                                            │
   for each tool call (in order):                                       │
     1. allowlist      unknown tool → error result                      │
     2. validate       JSON must parse and match the schema exactly     │
     3. permission     allow / confirm (card in the notch) / deny       │
     4. execute        with per-tool timeout, cancellable               │
     5. cap output     truncated to 16 000 characters                   │
     6. record         activity log + conversation + live run state     │
            │                                                            │
            ▼                                                            │
   append ALL results in one user turn ── limits OK? ───────────────────┘
            │ limit reached (tool calls, model turns, time, failing rounds)
            ▼
   final request with tools disabled → "what was done / not done" summary
```

Limits per mode (`AgentLimits.forMode`): Standard/Cautious — 14 tool calls, 10 model turns, 3 minutes of active time, 3 consecutive all-failed rounds; Autonomous — 32, 20, 7 minutes, 4. Time spent waiting for the user's approval is excluded. Transient provider errors (429, 5xx/529, network, timeouts) are retried twice before any output arrives, honouring `retry-after`.

### Append-only history

The system prompt (`SystemPrompt.text`) and the tool list never change within a conversation; per-turn facts (time, preferences, memories) travel in a hidden context block inside each user turn. History is never edited. This keeps the request prefix byte-stable, which

* lets Anthropic's prompt cache hit on every turn, and
* keeps replayed **thinking blocks** valid — current Claude models reject (or drop) reasoning whose preceding conversation changed.

Assistant turns store the provider's native content (`NativeContent`) next to a provider-neutral view (`ContentBlock`), so they are replayed verbatim to the same provider and converted when a conversation continues on a different one. A cancelled or failed turn is closed consistently: every `tool_use` always gets a `tool_result`.

## Providers

| Adapter | API | Notes |
|---|---|---|
| `AnthropicProvider` | Messages API, `anthropic-version: 2026-10-21`, SSE | Adaptive thinking with `display: "updates"` (progress notes), `effort`, `fallbacks: "default"` for refusals, `block_binding: drop_block`, automatic prompt caching and eager tool-input streaming on the first-party endpoint. If an endpoint rejects any optional feature the adapter retries once without them and stays in compatibility mode. No sampling parameters are sent. |
| `OpenAIResponsesProvider` | Responses API, SSE | `store: false`, encrypted reasoning items replayed from local history, `reasoning.effort` for reasoning models. |
| `OpenAIChatProvider` | Chat Completions, SSE | For OpenAI-compatible servers (Ollama, LM Studio, OpenRouter…); tool calls assembled from streamed deltas. |

All adapters map HTTP errors to `ProviderError` (auth, permission, not found, rate limited with `retry-after`, overloaded, server, bad request, network, timeout), redact secrets from error text, and treat a stream that ends without its terminal event as a network error.

## Tools

Every tool is a `RegisteredTool`: a `ToolDefinition` (name, prescriptive description, JSON schema, risk, feature area, timeout, low-impact flag), a `describe` closure that turns arguments into a human sentence for approval cards and the activity log, and an async `run` closure. The registry is the allowlist — there is no generic shell, file-system or scripting tool.

| Area | Tools |
|---|---|
| Time & planning | `get_current_datetime`, `set_plan` |
| Tasks | `list_tasks`, `create_task`, `create_tasks`, `update_task`, `complete_task`, `delete_task`¹ |
| Notes | `list_notes`, `read_note`, `create_note`, `update_note`, `delete_note`¹ |
| Timer | `start_timer`, `get_timer_status`, `control_timer` |
| Preferences & memory | `get_preferences`, `update_preferences`, `save_memory`², `search_memory`, `delete_memory`¹, `search_conversations` |
| Overview & calendar | `get_daily_overview`, `get_calendar_events`, `find_free_time`, `create_calendar_event`³, `create_reminder`³ |
| Mac | `open_application`, `open_url`³, `get_system_info`, `get_top_memory_processes`, `get_battery_status`, `get_now_playing`, `control_media`, `list_shortcuts`, `run_shortcut`¹, `copy_to_clipboard` |
| Text & documents | `create_email_draft`³ (never sends), `extract_dates`, `read_attachment` |

¹ always asks · ² asks by default · ³ asks unless allowed in Settings (Cautious mode asks for every change).

Tools that change state return the saved state read back from the store, which the model uses to verify the outcome (e.g. `start_timer` returns the running timer with its remaining seconds).

## Permission policy

`PermissionPolicy.evaluate` (`Sources/NotchPilotCore/Tools/Permissions.swift`) runs in code for every call:

| Risk | Cautious | Standard | Autonomous |
|---|---|---|---|
| read | allow | allow | allow |
| app-owned write (tasks, notes, timer, prefs) | ask | allow | allow |
| memory save | ask (setting) | ask (setting) | ask (setting) |
| external, low impact (open app, media, clipboard) | ask | allow | allow |
| external (calendar, reminders, links, email draft) | ask | ask¹ | ask¹ |
| destructive (delete) | ask | ask | ask |
| sensitive (Shortcuts) | ask | ask | ask |

¹ unless the matching "without asking" setting is on. A feature switched off in Settings is denied outright. Unanswered approvals expire (default 5 minutes) and count as declined.

## Persistence

`~/Library/Application Support/NotchPilot/` (or `~/.notchpilot` for the CLI on Linux):

| File | Contents |
|---|---|
| `settings.json`, `preferences.json` | App settings and assistant preferences (no secrets) |
| `tasks.json`, `notes.json`, `memories.json` | App-owned data |
| `timer.json` | Timer state (absolute end date) and recent focus sessions |
| `activity.json` | Last 500 agent actions |
| `conversations/index.json`, `conversations/<uuid>.json` | Conversation history (when enabled) |

Writes are atomic; a file that fails to decode is moved aside (`*.corrupt-<time>.json`) instead of being overwritten. Settings decode with defaults for keys added in later versions. API keys live only in the login Keychain (service `io.github.avyanarya.notchpilot`).

## Notch window

`NotchWindowController` positions a borderless, non-activating `NSPanel` above the menu bar on the display with a camera housing (`NSScreen.safeAreaInsets` / `auxiliaryTopLeftArea` / `auxiliaryTopRightArea`), or as a small island inside the menu bar on other displays. The panel ignores mouse events except over the island itself (tracked with global/local mouse-moved monitors, which need no special permission), so the menu bar and windows below stay clickable. It only becomes key when you click the composer or use the shortcut, and hands focus back when it collapses. The global shortcut uses Carbon `RegisterEventHotKey`, which needs no Accessibility permission.
