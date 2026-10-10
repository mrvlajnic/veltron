# Security

Veltron AI Lab is a public, internet-facing demo. It proxies requests to a paid third-party API
with a privileged credential, so the server is treated as a trust boundary.

## Threat model (what we defend against)

1. **Credential theft** — a visitor extracting the OpenRouter API key from client code, API
   responses, or error messages.
2. **Abuse as a free LLM proxy** — scripted traffic burning API credits or using the backend as a
   general-purpose completion endpoint.
3. **Prompt injection** — a visitor trying to override the support policies, exfiltrate the system
   prompt, or make the assistant assert false company policies.
4. **Resource exhaustion** — oversized bodies, long histories, or slow provider calls tying up the
   server.
5. **Cross-origin abuse** — another site issuing requests to the API from a visitor's browser.

## Controls implemented

### Credential handling
- The API key is read from `OPENROUTER_API_KEY` **server-side only**. It never appears in
  `ai-lab/index.html`, `ai-lab/ai-lab.js`, `ai-lab/ai-lab.css`, or any other static asset —
  enforced by `tests/ui.test.js` (asserts no `sk-` and no `OPENROUTER_API_KEY` literal in client files).
- `.env` is never committed; `.env.example` contains placeholders only. `.gitignore` excludes `.env`.
- Keys and `Authorization` headers are never logged. Responses are asserted to contain no `sk-`
  material in both the config endpoint and chat endpoint tests.

### Request validation (server-side, not browser-side)
- `message`: non-empty string, maximum **2000 characters**.
- `history`: optional array, maximum **20 messages**, roles restricted to `user` | `assistant`
  (a `system` message from the client is rejected — tested), each entry ≤ 2000 characters.
- Body parser limit: **256 KB**; malformed JSON → HTTP 400.
- The client's `maxlength` attribute is a convenience only; enforcement is on the server.

### Rate limiting
- Fixed-window limiter keyed by client IP: **10 requests / 60 s** per IP for `/api/ai-lab/chat`
  (override with `AI_LAB_RATE_LIMIT`).
- Exceeding the limit returns HTTP 429 with `X-RateLimit-*` headers and a clear message.
- **Honest limitation:** the limiter uses process-local memory. On a single Render instance this
  works as intended; in a horizontally scaled deployment each instance would count independently,
  so the effective global limit multiplies by instance count. It is therefore **not** claimed to be
  production-grade global rate limiting. For multi-instance deployments, back it with a shared store
  (e.g. Redis) or platform-level controls.

### Anti-bot honeypot
- The chat form contains a hidden `website_hp` input (same pattern as the existing contact form)
  that human users never see or fill.
- If the field is non-empty on submission, the request is rejected with HTTP 400 and the generic
  message `Invalid request.` — deliberately not revealing that a honeypot exists, so bots cannot
  adapt by skipping the field. Bots that auto-fill forms or replay payloads trip it reliably.
- The client sends the (empty) honeypot value with every request; a human path is unaffected.

### Model and proxy restrictions
- The client may request only models on the server's allowlist (derived from `OPENROUTER_MODEL` /
  defaults); arbitrary model identifiers are ignored — tested.
- The upstream URL is a hard-coded constant (`https://openrouter.ai/api/v1/chat/completions`).
  There is no user control over URLs, headers, or generation parameters — the backend cannot be
  repurposed as a general proxy.
- Output is capped at `max_tokens: 1024`; upstream timeout is 45 s (`AbortController`).

### Error hygiene
- Provider errors are mapped to generic messages (`PROVIDER_ERROR`, `TIMEOUT`); provider bodies,
  stack traces, internal paths, and the system prompt are never forwarded to visitors — tested with
  a marker string in a simulated provider error.
- Configuration problems surface as `NOT_CONFIGURED` with instructions, never as fake successes.
- The full system prompt is not exposed in any error response. (The *configuration* — persona,
  policies, examples — is intentionally public via `GET /api/ai-lab/config`: it is the documented
  subject of the experiment and contains no secrets.)

### Output rendering
- The client renders assistant and user text with `textContent` only — no `innerHTML`, no
  Markdown-to-HTML conversion, no HTML parsing of model output. This neutralizes HTML/script
  injection through model responses by construction (tested: no dynamic `innerHTML` assignments).
- The configuration viewer also renders with `textContent`.

### CORS
- `Access-Control-Allow-Origin` is echoed only for `https://veltroncars.com`,
  `https://www.veltroncars.com`, and localhost development origins. Unknown origins receive **no**
  CORS header (tested).
- Preflight `OPTIONS` returns 204 without executing anything.

### Security headers (API responses)
- `X-Content-Type-Options: nosniff`
- `X-Content-Type-Options` / `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'` (API responses only)

### Data collection
- **No chat storage.** Conversation history lives in the browser tab and is cleared on reload or
  via the "Clear" button. Nothing is written to disk or a database.
- **No analytics on this page.** The site-wide Google Tag Manager snippet is deliberately omitted
  from `ai-lab/index.html`; no cookies, fingerprints, or identifiers are set by this project.
- If analytics or conversation storage are ever added, they must be documented here first.

### Prompt-injection stance
- A `prompt-injection` policy instructs the model to treat user input as untrusted and ignore
  embedded override attempts; evaluation cases probe common attacks (`INJECTION-001..003`).
- **Instructions are not a security boundary.** They reduce but cannot eliminate injection
  compliance, which is inherently model-dependent and nondeterministic. The real protections are
  server-side: no secrets are reachable through the prompt (the key never enters the context),
  validation/rate limits bound abuse, and output is rendered inertly.
- No tools, code execution, browsing, or external actions are available to the model — there is
  nothing for an injection to *trigger* beyond text generation.

## Known security limitations

| Limitation | Consequence | Mitigation path |
|---|---|---|
| In-memory rate limiter | Weaker under horizontal scaling | Shared-store limiter or WAF/CDN rules |
| No CAPTCHA / device fingerprinting | Determined bots can consume quota within limits | Add challenge only if abuse appears |
| Model output can still be wrong or biased | Hallucinated answers despite policies | Human-review; escalation policy; disclaimer |
| Instruction-based injection defense | Not guaranteed | Keep model tool-less; monitor evaluation cases |
| Single API key for all traffic | No per-user attribution | OpenRouter supports key rotation; add per-user keys only if needed |

## Deployment checklist

- [ ] `OPENROUTER_API_KEY` is set as an environment variable in Render (never in git, never in
      frontend files, never in `render.yaml` committed values).
- [ ] `.env` exists only locally and is ignored by git (`git check-ignore .env` returns the path).
- [ ] `npm test` passes (48/48) on the deploy candidate.
- [ ] `git grep -i "sk-or\|sk-" -- ai-lab/` returns no key material in static assets.
- [ ] `GET /api/ai-lab/config` on the target host returns `"configured": true`.
- [ ] `GET /ai-lab/` on the production host renders the page; the status strip reports
      "Assistant configured and ready." after configuration loads.
- [ ] Chat round-trip works from the production origin (CORS path verified end-to-end).
- [ ] Rate limiting responds with 429 under burst traffic (spot-check).
- [ ] Error path verified: temporarily unset the key in a staging instance → UI shows the honest
      `NOT_CONFIGURED` notice instead of a fake reply.
- [ ] No secrets in build output: `git grep` over the repo before pushing.
