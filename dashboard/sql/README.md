# dashboard/sql/

The **read-only SQL query pack** that produced the dashboard's embedded data (`../data.js`).

| File | Purpose |
|------|---------|
| `dashboard_queries.sql` | One commented `SELECT` per dashboard component. Run via the Claude PostgreSQL MCP (read-only). |

Full mapping of each query to its dashboard component and to the workbook:
[../../documentation/08_data_mapping_completed.md](../../documentation/08_data_mapping_completed.md).
Database structure it reads: [../../documentation/07_database_discovery.md](../../documentation/07_database_discovery.md).

---

## 1. Purpose
Retrieve exactly the data the dashboard needs — nothing more — for reporting week **W27 2026**
(2026-06-29 → 2026-07-05, as-of 2026-07-08), so it can be embedded in `data.js`. Counts are
authoritative; financial columns are used as documented DB proxies.

## 2. SQL file description — queries in `dashboard_queries.sql`

| ID | Query | Feeds |
|----|-------|-------|
| Q0 | Carrier-family classifier (documented heuristic over free-text `carrier_name`) | reused by Q3/Q4 |
| Q1 | Overview KPIs (orders, FBA, Wayfair, self-labelled, £) | `overview` cards |
| Q2 | Daily Control per day | `dailyControl` |
| Q3 | Carrier summary / weekly invoice per carrier-family | `carrierSummary`, `weeklyInvoice` |
| Q4 | Booking Log best-effort buckets (date × carrier × country) | `bookingLog` |
| Q5 | 6-week order trend | `weeklyTrend` |
| Q6 | Service-label proxies (`source_name`) | `serviceProxies` |
| Q7 | Data coverage / quality (nulls, currency mix) | `metadata.data_quality` |
| Q8 | Daily reconciliation accuracy proxy | KPI 22 |

## 3. Execution order
Q0 is a standalone review query; Q1–Q8 are independent and may run in any order. Q3 and Q4 embed
the Q0 classifier inline (self-contained), so no query depends on another's output. Recommended:
run Q1→Q8 in numeric order for readability.

## 4. Required PostgreSQL tables (schema `public`)
| Table | Used for |
|-------|----------|
| `order_transaction` | order counts, FBA/Wayfair/self-labelled, dates, service proxies |
| `order_shipping_billing_detail` | carrier, `carrier_charge`, `shipping_template_price`, country |
| `ebay_order_expenses` | (return-label probe — effectively empty, 45 rows) |

Join key throughout: `order_id` (indexed). No FK constraints exist on these tables.

## 5. Read-only policy
**SELECT statements only.** The pack contains **no** INSERT / UPDATE / DELETE / CREATE / ALTER /
DROP / TRUNCATE / GRANT. It never modifies data or schema. Always run against a read-only role.
Always filter `order_date >= 2025-01-01` to exclude a few garbage-dated rows.

## 6. Expected outputs
Small aggregate result sets (per-day, per-carrier, per-bucket) that map 1:1 to the arrays in
`../data.js`. Internal consistency is verifiable: Σ carrier labels = Σ daily shipment labels =
`overview.labels_shipments` = **3,631** for W27 2026.

## 7. Re-running for a new week
Change the `w_start` / `w_end` dates in the CTEs (currently 2026-06-29 / 2026-07-05) to the target
ISO week (Monday→Sunday), re-run, and regenerate `data.js`. The future refresh script
([../../scripts/README.md](../../scripts/README.md)) will automate this.
