# evidence/

Proof that the work was done and is correct. Per the Mini-AIOS rule: **"no evidence = no completed
work."** This folder stores validation and acceptance evidence for each phase.

Validation procedure that generates this evidence:
[../documentation/06_validation_plan.md](../documentation/06_validation_plan.md) and
[../validation/README.md](../validation/README.md).

---

## Purpose
Capture durable, reviewable artefacts (screenshots, exports, logs, test output) that demonstrate the
dashboard reproduces the workbook and loads correctly from PostgreSQL.

## What goes here

| Evidence type | Examples | Status |
|---------------|----------|--------|
| **Validation evidence** | value-parity export (dashboard vs workbook), consistency-check output | To capture at UAT |
| **Screenshots** | each dashboard tab in light + dark theme; mobile/tablet/desktop widths | To capture |
| **SQL results** | saved outputs of `dashboard/sql/dashboard_queries.sql` per run | To capture per refresh |
| **Testing evidence** | data-consistency checks (labels reconcile to 3,631; order-math holds) | Partially captured (Phase 2) |
| **Acceptance evidence** | Accounts Team sign-off, reviewer notes | Pending UAT |

## Suggested structure
```
evidence/
└── <phase-or-date>/           e.g. 2026-07-08_phase3_uat/
    ├── screenshots/
    ├── sql-results/
    ├── value-parity.md|csv
    └── VALIDATION_RESULT.md   Performed / Result (PASS|FAIL|PENDING) / Evidence
```

## Naming conventions
- Date-prefixed folders: `YYYY-MM-DD_<topic>/`.
- Descriptive, lower-case, hyphenated filenames: `dashboard-overview-dark.png`,
  `weekly-invoice-w27-results.csv`.

## Rules
- **No secrets** — never store passwords, tokens, API keys, connection strings, or `.env` values.
  Redact with `[REDACTED_SECRET_PATTERN]`.
- Evidence is append-only; do not delete prior evidence, add a newer dated set.
- Keep raw exports alongside a short `VALIDATION_RESULT.md` interpreting them.

## Future evidence storage
As the project moves to UAT and production, add dated sets per validation run and per refresh. Large
binaries should be optimised; if volume grows, consider external storage and keep a manifest here.
