# Changelog

All notable changes to the Postage Reconciliation System. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Dates are ISO-8601.

Governance note: this project does not modify the business reference workbook or any production
system. Every phase is gated on GPT review per the Mini-AIOS operating model.

---

## [0.4.1] — 2026-07-09 · Calculation Parity — implementation fixes
**Status: complete. Dashboard implementation only — no schema changes, no PostgreSQL writes.**

### Fixed (Priority 2 — incorrect calculations)
- **Leakage £ (Others)** was hardcoded `0.00`; now **`-87.55`** = `Invoice £ − Forecast £` (signed, README Sheet 6 col I).
- **KPI 22 Daily reconciliation** no longer reports a false `100% PASS` → **NOT COMPUTABLE**. Closure needs
  `shipment.label_type`, and the customer Gap is structurally 0 (all 3,634 non-FBA orders have exactly 1 shipment row).
- **KPI 26 Avg dispute age** contradiction resolved → **NOT COMPUTABLE**, and Days Open / Date Raised are now blank
  in the Leakage Register (one consistent rule: Date Raised is a manual field with no PG source).
- **Variance %** now applies the workbook `IFERROR(...,0)` — Wayfair shows `0%`, not blank.
- **"Expected £" renamed "Estimated Cost (Historical Baseline)"** everywhere; it is NOT the workbook Forecast £.
- **Open Disputes = 1** (was 2) — "Killed" is not an open status per README §13.

### Refreshed snapshot (as-of 2026-07-09)
Orders 4,020→**4,027** · FBA 389→**393** · Self 3,484→**3,487** · Labels 3,631→**3,634** ·
Actual £12,517.31→**£12,525.72** · Others 24→**23**. W27 is **not immutable** — rows are back-dated into the
closed window (`max(order_date)` = 2026-07-09).

### Added (Phase 2 — no silent blanks)
- 23 blocked fields now render an **`Unavailable`** pill with a tooltip naming the exact requirement
  (e.g. "Requires public.shipment.label_type (schema)").

### Verified
- **42/42 automated calculation checks pass**; JS parses; 0 external deps; header `#15243d`; rate card 208 rows.
- **KPIs: 2 PASS · 3 FAIL · 5 NOT COMPUTABLE.** Zero dashboard calculation bugs remain.

### Added
- `documentation/15_calculation_parity_implementation.md`

## [0.4.0] — 2026-07-09 · Zero-Trust Final Audit (pre-production)
**Status: complete. Workbook re-parsed from file; PostgreSQL swept across all schemas/tables/views.**

### Found & implemented
- **Rate Card is in the WORKBOOK** — Sheet 4 holds **208 populated rows**, all with `Effective From`.
  Now embedded and rendered. (`blos.postage` exists in PG but has **0 rows** → ETL backfill gap.)
- **KPI 28 Rate card age = 310 days → FAIL** (newest Effective From 2025-09-01 vs 30-day BLOS limit).
  Previously reported "N/A — no rate card".

### Proven absent (zero-trust sweep, every schema + views)
`service_tier`, `weight_band_kg`, `total_weight`, `public.shipment.label_type`, invoice_received_*,
dispute/credit tables, `iso_week_number/year`. `supplier.invoices` is inbound-freight (container/FOB),
**not** carrier postage invoices — out of scope per README §1.

### Workbook defect (Category G)
- **Rate Card uses 22 distinct weight bands; Lists defines only 9.** 13 bands violate the spec
  (`100g, 110g, 250g, 500g, 750g, 1.03kg, 4kg, 6kg, 7kg, 8kg, 12kg, 20kg, 31.5kg`). Lookup Key
  cannot resolve until Lists ↔ Rate Card are reconciled.

### KPI outcome (targets from `blos`, no hardcoded thresholds)
**3 PASS · 3 FAIL · 4 N/A** — FAILs are real business signals: leakage £97.46 (DHL),
rate card 310 days stale, return rate 4.10% (limit 2%).

### Added / updated
- `documentation/13_zero_trust_final_audit.md` — full column matrix + 8-question conclusion.
- `dashboard/postage_reconciliation_dashboard.html`, `data.js` — rate card + KPI 28.
- `dashboard/README.md` — removed stale "no rate-card table" / "Leakage empty" claims.

### Verdict
**NOT signed off for production.** 12 blockers listed in priority order (backfill `blos.postage` first).

## [0.3.4] — 2026-07-09 · Workbook Column Validation — sources found, wrong values fixed
**Status: complete. Read-only PostgreSQL; no business logic invented.**

### Corrected my own earlier (wrong) findings
- **`blos` schema is NOT empty** — it contains `blos.postage` and `blos.postage_history`. The
  **rate-card table exists** with the right shape but holds **0 rows** → a **backfill/ETL gap, not a
  schema gap**. (Earlier `list_objects('blos')` returned empty and I over-concluded.)
- **Return Label In IS available** via `public.amazon_returns` (`label_type`, `label_cost`,
  `rd_carrier`, `fulfilment`) and `public.ebay_returns`. README §21's mapping
  (`ebay_order_expenses.transaction_memo`, `amz_refund_expenses`) is **wrong — neither exists**.

### Fixed
- **KPI 31 Return rate is now live: 4.10% → FAIL** (BLOS target 2%). Return Label In = 149
  (Amazon prepaid 110 + eBay label-evidenced 39) / 3,631 customer-order labels. Sensitivity:
  billed-only 3.06%, orders denominator 3.71% — **fails on every basis**. Still a lower bound
  (Return Label Out needs `shipment.label_type`).
- Removed a **duplicate `returns` JS key** that had crept into the data object and was silently
  overriding the correct dataset with unverified figures ("eBay 79 labels").
- Excluded 29 FBA returns (README §1), 30 `AmazonUnPaidLabel` (customer-paid) and 14 Shopify
  refunds (no label field) from the KPI 31 numerator.
- Corrected the Rate Card tab, `metadata.gaps` and the SQL-pack header, which all wrongly stated
  "no rate-card table / blos schema empty".

### Added
- `dashboard/sql/dashboard_queries.sql` — **Q10** (Return Label In, verified) and **Q11**
  (rate-card probe proving `blos.postage` = 0 rows). Pack remains SELECT-only.
- `documentation/12_workbook_column_validation.md` — column-by-column matrix, blank-field
  classification (A–F), README defect list, production-readiness plan.

### Noted
- **No "Version 4" workbook exists.** The only file is `Accounts postage_reconciliation_v3_merged.xlsx`
  (unchanged 2026-07-08 12:23, internally v3.4). Validation was performed against v3.4.

## [0.3.3] — 2026-07-09 · README Compliance Validation & Corrections
**Status: complete. Validation phase — no redesign; architecture, tabs and embedded-data approach preserved.**

### Fixed (README compliance)
- **Lists (Sheet 8)** restored verbatim: issue types 9 → **16** (two invented values removed), plus
  **labelTypes (7)**, **destinations (23)**, **weightBands (9)**, **owners (10)**.
- **No hardcoded thresholds** — KPI Target and PASS/FAIL are now derived at render from the `blos`
  object via `blos_key` (satisfies README audit check #2).
- **Leakage Register** — invented Issue Types removed; values now come from Lists or are NULL
  ("uncategorised", README-permitted). Added Week Start, Week Label, Trigger Source, Root Cause,
  Credit Recovered £, Label Type.
- **Week Label `Wxx YYYY` (Section 20)** added to Booking Log, Weekly Invoice Check, Leakage Register.
- **All README fields now present** on Daily Control, Booking Log, Weekly Invoice Check, Leakage
  Register and Rate Card — rendering "—" where PostgreSQL has no source. Nothing fabricated.

### Verified
- Dashboard == PostgreSQL exactly (4,020 orders · 3,631 labels · £12,517.31); ISO week = W27 2026.
- Worksheets: 6 PASS · 5 PASS-with-GAP · 0 FAIL. KPIs: 3 PASS · 1 FAIL (real signal) · 6 N/A.

### Found
- **Defect in the README (Section 21):** `ebay_order_expenses.transaction_memo` does not exist and
  `amz_refund_expenses` is absent, so "Return Label In — available today" is incorrect.

### Added
- `documentation/11_readme_compliance_validation.md` — full validation report.

## [0.3.2] — 2026-07-08 · Data Correction + UI Refinement + Full Validation
**Status: complete.**

### Fixed (data)
- Corrected the financial model. `shipping_template_price` is **67% zero** for the reporting week,
  so using it as "Forecast £" produced nonsensical all-LEAK variances. Now: **Actual £ =
  `carrier_charge`** (reliable), **Expected £ = prior-8-week avg rate per carrier × labels** (the
  workbook's "default per carrier" fallback), Variance/Status by the workbook rule. Realistic result:
  RM −0.9% (CHECK), DHL +3.3% (LEAK), net −£104.70.
- `dashboard/data.js` rewritten to the corrected model; now byte-identical to the HTML embedded data.
- Added query **Q9** (corrected carrier reconciliation) to `dashboard/sql/dashboard_queries.sql`.

### Changed (UI)
- KPI cards now use **full browser width** (`auto-fit` grid + `width:100%`) — no right-side gap.
- Cards made **compact** (reduced height, single-line, 8 important-first metrics).
- **Dark mode** reworked to an enterprise slate palette (bg `#0e141f`, surface `#171f2c`, high
  contrast, de-saturated pills); header stays `#15243d`. Added `:focus-visible` states + polish.

### Validation
- `documentation/10_ui_and_validation_report.md` — evidence-based per-worksheet validation of all
  11 worksheets (Excel dummy W19 vs live PostgreSQL W27 vs Dashboard): **9 PASS, 2 PASS-with-GAP, 0 FAIL**.
- Reconfirmed headline figures read-only from PostgreSQL (4,020 orders · 3,631 labels · £12,517.31).

---

## [0.3.0] — 2026-07-08 · Phase 3: Standalone HTML Dashboard
**Status: complete.**

### Added
- `dashboard/postage_reconciliation_dashboard.html` — single standalone file: HTML + inline CSS +
  inline vanilla JS + embedded data. No external dependencies, no frameworks.
- Horizontal tab navigation: Dashboard · Daily Control · Weekly Invoice Check · Leakage Register ·
  Booking Log · Rate Card · Reference.
- KPI cards (Forecast, Actual, Leakage, Open Disputes, Bookings + Total Orders, Self-Labelled,
  Recon accuracy), Carrier Summary, and the mandatory KPI table (rows 22–31).
- Contextual filters (Carrier, Week, Destination, Status, Issue Type); sortable/searchable tables
  with sticky headers and scrollable bodies; workbook-style status pills (OK/CHECK/LEAK/KILL,
  PASS/FAIL/N/A); light/dark theme with `localStorage` persistence; responsive layout.

### Preserved
- All business logic and terminology from the workbook; no invented calculations.
- Counts authoritative; £ figures badged **indicative**; missing datasets (leakage, rate card,
  service/return KPIs) shown as "no source" / N/A rather than fabricated.

### Verified
- Single file, 0 external references; embedded data internally consistent (labels reconcile to
  3,631; per-day order-math holds); full `<script>` block parses.

---

## [0.2.0] — 2026-07-08 · Phase 2: PostgreSQL Discovery & Embedded Data
**Status: complete.**

### Added
- `dashboard/sql/dashboard_queries.sql` — read-only, commented SQL query pack (SELECT only).
- `dashboard/data.js` — validated `dashboardData` export for reporting week **W27 2026**
  (2026-06-29 → 2026-07-05), as-of 2026-07-08.
- `documentation/07_database_discovery.md` — live schema, counts, nulls, relationships.
- `documentation/08_data_mapping_completed.md` — confirmed metric→source mapping, text ER diagram,
  and the PostgreSQL-vs-workbook validation report (PASS/WARNING/FAIL).
- `documentation/09_phase2_readiness.md` — Missing Columns Report + implementation readiness.

### Findings
- Source tables confirmed in `public`: `order_transaction`, `order_shipping_billing_detail`,
  `ebay_order_expenses`. `blos` schema empty; `shipment` / rate-card / dispute tables absent.
- Counts fully available; financials are DB proxies (`shipping_template_price`, `carrier_charge`,
  mixed GBP+EUR); carrier grouping is a documented heuristic. All gaps reported, none fabricated.

### Policy
- Read-only access only; no INSERT/UPDATE/DELETE/CREATE/ALTER issued.

---

## [0.1.0] — 2026-07-08 · Phase 1: Discovery & Project Setup
**Status: complete.**

### Added
- Folder scaffold and project `README.md`.
- `documentation/00`–`06`: project overview, business requirements, Excel analysis, sheet mapping,
  dashboard plan, PostgreSQL mapping plan, validation plan.
- `documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md` — project skill / governance.

### Analysed
- All 11 worksheets of `Accounts postage_reconciliation_v3_merged.xlsx` (v3.4): purpose, metrics,
  formulas, conditional formatting, 15 BLOS thresholds, dispute lifecycle, edge cases.

---

## [0.3.1] — 2026-07-08 · Documentation completion (this change)
**Status: complete. Documentation only — no implementation modified.**

### Added
- `PROJECT_STRUCTURE.md`, `CHANGELOG.md`, `documentation/INDEX.md`.
- Per-folder `README.md` for: `assets/`, `dashboard/`, `dashboard/sql/`, `evidence/`, `handover/`,
  `prompts/`, `scripts/`, `sql/`, `validation/`.

### Changed
- Root `README.md` status banner and layout updated to reflect Phases 1–3 complete (no logic changed).

---

## Planned (future phases)

| Version | Phase | Scope |
|---------|-------|-------|
| 0.4.0 | Validation & UAT | Execute `validation/` checklist; capture `evidence/`; Accounts Team sign-off. |
| 0.5.0 | Automatic refresh | `scripts/` job to regenerate `data.js` from PostgreSQL on a schedule. |
| 1.0.0 | Production readiness | Resolve missing columns (`label_type`, `service_tier`, `weight_band`, `destination_zone`), rate card, invoice ingestion, dispute source, BLOS API; move £ from indicative to authoritative. |
