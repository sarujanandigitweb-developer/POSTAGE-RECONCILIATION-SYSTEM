# 04 · Dashboard Planning Document

Design specification for the standalone HTML dashboard. **No code here** — this is the plan that
Phase 2 implements after GPT review. Every design choice traces to the workbook (`02`/`03`) or the
project README.

---

## 1. Design principles

1. **Faithful reproduction, not redesign.** The dashboard mirrors the workbook's Dashboard sheet
   and operational views. Numbers and statuses are identical in meaning and value.
2. **Read-only.** No control writes back anywhere.
3. **Standalone single file.** One `dashboard.html` that opens by double-click, with an **embedded
   data snapshot** so it renders with no server. External `assets/css` + `assets/js` may be used in
   development but the deliverable is inlined into one file (embedded-data strategy §9).
4. **Single source of truth.** The dashboard never re-derives a value two different ways; each KPI
   maps to one documented formula (`02` formula inventory).
5. **BLOS-driven.** All thresholds come from the embedded BLOS config object — never inlined.
6. **Self-explanatory.** Column meanings available on hover (mirrors workbook v3.4 comments).

## 2. Navigation & tabs

Top nav bar (left: title + reporting-week banner; right: refresh status + theme toggle).

| Tab | Source sheet | Purpose |
|-----|--------------|---------|
| **Overview** (default) | Dashboard | KPI cards, Carrier Summary, mandatory KPI table |
| **Daily Control** | Daily Control | per-day reconciliation (customer + service side) |
| **Weekly Invoice Check** | Weekly Invoice Check | per-carrier weekly variance & status |
| **Leakage / Disputes** | Leakage Register | dispute list, lifecycle, recovery |
| **Bookings** | Booking Log | filterable transactional drill-down |
| **Rate Card** *(optional)* | Rate Card | read-only price reference |
| **Glossary & Rules** *(drawer)* | README / SOP / Gap Analysis | definitions & procedure |

Global filters (persist across tabs where relevant): **Reporting Week**, **Carrier**, **Label Type**.

## 3. Overview page components

### 3.1 Reporting-week banner
`REPORTING WEEK: W19 2026 · 05 May – 11 May 2026` — computed from MIN/MAX of the snapshot's
Daily Control dates (ISO-8601 week, `WEEKNUM(date,21)` equivalent). Prominent, red per workbook.

### 3.2 Top KPI cards (5)
| Card | Value source |
|------|--------------|
| Total Orders (week) | Σ Daily Control Total Orders in week |
| Self-Labelled | Σ Daily Control Self-Labelled in week |
| Forecast £ (week) | Σ Daily Control Forecast £ Inc VAT in week |
| Leakage £ (open) | Leakage Register OPEN TOTAL £ Leakage |
| Open Disputes | count of disputes in open statuses |

### 3.3 Weekly Carrier Summary table (10 carriers)
Columns: Carrier · Labels · Forecast £ · Invoice £ · Variance £ · Variance % · **Status pill** · Owner.
Status pill colours: **OK** green · **CHECK** amber · **LEAK/KILL** red (matches conditional
formatting `G10:G18`). Mirrors Weekly Invoice Check exactly.

### 3.4 Mandatory KPI table (10 rows, KPIs 22–31)
Columns: KPI · Target · Actual · BLOS Key · **Status (PASS/FAIL)**.
- PASS/FAIL logic per KPI direction (lower-is-better vs higher-is-better) — see `01` §5.
- **PASS** green, **FAIL** red (matches `E22:E31`).
- Target values render from the embedded BLOS config (show the key name as a tooltip/column).

## 4. Cards, tables, KPIs, status indicators (conventions)

- **Cards:** large number + label + optional sub-line (e.g. week range). Neutral by default.
- **Status pills:** the ONLY colour-carrying elements besides charts. Use accessible colour +
  text label (never colour alone) — "LEAK", "FAIL" text always present for colour-blind users.
- **Tables:** sticky header, right-aligned currency (£, 2 dp), zebra rows, per-column sort,
  client-side filter. Currency formatted `£#,##0.00`; percentages `0.0%`; dates `dd mmm yyyy`.
- **£0 Forecast with Qty > 0** highlighted as an "unmapped booking" warning (audit check 4).
- **`TBD — [Carrier]`** owners shown verbatim in a muted style (not an error).

## 5. Filters

| Filter | Values | Applies to |
|--------|--------|------------|
| Reporting Week | ISO week labels present in data | all pages |
| Carrier | Lists Carriers (10) | Overview, Weekly, Bookings, Leakage |
| Label Type | Lists Label Types (7) | Bookings, Daily (customer/service toggle) |
| Destination | Lists Destinations (23) | Bookings |
| Weight Band | Lists Weight Bands (9) | Bookings |
| Status | Lists Statuses (7) | Leakage |
| Issue Type | Lists Issue Types (16) | Leakage |

Filters are client-side over the embedded dataset (instant, no round-trip).

## 6. Charts / visualisation

The workbook has **no charts** — status is conveyed via pills and the KPI table. To stay faithful,
Phase 2 keeps charts **minimal/optional**:
- (Optional) a small carrier Forecast-vs-Invoice bar and a leakage-by-carrier bar, purely as
  supporting visuals, clearly secondary to the pill/table truth. If added, follow the **dataviz**
  design skill for palette/accessibility. Decision deferred to GPT review (see open questions).

## 7. Responsive behaviour

- **≥1200px:** full multi-column layout (cards row of 5, wide tables).
- **768–1199px:** cards wrap to 2–3 per row; tables scroll horizontally inside `overflow-x:auto`.
- **<768px:** single-column cards; tables become horizontally scrollable; nav collapses to a menu.
- The page body never scrolls horizontally; only wide tables scroll within their own container.

## 8. Light / dark mode

**Recommendation: theme-aware, defaulting to the OS preference, with a manual toggle.**
- Use `prefers-color-scheme` as the default signal + a toggle that persists to `localStorage`.
- Status colours must keep contrast in both themes (test green/amber/red pills on light & dark).
- Accounts Team likely views in a bright office → light default is acceptable; toggle covers both.

## 9. Embedded-data strategy

- The dashboard ships with a **`DATA` JSON object embedded in the HTML** (in a `<script>` block),
  containing: `bookings[]`, `dailyControl[]`, `weeklyInvoiceCheck[]`, `leakage[]`, `rateCard[]`,
  `lists{}`, `blos{}`, plus a `meta` block (`snapshot_at`, `reporting_week`, `as_of_date`, `source`).
- The HTML opens and renders **entirely from this embedded snapshot** — no server needed to view.
- **`as_of_date`** in `meta` drives all `TODAY()`-equivalent fields (Days Open, Rate card age) so
  values are deterministic and reconcilable against the workbook at snapshot time.
- A Python build script (`scripts/`) queries PostgreSQL via the Claude MCP, computes the datasets,
  and writes/refreshes the embedded block. **Build-time embedding, view-time static** is the model.

## 10. Automatic refresh strategy

Two complementary mechanisms (final choice confirmed at GPT review):

1. **Build-time refresh (primary):** a scheduled run (cron / Mini-AIOS routine / manual `make refresh`)
   re-queries PostgreSQL and regenerates the embedded snapshot + `snapshot_at`. This is the
   authoritative refresh and keeps the file standalone.
2. **View-time refresh (optional, if hosted):** if the dashboard is served (not just opened as a
   file), a small JS timer re-fetches a `data.json` sibling every N minutes and re-renders, showing
   a "Last updated HH:MM" indicator. Falls back silently to the embedded snapshot if the fetch
   fails or the file is opened locally (CSP/file:// safe).

The UI always displays **"Data as of `snapshot_at`"** so the Accounts Team knows the freshness.

## 11. Validation strategy (dashboard-side)

- A hidden/collapsible **"Validation"** panel can render a row-by-row comparison of dashboard
  values vs the workbook's expected values for the snapshot week (penny diff), turning `06`'s
  validation into a visible self-check during UAT. Removed or hidden for the Accounts Team view.
- Every KPI links back to its formula id (`02` inventory) for traceability.

## 12. Non-goals / explicit exclusions

- No data entry, no dispute editing, no threshold editing.
- No re-implementation of business logic beyond faithful reproduction.
- No external network calls at view time except the optional same-origin `data.json` poll.

## 13. Accessibility & polish checklist (for Phase 2)

- Colour + text on every status (no colour-only meaning).
- Keyboard-navigable tabs and filters; visible focus rings.
- Sufficient contrast in both themes.
- Numbers right-aligned, thousands-separated, currency symbol consistent.
- Load the **dataviz** skill before building any chart; **artifact-design** if delivered as an Artifact.
