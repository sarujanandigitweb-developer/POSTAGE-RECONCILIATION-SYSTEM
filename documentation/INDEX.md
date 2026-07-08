# Documentation Index

The guided map of every document in this project: what to read, in what order, why, and how the
documents depend on each other. Start here.

---

## 1. Reading order

| # | Read | Why | Phase |
|---|------|-----|-------|
| 1 | [00_project_overview.md](00_project_overview.md) | What the project is and the deliverables | 1 |
| 2 | [SKILL_POSTAGE_RECONCILIATION_SYSTEM.md](SKILL_POSTAGE_RECONCILIATION_SYSTEM.md) | Governance rules that constrain everything | 1 |
| 3 | [01_business_requirements.md](01_business_requirements.md) | The business rules, KPIs and scope | 1 |
| 4 | [02_excel_analysis.md](02_excel_analysis.md) | Every worksheet, formula and threshold | 1 |
| 5 | [03_sheet_mapping.md](03_sheet_mapping.md) | Which sheet becomes which dashboard part | 1 |
| 6 | [04_dashboard_plan.md](04_dashboard_plan.md) | The dashboard design specification | 1 |
| 7 | [05_postgresql_mapping.md](05_postgresql_mapping.md) | The data-mapping **plan** (pre-DB) | 1 |
| 8 | [06_validation_plan.md](06_validation_plan.md) | Validation strategy, readiness, open questions | 1 |
| 9 | [07_database_discovery.md](07_database_discovery.md) | The **actual** live database structure | 2 |
| 10 | [08_data_mapping_completed.md](08_data_mapping_completed.md) | Confirmed mapping + ER diagram + validation | 2 |
| 11 | [09_phase2_readiness.md](09_phase2_readiness.md) | Missing columns + readiness for the dashboard | 2 |

For the code deliverables, then read [../dashboard/README.md](../dashboard/README.md) and
[../dashboard/sql/README.md](../dashboard/sql/README.md); for deployment, [../handover/README.md](../handover/README.md).

## 2. Purpose of every document

| Document | Purpose (one line) |
|----------|--------------------|
| `00_project_overview.md` | Scope, objective, source files, key facts, deliverables list. |
| `01_business_requirements.md` | Canonical business rules, Forecast £ formula, closure logic, KPI table, BLOS rule. |
| `02_excel_analysis.md` | Sheet-by-sheet analysis of the v3.4 workbook incl. formulas & conditional formatting. |
| `03_sheet_mapping.md` | Maps each worksheet to a dashboard page / backend data / lookup / filter. |
| `04_dashboard_plan.md` | Navigation, cards, tables, filters, theming, refresh & embedded-data strategy. |
| `05_postgresql_mapping.md` | Pre-discovery **plan** of expected tables/columns/joins and known gaps. |
| `06_validation_plan.md` | Validation layers, acceptance tests, readiness report, clarification questions. |
| `07_database_discovery.md` | Result of live read-only introspection: schemas, tables, counts, nulls, keys. |
| `08_data_mapping_completed.md` | Confirmed metric→source mapping, text ER diagram, gap register, validation results. |
| `09_phase2_readiness.md` | Missing-columns report, phase-2 readiness, open questions for GPT. |
| `SKILL_POSTAGE_RECONCILIATION_SYSTEM.md` | Standing governance/skill rules for anyone working on the project. |

## 3. Cross-references

- **Business rules** in `01` are applied by the KPI logic documented in `02` and reproduced in
  `dashboard/data.js` / the HTML.
- **The mapping plan** in `05` is superseded by the confirmed mapping in `08` after discovery in `07`.
- **Validation** in `06` (plan) is executed and reported in `08 §D`; residual gaps in `09`.
- **The dashboard design** in `04` is implemented by `dashboard/postage_reconciliation_dashboard.html`
  and described in `dashboard/README.md`.
- **Governance** in the SKILL file constrains `05`–`09` and all code.

## 4. Document dependency graph

```
SKILL (governance) ─────────────► constrains everything
00 overview
     └─► 01 requirements ─► 02 excel analysis ─► 03 sheet mapping ─► 04 dashboard plan
                                     └────────────────► 05 pg mapping PLAN
                                                              │ (superseded by)
06 validation plan ◄──────────────────────────────────────── │
                                                              ▼
07 db discovery ─► 08 mapping COMPLETED (+validation) ─► 09 readiness
                                     │
                                     ▼
                       dashboard/data.js ─► dashboard/*.html
```

## 5. Which document answers which question

| Question | Document |
|----------|----------|
| What are the business rules / KPIs? | `01` (+ `02` for formulas) |
| What does each worksheet do? | `02` |
| Where does each dashboard number come from? | `08 §B` |
| What data is missing and why? | `09 §A` (+ `08 §C`) |
| Is it safe / read-only? What are the guardrails? | `SKILL` + `07 §7` |
| How was it validated? | `08 §D` |
| How do I deploy / maintain it? | `../handover/README.md` |
