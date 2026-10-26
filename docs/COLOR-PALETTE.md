# Veltron Color Palette & Typography

Single source of truth for colors: the `:root` token block at the top of
`Assets/css/styles.css`. **Never hardcode a hex that already has a token.**

## Brand red
| Token | Hex | Usage |
|---|---|---|
| `--primary-red` | `#D40000` | Accent everywhere: links hover, borders, badges, buttons, markers |
| `--primary-red-rgb` | `212, 0, 0` | Tints via `rgba(var(--primary-red-rgb), α)` |
| `--red-hover` | `#B30000` | Hover/pressed state on filled red elements (CTA, send button, user chat bubble) |
| `--red-soft` | `#FF6B6B` | Error text / error dots on dark tinted surfaces |

Use one of these reds everywhere. Previously the site had 4 different "hover
reds" (`#B00000`, `#B50000`, `#B80000`, `#A30000`) and 4 different soft-error
reds — all now normalized.

## Status colors
| Token | Hex | Usage |
|---|---|---|
| `--success` | `#2FBF71` | "OK" dots, pass badges, successful form alerts |
| `--warning` | `#F39C12` | Loading dots |
| (error) | use `--primary-red` / `--red-soft` | Fail badges, error dots |

The old greens `#2ECC71` and `#00FF64` are retired; use `--success`.

## Surfaces (dark background scale)
| Token | Hex | Usage |
|---|---|---|
| `--bg-black` | `#000000` | Page body base |
| (section alt) | `#050505` | Alternating section backgrounds (Future Lab, pillars, discipline, workflow, quote sections) |
| (section alt 2) | `#0C0C0C` | Features section band |
| `--card-bg` | `#141414` | Card / raised surface fill |
| (hover surface) | `#0E0E0E–#0F0F0F` | Card hover fill |

Keep the vertical order: `#000000 < #050505 < #0C0C0C < #141414 < #1A1A1A`.
Do not invent new steps like `#090909` / `#080808` in new code — pick the
nearest existing step.

## Text scale
| Token | Hex | Usage |
|---|---|---|
| `--text-white` | `#FFFFFF` | Primary headings, active labels |
| `--text-gray` | `#B0B0B0` | Paragraphs / secondary text |
| (via hex) | `#888` | Tertiary / meta labels |
| (via hex) | `#666` | Muted meta, footer links |
| (via hex) | `#444` | Faintest text (ghost numbers, rules) |

## Borders
| Token | Hex | Usage |
|---|---|---|
| `--border-color` | `#222222` | Default card/section border |
| (via hex) | `#1A1A1A` | Subtle separators |
| (via hex) | `#333` / `#383838` | Strong / hover borders |

## Typography
Brand font: **Inter** — **self-hosted** in `Assets/fonts/` (variable font,
weight 200–700, latin + latin-ext subsets, ~130 KB total). No Google Fonts CDN,
no third-party request, works offline and under network filters.

Registered via `@font-face` at the top of `Assets/css/styles.css`
(pitch deck uses the same inline, since it doesn't load `styles.css`).

- Global stack (CSS token `--font-sans`):
  `'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- Code blocks: `'Cascadia Code', 'JetBrains Mono', Consolas, monospace`

Rationale: before this, the `*` reset pointed at OS-native fonts
(Segoe UI on Windows, Helvetica on macOS/iOS, DejaVu on Linux), so text metrics
— line wraps on the hero and headings — differed per OS. `'Inter'` was also
referenced in places but never loaded, so it silently never applied.
