# 05 · PostgreSQL Data Mapping Plan

**No PostgreSQL was queried during discovery** (per the task rule). This is the *plan* for what
Phase 2 will query, derived from the workbook's own postgres-mapping sections (README Sections 15,
19 v3.1, 21 v3.3) and the field-level annotations (Section 7). The Claude PostgreSQL MCP is
available (`mcp__claude_ai_postgres__*`) and will be used in Phase 2 only, read-only.

> ⚠ **Reality check:** the workbook explicitly states several required columns/tables **do not yet
> exist** and that Royal Mail invoice ingestion is **~10% coverage**. This mapping therefore
> separates **Available today**, **Required (missing)**, and **Derived/computed**. Where a source is
> missing, Phase 2 surfaces the field as null/"awaiting" — it must not fabricate values.

---

## 1. Tables referenced by the workbook

| Table (as named in workbook) | Used for | Status per workbook |
|------------------------------|----------|---------------------|
| `order_transaction` | Daily Control order counts; Booking Log order_id | Available today |
| `order_shipping_billing_detail` | Booking Log carrier/service/weight/destination + invoice fields | Partially available; **new columns required** |
| `public.shipment` | Booking Log `label_type` (service/return classification) | **Required — does not exist** |
| `public.ebay_order_expenses` | Return Label In (marketplace-billed) | Available today |
| `public.amz_refund_expenses` | Return Label In (Amazon side) | Available today (analogous) |
| BLOS API `GET /thresholds?key=postage.*` | thresholds | **Awaiting BLOS UI/API**; use workbook values meanwhile |

**Phase-2 first action:** use the MCP `list_schemas` / `list_objects` / `get_object_details`
(read-only) to confirm these table and column names actually exist and match, before writing the
SQL pack. Discrepancies feed the Open Questions list.

## 2. Field-by-field mapping

### 2.1 Daily Control (per day)
| Workbook field | Postgres source | Status | Transformation |
|----------------|-----------------|--------|----------------|
| B Total Orders | `COUNT(*) FROM order_transaction WHERE order_date::date = ? AND order_status='Completed'` | Available | cast to date |
| C FBA Excluded | `COUNT(*) … AND source_name='AMAZON' AND fba_sales=TRUE` | Available | exact filter |
| D Wayfair | `COUNT(*) … AND source_name='WAYFAIR'` | Available | — |
| E Self-Labelled | `Total − FBA − Wayfair` | Derived | computed |
| F Labels in BL (Customer) | `SUM(qty) FROM bookings WHERE date=? AND label_type='Customer Order'` | Depends on booking source | GROUP BY date |
| H Forecast £ Inc VAT | `SUM(forecast_inc) … WHERE date=?` | Derived from bookings×rate card | — |
| M Service Labels expected | CS helpdesk ticket count (Replacement/Missing Part/Collection) | **Required — helpdesk integration** | daily aggregate |
| N Service Labels in BL | `SUM(qty) … WHERE date=? AND label_type IN (6 service types)` | Depends on `label_type` | GROUP BY |
| I Closure Status | 3-condition boolean (see `01` §4.3) | Derived | reproduce logic |

### 2.2 Booking Log (the fact table — per Carrier×Service×Weight×Destination×LabelType×Date)
| Workbook field | Postgres source | Status | Transformation |
|----------------|-----------------|--------|----------------|
| C Order ID | `order_transaction.order_id` | Available | direct |
| D Carrier | `order_shipping_billing_detail.carrier_name` | Available **but inconsistent** | normalise free-text → Lists enum (mapping table needed; RM variants) |
| E Service | `order_shipping_billing_detail.service_tier` | **Required — missing** | add column; backfill from carrier API |
| F Destination | `order_shipping_billing_detail.destination_zone` OR derive from `shipping_country` | **Required — missing/derive** | country → zone map (BLOS) |
| G Weight Band | `order_shipping_billing_detail.weight_band_kg` | **Required — missing** | derive from `total_weight` / weigh-station |
| H Qty Labels | `GROUP BY 4 dims, COUNT(*)` | Works once cols added | aggregation |
| P Label Type | `public.shipment.label_type` | **Required — missing** | add column; default existing → 'Customer Order' |
| J Rate Ex VAT / L VAT% | join to Rate Card on Lookup Key | Derived | INDEX/MATCH → SQL join |
| K,M,N Forecast Ex/VAT/Inc | arithmetic | Derived | Qty×Rate×(1+VAT%) |

### 2.3 Weekly Invoice Check (carrier × week)
| Workbook field | Postgres source | Status | Transformation |
|----------------|-----------------|--------|----------------|
| D Labels / E,F Forecast | `SUM` over bookings by carrier within week | Derived | GROUP BY carrier, week |
| G Invoice £ Inc VAT | `order_shipping_billing_detail.invoice_received_amount` (+ `invoice_received_date`, `invoice_batch_id`) | **Required — invoice ingestion broken (~10%)** | fix RM ingestion first |
| H Variance £ / I Variance % / J Status | derived from F & G vs BLOS | Derived | reproduce logic |
| K Owner | VLOOKUP Owners (Lists) | Available | `'TBD — '||carrier` fallback |

### 2.4 Leakage Register (per dispute)
| Workbook field | Postgres source | Status | Transformation |
|----------------|-----------------|--------|----------------|
| B Date Raised | row-create timestamp | Works once schema in place | `NOW()` at create |
| G/H Forecast/Invoice £ | VLOOKUP Weekly Check | Derived | — |
| I £ Leakage | `H − G` | Derived | — |
| J Days Open | `as_of_date − Date Raised` (unless closed) | Derived | use snapshot `as_of_date`, **not** live clock |
| M Status / N Credit Recovered £ | dispute-tracking source (manual today) | **Not yet sourced** | null/0 until available |
| K Owner | Lists Owners | Available | VLOOKUP |

### 2.5 Return labels (v3.3)
| Field | Postgres source | Status |
|-------|-----------------|--------|
| Return Label In rows | `public.ebay_order_expenses WHERE transaction_type='SHIPPING_LABEL' AND transaction_memo ILIKE '%return%'` (+ `amz_refund_expenses`) | Available today |
| Return Label Out rows | `public.shipment WHERE label_type='Return Label Out'` | **Required — depends on label_type** |

### 2.6 BLOS thresholds
| Field | Source | Status |
|-------|--------|--------|
| all 15 keys | BLOS API `GET /thresholds?key=postage.*` | **Awaiting API** — use the workbook `BLOS Thresholds` values as the embedded config until live |

## 3. Expected joins

```
bookings (order_shipping_billing_detail + shipment.label_type)
   └─ JOIN order_transaction         ON order_id           (order attributes, source_name, fba_sales)
   └─ JOIN rate_card (embedded/ref)  ON lookup_key          (Rate Ex VAT, VAT%)   → Forecast £
weekly_invoice_check
   └─ aggregate bookings              BY carrier, iso_week   → Forecast; LEFT JOIN invoice source → Invoice £
leakage
   └─ derive from weekly_invoice_check status ∈ {LEAK,KILL} + manual/dispute rows
return_label_in
   └─ ebay_order_expenses ∪ amz_refund_expenses (memo ~ 'return')
```

## 4. Expected aggregations

- **Daily:** `GROUP BY order_date::date` (+ `label_type` for customer/service split).
- **Weekly:** `GROUP BY carrier_name, iso_week_number, iso_week_year` (ISO-8601, stored at insert
  per README Section 20 production rule).
- **Ratios/KPIs:** computed in the data layer from the above (see `02` formula inventory).

## 5. Missing information / unknown mappings (feeds Open Questions)

1. **Missing columns:** `service_tier`, `weight_band_kg`, `destination_zone` (or country→zone map),
   `shipment.label_type`, and invoice fields (`invoice_received_amount/date/batch_id`) — none exist yet.
2. **Carrier name normalisation table** (free-text `carrier_name` → 10 Lists carriers) — not defined.
3. **Country → Destination-zone mapping** — lives "in BLOS", not yet available.
4. **CS helpdesk integration** for Service Labels expected (Daily Control M) — not queryable yet.
5. **Dispute-tracking source** for Status / Credit Recovered £ — no table identified; manual today.
6. **Royal Mail invoice ingestion** at ~10% coverage — single biggest data blocker
   (README: "1,567 RM labels/week ungrouped to invoice").
7. **BLOS API** not live — thresholds sourced from the workbook meanwhile.
8. **Exact schema/qualified names** (`public.` vs other schemas), data types, and `order_status`
   allowed values — to be confirmed via read-only MCP introspection in Phase 2.
9. **"As-of" date** definition for `TODAY()` fields — must be agreed (snapshot date vs a fixed
   business date) so values reconcile with the workbook.

## 6. Phase-2 PostgreSQL discovery steps (read-only, when approved)

1. `list_schemas` → confirm schema(s).
2. `list_objects` on the relevant schema → confirm tables above exist.
3. `get_object_details` on `order_transaction`, `order_shipping_billing_detail`, `shipment`,
   `ebay_order_expenses`, `amz_refund_expenses` → confirm columns, types, nullability.
4. Map each confirmed column to the fields in §2; update this document with real names.
5. Draft the SQL query pack in `sql/` (one query per dataset), review with Sajeesan/Pratheepan.
6. Only then build the data-layer/embed script.

## 7. Data-mapping conclusion

The workbook is a **complete functional spec**, but the PostgreSQL side is **not yet
production-ready**: at least 5 required columns/integrations are missing and RM invoice ingestion
is broken. A faithful dashboard is buildable **for the dimensions that exist today** (order counts,
carrier-level Forecast £ where rate lookups resolve, marketplace returns), with clearly-marked
"awaiting source" gaps for Service labels, Invoice £, and dispute recovery. This gating is expected
and is exactly why the tool is temporary and validated against the workbook.
