# Veltron AI Lab

An experimental, instruction-driven customer-support assistant for [Veltron Auto](https://veltroncars.com),
built as a public technical demonstration at **https://veltroncars.com/ai-lab/**.

The project demonstrates how structured JSON instructions, support policies, and curated examples
influence the behavior of a large language model — without any fine-tuning. Everything is inspectable:
the full configuration is public, the test suite is deterministic, and evaluation results are recorded
with the exact commands that produced them.

> **Status:** Implemented, integrated into the veltron-backend, and verified live.
> 48/48 deterministic tests pass; 8/8 live behavioral cases passed (2026-10-11,
> `google/gemini-2.5-flash`, config v1.1.0 — snapshot). Production requires
> `OPENROUTER_API_KEY` to be set in the Render service (see [Deployment](#deployment)).

---

## What this project is

- A live chat playground where visitors can talk to the assistant and see the actual model identifier returned by the API.
- A transparent experiment: the complete JSON configuration (persona, policies, examples, verified facts, limitations) is displayed on the page and served by the API.
- A reproducible evaluation setup: deterministic tests plus a live behavioral evaluation script with structured results.

## What this project is not

- **Not fine-tuned.** The model is unchanged. Instructions shape behavior for each request only.
- **Not an official customer-service channel.** It is an experimental demonstration.
- **Not a claim of accuracy.** Responses come from an external model and may be wrong. The assistant is explicitly instructed to say when it does not know something.

## Architecture in one paragraph

The existing Veltron website is static HTML served at `veltroncars.com`. The AI Lab page lives in
`ai-lab/` as a static page that calls a server-side API (`/api/ai-lab/chat`) hosted on the project's
existing Render backend. The server loads `config/support-assistant.json`, validates it against a
schema, builds a system prompt, and forwards the conversation to the OpenRouter API. The OpenRouter
API key is read from an environment variable on the server and is never exposed to the browser.

```
Browser (ai-lab/)  ──POST /api/ai-lab/chat──►  Render backend  ──►  OpenRouter API
                          │                          │
                          │                  config/support-assistant.json
                          │                  (validated at startup)
                          ▼
                   static page at veltroncars.com/ai-lab/
```

## Repository layout

```
ai-lab/                     Static page served at /ai-lab/
  index.html                Page markup (hero, playground, methodology, experiments, tech info)
  ai-lab.css                Scoped styles reusing the site's design tokens
  ai-lab.js                 Chat client (states: loading, error, rate limit, not configured)
config/
  support-assistant.json    Versioned instruction configuration (public by design)
server/
  ai-lab-app.js             Express app/router: validation, rate limiting, OpenRouter proxy
  ai-lab-server.js          Standalone server entry point (npm start)
  validate-config.js        Dependency-free JSON schema validator for the configuration
tests/
  validate-config.test.js   Configuration schema tests
  api.test.js               API behavior tests (validation, errors, security headers, rate limiting)
  security.test.js          Prompt-injection and secret-leakage tests
  ui.test.js                Static checks on the client (no secrets, correct states, a11y)
  evaluate-live.js          Live behavioral evaluation (requires OPENROUTER_API_KEY)
docs/
  ARCHITECTURE.md           System design and data flow
  METHODOLOGY.md            How instructions, policies, and examples shape behavior
  EVALUATION.md             Evaluation methodology and how to reproduce results
  SECURITY.md               Security measures and their limits
  LIMITATIONS.md            Known limitations and model dependence
```

## Running locally

**Requirements:** Node.js 18+ (developed on Node 24).

```bash
npm install          # installs express (used by the API server and tests)
npm start            # starts the API server on http://localhost:5000
```

For the frontend, serve the repository root with any static file server, e.g.:

```bash
npx serve .          # then open http://localhost:3000/ai-lab/
```

The client automatically targets `http://localhost:5000` when the page is opened from localhost,
and `https://veltron-backend.onrender.com` otherwise (same pattern as the existing contact form).

### Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Purpose |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes, for chat | Server-side credential for the OpenRouter API. Never exposed to the browser. |
| `OPENROUTER_MODEL` | No | Model identifier. Default: `openrouter/auto`. Free models use the `:free` suffix. |
| `PORT` | No | Port for the standalone server. Default: `5000`. |

Without `OPENROUTER_API_KEY`, the page still loads and explains the experiment, the configuration
is visible, and the API returns a clear `NOT_CONFIGURED` error instead of simulating responses.

## Testing

```bash
npm test             # 48 deterministic tests (no API key required)
npm run test:live     # behavioral evaluation against the live model (requires API key)
```

The test suite covers: configuration schema validation, request validation (empty, malformed,
oversized), missing-credential handling, provider error handling, timeout handling, rate limiting,
security headers, CORS rules, secret leakage, prompt-injection policy content, and client-side
correctness (no secrets in static assets, all error states handled, Enter-to-send, accessibility).

## Deployment

The frontend deploys with the rest of the static site (merge to `main`). The backend requires
deploying `server/` to the Render service with `OPENROUTER_API_KEY` set. Exact steps are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deployment) and the checklist in
[docs/SECURITY.md](docs/SECURITY.md#deployment-checklist).

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data flow, deployment
- [docs/METHODOLOGY.md](docs/METHODOLOGY.md) — how the instruction system works
- [docs/EVALUATION.md](docs/EVALUATION.md) — evaluation methodology and reproduction steps
- [docs/SECURITY.md](docs/SECURITY.md) — security measures, abuse protections, deployment checklist
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — known limitations and model dependence

## License

No license is granted by this README. The Veltron Auto brand and site content remain the property of
their respective owners. The AI Lab demonstration code is provided as a technical example.
