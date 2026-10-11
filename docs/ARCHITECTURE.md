# Architecture

## Overview

Veltron AI Lab extends the existing static Veltron website with an experimental AI support
assistant. The design constraint was to integrate with the current deployment — a static site on
`veltroncars.com` plus a Node.js/Express backend on Render — without migrating or replacing anything.

```
┌────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│  https://veltroncars.com/ai-lab/  (static page, ai-lab/)           │
│    • renders chat UI, configuration viewer, documentation           │
│    • calls the API via fetch (same-origin policy: cross-origin     │
│      to the Render backend, CORS-restricted to veltroncars.com)    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ POST /api/ai-lab/chat
                               │ GET  /api/ai-lab/config
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│ Render backend (Node.js/Express)                                   │
│  server/ai-lab-app.js                                              │
│    1. loads + validates config/support-assistant.json at startup   │
│    2. validates request body (length, shape, roles)                │
│    3. rate-limits per IP (fixed window, in-memory)                 │
│    4. builds system prompt from the configuration                  │
│    5. calls OpenRouter with the server-side API key                │
│    6. returns { reply, model, usage, config_version }              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ HTTPS, Authorization: Bearer $OPENROUTER_API_KEY
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│ OpenRouter API (https://openrouter.ai/api/v1/chat/completions)    │
│  Routes the request to a third-party model and returns the         │
│  actual model identifier in the response.                          │
└────────────────────────────────────────────────────────────────────┘
```

## Why this architecture

- **The existing site is static.** GitHub Pages-style hosting cannot run server-side code, so the
  chat API must live elsewhere. The project already operates a Render backend for the contact form
  and journal; the AI Lab reuses that pattern instead of introducing a new platform.
- **The API key must be server-side.** A browser-only integration would expose the credential.
  The Render backend is the trust boundary.
- **The smallest maintainable stack.** One Express router, one JSON configuration file, one static
  page. No database (no chat storage by default), no build step for the frontend, no new
  dependencies beyond `express` (already used by the existing backend).

## Data flow for a chat message

1. The client sends `POST /api/ai-lab/chat` with `{ message, history? }`.
2. The server validates the body: `message` is a non-empty string ≤ 2000 characters; `history`
   (optional) is an array of ≤ 20 `{ role: "user" | "assistant", content }` entries, each ≤ 2000
   characters. Anything else is rejected with HTTP 400.
3. The server checks the per-IP rate limit (10 requests / 60 s, `AI_LAB_RATE_LIMIT` overridable) and a hidden honeypot field that humans never fill. Excess requests return HTTP 429; a filled honeypot returns HTTP 400.
4. The server checks for `OPENROUTER_API_KEY`. If missing, it returns HTTP 503 with
   `code: "NOT_CONFIGURED"` — the client shows a clear notice and never fabricates a response.
5. The server builds the message list: one `system` message generated from the configuration,
   then the sanitized history, then the current user message.
6. The server calls OpenRouter with a 45-second timeout and `max_tokens: 1024`, offering a
   `browse_veltron_site` tool (see below). If the model calls the tool, the server fetches the page,
   returns its text to the model, and requests the final answer (up to 3 tool rounds).
7. On success, the server returns the reply, the **actual model identifier** from the provider
   response, token usage, the configuration version, and the list of site pages that were browsed
   for this answer (`browsed_pages`).
8. On provider failure, the server returns a safe, generic error (HTTP 502/504) without
   forwarding provider internals.

## Live site browsing (tool calling)

The assistant can read the **live** veltroncars.com pages during a conversation, so visitors get
current site content without anyone maintaining page text in the JSON configuration:

- The server offers one tool, `browse_veltron_site({ path })`, with `path` constrained by an enum
  of public site pages (`/vision.html`, `/construction.html`, …) defined in code.
- When the model calls the tool, the backend fetches `https://veltroncars.com<path>` with an 8 s
  timeout, strips HTML to plain text (scripts/styles removed), truncates to ~8 000 characters, and
  appends it to the conversation as a tool result. The model then answers from that text.
- Responses are cached in-memory per page for 5 minutes (max 30 entries) to avoid repeated fetches.
- The reply includes `browsed_pages` so the UI can show which pages were consulted; the model is
  instructed to note when it checked the live site.
- If the provider or routed model does not support tool calling, the server degrades to a plain
  completion using only the verified facts.
- Stable company facts still come from `verified_facts`; browsing is for the latest page content
  and explicit "check the site" requests.

## Site-wide chat widget

Every public page (`index`, `vision`, `concepts`, `concept-v1-sportline`, `construction`,
`journal`, `about`, `contact`) includes a floating assistant widget
(`Assets/js/ai-chat-widget.js` + `Assets/css/ai-chat-widget.css`). The AI Lab playground page
(`/ai-lab/`) deliberately does **not** load it, so the full interface is never doubled up.

- A launcher bubble sits in the lower-right corner with an "Ask me anything about Veltron" hint
  pill. Clicking it opens a themed chat panel (welcome message, "What's on this page?" chip,
  message log, input + send, clear, close, Escape-to-close).
- The widget calls the same `/api/ai-lab/chat` and `/api/ai-lab/config` endpoints as the AI Lab
  page. It never talks to OpenRouter directly and holds no API key.
- **Page awareness:** each request includes `page: window.location.pathname`. The server appends a
  short line to the system prompt naming the page the visitor is on, so "what's on this page?"
  resolves to that page (and may trigger `browse_veltron_site` for exact content). The `page`
  value is validated against a safe path charset and silently dropped if malformed.
- Anti-abuse matches the playground: hidden honeypot field, the same 10 req/min per-IP rate limit,
  message/history length caps, `textContent`-only rendering, and the same error-state handling.
- Conversation history is kept in `sessionStorage` (≤ 20 messages) so it survives navigation
  between pages within a tab; the server still stores nothing.

## Configuration loading and validation

`config/support-assistant.json` is loaded once at server startup by `server/validate-config.js`,
a dependency-free schema validator. The server refuses to start the router if the configuration
is malformed — fail-safe by design. The schema requires:

- `name`, `description`, `language_policy` — non-empty strings
- `version` — semantic version (`x.y.z`)
- `persona` — `role`, `tone` (non-empty string array), `verbosity`
- `policies` — non-empty array; each entry has a unique `id` and an `instruction` ≥ 10 chars;
  the ids `truthfulness`, `uncertainty`, `escalation`, `scope`, and `prompt-injection` are required
- `examples` — array of `{ id, user, assistant }` with non-empty strings
- `verified_facts` — array of `{ fact, source }` with non-empty strings
- `limitations` — non-empty string array

The configuration is public by design: `GET /api/ai-lab/config` returns it in full so visitors can
inspect exactly what the assistant is told. It contains no credentials.

## Model selection

The model is server-configured via `OPENROUTER_MODEL` (default: `openrouter/auto`, OpenRouter's
documented auto-router). Clients may send a `model` field, but the server only honors it if it is
in its own allowed list — arbitrary provider model identifiers are ignored. The actual model used
is always taken from the provider's response and displayed in the UI. This avoids the false claim
that "all models support the same context length or features" and prevents the backend from being
used as a general-purpose proxy.

## Deployment

### Frontend (no action needed beyond merging)

The `ai-lab/` directory is part of the static site. Merging to `main` publishes it at
`https://veltroncars.com/ai-lab/`. No build step, no new hosting.

### Backend (integrated; one Render setting remains)

The AI Lab router has been integrated into the existing backend repository
(`mrvlajnic/veltron-backend`) as `ai-lab/ai-lab-app.js` + `ai-lab/validate-config.js` +
`config/support-assistant.json`, mounted in `server.js`:

```js
const { createAiLabRouter } = require('./ai-lab/ai-lab-app');
app.use('/api/ai-lab', createAiLabRouter());
```

If the AI Lab configuration is invalid at startup, only `/api/ai-lab/*` degrades to HTTP 503 —
the contact form, journal, and admin API are unaffected.

**Remaining production step:** set the environment variable `OPENROUTER_API_KEY` (and optionally
`OPENROUTER_MODEL`) in the Render dashboard for the `veltron-backend` service. The frontend
already targets `https://veltron-backend.onrender.com`, so no client change is needed once the
variable is set.

## What is not stored

- Chat messages are **not** persisted. History lives in the browser tab only and is discarded on
  reload or when the visitor clicks "Clear".
- No analytics or tracking is added by this project. The site's existing Google Tag Manager
  snippet is intentionally **not** included on the AI Lab page.
- No personal information is collected. The API logs nothing beyond what the framework emits by
  default; API keys and authorization headers are never logged.
