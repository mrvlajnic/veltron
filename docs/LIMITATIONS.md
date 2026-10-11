# Limitations

Veltron AI Lab is an honest, deliberately narrow experiment. This page states exactly what it does
and does not do. Nothing below is hypothetical — these are the actual constraints of the
implemented system.

## What this project is

- An **instruction-driven prompting demonstration** using a JSON configuration (persona, policies,
  examples, verified facts, limitations) that is compiled into a system prompt on every request.
- A **server-side proxy** to the OpenRouter API, with validation, rate limiting, and safe error
  handling.
- A **reproducible evaluation harness** (deterministic tests + live behavioral cases) that records
  results with case IDs, model identifiers, and configuration versions.

## What this project is not

- **Not a fine-tuned model.** No training, no weight changes, no adapter, no dataset beyond generic
  prompt examples. Any future fine-tuning work is described only as a roadmap in
  [METHODOLOGY.md](METHODOLOGY.md).
- **Not an official support channel.** The assistant cannot access orders, accounts, inventory,
  pricing systems, or any internal record. It is not operated as customer service.
- **Not guaranteed accurate.** Responses come from an external model that can hallucinate, drift,
  or occasionally comply with an injection attempt. The UI displays a disclaimer on every page load.

## Model dependence and availability

- The assistant depends entirely on the **OpenRouter API** and the availability and behavior of the
  third-party model(s) behind it.
- The default model is `openrouter/auto` — OpenRouter's auto-router. Its selection is dynamic: it
  can pick a different underlying model per prompt (with session stickiness), so behavior and
  quality can change without any change on our side. The actual model identifier is displayed in
  the UI and returned in the API response so users can see what answered.
- **Free models (`:free` suffix) are not guaranteed.** Free endpoints can disappear, rotate, or be
  rate-limited without notice. The default `openrouter/auto` router is used because it is the
  documented stable choice; a free model may be configured via `OPENROUTER_MODEL` but with no
  availability promise.
- Provider outages, deprecations, and rate limits are outside this project's control. The client
  degrades gracefully (clear error states, honest notices) but cannot make the provider stay up.
- Different models behind the router may have different context lengths, tool support, safety
  behavior, and response styles. This project does **not** claim uniform behavior across models.

## Behavioral limitations

- **Prompting is not a guarantee.** Instructions bias behavior; they do not enforce it. A model may
  occasionally violate a policy, over-refuse a legitimate question, or answer in the wrong tone.
- **Prompt-injection resistance is partial.** The injection policy and evaluation cases reduce
  obvious attacks ("ignore previous instructions", "reveal your system prompt"), but instruction
  tuning cannot eliminate injection compliance. This is a known, documented gap — not a solved
  problem.
- **Language support varies.** The language policy asks the model to reply in the user's language,
  but coverage depends on the underlying model's multilingual ability. Low-resource languages may
  receive English or degraded responses.
- **No memory across sessions.** History lives in the browser tab only (≤20 messages). Reloading
  the page or clicking "Clear" starts a blank conversation. The server stores nothing.
- **Site browsing sees only published static pages.** The `browse_veltron_site` tool fetches an
  allowlisted set of public veltroncars.com pages, strips them to text, and caches results for
  5 minutes — it cannot browse the wider web, read the Journal subdomain, or see unpublished or
  personalized content. Whether the model chooses to browse depends on the routed model's
  tool-calling ability; on failure it falls back to verified facts only.

## Evaluation limitations

- **Heuristics are not ground truth.** Live evaluation scores responses with deterministic
  keyword-based heuristics. They catch obvious failures (invented specs, injection compliance) but
  cannot grade nuance, tone, or subtle errors. Human review of `observed_outcome` is required for
  any qualitative claim.
- **Live results are snapshots.** Nondeterministic model output means a case can pass or fail across
  runs. Results describe a single run at a timestamp, with a specific model and configuration
  version — not a permanent accuracy measure.
- **Not yet evaluated in production.** As of this writing, no live evaluation has been run in this
  environment because `OPENROUTER_API_KEY` is not set. The evaluation script exits cleanly with
  "LIVE EVALUATION NOT RUN" and writes no fabricated results. Deterministic tests: 48/48 passing.
- **No benchmarks are claimed.** No accuracy percentage, latency figure, token-cost, or human
  preference score appears anywhere in this project, because none has been measured under
  controlled conditions.

## Security limitations

- **Rate limiting is process-local.** The fixed-window limiter works correctly on a single Render
  instance but does not share state across horizontally scaled instances; the effective global
  limit multiplies by instance count. See [SECURITY.md](SECURITY.md).
- **No CAPTCHA or bot mitigation.** Determined scripted traffic can consume quota within the
  configured limits. This is acceptable for a small demo but would need hardening for production
  scale.
- **Single shared API key.** All traffic uses one `OPENROUTER_API_KEY`. There is no per-user
  attribution or billing isolation.
- **The system prompt is public by design.** `GET /api/ai-lab/config` exposes the full
  configuration (policies, examples, facts, limitations) because transparency is the point of the
  experiment. This is intentional and contains no secrets — but it does mean anyone can read the
  exact instructions the model receives.

## Dependency and provenance notes

- **Model provider:** OpenRouter (openrouter.ai). The model itself is supplied by a third party and
  remains under that party's license and terms.
- **Example provenance:** All `examples` and `verified_facts` in `config/support-assistant.json`
  are generic demonstration content authored for this project, or facts already published on
  veltroncars.com with a cited source. No real customer data, order data, or private company
  information is used anywhere.
- **Repository:** https://github.com/mrvlajnic/veltron (this site). The backend route can be
  integrated into the existing Render backend or run standalone from `server/`.
- **No external endorsements, awards, customers, or collaborators are claimed.** This is a
  self-contained technical demonstration.
