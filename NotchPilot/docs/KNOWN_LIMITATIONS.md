# Known limitations

## Build and verification status

* **The app has been compiled and smoke-tested on macOS, but not used interactively on a real MacBook.** This project was developed in a Linux container. GitHub's macOS runner builds the universal app with Xcode, runs all 83 tests and launches the real app in a smoke test (island, every tab, timer, approval card, Settings, error handling) with screenshots. A CI runner has no notch, no person moving the pointer and no permission prompts, so hover behaviour, click-through, focus hand-back, macOS permission prompts, notifications and launch at login are untested — see the manual checklist in [TESTING.md](TESTING.md).
* **Live AI calls were not exercised with real credentials** — none were available. The provider adapters were tested against recorded wire formats and a local mock server speaking the Anthropic and OpenAI streaming protocols (including thinking-block replay checks), not against the real services. Use Settings → AI Provider → **Test connection** after adding a key.
* **Not signed with a Developer ID or notarised.** The build script ad-hoc signs the app; Gatekeeper requires a manual “Open” the first time. See [SETUP.md](SETUP.md#signing-and-notarising-optional).
* macOS-specific behaviour (notch geometry, hover/click-through, focus hand-back, permission prompts, notifications, launch at login) can only be verified on a real Mac — see the manual checklist in [TESTING.md](TESTING.md).

## Product limitations

* **Media:** only Apple Music and Spotify (via their public notifications and AppleScript). Browser audio, Podcasts and other players are not shown — the system-wide “Now Playing” framework is private API and is not used. The first control or artwork request triggers an Automation prompt per player.
* **Calendar:** with *Add Only* (write-only) access the assistant can add events but cannot read them; choose *Full Access* for summaries and free-time search. Events are added to your default calendar.
* **Memory usage by app** covers processes owned by your user only (no root/system processes, which would need elevated privileges). Helper processes are grouped under their app name.
* **Documents:** text extraction only — scanned PDFs (images) have no text and are rejected; content beyond 200 000 characters is not loaded; the first 24 000 characters are sent with the message and the assistant can page through the rest with `read_attachment`.
* **Date extraction** without the system detector (CLI on Linux) understands English phrases only.
* **The assistant cannot** browse the web, read your email or messages, send anything, run shell commands, access arbitrary files, or control apps beyond opening them — by design.
* **Agent budgets:** long multi-step requests stop at the per-request limits (Standard: 14 tool calls / 3 minutes; Autonomous: 32 / 7 minutes) and the assistant summarises what remains; say “continue” to carry on.
* **Proactive notifications** are computed when data changes and after midnight; with more than 40 future task deadlines only the nearest 40 are scheduled.
* **One island:** it appears on one display (the notched one by default). On displays without a notch it sits in the menu bar and may cover the middle of very long app menus — it can be hidden on such displays in Settings → Appearance.
* **Light theme** applies to the expanded panel; the collapsed island stays black to blend with the hardware notch.
* **Keyboard shortcut conflicts:** if another app owns the chosen shortcut, registration fails and NotchPilot shows a message; pick another in Settings → General.
* **Keychain prompt after rebuilding:** an ad-hoc-signed app gets a new code signature on every build, so macOS may ask once whether it may read its Keychain item.
* **Model names:** provider model line-ups change frequently. The defaults (`claude-opus-5-5`, `gpt-6.1-sol`) reflect October 2026; any model ID can be entered. Small local models may call tools unreliably.
* **Conversation search** scans conversations linearly — fine for hundreds of conversations, slower for many thousands.
* **Not sandboxed / not for the Mac App Store** (it uses Apple Events, `libproc`, the Shortcuts CLI and a window above the menu bar).
* **Accessibility:** controls have labels and the panel respects Reduce Motion, but a full VoiceOver audit has not been done.
