# handover/

Everything an unknown developer needs to understand, run, deploy and maintain the Postage
Reconciliation System from the repository alone — no tacit knowledge, no human contact required.

Governance standard: [../documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md](../documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md) §22.

---

## 1. Project overview
A **temporary, read-only HTML dashboard** for the Accounts Team that reproduces the postage
reconciliation workbook (`Accounts postage_reconciliation_v3_merged.xlsx`, v3.4), loading data from
**PostgreSQL** (read-only) and embedding a validated snapshot so it renders offline. PostgreSQL is
the source of truth; the workbook is the business reference. Full context:
[../README.md](../README.md), [../PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md).

## 2. Current status
| Phase | State |
|-------|-------|
| 1 · Discovery & design | ✅ Complete (`documentation/00`–`06`, SKILL) |
| 2 · PostgreSQL discovery & data export | ✅ Complete (`documentation/07`–`09`, `dashboard/sql/`, `dashboard/data.js`) |
| 3 · Standalone dashboard | ✅ Complete (`dashboard/postage_reconciliation_dashboard.html`) |
| Documentation completion | ✅ Complete (this pass) |
| Validation & UAT | ⏳ Pending (`validation/`, `evidence/`) |
| Automatic refresh | ⏳ Planned (`scripts/`) |
| Production cutover | ⏳ Blocked on data gaps (`documentation/09`) |

Reporting week in the current snapshot: **W27 2026** (29 Jun–05 Jul 2026), as-of 2026-07-08.

## 3. Completed work
- All 11 workbook sheets analysed; business rules, KPIs and 15 BLOS thresholds documented.
- Live database discovery; confirmed source tables and gaps.
- Read-only SQL query pack; validated data export (`data.js`) with internal consistency proven.
- Standalone single-file dashboard: tabs, filters, sortable/searchable tables, KPI cards, status
  pills, light/dark theme, responsive — no external dependencies, business logic preserved.

## 4. Pending work
- Execute the `validation/` checklist and capture `evidence/`; Accounts Team UAT sign-off.
- Build the refresh script (`scripts/`) to regenerate the snapshot on a schedule.
- Close data gaps for production (see §7 and `documentation/09` §A).

## 5. Deployment guide
The deliverable is a single self-contained file — deployment is trivial:

**Option A — local file (simplest):**
1. Open `dashboard/postage_reconciliation_dashboard.html` by double-click. It renders offline; no
   server, no network, no install.

**Option B — hosted (shared link):**
1. Serve the `dashboard/` folder from any static web host / internal server (e.g.
   `python3 -m http.server` for a quick test, or an internal Nginx/S3/static host).
2. Share the URL to `postage_reconciliation_dashboard.html`.

No build step, no dependencies, no environment variables are required to **view** it. (Only the
future *refresh* needs a read-only DB connection — see `scripts/README.md`.)

## 6. Maintenance guide
- **Refresh the data:** re-run `dashboard/sql/dashboard_queries.sql` for the target ISO week (edit
  the `w_start`/`w_end` dates), then regenerate `dashboard/data.js` and the embedded `<script>` data
  block. Automate via the planned `scripts/refresh_dashboard_data.py`.
- **Never hand-edit embedded values** — always regenerate from PostgreSQL.
- **Keep it self-contained** — do not add external CSS/JS/CDN dependencies to the HTML.
- **Do not change business logic** — the dashboard must mirror the workbook; changes to rules go
  through the workbook owners (Sathees process, Sajeesan schema, Vithursali BLOS).
- **Read-only always** — no script or query may write to the database.

## 7. Known issues / limitations
| Limitation | Detail | Reference |
|------------|--------|-----------|
| £ figures are **indicative** | DB proxies (`shipping_template_price`, `carrier_charge`), mixed GBP+EUR, no FX table | `documentation/09` §A |
| Carrier grouping is **heuristic** | free-text `carrier_name` classified by pattern; no official map | `documentation/07`, `08` |
| Leakage / disputes **absent** | no dispute/recovery table → register empty, recovery/age KPIs N/A | `documentation/09` §A |
| Service / return / rate-card KPIs **N/A** | no `label_type`, no rate-card/invoice ingestion | `documentation/09` §A |
| Single snapshot week | one embedded week (W27) until refresh automation lands | `dashboard/README.md` §13 |

None are logic errors — all are data-availability gaps, surfaced honestly in the UI (N/A / "no source").

## 8. Future roadmap
| Version | Goal |
|---------|------|
| 0.4.0 | Validation & Accounts Team UAT sign-off |
| 0.5.0 | Automatic scheduled refresh of the embedded snapshot |
| 1.0.0 | Production readiness: add `label_type`/`service_tier`/`weight_band`/`destination_zone`, rate card, invoice ingestion, dispute source, BLOS API; promote £ from indicative to authoritative |

See [../CHANGELOG.md](../CHANGELOG.md) for the full history.

## 9. Developer checklist (new developer, start here)
- [ ] Read [../README.md](../README.md) and [../PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md).
- [ ] Read [../documentation/INDEX.md](../documentation/INDEX.md) and the `00`–`09` docs in order.
- [ ] Read the governance rules in the SKILL file (read-only DB, no invented logic, BLOS-driven).
- [ ] Open the dashboard locally; click every tab, filter, sort, and toggle the theme.
- [ ] Review `dashboard/sql/dashboard_queries.sql` and confirm it is SELECT-only.
- [ ] Understand the indicative-£ / heuristic-carrier / data-gap caveats before quoting any number.
- [ ] To refresh data: change the week dates in the query pack, re-run read-only, regenerate `data.js`.
- [ ] Never modify the workbook, production data, or database schema.

## 10. Handover package (to assemble at sign-off)
When formally handing over, this folder should also contain: `HANDOVER_SUMMARY.md` (task id, files
changed, validation performed, known issues, rollback method, evidence location, approval status =
"Pending Team Lead Review") and `ROLLBACK_NOTE.md` (commit hash + procedure), per the Mini-AIOS
task-folder standard.

## Contacts / ownership
| Function | Owner |
|----------|-------|
| Developer | Sarujanan |
| Coordinator | Sathees |
| Technical reviewer / schema | Sajeesan |
| Postgres ETL | Pratheepan |
| BLOS thresholds | Vithursali |
| Business validation | Accounts Team |
