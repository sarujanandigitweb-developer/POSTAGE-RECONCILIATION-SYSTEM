# POSTAGE RECONCILIATION SYSTEM

> **Phase status: DISCOVERY + PHASE 2 (data) + PHASE 3 (dashboard) COMPLETE.**
> A working standalone dashboard exists at
> [dashboard/postage_reconciliation_dashboard.html](dashboard/postage_reconciliation_dashboard.html),
> populated with the validated PostgreSQL export for reporting week **W27 2026** (as-of 2026-07-08).
> See [CHANGELOG.md](CHANGELOG.md) for phase history and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
> for the full folder map and data flow.

## Purpose

Build a **temporary, read-only HTML dashboard** for the Accounts Team that replaces manual
viewing of the Google Sheet / Excel workbook (`Accounts postage_reconciliation_v3_merged.xlsx`),
while keeping **PostgreSQL as the source of truth**. The dashboard automatically retrieves data
from PostgreSQL (via the existing Claude MCP), refreshes itself, embeds a data snapshot for
offline viewing, and preserves every business calculation exactly as the workbook computes it.

The Google Sheet / workbook remains the **business reference** until the dashboard is fully validated.

## Source of truth vs. business reference

| Role | Artefact |
|------|----------|
| **Primary source of truth (data)** | PostgreSQL |
| **Business reference (logic + expected values)** | `Accounts postage_reconciliation_v3_merged.xlsx` (v3.4) |
| **Governance model** | Mini-AIOS Master Instruction & Skill Guide |

## Business owner & team

Business owner: **Accounts Team**.

| Role | Name |
|------|------|
| Owner (developer) | Sarujanan |
| Coordinator | Sathees |
| Technical Reviewer | Sajeesan |
| Business Validator | Accounts Team |
| BLOS thresholds | Vithursali |
| Postgres ETL | Pratheepan |
| Fault-finding / direction (receives outputs) | Mani |

## Repository layout

```
POSTAGE-RECONCILIATION-SYSTEM/
├── README.md                     ← this file (start here)
├── PROJECT_STRUCTURE.md          ← full folder tree + data flow
├── CHANGELOG.md                  ← version / phase history
├── Accounts postage_reconciliation_v3_merged.xlsx   ← business reference (v3.4)
├── documentation/                ← discovery + design + Phase-2 reports (see INDEX.md)
├── dashboard/                    ← the standalone HTML dashboard (Phase 3)
│   ├── postage_reconciliation_dashboard.html   ← THE deliverable
│   ├── data.js                   ← validated PostgreSQL export (Phase 2)
│   └── sql/dashboard_queries.sql ← read-only SQL query pack (Phase 2)
├── assets/{css,js,images}/       ← static assets (reference; dashboard is self-contained)
├── evidence/                     ← validation evidence / screenshots / exports
├── prompts/                      ← GPT→Claude prompts (Mini-AIOS requirement)
├── scripts/                      ← future refresh / automation scripts
├── sql/                          ← future schema / views / migration scripts
├── validation/                   ← validation reports & acceptance checklists
└── handover/                     ← handover package
```

Each folder carries its own `README.md` explaining purpose, conventions, and status.

## How to read this project

1. Start here, then [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the folder map + data flow.
2. Open [documentation/INDEX.md](documentation/INDEX.md) for the guided reading order of all `00`–`09` docs.
3. Read the governance rules in [documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md](documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md).
4. Open the dashboard: [dashboard/postage_reconciliation_dashboard.html](dashboard/postage_reconciliation_dashboard.html) (double-click; renders offline).
5. For deployment / maintenance, see [handover/README.md](handover/README.md).

## Scope (from project README + workbook)

**Allowed:** read PostgreSQL · create HTML dashboard · create JS · create SQL · create documentation · create validation reports.

**Not allowed:** modify production data · change PostgreSQL schema · change business rules · change BLOS thresholds · replace / re-derive the workbook's calculations.

## Success criteria

- Dashboard automatically updates from PostgreSQL.
- Business values match the workbook (penny-exact where the workbook is correct).
- No manual data entry.
- No duplicate business logic.
