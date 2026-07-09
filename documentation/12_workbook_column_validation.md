# 12 · Workbook Column-by-Column Validation (Final)

**Date:** 2026-07-09 · **Data:** PostgreSQL read-only via Claude MCP · **Week:** W27 2026 (2026-06-29 → 2026-07-05)

> ## ⚠ Scope correction — there is no "Version 4" workbook
> The task states the workbook was updated to v4. **No such file exists.** The only workbook on disk is
> `Accounts postage_reconciliation_v3_merged.xlsx`, unchanged since **2026-07-08 12:23** (the repo copy is
> byte-identical to the Downloads copy). Its internal version is **v3.4**. This validation is therefore
> performed against **v3.4** — the definitive specification that actually exists. If a v4 exists elsewhere,
> supply it and this document must be re-run.

---

## PART 1 · Corrections to my own earlier findings

This phase **overturned three claims I previously made**. They were wrong; the evidence is below.

| Earlier claim | Truth | Evidence |
|---|---|---|
| "`blos` schema is empty" | **False.** It contains `blos.postage` and `blos.postage_history`. | `list_objects` returned `[]`, but `information_schema.columns` shows both tables. |
| "No rate-card table exists" | **False.** `blos.postage` has exactly the rate-card shape: `postage_type`, `destination_zone`, `weight_from`, `weight_to`, `weight_unit`, `postage_value`. It holds **0 rows**. | Q11: `SELECT count(*) FROM blos.postage` → 0 |
| "Return Label In is not available" | **False.** `public.amazon_returns` (with `label_type`, `label_cost`, `rd_carrier`, `fulfilment`) and `public.ebay_returns` both exist. | Q10 |

**Consequence:** Rate Card is a **backfill/ETL gap, not a schema gap**, and **KPI 31 is now computable**.

Also corrected: an unverified `returns` dataset had crept into `data.js`/HTML as a **duplicate JS key**
(claiming "eBay 79 labels"), silently overriding the correct one. Both stale keys were removed.

---

## PART 2 · Return Label In — verified (KPI 31)

| Source | Table | Labels | Cost | Basis |
|---|---|---:|---:|---|
| Amazon FBM · `AmazonPrePaidLabel` | `public.amazon_returns` | **110** | 382.68 (GBP/EUR/USD) | `label_type` + `label_cost` + `rd_carrier` present |
| eBay · return with carrier (label evidence) | `public.ebay_returns` | **39** | — | 39 of 79 distinct `return_id` have a carrier; label cost not stored |
| eBay · billed `SHIPPING_LABEL` fee | `public.ebay_order_expenses` | 1 | 3.06 GBP | billing evidence only — **fee ingestion incomplete** (39 labels vs 1 fee) |
| Shopify refunds — **EXCLUDED** | `public.shopify_returns` | 0 | — | `refund_amount` only, **no label field** → not a Return Label In |
| Return Label Out — **UNAVAILABLE** | `public.shipment` (absent) | — | — | requires `label_type` |

**Excluded per README:** 29 FBA returns (§1 out of scope) · 30 `AmazonUnPaidLabel` (customer-paid, not marketplace-billed).

**Return rate = 149 / 3,631 customer-order labels = 4.10% → FAIL** (BLOS target 2.0%).
Sensitivity: billed-only basis (111) = 3.06%; orders denominator (4,020) = 3.71%. **FAILS on every basis.**
Still a **lower bound** — Return Label Out is not identifiable.
Corroboration: the single eBay label fee is **£3.06**, exactly the figure quoted in README §21.

---

## PART 3 · Booking Log — column-by-column (Step 3)

| # | Column | PostgreSQL source | Available? | Category | Dashboard |
|---|---|---|:--:|:--:|---|
| A | Booking ID | none (workbook auto-generates `BKG-NNNNN`) | ✗ | **D** manual/generated | “—” |
| B | Date | `order_transaction.order_date::date` | ✓ | — | populated |
| C | Order ID | `order_transaction.order_id` | ✓ (row grain) | **D** | “—” at bucket grain (buckets aggregate many orders) |
| D | Carrier | `order_shipping_billing_detail.carrier_name` (free text) | ⚠ derived | **E** | populated via documented `carrier_family` heuristic |
| E | Service | `service_tier` — **column absent** | ✗ | **A** | “—” |
| F | Destination | `shipping_country` (README §15 permits derivation) | ⚠ raw country | **A/E** | raw country shown; not mapped to the 23-value zone enum |
| G | Weight Band | `weight_band_kg` — **column absent** | ✗ | **A** | “—” |
| H | Qty Labels | `COUNT(*)` over shipments | ✓ | — | populated |
| I | Lookup Key | concat of D·E·G·F | ✗ (needs E,G) | **A** | not computable |
| J | Rate Ex VAT | rate card → `blos.postage` **0 rows** | ✗ | **A** (data) | “—” |
| K | Forecast Ex VAT | `H × J` | ✗ | **A** | “—” |
| L | VAT % | rate card / README §4 rules | ✗ | **A** | “—” |
| M | VAT £ | `K × L` | ✗ | **A** | “—” |
| N | Forecast Inc VAT | `K + M` | ✗ | **A** | “—” |
| — | *(Actual £ — not a workbook column)* | `carrier_charge` | ✓ | — | populated |
| O | Status | derivable (Others→KILL, Wayfair→3rd-party, else Booked) | ⚠ | **E** | “—” |
| P | Label Type | `shipment.label_type` — **table absent** | ✗ | **A** | “—” |
| Q | Week Label | `to_char(date,'IW')` | ✓ | — | populated (**W27 2026**, matches PG) |

## PART 4 · Rate Card (Step 4)

Every Lookup Key requires Carrier × Service × Weight Band × Destination. **Service and Weight Band do not
exist**, so **no Lookup Key can be generated**. The target table `blos.postage` exists but is **empty**.

| Column | Source | Status |
|---|---|---|
| Lookup Key / Carrier / Service / Weight Band / Destination / Rate / VAT / Effective From / Notes | `blos.postage` (+ `blos.postage_history` for Effective From) | **table exists, 0 rows** → currently unavailable |

**Missing lookups: all of them.** Fix = ETL backfill of `blos.postage`, not a migration.

## PART 5 · Weekly Invoice Check (Step 5)

| Column | Comes from | Status |
|---|---|---|
| A/B Week Start·End · P Week Label | derived (ISO) | ✓ populated |
| C Carrier | `carrier_name` (heuristic) | ✓ |
| D Labels | Booking Log rollup | ✓ |
| E Forecast Ex VAT · F Forecast Inc VAT | **Rate Card** | ✗ (empty) → Expected £ uses 8-week baseline (README §15 fallback) |
| G Invoice £ | manual / `invoice_received_amount` (absent) | ✗ → `carrier_charge` substituted |
| H Variance £ · I Variance % · J Status | generated formula | ✓ (formula exact; inputs substituted) |
| K Owner | Lists lookup | ✓ `TBD — [Carrier]` |
| L–O Customer/Service Labels & £ | needs `label_type` | ✗ **A** |

## PART 6 · Leakage Register (Step 6)

| Column | Type | Status |
|---|---|---|
| A Gap ID · B Date Raised · C Week Start · P Week Label | generated | ✓ |
| D Carrier · F Trigger Source | automatic | ✓ |
| E Issue Type | manual, **must come from Lists** | ✓ (`Unmapped carrier`) / NULL = uncategorised (README-permitted) |
| G Forecast £ · H Invoice £ · I £ Leakage · J Days Open | automatic | ✓ (on substituted inputs) |
| K Owner | lookup | ✓ |
| L Root Cause · M Status | manual | partial |
| N Credit Recovered £ | manual — **no source** | ✗ **D** → Recovery rate N/A |
| O Label Type | needs `label_type` | ✗ **A** |

## PART 7 · Daily Postage Control (Step 7)

- **Customer side:** `Total Orders (4,020) = FBA (389) + Wayfair (147) + Self-Labelled (3,484)` ✓ holds all 7 days.
- **Booking Gap:** `(Self-Labelled + Wayfair) − Labels = 0` ✓ all 7 days.
- **Service side (M–P):** requires `label_type` → **not computable** (Category A).
- **Closure (I):** v3.1 requires customer gap = 0 **AND** service gap = 0. Only the customer side can be
  verified → closure is **PARTIAL**, and the dashboard says so rather than silently passing.
- **Forecast £ (H):** rate card empty → “—”. **Actual Cost £** shown from `carrier_charge`.

## PART 8 · Blank-field classification (Step 10)

| Column(s) | Reason blank | Source table | Source column | Populatable? | Required implementation |
|---|---|---|---|:--:|---|
| Rate Ex VAT, Forecast Ex/Inc VAT, VAT %, VAT £, Lookup Key | rate card **empty** | `blos.postage` | `postage_value`, `destination_zone`, `weight_from/to` | **YES (after backfill)** | ETL backfill of `blos.postage` (+`postage_history` for Effective From) |
| Service (E) | column absent | `order_shipping_billing_detail` | `service_tier` | NO | add column; backfill from carrier API |
| Weight Band (G) | column absent | `order_shipping_billing_detail` | `weight_band_kg` | NO | add column; derive from weigh-station |
| Destination zone (F) | zone enum absent | `order_shipping_billing_detail` | `destination_zone` (or map `shipping_country`) | **PARTIAL** | country→zone map (README says BLOS) |
| Label Type (P), Service side (M–P), Service spend %, Service ratio | table absent | `public.shipment` | `label_type` | NO | create table/column |
| Invoice £ (G) | columns absent | `order_shipping_billing_detail` | `invoice_received_amount/date/batch_id` | NO | invoice ingestion (+ fix RM feed) |
| Credit Recovered £ (N), Days Open lifecycle, Recovery rate | no dispute table | — | — | NO | build dispute/recovery table |
| Rate card age (KPI 28) | `blos.postage_history` empty | `blos.postage_history` | — | **YES (after backfill)** | backfill |
| Booking ID (A), Order ID (C) | bucket grain / auto-gen | `order_transaction.order_id` | — | **YES at row grain** | expose per-shipment rows (Category D) |
| Return Label Out | table absent | `public.shipment` | `label_type` | NO | create column |
| **Return rate (KPI 31)** | *was* blank | `amazon_returns`, `ebay_returns` | `label_type`, `carrier` | **YES — NOW POPULATED (4.10%)** | ✅ implemented this phase |

Category key: **A** no source · **B** missing join · **C** render failure · **D** manual/generated · **E** business logic · **F** bug.
Categories **C** and **F** found: the duplicate `returns` key (F) — **fixed**.

## PART 9 · Worksheet matrix

| Worksheet | Verdict |
|---|---|
| README | ✅ PASS (spec; §21 mapping is itself defective — see below) |
| Dashboard | ✅ PASS (targets from BLOS; KPI 31 now live) |
| Daily Postage Control | ⚠️ PASS WITH GAP (service side needs `label_type`) |
| Booking Log | ⚠️ PASS WITH GAP (Service/Weight/Label Type/rate columns) |
| Postage Rate Card | ⚠️ PASS WITH GAP (table exists, **0 rows**) |
| Weekly Invoice Check | ⚠️ PASS WITH GAP (Forecast/Invoice substituted; L–O need `label_type`) |
| Leakage Register | ⚠️ PASS WITH GAP (Credit Recovered, Label Type) |
| Gap Analysis | ✅ PASS |
| Lists | ✅ PASS (10/7/16/7/23/9/10 verbatim) |
| SOP | ✅ PASS |
| BLOS Thresholds | ✅ PASS (15 keys; values from workbook, API not live) |

**4 PASS · 5 PASS WITH GAP · 0 FAIL · 2 reference sheets PASS.**

## PART 10 · README defects found (the spec is wrong, not the data)

1. **§21 Return-label mapping is wrong.** It names `ebay_order_expenses.transaction_memo` (**column does not
   exist**) and `amz_refund_expenses` (**table does not exist**). The real sources are `public.amazon_returns`
   and `public.ebay_returns`.
2. **§15 "rate card" framing is misleading.** The target table `blos.postage` already exists; only the data is
   missing. The action is a **backfill**, not a schema change.

## PART 11 · Production readiness

**Blockers (ETL/backfill first — cheapest, highest value):**
1. **Backfill `blos.postage`** → unlocks Rate Card, Lookup Key, Rate/VAT/Forecast £, KPI 28, true Variance/Leakage.
2. Fix **eBay return-label fee ingestion** (39 labels vs 1 fee row).
3. Ingest **carrier invoices** (`invoice_received_*`) + fix Royal Mail feed (README calls this the single biggest blocker).

**Schema changes (require Sajeesan sign-off):**
4. `public.shipment.label_type` → unlocks Service side, Service spend %, Service ratio, Return Label Out, full closure.
5. `service_tier`, `weight_band_kg`, `destination_zone` on `order_shipping_billing_detail`.
6. Dispute/recovery table → Recovery rate, Days Open, Credit Recovered £.
7. `iso_week_number` / `iso_week_year` (README §20 production rule).

**Governance:** correct README §21 and §15 · stand up BLOS API · Sathees to name the 10 carrier owners ·
DHL owner to investigate GAP-W27-01 (+£97.46) · **act on the newly-visible Return rate of 4.10% (target 2%).**
