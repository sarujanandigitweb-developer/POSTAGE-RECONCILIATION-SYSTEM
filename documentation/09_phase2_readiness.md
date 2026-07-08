# 09 · Missing Columns Report + Phase-2 Implementation Readiness

Phase-2 close-out. Pairs with `07_database_discovery.md` and `08_data_mapping_completed.md`.

---

## PART A — Missing Columns / Sources Report

Confirmed via live read-only introspection (2026-07-08). "Impact" = what the dashboard cannot
faithfully reproduce without it. Nothing below was fabricated in `data.js`.

| # | Missing item | Expected by workbook | Actual in DB | Impact | Owner to resolve |
|---|--------------|----------------------|--------------|--------|------------------|
| 1 | `label_type` | `public.shipment.label_type` (7 types) | table & column absent | Service Labels (Daily Control M-P), Service spend %, Service ratio, Return rate — all N/A | Sajeesan + Pratheepan |
| 2 | `service_tier` | `order_shipping_billing_detail.service_tier` | absent | Service dimension of Booking Log grain | Sajeesan + Pratheepan |
| 3 | `weight_band_kg` | `order_shipping_billing_detail.weight_band_kg` | absent | Weight dimension; volumetric-reweigh detection | Sajeesan + Pratheepan |
| 4 | `destination_zone` | zone enum (or country→zone map) | only raw `shipping_country` | Destination = country string, not workbook zone/VAT | Sajeesan + Pratheepan (map in BLOS) |
| 5 | Rate card | dedicated rate table (Lookup Key→Rate,VAT%) | absent | Workbook Forecast £ (rate-card) not reproducible; used `shipping_template_price` proxy | Sathees + Pratheepan |
| 6 | Invoice ingestion | `invoice_received_amount/date/batch_id` | absent | Workbook Invoice £ not available; used `carrier_charge` proxy | Pratheepan (RM ingestion) |
| 7 | Leakage / dispute / recovery | dispute table + credit | absent in `public` | Leakage Register empty; Recovery rate, dispute age, open disputes N/A | Sajeesan + Pratheepan |
| 8 | BLOS thresholds | `blos` schema / BLOS API | `blos` schema empty | Thresholds sourced from workbook (interim) | Vithursali |
| 9 | Carrier normalisation map | free-text → 10 carriers | none | carrier_family is heuristic | Pratheepan + Sathees |
| 10 | Marketplace returns | eBay memo `%return%` + `amz_refund_expenses` | `amz_refund_expenses` absent; eBay `SHIPPING_LABEL`=45, none return-linked; no memo col | Return Label In unavailable | Pratheepan |

**Data-quality caveats on fields that DO exist:**
- `carrier_charge`: 35% null table-wide (4.79% for W27) — recent weeks reliable, history sparse.
- `carrier_charge_currency`: mixed **GBP + EUR** (+ null); no FX table → £ totals INDICATIVE.
- `carrier_name`: 21% blank table-wide; free-text embedding carrier+service+weight.
- `order_transaction` has garbage rows (year ~0025) → always filter `order_date >= 2025-01-01`.
- No PK/FK constraints on source tables (rely on `order_id` / `order_date` indexes).

## PART B — Implementation Readiness (Phase 3: the HTML dashboard)

### B1. Ready ✅
- **`dashboard/data.js` produced from live PostgreSQL** — 12 datasets, validated, internally
  consistent (order-math holds; Σ labels reconcile; recon 100%).
- **SQL query pack** (`dashboard/sql/dashboard_queries.sql`) — SELECT-only, commented, reproducible.
- **Reporting week fixed** (W27 2026) with `as_of_date` for deterministic `TODAY()`-type fields.
- **Lookups + BLOS** embedded from the workbook so filters/thresholds work offline.
- Counts and the reconciliation KPI are **production-trustworthy today**.

### B2. Build the dashboard with these guardrails
- Render **counts and recon** as primary/authoritative.
- Render **£ figures** clearly badged **"indicative — DB proxy, mixed currency"**; do not present as
  the workbook's rate-card Forecast or manual Invoice.
- Show **carrier_family** with a "heuristic mapping" tooltip.
- Render **N/A** KPIs (leakage, recovery, dispute age, service %, return rate) as an explicit
  "awaiting data source" state — never blank, never zero-implying-real.
- Keep `leakage` panel visibly "no data source yet".

### B3. Not ready ❌ (for a production-grade reconciliation dashboard)
Items 1–10 in Part A. Until `label_type`, rate card, invoice ingestion, and a dispute source exist,
the dashboard is an **interim operational view** (order/label volumes, carrier mix, recon status),
not a full leakage/recovery reconciliation. This matches the Phase-1 readiness verdict.

### B4. Recommended next steps
1. GPT reviews this Phase-2 package + `data.js`.
2. On approval → Phase 3: build the standalone HTML that consumes `data.js` (no logic changes;
   reproduce the workbook's presentation; honour the guardrails above).
3. In parallel, escalate Part-A gaps to the named owners so a production cutover becomes possible.

### B5. STOP
Per the Phase-2 brief, work **stops after `dashboard/data.js`**. No HTML/CSS/UI/charts created.
Awaiting GPT review.

## PART C — Open questions for GPT / business

1. **Reporting week:** fix to latest complete week (W27) as done, or make week-selectable using the
   `weeklyTrend` list? Pin, or roll forward automatically on each refresh?
2. **£ figures:** include the indicative `shipping_template_price` / `carrier_charge` proxies at all,
   or hide all financials until the rate card + invoice ingestion exist? (They are clearly badged now.)
3. **Carrier mapping:** is there an official carrier-name normalisation table to replace the heuristic?
4. **Currency:** confirm handling — restrict £ to GBP-only rows, or keep mixed with a caveat?
5. **Confirm** the connected database is the correct production/replica and read-only is acceptable
   for the automated refresh.
