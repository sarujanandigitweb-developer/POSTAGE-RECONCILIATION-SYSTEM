# 07 · Database Discovery Report (Phase 2)

**Method:** Read-only introspection via Claude PostgreSQL MCP on 2026-07-08. No DDL/DML issued.
**Reporting week selected:** **W27 2026 = Mon 2026-06-29 → Sun 2026-07-05** (most recent complete
ISO-8601 week; W28 is partial). **As-of date:** 2026-07-08 (max `order_date` in DB).

---

## 1. Schemas
41 schemas total. User schemas include `public`, `blos`, `analytics`, `development`, `staging_ai`,
`supplier`, `governance`, etc. **All source tables for this project live in `public`.**
The **`blos` schema exists but is EMPTY** (no tables) → BLOS thresholds come from the workbook.

## 2. Source tables (confirmed)

### `public.order_transaction` — order/order-item grain
- **Rows:** 1,229,672 · **Completed:** 1,195,576 · **Distinct order_id:** 1,124,266
- **Date range:** `order_date` up to **2026-07-08** (live). (A few garbage rows with year ~0025 exist → filter `order_date >= 2025-01-01`.)
- **Key columns:** `order_id (text)`, `order_date (timestamp)`, `order_status (text)`,
  `source_name (text)`, `fba_sales (boolean)`, `market_place`, `sku`, `quantity`, `item_price`.
- **Indexes:** on `order_date`; `(source_name, order_status)`; `(order_status, source_name, order_date)`;
  `order_id`; `sku`; `asin`. **No PK/FK constraints defined** (constraints: []).
- **`source_name` values:** AMAZON (186,225), EBAY (139,495), SHOPIFY (69,104), **WAYFAIR (13,055)**,
  B&Q, **REPLACEMENT (6,785)**, MANUAL OM, RESEND (127), ONBUY, FAIRE, AVASAM.
- **`fba_sales=TRUE`:** 37,613 rows.

### `public.order_shipping_billing_detail` — shipment/billing grain (≈1 row per order)
- **Rows:** 1,097,625 · **Distinct order_id:** 1,095,083 (≈ 1:1 order↔shipment).
- **NO date column** → must join to `order_transaction` on `order_id` for any date filter.
- **Key columns:** `order_id`, `warehouse_name`, `warehouse_location`, `carrier_name (text)`,
  **`carrier_charge (double)`**, `carrier_charge_currency`, **`shipping_template_price (double)`**,
  `shipping_country`, `tracking_number`, `shipment_status`.
- **Index:** `idx_osbd_orderid (order_id)`. No PK/FK.
- **Null profile (whole table):** carrier_name blank/null 21.25%; carrier_charge NULL 35.44%;
  shipping_template_price NULL 0.00%; shipping_country null 2.43%; warehouse null 35.25%.
- **Null profile (W27 slice):** shipment_rows 3,631; carrier_charge NULL **4.79%**; carrier blank
  0.06% — recent data is far cleaner than the historical average.
- **`warehouse_location`:** UK (UK Unit3/4), Germany (Trossingen ×2, Duisburg), US (US1), Canada, France, NL.
- **`carrier_name`:** FREE TEXT, highly inconsistent, embeds carrier+service+weight
  (e.g. "ROYAL MAIL TRACKED 48 NEX(2kg)", "Smart Track Hermes 2Kg", "Trossingen kronen DHL Kleinpaket").
  60+ distinct values. **No clean carrier enum.**

### `public.ebay_order_expenses` — marketplace fees
- **Columns:** `transaction_date (date)`, `transaction_type`, `fee_type`, `transaction_amount`,
  `fee`, `order_id`, `return_id`, `order_status`. Index `(order_id, transaction_type, fee_type)`.
- **`transaction_type='SHIPPING_LABEL'`:** only **45 rows**, **none** linked to a `return_id`.
- **No `transaction_memo` column** (the workbook assumed `memo ILIKE '%return%'`).
- → Marketplace return-label data is effectively **unusable**; report as a gap.

## 3. Tables that DO NOT exist (workbook-referenced)
- `public.shipment` (workbook's `label_type` source) — **absent**.
- `public.amz_refund_expenses` — **absent** (only eBay side exists).
- Any **rate card**, **invoice ingestion**, **leakage/dispute/recovery** table — **absent** in `public`.
  (Other schemas contain unrelated `development.leakage_*` / `staging_ai.*` engines — different projects,
  not this workbook's source of truth.)

## 4. Missing columns on existing tables (vs workbook README Section 15/19/21)
`order_shipping_billing_detail` is missing: `service_tier`, `weight_band_kg`, `destination_zone`,
`label_type`, and invoice fields (`invoice_received_amount/date/batch_id`). Confirmed absent —
matches the Phase-1 prediction exactly.

## 5. Relationships (observed; no FK constraints exist)
```
order_transaction.order_id  (1) ──< (≈1) order_shipping_billing_detail.order_id
order_transaction.order_id  (1) ──< (0..n) ebay_order_expenses.order_id
```
Join key throughout is **`order_id (text)`**, indexed on all three tables.

## 6. Latest refresh / freshness
Max `order_date` = 2026-07-08 (today). W27 is the last complete week. Order volume is stable
(~3.5–4.4k completed orders/week over W22–W27).

## 7. Health note
No PK/FK constraints on the source tables (data-warehouse style). Rely on indexes on `order_id`
and `order_date` for query performance; the pack uses those. No write access exercised.
