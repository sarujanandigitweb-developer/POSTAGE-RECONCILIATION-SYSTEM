# Project Structure

Complete folder tree, the purpose of every folder and major file, and the end-to-end data flow for
the Postage Reconciliation System. Companion to [README.md](README.md) and
[CHANGELOG.md](CHANGELOG.md).

---

## 1. Folder tree

```
POSTAGE-RECONCILIATION-SYSTEM/
├── README.md                                   Project entry point
├── PROJECT_STRUCTURE.md                        This file
├── CHANGELOG.md                                Version / phase history
├── Accounts postage_reconciliation_v3_merged.xlsx   Business reference workbook (v3.4)
│
├── documentation/                              All written analysis & design
│   ├── INDEX.md                                Guided reading order (start here)
│   ├── 00_project_overview.md                  What the project is
│   ├── 01_business_requirements.md             Rules, KPIs, scope
│   ├── 02_excel_analysis.md                    Every worksheet analysed
│   ├── 03_sheet_mapping.md                     Sheet → dashboard role
│   ├── 04_dashboard_plan.md                    Dashboard design spec
│   ├── 05_postgresql_mapping.md                Data mapping PLAN (Phase 1)
│   ├── 06_validation_plan.md                   Validation + readiness + questions
│   ├── 07_database_discovery.md                Live DB structure (Phase 2)
│   ├── 08_data_mapping_completed.md            Confirmed mapping + validation (Phase 2)
│   ├── 09_phase2_readiness.md                  Missing columns + readiness (Phase 2)
│   └── SKILL_POSTAGE_RECONCILIATION_SYSTEM.md  Project skill / governance
│
├── dashboard/                                  The deliverable
│   ├── postage_reconciliation_dashboard.html   Standalone single-file dashboard (Phase 3)
│   ├── data.js                                 Validated PostgreSQL export (Phase 2)
│   ├── README.md                               Dashboard architecture doc
│   └── sql/
│       ├── dashboard_queries.sql               Read-only SQL query pack (Phase 2)
│       └── README.md                           SQL pack doc
│
├── assets/                                     Static assets (dashboard is self-contained)
│   ├── README.md
│   ├── css/                                    (reserved — styles are inlined in the HTML)
│   ├── js/                                     (reserved — JS is inlined in the HTML)
│   └── images/                                 (reserved — logos / icons / favicons)
│
├── evidence/            README.md              Validation evidence, screenshots, SQL results
├── prompts/             README.md              GPT→Claude prompts used per phase
├── scripts/            README.md              Future refresh / automation scripts
├── sql/                README.md              Future schema / views / migration scripts
├── validation/         README.md              Validation reports & acceptance checklists
└── handover/           README.md              Handover, deployment & maintenance package
```

## 2. Purpose of every folder

| Folder | Purpose | Status |
|--------|---------|--------|
| `documentation/` | All analysis, design, mapping, validation and skill docs. The written source of truth for the build. | Complete (Phases 1–2) |
| `dashboard/` | The standalone HTML dashboard plus its embedded data export. | Complete (Phase 3) |
| `dashboard/sql/` | The read-only SQL query pack that produced the embedded data. | Complete (Phase 2) |
| `assets/` | Static assets (images/icons/fonts). Reserved — the dashboard inlines its own CSS/JS. | Scaffold |
| `evidence/` | Screenshots, query outputs, test/acceptance evidence ("no evidence = no completed work"). | Awaiting UAT |
| `prompts/` | The exact GPT→Claude prompts per phase (Mini-AIOS traceability). | Ongoing |
| `scripts/` | Future automation (refresh the embedded snapshot from PostgreSQL). | Planned |
| `sql/` | Future database objects (schema additions, views, migrations). Distinct from `dashboard/sql/`. | Planned |
| `validation/` | Formal validation reports and the acceptance checklist. | Awaiting UAT |
| `handover/` | Everything an unknown developer needs to run, deploy and maintain the project. | Complete (doc) |

## 3. Purpose of every major file

| File | Purpose |
|------|---------|
| `Accounts postage_reconciliation_v3_merged.xlsx` | The business reference (v3.4). Defines every rule, formula, KPI and BLOS threshold. Not modified. |
| `dashboard/postage_reconciliation_dashboard.html` | The single-file deliverable: HTML + inline CSS + inline JS + embedded data. Opens offline. |
| `dashboard/data.js` | The validated PostgreSQL export (week W27 2026) — the data source embedded in the HTML. |
| `dashboard/sql/dashboard_queries.sql` | The commented, SELECT-only query pack used to build `data.js`. |
| `documentation/INDEX.md` | The map of all documents, reading order, and dependencies. |
| `documentation/SKILL_*.md` | Governance rules (read-only DB, no invented logic, BLOS-driven, evidence, handover). |

## 4. Data flow

```
┌─────────────────────────────┐
│  Excel Workbook (v3.4)      │   Business reference: rules, formulas, KPIs, BLOS thresholds
│  business logic & terms     │
└──────────────┬──────────────┘
               │  analysed in documentation/02, 03; rules in 01
               ▼
┌─────────────────────────────┐
│  PostgreSQL (source of truth)│  public.order_transaction, order_shipping_billing_detail,
│  read-only via Claude MCP    │  ebay_order_expenses  (discovery in documentation/07)
└──────────────┬──────────────┘
               │  read-only SELECT queries
               ▼
┌─────────────────────────────┐
│  dashboard/sql/              │  dashboard_queries.sql — one query per dashboard component
│  dashboard_queries.sql       │  (mapping in documentation/08)
└──────────────┬──────────────┘
               │  executed via MCP, results collected
               ▼
┌─────────────────────────────┐
│  dashboard/data.js           │  const dashboardData = {...}  — validated snapshot (W27 2026)
│  embedded data export        │  (validation in documentation/08 §D)
└──────────────┬──────────────┘
               │  embedded inline
               ▼
┌─────────────────────────────┐
│  HTML Dashboard              │  postage_reconciliation_dashboard.html
│  tabs · filters · KPI cards  │  standalone, offline, theme-aware (design in documentation/04)
│  status pills · tables       │
└─────────────────────────────┘
```

**Governance overlay (all stages):** read-only PostgreSQL · BLOS thresholds from the workbook ·
counts authoritative, £ indicative · missing sources reported, never fabricated · no workbook logic changed.

## 5. Two SQL locations — do not confuse

| Path | Contains | When |
|------|----------|------|
| `dashboard/sql/` | The **dashboard query pack** (read-only SELECTs that build `data.js`). | Built in Phase 2. |
| `sql/` (top-level) | **Future database objects** — schema additions, views, migrations that the *production* system will need (e.g. `label_type`, rate card). | Planned; empty scaffold today. |

See [sql/README.md](sql/README.md) and [dashboard/sql/README.md](dashboard/sql/README.md).
