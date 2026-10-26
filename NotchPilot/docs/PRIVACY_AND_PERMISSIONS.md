# Privacy, permissions and safety

## Principles

* **Local by default.** Tasks, notes, memories, preferences, conversations and the activity log are JSON files in `~/Library/Application Support/NotchPilot/` on your Mac. There is no NotchPilot server, account, analytics or telemetry.
* **Secrets stay in the Keychain.** API keys are stored as generic passwords in your login Keychain (service `io.github.avyanarya.notchpilot`). They are never written to settings files, logs, or the app bundle, and log output passes through a redactor that masks anything that looks like a key or bearer token.
* **Only what a request needs leaves the Mac**, and only when you send a message (or tap the AI briefing notification). See *What is sent* in [AI_PROVIDERS.md](AI_PROVIDERS.md). What the provider retains depends on its policies and your account settings.
* **macOS privacy protections are respected.** Permissions are requested through the system prompts when a feature first needs them. NotchPilot never asks for Accessibility, Full Disk Access, Screen Recording, Input Monitoring or microphone access, and uses no private APIs.

## macOS permissions

| Permission | Used for | Requested | If denied |
|---|---|---|---|
| Calendars (Full Access) | Reading events, free-time search, daily overview, adding approved events | First calendar request or **Connect Calendar** | Calendar tools explain how to enable it; everything else works |
| Reminders | Creating reminders you approve | First reminder | Reminder tool explains how to enable it |
| Notifications | Focus-session end, deadline reminders, briefings, event preparation, end-of-day summary | First timer or proactive feature | No banners; in-panel status still works |
| Automation → Music / Spotify | Now-playing details, artwork, playback control | First media read or control | Media controls report the missing permission; track names from the players' public notifications still appear |
| Login Items | Launch at login (`SMAppService`) | When you enable it | Off |

No permission is needed for: the global shortcut (Carbon hot key — not a key logger), hover detection (mouse-moved events only), opening apps and links (`NSWorkspace`), battery/memory/disk information (IOKit, Mach, `libproc` for your own processes), the clipboard (written only when a tool is approved/allowed), or Shortcuts (`/usr/bin/shortcuts`).

## What the assistant can and cannot do

The model can only call the tools in NotchPilot's allowlist (see [ARCHITECTURE.md](ARCHITECTURE.md#tools)). There is **no** tool to run shell commands or scripts, read or write arbitrary files, install software, change system settings, send email or messages, browse the web itself, or make purchases. Documents are read only when you attach them.

Every tool call is checked in code before it runs:

1. **Allowlist** — unknown tool names are refused.
2. **Schema validation** — arguments must be valid JSON matching the tool's schema exactly (types, required fields, enums, ranges, lengths, date formats; unexpected properties are rejected).
3. **Feature switches** — a disabled integration refuses.
4. **Permission policy** by risk and agent mode:

| Risk | Examples | Cautious | Standard | Autonomous |
|---|---|---|---|---|
| Read | list tasks, read calendar, battery | ✓ | ✓ | ✓ |
| App-owned change | create task, start timer, edit note | ask | ✓ | ✓ |
| Save long-term memory | “remember that…” | ask | ask* | ask* |
| Low-impact external | open an app, pause music, copy to clipboard | ask | ✓ | ✓ |
| External | add calendar event or reminder, open a link, open an email draft | ask | ask* | ask* |
| Destructive | delete a task, note or memory | ask | ask | ask |
| Sensitive | run a Shortcut | ask | ask | ask |

\* configurable in Settings → Agent. Approval cards show exactly what will happen (“Add ‘Study session’ to Calendar on Tue 27 Oct, 15:00”) and expire (default 5 minutes, counted as declined). Declined actions are reported back to the model, which is told not to retry them.

5. **Bounded execution** — per request: at most 14 tool calls / 10 model turns / 3 minutes of active work in Standard mode (32 / 20 / 7 min in Autonomous); repeated failing rounds stop the run. When a limit is reached the model must summarise what was done and what was not, with tools disabled.
6. **Timeouts and output caps** — every tool has a timeout; results sent back to the model are capped at 16 000 characters.

### Untrusted content and prompt injection

Text that comes from tools — notes, attached documents, calendar entries, web pages, Shortcut output — is treated as **data**. The system prompt tells the model never to follow instructions found in such content, documents are wrapped in explicit `<document>` delimiters with a reminder, and — most importantly — the permission policy above is enforced in code, so injected text cannot make an action skip its approval or reach a tool that does not exist.

### Memory

* Conversation **history** and long-term **memory** are separate. History is never injected into other conversations; only approved memories are.
* The assistant saves a memory only through `save_memory`, which asks for your approval by default, and is instructed not to store sensitive details unless you explicitly ask.
* Settings → Memory lists every memory with its category and source; edit, delete or add items there, or turn memory off entirely.
* Conversation history can be turned off (conversations are then kept in memory until you quit and removed from disk), auto-deleted after 7/30/90 days, or deleted individually or all at once.

### Proactive features

All proactive features are **off or local by default** and individually switchable. They schedule local notifications computed on your Mac (counts of tasks and events). No data is sent to an AI provider in the background; the morning briefing asks the assistant only after you tap it.

## Deleting your data

Settings → Privacy → **Delete all NotchPilot data** removes tasks, notes, memories, preferences, conversations and the activity log (it does not touch events or reminders in Apple's apps). API keys are removed in Settings → AI Provider → **Remove**. To remove everything manually see [SETUP.md](SETUP.md#uninstall).
