# VELTRON — Handoff Note

**Updated:** 2026-10-26
**Purpose:** HUD for anyone (or any agent session) picking this repo up cold.

- The site is a **static GitHub Pages site** (veltroncars.com). HTML pages at root, shared styles in `Assets/css/`.
- Working convention: the AI/agent **does not touch git** — the owner commits and pushes manually.
- Backend (journal + contact + AI Lab API) lives on **Render** (`veltron-backend.onrender.com`), code in `server/`.
- The live Journal channel is the subdomain `journal.veltroncars.com`; root `journal.html` is the legacy local fallback page.

## Site structure (quick map)

| Page | Notes |
|---|---|
| `index.html` | Home. Hero CTA → `concept-v1-sportline.html` (as of 2026-10-26, previously construction.html) |
| `vision.html` | Philosophy / 4 pillars / R&D roadmap |
| `concepts.html` + `concept-v1-sportline.html` | Concepts grid + scroll-snap showcase (shares `Assets/css/concept-styles.css`) |
| `about.html` | Founder page (Boris) |
| `journal.html` | Legacy local journal; fetches `veltron-backend.onrender.com/api/journal` w/ seed fallback |
| `contact.html` | Form posts to `/api/contact` (Render) |
| `construction.html` | Placeholder for unbuilt sections |
| `ai-lab/` | Experimental support assistant (OpenRouter), config in `config/support-assistant.json` |
| `pitch-deck.html` | Self-contained deck — has its **own inline CSS/`:root`** (kept in sync manually with tokens) |

## Recently applied (2026-10-26 session)

1. **CSS cleanup in `styles.css`** — removed duplicated Future Lab block (was declared twice, first copy overridden), dead `#hero-image`, dead `.location-ping` + `pulse` keyframes, duplicate `.feature-card`. Consolidated block preserves previously-rendered computed values (`min-height: 450px` etc.).
2. **Missing styles added** — `.model-card` (contact form wrapper), preloader `visibility` transition now delays until fade ends.
3. **UX fixes** — `scroll-padding-top: 90px` on `html` (anchors no longer hide under fixed nav); `100svh` fallbacks on hero / mobile menu / sportline scroll container.
4. **HTML fixes** — duplicate `id="about-section"` on index (second section → `id="future-lab"`); broken `ai-lab/` self-links inside `ai-lab/index.html`; `construction.html` canvas/scripts were outside `<body>`; GTM `<noscript>` moved inside `<body>` on `about.html`/`vision.html`.
5. **A11y** — hamburger converted to real `<button>` with `aria-expanded` (synced in `script.js`) on all 7 pages.
6. **Typography** — self-hosted **Inter** variable font (weights 200–700, latin + latin-ext for Serbian diacritics) in `Assets/fonts/`, registered via `@font-face` at the top of `styles.css` (pitch-deck carries an inline copy — it doesn't load the shared CSS). Replaced the old OS-dependent stack (Segoe UI / Helvetica / Roboto per-OS inconsistency).
7. **Color tokens** — `:root` in `styles.css` is the single source of truth; see `docs/COLOR-PALETTE.md`. All off-token reds/greens swept (chat widget, ai-lab, vision roadmap, contact form alert, pitch-deck re-aligned to site palette).

## Open / deferred items

- [ ] `.nav-contact` class exists in all navs but was never styled — decide: CTA treatment or remove the class.
- [ ] Footer "LinkedIn"/"Instagram" links on every page point to `construction.html` placeholders — swap for real URLs.
- [ ] `VeltronV1.html` is a bare `<H1>` stub (referenced in `script.js` page-order map) — flesh out or delete + update map.
- [ ] `journal.html` renders backend article HTML via `innerHTML` with inline `onclick` templating — harden (event delegation + sanitization) when touching JS next.
- [ ] Contact form + journal seed colors are in inline JS strings on the pages (not tokenized) — fine, but grep `rgba(47, 191, 113` / `var(--primary-red-rgb)` there when editing.
- [ ] Inter is slightly wider than Segoe UI — if a headline wraps awkwardly somewhere, adjust per-class rather than reverting the font.
- [ ] Unused images: `16154.jpg`, `dealer.png`, `diler.png`, `original_engine.jpg`, `service.png`, `Screenshot (42).*`, `logo.png`, `Render2.png`, `boris-vlajnic.png`, `lokacija.png`, `16154.jpg` — `.webp` versions are in use; PNG/JPG twins are fallback/unused candidates for deletion (verify before removing).
- [ ] `docs/COLOR-PALETTE.md` is the palette law — keep it current when adding tokens.

## Verification checklist (after any CSS/layout change)

1. Fast path: open `index.html`, `about.html`, `vision.html`, `ai-lab/index.html` in a browser — no console errors.
2. Narrow to ~770px width: hamburger opens/closes (button, ARIA state), sections stack to 1 column.
3. Anchor test: `about.html` → "Read The Founder's Story" lands below the fixed nav.
4. Fonts: DevTools → computed `font-family` starts with `Inter`; `document.fonts.check('300 16px Inter')` === true.
5. Serbian glyphs render in Inter (latin-ext): "Boris Vlajnić" on `about.html`.
6. CSS sanity: braces balanced in all 4 CSS files (`Assets/css/*.css`, `ai-lab/ai-lab.css`).
