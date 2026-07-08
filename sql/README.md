# sql/

**Future database objects** for the project — schema additions, views, helper queries and
migrations that a *production* deployment will need. **Reserved / planned** — empty today.

> **Not the dashboard query pack.** The read-only SELECTs that build the dashboard's data live in
> [../dashboard/sql/](../dashboard/sql/README.md). This top-level `sql/` folder is for **database
> objects** (things that would be created in the DB), which is a different concern. See
> [../PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) §"Two SQL locations".

---

## Purpose
Hold the SQL that closes the gaps identified during discovery so the dashboard can eventually move
from an *interim* view to a *production* reconciliation — without ever being run against production
without sign-off.

## Schema scripts (planned)
Column/table additions the workbook expects but the database lacks (see
[../documentation/09_phase2_readiness.md](../documentation/09_phase2_readiness.md) §A):
`shipment.label_type`, `order_shipping_billing_detail.service_tier`, `weight_band_kg`,
`destination_zone`, invoice fields, and a rate-card table. **DDL — requires Sajeesan sign-off;
never applied by the dashboard.**

## Views (planned)
Reusable views that encapsulate the dashboard aggregations (daily control, weekly invoice, carrier
rollup) once the underlying columns exist — so the dashboard reads a stable view instead of ad-hoc SQL.

## Helper queries
Diagnostic / audit queries (e.g. carrier-name normalisation coverage, null-rate monitoring, currency
mix) used during data-quality work. Read-only.

## Migration scripts
Ordered, reversible migrations to introduce the schema changes and backfill (e.g. default existing
rows to `label_type = 'Customer Order'`). Each migration documents its rollback.

## Execution sequence (when this folder is populated)
```
1. schema/   add missing columns & rate-card table   (Sajeesan sign-off)
2. migrate/  backfill defaults, normalisation maps
3. views/    create dashboard views on the new columns
4. verify    read-only checks; then repoint the query pack / refresh script
```

## Rules
- Nothing here runs automatically. Schema/data changes are **out of scope** for the dashboard build
  and require the named owners' approval (Sajeesan schema, Pratheepan ETL, Vithursali BLOS).
- Every DDL script must have a documented rollback and be idempotent where possible.
- No secrets; parameterise connections via environment variables.
