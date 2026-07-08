# 00 · Project Overview

**Project:** Postage Reconciliation System — HTML Dashboard
**Phase:** 1 — Discovery & Project Setup (this document set)
**Date:** 2026-07-08
**Author:** Sarujanan (via Claude Code)
**Governance:** Mini-AIOS Master Instruction & Skill Guide
**Status:** Discovery complete · awaiting GPT review before Phase 2

---

## 1. What this project is

The Accounts Team currently reconciles postage cost by **manually viewing** a workbook,
`Accounts postage_reconciliation_v3_merged.xlsx` (version v3.4). The workbook reconciles every
parcel **label** generated against every carrier **invoice line**, detects variances, turns each
variance into a tracked dispute, and reports KPIs against BLOS threshold values.

This project builds a **standalone HTML dashboard** that:

1. Reproduces the workbook's **Dashboard** view (and the operational sheets that feed it).
2. **Automatically loads data from PostgreSQL** through the existing Claude MCP.
3. **Embeds a data snapshot** inside the HTML file so it opens and renders on its own.
4. **Refreshes automatically** so the Accounts Team never re-keys data.
5. **Preserves every business calculation** exactly as the workbook computes it — no new logic.

The dashboard is explicitly a **temporary operational tool**. PostgreSQL is the source of truth;
the workbook remains the business reference until the dashboard is validated.

## 2. What this project is NOT

- Not a rewrite of the business rules. Every formula is carried over verbatim in meaning.
- Not a write-back tool. The dashboard is **read-only**; it never mutates production data or schema.
- Not a replacement for BLOS. Threshold values continue to be owned by Vithursali.
- Not a replacement for the workbook until validation passes.

## 3. The three source files (all read during discovery)

| # | File | Location | Role |
|---|------|----------|------|
| 1 | `Accounts postage_reconciliation_v3_merged.xlsx` | `~/Downloads/` | Business reference — 11 sheets, ~1,286 formulas, self-documenting README sheet |
| 2 | `README.md` (project) | project root / `~/Downloads/` | Objective, scope, allowed/not-allowed, success criteria, team |
| 3 | Mini-AIOS Master Instruction & Skill Guide | `~/Downloads/*.docx` + `TECHNICAL MINI-AIOS MASTER OPERATING GUIDE.md` | Governance / operating model |

## 4. The workbook in one paragraph

Every parcel we ship generates a **label**. Labels are aggregated into **bookings**
(Carrier × Service × Weight Band × Destination × Label Type, per day). Each booking's expected
cost (**Forecast £**) is looked up from a **Rate Card** and computed `Qty × Rate × (1 + VAT%)`.
Weekly, the sum of Forecast £ per carrier is compared to the actual **carrier Invoice £**; the
**Variance** is classified OK / CHECK / LEAK / KILL against **BLOS thresholds**. Any LEAK/KILL
becomes a **Leakage Register** dispute with an owner, a lifecycle, and a recovery target. The
**Dashboard** rolls all of this into KPI cards and a mandatory KPI table, each row PASS/FAIL
against its BLOS threshold. **Recovery rate** (credit recovered ÷ leakage £) is the primary metric.

## 5. Key facts discovered (used throughout the design)

- **11 worksheets**, all visible. No hidden sheets. **No charts** (status is shown via
  conditional-formatting "pills", not chart objects).
- Workbook version history runs **v1.0 → v3.4**; scope was corrected across changelogs
  (returns postage moved *in*-scope in v3.3; Label Type dimension added in v3.1; ISO-week
  labelling in v3.2; self-documenting column comments in v3.4).
- **15 BLOS threshold keys**, all referenced via Excel *named ranges* (never hardcoded).
- Reporting week in the sample data is **W19 2026 (05–11 May 2026)**. Dates are stored as
  Excel serial numbers (e.g. `46147` = 2026-05-05).
- The workbook currently holds **dummy/sample data** and is **pending all v3.0 production
  sign-offs** (Sajeesan schema, Vithursali BLOS, Pratheepan ETL, Sathees ownership, Rajiv access).
- Three+ PostgreSQL columns required for production **do not yet exist** (`service_tier`,
  `weight_band_kg`, `destination_zone`, `label_type`, invoice ingestion fields). This is a
  **known blocker** documented in `05_postgresql_mapping.md`.

## 6. Deliverables of this discovery phase

1. Existing Asset Report — see §"Existing Asset Report" in `01`/final summary.
2. Excel Workbook Analysis — `02_excel_analysis.md`.
3. Worksheet Mapping — `03_sheet_mapping.md`.
4. Business Requirement Summary — `01_business_requirements.md`.
5. Dashboard Planning Document — `04_dashboard_plan.md`.
6. PostgreSQL Data Mapping Plan — `05_postgresql_mapping.md`.
7. Folder Structure — created (see root `README.md`).
8. Project Skill File — `SKILL_POSTAGE_RECONCILIATION_SYSTEM.md`.
9. Duplicate Risk Assessment — `01` §Duplicate Risk + Skill file.
10. Implementation Readiness Report — `06_validation_plan.md` §Readiness.
11. Clarification questions — `06_validation_plan.md` §Open Questions.

## 7. Phase gate

Per the Mini-AIOS flow and the task's stop condition, **no implementation begins** until GPT
reviews this discovery package. Phase 2 (SQL pack → data layer → HTML) starts only on that approval.
