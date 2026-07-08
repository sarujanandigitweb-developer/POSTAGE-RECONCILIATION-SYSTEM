# dashboard/

The deliverable: a **standalone, single-file HTML dashboard** for the Accounts Team, plus the
embedded data export and the SQL that produced it.

| File | Role |
|------|------|
| `postage_reconciliation_dashboard.html` | The dashboard — HTML + inline CSS + inline JS + embedded data. Opens offline by double-click. |
| `data.js` | The validated PostgreSQL export (`const dashboardData`) for week W27 2026. Reference copy; the same data is embedded inside the HTML. |
| `sql/` | The read-only SQL query pack that produced `data.js` — see [sql/README.md](sql/README.md). |

Design source: [../documentation/04_dashboard_plan.md](../documentation/04_dashboard_plan.md).
Data source & validation: [../documentation/08_data_mapping_completed.md](../documentation/08_data_mapping_completed.md).

---

## 1. Purpose
Replace manual spreadsheet viewing with an auto-loadable, read-only dashboard that reproduces the
workbook's Dashboard and operational views, preserving every business calculation and term. It is a
**temporary operational tool**; the workbook remains the business reference until fully validated.

## 2. Architecture
A single `.html` file with three embedded parts and **no external dependencies** (no CDNs, no
frameworks — verified 0 external references):

```
<style> … </style>      inline CSS (theme variables, layout, tables, pills)
<body> … </body>        header · tab nav · filters · main · footer (skeleton only)
<script> … </script>    embedded data + vanilla-JS app (render, sort, filter, theme)
```

The app is data-driven: one `render()` builds the active tab from `dashboardData` + current filter
and sort state. A generic table renderer handles sorting, search and pills for every table.

## 3. Standalone HTML design
- **One file**, opens from `file://` with no server and no network.
- Everything inlined; a strict offline environment renders it fully.
- Business logic is reproduced in JavaScript exactly as the workbook computes it — no new logic.

## 4. Embedded CSS
- CSS custom properties (`:root` / `html[data-theme="dark"]`) drive theming.
- Header colour `#15243d`; accessible status colours (colour **and** text on every pill).
- Cards grid, sticky table headers, scrollable table bodies, responsive breakpoints.

## 5. Embedded JavaScript (vanilla)
- `TABS`, `state` (tab / theme / filters / sort), formatting helpers (`gbp`, `pct`, `num`, signed).
- `renderTable()` — generic sortable/searchable table with pill formatters and optional total row.
- `applyFilters()` — contextual filtering by carrier / destination / week.
- Page builders: `pageDashboard`, `pageDaily`, `pageWeekly`, `pageLeakage`, `pageBooking`,
  `pageRateCard`, `pageReference`.
- Event delegation for tab switch, column sort, filter change, search input, theme toggle.

## 6. Embedded data
- `const dashboardData = { overview, carrierSummary, dailyControl, weeklyInvoice, kpis, bookingLog,
  leakageRegister, rateCard, weeklyTrend, serviceProxies, lookups, blos, metadata }`.
- Sourced from PostgreSQL (Phase 2), reporting week **W27 2026** (29 Jun–05 Jul 2026), as-of 2026-07-08.
- **Counts authoritative; £ indicative** (DB proxies, mixed GBP+EUR); carrier grouping heuristic.
- `leakageRegister` and `rateCard` are **empty** — no PostgreSQL source; shown as "no source", not faked.

## 7. Tabs
| Tab | Shows |
|-----|-------|
| Dashboard | KPI cards, Carrier Summary, mandatory KPI table (rows 22–31) |
| Daily Control | per-day order→label reconciliation + weekly total |
| Weekly Invoice Check | per-carrier Forecast vs Invoice, variance, status |
| Leakage Register | disputes (empty — no source) |
| Booking Log | best-effort buckets (date × carrier × destination) |
| Rate Card | empty — no rate-card table in DB |
| Reference | provenance, data gaps, BLOS thresholds, trend, service proxies |

## 8. Filters
Contextual per tab: **Carrier**, **Week**, **Destination** (Booking Log), **Status** / **Issue
Type** (Leakage). Filters update visible tables/cards instantly (client-side over embedded data).
"Clear filters" resets state.

## 9. KPI cards
Forecast Cost, Actual Cost, Leakage £, Open Disputes, Bookings, Total Orders, Self-Labelled, Daily
Recon Accuracy. Cards with no data source render "No source" rather than a fabricated number; £
cards carry an "indicative £" flag.

## 10. Responsive behaviour
- ≥1200px full multi-column; 760–1199px cards wrap and tables scroll horizontally; <760px single
  column, condensed header, menu-style tabs.
- Page body never scrolls horizontally; wide tables scroll within their own container.

## 11. Theme
Light / dark toggle in the header; choice persisted in `localStorage` (`prd_theme`). Status colours
keep contrast in both themes.

## 12. Browser support
Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses standard ES2015+ and CSS custom
properties; no build step, no polyfills. No IE support.

## 13. Future enhancements
- Optional supporting charts (kept minimal to match the workbook's pill/table style).
- Live/auto refresh (see [../scripts/README.md](../scripts/README.md)) and a "last updated" poll.
- Populate Leakage Register, Rate Card and service/return KPIs once their PostgreSQL sources exist
  (see [../documentation/09_phase2_readiness.md](../documentation/09_phase2_readiness.md)).
- Multi-week selector driven by `weeklyTrend`.

> **Do not hand-edit the embedded data.** Regenerate it from PostgreSQL via the query pack; see
> [sql/README.md](sql/README.md) and the future refresh script.
