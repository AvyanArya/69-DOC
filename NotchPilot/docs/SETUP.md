# Setup

## Requirements

* A Mac running **macOS 14 Sonoma or later** (built and designed for a MacBook Air M4 on macOS 15; works on any Mac — displays without a notch get a small island in the menu bar).
* To build from source: **Xcode 15.3 or later** (Xcode 16 recommended) or the matching Command Line Tools.
* For the AI assistant: an API key for Anthropic or OpenAI, or a local OpenAI-compatible server (e.g. Ollama). Everything else works without one.

## Option A — use a CI-built app

The GitHub Actions workflow `.github/workflows/notchpilot-macos.yml` builds a universal `NotchPilot.app`, runs the tests and a UI smoke test, and uploads **NotchPilot-macOS** as a workflow artifact (when a macOS runner is available to the repository).

1. Open the repository's **Actions** tab → *NotchPilot (macOS)* → the latest successful run → download **NotchPilot-macOS**.
2. Unzip twice (the artifact zip contains `NotchPilot-macOS.zip`), and move `NotchPilot.app` to `/Applications`.
3. The app is **ad-hoc signed, not notarised**, so Gatekeeper blocks the first launch. Either right-click the app → **Open** → **Open**, or run:

   ```bash
   xattr -dr com.apple.quarantine /Applications/NotchPilot.app
   ```

## Option B — build from source

```bash
git clone https://github.com/AvyanArya/69-DOC.git
cd 69-DOC/NotchPilot
swift test                     # core unit + end-to-end tests (≈ 85 tests)
./scripts/build_app.sh         # → dist/NotchPilot.app, dist/NotchPilot-macOS.zip, dist/notchpilot-cli
open dist/NotchPilot.app
```

`ARCHS=native ./scripts/build_app.sh` builds only for your Mac's architecture (faster). You can also open `Package.swift` in Xcode and run the **NotchPilot** scheme; for features that depend on the bundle (notifications, Keychain prompts naming the app, launch at login) prefer the script-built `.app`.

Optional smoke test of the built app (drives the real UI against a temporary data folder and writes screenshots):

```bash
dist/NotchPilot.app/Contents/MacOS/NotchPilot --smoke-test --screenshots /tmp/notchpilot-shots
```

### Signing and notarising (optional)

With an Apple Developer ID:

```bash
SIGN_IDENTITY="Developer ID Application: Your Name (TEAMID)" ./scripts/build_app.sh
xcrun notarytool submit dist/NotchPilot-macOS.zip --keychain-profile <profile> --wait
xcrun stapler staple dist/NotchPilot.app
```

The script signs with the Hardened Runtime and `Resources/NotchPilot.entitlements` (Apple Events and Calendars) when an identity is given.

## First launch

1. NotchPilot has **no Dock icon**. Look for the ✦ icon in the menu bar and the island at the top of your built-in display.
2. The panel opens on the **Assistant** tab with a *Connect an AI provider* card. Pick a provider, paste your API key, **Save** (it goes to your Keychain). See [AI_PROVIDERS.md](AI_PROVIDERS.md).
3. Open **Settings** (gear icon, ⌘, or the menu-bar item) → **AI Provider** → **Test connection**.
4. Try: *“Give me 25 minutes to finish my economics essay, then remind me to take a break.”*

macOS will ask for permissions only when a feature first needs them:

| When | Prompt |
|---|---|
| First calendar question, or **Connect Calendar** on the Today tab | Calendars (choose *Full Access* to let the assistant read events) |
| First reminder the assistant creates | Reminders |
| First timer or proactive notification | Notifications |
| First time you control or read Music/Spotify | Automation (per app) |

After rebuilding an ad-hoc-signed app, macOS may ask once whether NotchPilot may read its Keychain item — choose **Always Allow**.

## Using it

| Action | How |
|---|---|
| Open / close the panel | Hover over the notch, click it, press **⇧⌘Space** (configurable), or use the menu-bar item |
| Close | **Esc**, click elsewhere, or move the pointer away (unless pinned 📌) |
| Switch tabs | ⌘1 Assistant · ⌘2 Today · ⌘3 Tasks · ⌘4 Notes · ⌘5 Activity |
| New conversation | ⌘N |
| Stop the agent | ⌘. or **Stop** |
| Attach documents | 📎 in the composer (text, Markdown, PDF, RTF, Word, HTML, CSV, JSON, code) |
| Agent mode | the mode icon next to the composer, or Settings → Agent |

## Command-line interface

`dist/notchpilot-cli` uses the same agent, tools and data folder:

```bash
export ANTHROPIC_API_KEY=sk-ant-…     # or OPENAI_API_KEY / NOTCHPILOT_API_KEY
notchpilot-cli chat "What's on my task list today?"
notchpilot-cli repl
notchpilot-cli tasks | notes | memories | timer | activity | conversations | tools
notchpilot-cli --provider compatible --base-url http://localhost:11434/v1 --model llama3.1 chat "Hi"
```

Confirmation prompts appear in the terminal (`--yes` approves automatically). On the command line, calendar, media and other macOS integrations report that they are only available in the app.

## Uninstall

Quit NotchPilot (menu-bar item → Quit), delete `/Applications/NotchPilot.app` and `~/Library/Application Support/NotchPilot`, and remove the Keychain items named *NotchPilot API key* (Keychain Access, or Settings → AI Provider → Remove before uninstalling). If you enabled launch at login, turn it off first or remove NotchPilot in System Settings → General → Login Items.
