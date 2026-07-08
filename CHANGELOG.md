# Changelog

All notable changes to the Postage Reconciliation System. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Dates are ISO-8601.

Governance note: this project does not modify the business reference workbook or any production
system. Every phase is gated on GPT review per the Mini-AIOS operating model.

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
