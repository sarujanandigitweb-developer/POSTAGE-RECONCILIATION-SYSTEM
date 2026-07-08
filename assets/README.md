# assets/

Static assets for the project (images, icons, logos, fonts).

> **Note:** the delivered dashboard is **self-contained** — its CSS and JavaScript are inlined in
> `dashboard/postage_reconciliation_dashboard.html`, and it embeds its own data. This folder is
> therefore **reserved**: use it only for assets that a future non-inlined build, documentation, or
> a hosted deployment might need. Do not add an external stylesheet/script that the standalone
> dashboard would depend on — that would break its offline, single-file guarantee.

---

## Purpose
Hold reusable static files that are not code and not data: brand imagery, icons, favicons and
fonts, kept out of the HTML/JS so they can be versioned and reused.

## Folder structure
| Folder | Holds |
|--------|-------|
| `css/` | Stylesheets — **reserved** (dashboard styles are inlined). Use only for non-dashboard pages. |
| `js/` | Scripts — **reserved** (dashboard JS is inlined). Use only for build tooling / non-dashboard pages. |
| `images/` | Logos, icons, favicons, screenshots used by docs. |

## Images
Company/team logo, dashboard favicon, and any diagram images referenced from documentation.
Prefer **SVG** for logos/icons (crisp, small) and **PNG** for screenshots. Optimise before commit.

## Icons
Use inline SVG or an emoji where possible to keep the dashboard dependency-free. If a shared icon
set is needed for other pages, store SVGs here under `images/icons/`.

## Logos
Store master logo(s) in `images/` (SVG preferred, plus a PNG fallback). Keep light- and dark-theme
variants where the logo needs different colours per theme.

## Fonts
The dashboard uses the OS system font stack (no web-font download) to stay self-contained. If a
brand font is ever required for another artefact, store the licensed files under `assets/fonts/`
and record the licence — never commit fonts you are not licensed to redistribute.

## Static assets
Any other static file (PDF exports, printable one-pagers) may live here in a clearly named subfolder.

## Naming conventions
- Lower-case, hyphen-separated: `postage-logo.svg`, `favicon-32.png`, `dashboard-overview-light.png`.
- Include theme/size in the name where relevant: `-light` / `-dark`, `-32` / `-512`.
- No spaces, no upper-case, no version numbers in filenames (use git history for versions).

## Best practices
- Keep the standalone dashboard **dependency-free** — do not link assets into it.
- Optimise/compress images before committing; prefer vector where possible.
- One logical asset per file; document non-obvious assets in a short note here.
- No secrets, no licensed material without a recorded licence.
