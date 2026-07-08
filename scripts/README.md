# scripts/

Automation scripts — chiefly the **data refresh** that regenerates the dashboard's embedded data
from PostgreSQL. **Reserved / planned** — no scripts exist yet (Phase 3 embedded a validated
snapshot manually via the Claude MCP).

Related: [../dashboard/sql/README.md](../dashboard/sql/README.md) (the queries a refresh runs) and
[../documentation/04_dashboard_plan.md](../documentation/04_dashboard_plan.md) §Refresh strategy.

---

## Purpose
Keep the dashboard current without manual work: run the read-only query pack, transform the results
into the `dashboardData` shape, and rewrite the embedded data — so the Accounts Team always sees a
fresh snapshot.

## Refresh scripts (planned)
A single script (Python recommended) that:
1. Connects **read-only** to PostgreSQL.
2. Executes `dashboard/sql/dashboard_queries.sql` for the target ISO week.
3. Builds the `dashboardData` object (counts authoritative; £ indicative; gaps preserved).
4. Regenerates `dashboard/data.js` **and** the embedded `<script>` data block in the HTML.
5. Stamps `metadata.as_of` / reporting week and writes a run log to `evidence/`.

Suggested name: `refresh_dashboard_data.py`.

## Automation scripts
Any supporting helpers (e.g. week-selection, currency-mix reporting, consistency assertions that
mirror the Phase-2 validation) live here, one concern per file.

## Scheduling
Run on a schedule appropriate to the Accounts Team's needs (e.g. daily early morning, or hourly).
Options: cron, a Mini-AIOS routine, or CI. The dashboard always displays "Data as of …" so freshness
is visible regardless of cadence.

## Dependencies
- A read-only PostgreSQL connection (credentials supplied via environment variables — **never**
  hard-coded or committed).
- Python 3.x with a Postgres driver (e.g. `psycopg`), or reuse of the Claude MCP.
- Document exact dependencies in a `requirements.txt` here when the script is added.

## Execution order
`refresh_dashboard_data.py` → (regenerates) `dashboard/data.js` + HTML data block → optional
consistency check → write log to `evidence/`. Idempotent: same week + same `as_of` ⇒ same output.

## Logging
Each run writes a timestamped log (rows fetched per query, consistency check result, output written)
to `evidence/<date>_refresh/`. Logs must contain **no secrets**.

## Rules
- Read-only database access only; no schema/data writes.
- Never fabricate values for missing sources — carry the same "no source" / N/A treatment as today.
- Keep the dashboard self-contained after refresh (data embedded, no new external dependency).
