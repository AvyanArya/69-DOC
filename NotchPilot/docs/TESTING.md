# Testing

```bash
cd NotchPilot
swift test                  # all core tests (Linux or macOS); end-to-end tests need python3
swift test --filter EndToEndHTTPTests
```

## Automated tests (`Tests/NotchPilotCoreTests`, 83 tests)

| Suite | What it covers |
|---|---|
| `JSONTests` | Order-preserving parse/serialise round trips, escapes and surrogate pairs, invalid-JSON rejection, depth limit, exact persistence through `Codable`, forward-compatible settings decoding |
| `SchemaValidationTests` | **Tool argument validation**: required fields, unexpected properties (e.g. an injected `shell` argument), types, enums, ranges, string lengths, ISO dates (including impossible dates), nested arrays/objects; every built-in tool has a strict object schema, a unique name, a description and a timeout; destructive tools are never low-impact |
| `PermissionPolicyTests` | **Permission checks** for every risk level × agent mode, feature switches, memory approval, calendar/link overrides; secret redaction in logs |
| `PersistenceTests` | **Task, note, memory, settings and conversation persistence across a simulated restart**, ordering/overdue logic, corrupt-file quarantine, conversation search, retention, history-off mode |
| `FocusTimerTests` | **Timer accuracy** with an injected clock: countdown, pause/resume (paused time excluded), extend, exact completion, restart while running, completion of a timer that expired while the app was closed, the real scheduler firing |
| `DateParsingTests` | ISO parsing with/without time and zone, millisecond storage precision, rule-based extraction (“tomorrow at 3pm”, “by Friday”, “next Monday”, “30th of November”, “in 3 days”, “next week”, year roll-over), free-slot computation around overlapping and all-day events |
| `SSEParserTests` | Server-Sent Events framing, comments, multi-line data, missing blank lines, UTF-8 split across network chunks, CRLF |
| `AnthropicProviderTests` | Request shape (version header, betas, adaptive thinking, effort, fallbacks, caching, eager streaming, **no sampling parameters**), streamed thinking/progress/tool-input parsing, **verbatim replay of thinking blocks**, malformed tool input, refusals, fallback-block echo rules, **provider failures** (401/429 with `retry-after`/529/500, stream `error` events, truncated streams), automatic compatibility retry, configuration validation (missing key, plain-HTTP key leak guard), model capability table |
| `OpenAIProviderTests` | Responses API streaming function calls, `store:false`/encrypted reasoning, replay order with `function_call_output`; Chat Completions streamed tool-call deltas; cross-provider history conversion that never leaks Anthropic thinking blocks |
| `AgentOrchestratorTests` | **A complete multi-step workflow** (“25 minutes for my essay, then a break”: plan → timer → task → verify timer → answer) with real state changes and persistence; **tool-call loops**; argument validation before execution; unknown tools; malformed JSON; approval/decline/timeout; disabled features; calendar permission denied; calendar free-time + approved event creation; memory approval; **agent limits** (tool calls, model turns, failing rounds, time budget excluding approval waits); **cancellation** while awaiting approval and while streaming (history stays valid); **error recovery** (transient retries, retry budget, non-retryable errors, retry without duplicating the message); missing credentials send nothing; refusals shown but never replayed; truncated tool calls retried with more room; tool timeouts and output caps; document attachments |
| `EndToEndHTTPTests` | The real `URLSession` streaming transport against a local mock server (`Fixtures/mock_llm_server.py`) speaking the Anthropic and OpenAI Responses wire formats: a 3-round tool workflow with real effects, header/body checks, byte-identical system prompt and tools across requests, thinking blocks that the server **rejects unless replayed verbatim**, invalid-key handling, and identical replay after reloading the conversation from disk |

Every test also asserts that each `tool_use` in the history has exactly one matching `tool_result` and that each request's history is an unchanged prefix of the next (append-only).

## Continuous integration

`.github/workflows/notchpilot-macos.yml`:

* **core-linux** — `swift test` in the `swift:6.1` container (with python3 for the end-to-end tests).
* **build-and-test** (macOS) — `swift test` on macOS, `scripts/build_app.sh` (universal `.app`, ad-hoc signed, zipped), an app smoke test (`NotchPilot --smoke-test --screenshots …`) that launches the real UI against a temporary data folder, expands/collapses the island, renders every tab, an approval card, the history view and every Settings pane, checks that an unreachable provider fails cleanly, and saves screenshots; artifacts: the app ZIP, the CLI, screenshots and the test log.

## Manual checks on a Mac (cannot be automated in CI)

These need a real logged-in session, your permissions and your accounts:

- [ ] Island position and size on the built-in notched display, on an external display, and with an app in full screen
- [ ] Hover-to-expand, click-through outside the island, collapse on outside click and Esc, focus returns to the previous app
- [ ] ⇧⌘Space toggles the panel from any app; changing the shortcut in Settings
- [ ] Calendar prompt → events on the Today tab → “Find a suitable time for a study session” → approve the event → it appears in Calendar
- [ ] Reminder creation after approval appears in Reminders
- [ ] Music/Spotify: track shows in the island; play/pause/next from the Today tab and via the assistant (Automation prompt)
- [ ] Timer notification at the end of a focus session; “Start break” action
- [ ] Launch at login from `/Applications`
- [ ] A live conversation with your provider (set the key, Test connection, then the example requests in the README)
