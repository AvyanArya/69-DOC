# AI provider configuration

NotchPilot talks to the provider you choose directly from your Mac. **Direct API use is billed by that provider**, separately from any consumer subscription (Claude Pro, ChatGPT Plus, …). Each message costs one or more model requests: the agent makes one request per tool round, and a request carries the conversation so far plus the tool definitions (cached by Anthropic after the first request).

Settings → **AI Provider** has: provider, model ID (free text, with suggestions), endpoint override, API key (Keychain), reasoning effort, max response tokens, and optional-feature switches. **Test connection** sends one tiny request and reports the model that answered and the latency.

## Anthropic (Claude) — default

| | |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` (`anthropic-version: 2026-10-21`) |
| Key | `sk-ant-…` from <https://console.anthropic.com> → API Keys |
| Default model | `claude-opus-5-5` |
| Faster / cheaper | `claude-sonnet-5-5`, `claude-haiku-5-5` |
| Most capable | `claude-fable-5-1` |

What NotchPilot sends for current Claude models:

* `thinking: {type: "adaptive", display: "updates"}` — the model decides how much to think; short **progress notes** between tool calls are shown in the panel while the reasoning itself stays hidden. Thinking blocks are kept and replayed unchanged, as the API requires.
* `output_config.effort` from Settings (default **medium**; *low* is snappier for chat).
* `fallbacks: "default"` (Opus 5.5, Sonnet 5.5, Fable 5.1, Opus 5) — if a safety classifier declines a request, the API retries it on Anthropic's recommended fallback model; the panel notes when that happens. You can turn this off.
* Automatic prompt caching (`cache_control`) — the system prompt and tool list never change inside a conversation, so later turns read them from cache.
* `eager_input_streaming` on tools; every tool input is still validated locally before anything runs.
* No `temperature`/`top_p`/`top_k` (removed in API version 2026-10-21).

If you point the endpoint at a proxy or gateway, the Claude-API-only features (fallbacks, caching, eager streaming) are left out. If any endpoint rejects an optional feature, NotchPilot automatically retries without them and stays in that compatibility mode for the session; you can also switch **Use newer optional API features** off.

## OpenAI

| | |
|---|---|
| Endpoint | `https://api.openai.com/v1/responses` |
| Key | `sk-…` from <https://platform.openai.com/api-keys> |
| Default model | `gpt-6.1-sol` (suggestions: `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`) |

The adapter uses the **Responses API**, which current OpenAI models require for tool calling, with `store: false` (responses are not stored for later retrieval) and `include: ["reasoning.encrypted_content"]` so reasoning items can be passed back from local history. `reasoning.effort` follows the effort setting for reasoning models. Model availability changes often; type any model ID your account can use.

## OpenAI-compatible servers (local or hosted)

For servers that implement **Chat Completions with function calling**:

| Server | Endpoint | Key |
|---|---|---|
| Ollama | `http://localhost:11434/v1` | none |
| LM Studio | `http://localhost:1234/v1` | none |
| OpenRouter | `https://openrouter.ai/api/v1` | OpenRouter key |
| vLLM / others | your server's `/v1` URL | as configured |

The model must support tool calling (e.g. Llama 3.1+, Qwen 2.5+, Mistral Nemo in Ollama). Small local models follow the agent instructions less reliably than frontier models. A key is never sent over plain `http://` to anything other than `localhost`.

## Errors you may see

| Message | Meaning / fix |
|---|---|
| *No API key is set…* | Nothing was sent. Add a key in Settings → AI Provider. |
| *The API key was rejected* | Wrong or revoked key, or a key for a different provider. |
| *Rate limited… try again in N s* | NotchPilot retried twice already; wait or lower usage. |
| *The provider is temporarily overloaded* | Retried automatically; try again shortly. |
| *The provider declined this request* | A safety system refused. The partial answer is shown but not sent back. |
| *could not find that model* | Check the model ID and that your account has access. |
| *Network problem / timed out* | Check connectivity, VPN or proxy; streaming requests time out after 90 s of silence. |

## What is sent with a request

Your message and any documents you attached; the earlier messages of the current conversation (including tool results from that conversation); a short context block (current time and time zone, agent mode, your assistant preferences, at most ten relevant approved memories, the timer state, and which integrations you turned off); the system prompt; and the tool definitions. **Not** sent: your other conversations, your full task list or notes (unless the assistant reads them with a tool during the request), API keys, or anything in the background. Provider-side retention follows the provider's policies and your account settings.
