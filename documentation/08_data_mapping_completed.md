# 08 · Completed Data Mapping + Gap Register + Validation (Phase 2)

Supersedes the *plan* in `05_postgresql_mapping.md` with **confirmed** mappings after live
introspection. Covers Step 2 (mapping), Step 3 (gaps), Step 7 (validation).

Reporting week **W27 2026 (2026-06-29 → 2026-07-05)**. As-of **2026-07-08**.

---

## A. Table Relationship Diagram (text)

```
                         ┌───────────────────────────────┐
                         │   public.order_transaction    │  (order/item grain, 1.23M rows)
                         │  order_id · order_date        │  order_status='Completed'
                         │  source_name · fba_sales      │  source_name → Wayfair / Replacement
                         └──────────────┬────────────────┘
                            order_id (indexed, no FK)
              ┌──────────────────────────┼───────────────────────────┐
              ▼                                                        ▼
┌───────────────────────────────────────────┐        ┌───────────────────────────────┐
│ public.order_shipping_billing_detail       │        │ public.ebay_order_expenses    │
│ order_id · carrier_name(free text)         │        │ order_id · transaction_type   │
│ carrier_charge · shipping_template_price   │        │ fee_type · return_id          │
│ shipping_country · warehouse_location      │        │ (SHIPPING_LABEL = 45 rows)    │
│ NO date (join to order_transaction)        │        │ → returns effectively empty   │
│ MISSING: service_tier, weight_band,        │        └───────────────────────────────┘
│          destination_zone, label_type      │
└───────────────────────────────────────────┘
   carrier_family = HEURISTIC classifier over carrier_name (dashboard/sql Q0)
   BLOS thresholds = WORKBOOK (blos schema empty)   ·   Lists = WORKBOOK (no DB table)
```

## B. Completed metric → source mapping

| Dashboard metric | Source table.column | Join | Aggregation | Transformation | Business rule | Validation | Status |
|---|---|---|---|---|---|---|---|
| Total Orders (week) | order_transaction.order_id | — | COUNT(DISTINCT) | status='Completed', date in week | Daily Control B | vs workbook order-math | ✅ Available |
| FBA Excluded | order_transaction.fba_sales | — | COUNT FILTER TRUE | — | Daily Control C | order-math | ✅ Available |
| Wayfair | order_transaction.source_name='WAYFAIR' | — | COUNT FILTER | — | Daily Control D | order-math | ✅ Available |
| Self-Labelled | order_transaction | — | Total−FBA−Wayfair | non-FBA, non-Wayfair | Daily Control E | order-math | ✅ Available (derived) |
| Labels (in BL) | order_shipping_billing_detail.order_id | ON order_id | COUNT | orders in week | Daily Control F | gap vs self+wayfair | ⚠️ Proxy (shipment count) |
| Forecast £ | order_shipping_billing_detail.shipping_template_price | ON order_id | SUM | — | Booking Log N (rate-card) | INDICATIVE | ⚠️ Proxy (not rate-card) |
| Actual/Invoice £ | order_shipping_billing_detail.carrier_charge | ON order_id | SUM | 4.79% null (week) | Weekly Invoice G (manual) | INDICATIVE | ⚠️ Proxy (not manual invoice) |
| Carrier (per-carrier rollup) | order_shipping_billing_detail.carrier_name | ON order_id | GROUP BY family | HEURISTIC classify | Carrier Summary | family counts consistent | ⚠️ Derived (heuristic) |
| Variance £ / % | carrier_charge − template_price | — | per family | — | Weekly Invoice H/I | on INDICATIVE £ | ⚠️ Proxy |
| Status OK/CHECK/LEAK/KILL | computed | — | per family | vs workbook BLOS | Weekly Invoice J | logic reproduced | ⚠️ On proxy £ |
| Daily recon accuracy (KPI22) | derived (gap=0) | — | 7/7 days | customer-side only | Dashboard row 22 | 100% this week | ✅ Available (customer side) |
| Others share (KPI27) | Others family / total labels | — | ratio | heuristic Others | Dashboard row 27 | 0.66% | ⚠️ Derived proxy |
| Owner | — (workbook) | — | — | `TBD — [carrier]` | Carrier Summary K | placeholder | ✅ From workbook |
| Destination | order_shipping_billing_detail.shipping_country | ON order_id | GROUP BY | raw country (not zone) | Booking Log F | — | ⚠️ Country ≠ zone enum |
| Leakage £ / disputes / recovery / dispute age | — | — | — | — | Leakage Register, KPI 23-26 | — | ❌ No source |
| Service labels / spend % / ratio (KPI29-30) | — (no label_type) | — | — | — | Daily Control M-P | — | ❌ No source |
| Return rate (KPI31) | ebay SHIPPING_LABEL (45 rows) | — | — | — | Dashboard row 31 | — | ❌ Unusable |
| Rate card age (KPI28) | — (no rate card) | — | — | — | Dashboard row 28 | — | ❌ No source |
| Service proxies (context) | order_transaction.source_name IN (REPLACEMENT,RESEND,MANUAL OM) | — | COUNT DISTINCT | proxy only | (informational) | — | ⚠️ Proxy |

## C. Gap Register (Step 3)

**Available (authoritative):** order counts (total/FBA/Wayfair/self-labelled), per-day and per-week;
shipment (label) counts per carrier-family; daily order-vs-label gap; 6-week order trend.

**Derived / estimated (flagged in data.js):** carrier_family (heuristic over free-text
`carrier_name`); Forecast £ ← `shipping_template_price`; Actual £ ← `carrier_charge`; Others-share
KPI; destination = raw `shipping_country`.

**Missing — no DB source (NOT fabricated, reported):**
1. `label_type` → Service Labels (Daily Control M-P), Service spend %, Service ratio, Return rate.
2. `service_tier`, `weight_band_kg`, `destination_zone` → true Booking Log 4-dim grain.
3. Rate card table → workbook rate-card Forecast £.
4. Invoice ingestion fields → workbook manual Invoice £.
5. Leakage/dispute/recovery tables → Leakage Register, recovery rate, dispute age, open disputes.
6. `blos` schema empty + BLOS API not live → thresholds (using workbook values).
7. Marketplace return labels (eBay `SHIPPING_LABEL` = 45 rows, none return-linked).

**Requires manual input (per workbook, unchanged):** Invoice £, Credit Recovered £, dispute Status,
Service Labels expected (CS helpdesk), Closed By / Notes, named Owners.

## D. Validation Report (Step 7) — PostgreSQL vs Workbook

The workbook's sample data is **W19 2026 (May)**; the DB's live week is **W27 2026 (Jul)**. So a
value-for-value match is not expected. Validation instead checks **structural/logic fidelity** and
**internal consistency**, classified PASS / WARNING / FAIL.

| # | Check | Result | Verdict |
|---|-------|--------|---------|
| 1 | data.js is valid JS, loads, 12 datasets present | Loads clean | **PASS** |
| 2 | Order-math per day: Total = FBA + Wayfair + Self-Labelled | Holds all 7 days | **PASS** |
| 3 | Σ daily orders (4020) = overview.total_orders (4020) | Equal | **PASS** |
| 4 | Σ carrier labels (3631) = Σ daily shipments (3631) = overview | Equal | **PASS** |
| 5 | Daily order-vs-label gap | 0 all 7 days → recon 100% | **PASS** |
| 6 | KPI direction/threshold logic reproduced from BLOS (not hardcoded) | Matches workbook | **PASS** |
| 7 | Carrier-family classification of free-text carrier_name | Heuristic, documented | **WARNING** (needs official map) |
| 8 | Forecast £ vs workbook rate-card model | Proxy (template price) | **WARNING** (indicative only) |
| 9 | Actual £ / carrier_charge completeness | 4.79% null this week; mixed GBP+EUR | **WARNING** |
| 10 | Leakage / recovery / dispute datasets | No DB source | **FAIL (data gap)** — empty, reported |
| 11 | Service labels / return rate (label_type) | No DB source | **FAIL (data gap)** — N/A, reported |
| 12 | Rate card age / invoice ingestion | No DB source | **FAIL (data gap)** — N/A, reported |

**Interpretation:** All **logic and count** checks PASS. WARNINGs are financial-proxy and
heuristic-mapping caveats. FAILs are **data-availability gaps** (expected per Phase-1 readiness
report), not logic errors — every one is surfaced honestly in `data.js` (`leakage:[]`, KPI
`status:"N/A"`, `metadata.gaps`) rather than fabricated.

## E. Sample-data anomaly note
The workbook's sample contained simulated invoice multipliers (e.g. Evri `=F7*1.22`). None of that
appears here — all figures in `data.js` are real PostgreSQL aggregates for W27 2026.
