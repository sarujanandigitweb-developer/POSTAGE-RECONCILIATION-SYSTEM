# 16 · PostgreSQL Data Requirements — Postage Reconciliation System

**Prepared:** 2026-07-09 · **Verified against:** live database, read-only, this date
**Audience:** PostgreSQL / Data Engineering team
**Reference week used for all evidence:** W27 2026 (2026-06-29 → 2026-07-05)

> Every count, NULL rate and absence in this document was re-derived from the live database on
> 2026-07-09. Nothing is carried over from earlier reports. Where an earlier report was wrong,
> it is corrected in **§0**.

---

## §0 · Corrections to earlier reports (read this first)

Three statements in `documentation/13`–`15` are **no longer true**. Anyone working from those docs must
re-read this section.

| Earlier claim | Actual state on 2026-07-09 | Impact |
|---|---|---|
| "`blos.postage` exists but has **0 rows** — ETL backfill gap" | **753 rows.** It has been populated since the last audit. | The rate card is now *in* PostgreSQL. The remaining problem is **column coverage**, not emptiness. |
| "Requires `public.shipment.label_type` (schema)" | **`public.shipment` does not exist at all** (`to_regclass` → NULL). | `label_type` must be added to **`public.order_shipping_billing_detail`**. Any ticket naming a `shipment` table is unactionable. |
| "Rate card 311 days stale (workbook Sheet 4, eff. 2025-09-01)" | `blos.postage.effective_date` is **2026-01-01 for all 753 rows** → **189 days** stale. | KPI 28 still **FAILs** (limit 30 days), but the correct figure is 189, and it now comes from PostgreSQL. |

A fourth issue, newly discovered and not in any prior doc, is in **§5.6 (carrier coverage)**: the rate card
contains **no DHL rows**, and DHL is the second-largest postage spend.

---

## §1 · Grain warning — read before writing any query

`public.order_transaction` is **one row per order line item**, keyed on `order_item_info`. It is **not**
one row per order.

Joining it directly to `order_shipping_billing_detail` **duplicates postage on multi-line orders**:

| Query shape | W27 labels | W27 postage |
|---|---:|---:|
| Naïve `order_transaction JOIN shipping_detail` | 4,002 | **£13,741.60** ← overstated by £1,215.88 |
| `SELECT DISTINCT order_id` first, then join | **3,634** | **£12,525.72** ← correct |

**Every postage aggregate must deduplicate to order grain first.** This is the single most likely source
of silent error in any downstream report.

---

## §2 · Mandatory tables

### 2.1 Exists and is used today

| Table | Grain | Role | State |
|---|---|---|---|
| `public.order_transaction` | order **line item** | Order set, FBA flag, dates, marketplace | ✅ usable (see §1) |
| `public.order_shipping_billing_detail` | **order** (1:1) | Carrier, charge, tracking, destination | ⚠️ usable, missing 4 columns (§3.2) |
| `blos.postage` | rate-card row | Rate card | ⚠️ 753 rows, but key columns unusable (§5) |
| `public.amazon_returns` | return | Return Label In (Amazon) | ✅ usable |
| `public.ebay_returns` | return | Return Label In (eBay) | ⚠️ label cost not ingested |

### 2.2 Exists but is **out of scope** — do not use

| Table | Why not |
|---|---|
| `supplier.invoices` | Inbound container / FOB freight. 22 rows, **0 in W27**. Not carrier postage. Excluded per README §1. |
| `public.amz_order_expenses` | Amazon marketplace fees. Contains **no postage invoice**. Has no row at all for many shipped orders. |
| `public.shopify_returns` | No label field. |

### 2.3 Does **not** exist and must be created

| Required table | Purpose | Blocks |
|---|---|---|
| **`carrier_invoice`** (or equivalent) | The carrier's actual bill | Weekly Invoice Check — the entire tab (§6.1) |
| **`carrier_name_map`** | 261 raw carrier strings → canonical carrier | Every per-carrier aggregate (§4.1) |
| **`dispute`** / **`credit_recovered`** | Leakage Register lifecycle | Leakage Register cols B/J/N, KPI 25, KPI 26 |

> **`public.shipment` does not exist.** Do not create it. Add the missing shipment attributes to the
> existing `public.order_shipping_billing_detail`, which already holds shipment data at order grain.

---

## §3 · Required columns and fields

### 3.1 Present and confirmed populated

| Table.Column | Type | Notes |
|---|---|---|
| `order_transaction.order_id` | text | join key |
| `order_transaction.order_date` | timestamp | **timestamp, not date** — use half-open ranges `>= start AND < end+1`. `BETWEEN` silently drops the last day (loses ~£601 of DHL in W27). |
| `order_transaction.order_status` | text | filter `= 'Completed'` |
| `order_transaction.fba_sales` | boolean | filter `= false` (FBA excluded, README §1) |
| `order_transaction.quantity`, `item_price` | bigint / numeric | Forecast £ input |
| `order_shipping_billing_detail.carrier_name` | text | **261 distinct values** — needs §4.1 |
| `order_shipping_billing_detail.carrier_charge` | double precision | actual cost; **173 NULLs in W27** (§3.3) |
| `order_shipping_billing_detail.shipping_country` | text | destination |
| `order_shipping_billing_detail.tracking_number` | text | sometimes `''` not NULL |

### 3.2 Missing columns that must be **added to `public.order_shipping_billing_detail`**

| Column | Type | Unblocks |
|---|---|---|
| **`label_type`** | text (enum, 7 values from Lists) | Closure Status · **KPI 22** · KPIs 29/30 · Daily Control M–P · Weekly Invoice Check L–O · Booking Log P · Return Label **Out** |
| **`service_tier`** | text | Booking Log E → **Lookup Key** |
| **`weight_band_kg`** | numeric | Booking Log G → **Lookup Key** |
| **`destination_zone`** | text (enum) | Booking Log F → **Lookup Key** |

Without all four, the workbook's `Lookup Key` cannot be constructed, therefore **`Forecast £` cannot be
computed for any order**, therefore Variance £ and Leakage £ have no valid basis.

### 3.3 Data-quality defects in existing columns

| Defect | Count (W27) | Consequence |
|---|---:|---|
| `carrier_charge IS NULL` | **173 / 3,634 (4.8%)** | `SUM()` skips them → carrier totals **silently understate**. |
| ↳ of which Wayfair | 146 | **Legitimate** — postage is £0 to us (README). Should be `0.00`, not NULL. |
| ↳ of which Evri | 10 | **Genuine gap** — must be investigated. |
| ↳ of which Others | 17 | **Genuine gap.** |
| `shipping_template_price = 0.0` | **~67% of all rows** | **Unusable as Forecast £.** Do not use this column for anything. |
| `tracking_number = ''` (empty string, not NULL) | many | Breaks `IS NOT NULL` checks. |
| `customer_first_name` holds full name | e.g. `'linda gibbs'` | `customer_last_name` is NULL. Cosmetic. |

---

## §4 · Lookup / mapping data required

### 4.1 `carrier_name_map` — **highest-value, lowest-cost fix**

`order_shipping_billing_detail.carrier_name` holds **261 distinct free-text values**. W27 alone uses 37 raw
strings across 8 carrier families. Current dashboard code resolves these with a hardcoded `ILIKE` heuristic,
which is unmaintainable and will silently misclassify new strings into `OTHERS`.

W27 evidence:

| Family | Labels | Raw name variants | NULL charge |
|---|---:|---:|---:|
| Royal Mail | 2,273 | 6 | 0 |
| DHL | 514 | 6 | 0 |
| Evri | 349 | 10 | 10 |
| Amazon Shipping | 223 | 1 | 0 |
| Wayfair | 146 | 1 | 146 |
| DPD | 78 | 2 | 0 |
| **OTHERS** | 26 | 10 | 17 |
| GLS | 25 | 1 | 0 |

Real examples requiring mapping: `Trossingen schmutter DHL Paket International`, `Trossingen kronen DHL Kleinpaket`,
`ROYAL MAIL TRACKED 48 NEX(2kg)`, `Royal Mail Internal`.

**Required:** `carrier_name_map(raw_carrier_name PK, carrier_family, service_name, is_domestic, owner)`
covering all 261 values, with a NOT-NULL constraint so new strings fail loudly instead of falling into `OTHERS`.

### 4.2 Reference lists (currently workbook-only, should be PostgreSQL tables)

`label_type` (7) · `destination_zone` (23) · `weight_band` (9) · `issue_type` (16) · `owner` (10) ·
`blos` thresholds (15 keys).

⚠️ **Known workbook defect:** the Rate Card uses **22 distinct weight bands** while the Lists sheet defines
only **9**. 13 bands violate the spec (`100g, 110g, 250g, 500g, 750g, 1.03kg, 4kg, 6kg, 7kg, 8kg, 12kg, 20kg, 31.5kg`).
`blos.postage` currently contains **17** distinct bands. **These three must be reconciled to one canonical set
before `weight_band_kg` is populated**, or the Lookup Key will not resolve.

---

## §5 · `blos.postage` — 753 rows, but not yet usable as a rate card

The table exists with the right shape. The **content** blocks the Lookup Key.

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 5.1 | **`destination_zone` is 100% NULL** | 753 / 753 NULL | 🔴 Lookup Key cannot resolve |
| 5.2 | **`price_with_tax` / `price_without_tax` populated on only 45 rows** | 45 / 753. The other 708 carry price only in `postage_value`. | 🔴 Forecast £ needs a VAT-inclusive price |
| 5.3 | `postage_value` is the only universally populated price | 753 / 753 | ✅ use this, but VAT status is ambiguous |
| 5.4 | `tax_status` splits the table | 708 `INTERNATIONAL`/`flat`, 45 `LOCAL`/`both` | 🟠 VAT rule differs by row; `Qty × Rate × (1+VAT%)` is undefined for `flat` |
| 5.5 | `weight_from` / `weight_to` NULL on 45 rows; `destination_country` NULL on 45 | 45 / 753 | 🟠 those rows unmatchable |
| 5.6 | **No DHL rows. No GLS. No Wayfair.** | `dhl_rows = 0` | 🔴 **DHL is 514 labels / £3,038.22 in W27** — the #2 carrier has **no rate card at all** |
| 5.7 | Carrier names not normalised *within* the rate card | `'Royal Mail'` (537) **and** `'ROYAL MAIL'` (15) coexist | 🟠 joins will miss |
| 5.8 | All 753 rows share `effective_date = 2026-01-01` | single import batch | 🟠 **189 days old** → KPI 28 FAIL (limit 30) |
| 5.9 | `blos.postage_history` has **0 rows** | | 🟠 no rate-change audit trail |

**To make `blos.postage` usable:** populate `destination_zone`; populate `price_with_tax` for all 753 rows
(or define the VAT rule for `tax_status='flat'`); load DHL / GLS rate cards; normalise `carrier_name` casing;
establish a refresh cadence ≤30 days.

---

## §6 · Missing data that must be **added** to PostgreSQL

### 6.1 Carrier invoices — the largest single gap

**No carrier invoice exists anywhere in the database.** A sweep of every column in every schema for `%invoice%`
returned exactly two hits, neither usable:

- `public.amazon_returns.invoice_number` — marketplace return reference, not carrier postage.
- `supplier.invoices.invoice_date` — inbound container freight, 0 rows in W27.

**Consequence, stated plainly:** the Weekly Invoice Check currently compares `carrier_charge` against an
8-week moving average **of itself**. It measures cost *drift*, not billing *accuracy*. **It is structurally
incapable of detecting carrier overbilling** — which is the tab's entire purpose. If DHL invoices £5,000 for
£3,038 of labels, no figure in the system changes.

**Required:**

| Column | Type | Notes |
|---|---|---|
| `invoice_received_amount` | numeric | the carrier's billed amount |
| `invoice_received_date` | date | |
| `invoice_batch_id` | text | groups a carrier's weekly invoice |
| `invoice_line_tracking_number` | text | joins invoice line → shipment |

Target ingestion coverage ≥95% (BLOS `postage.invoice_coverage_target = 1.00`).

### 6.2 Dispute lifecycle

| Column | Type | Unblocks |
|---|---|---|
| `date_raised` | date | Leakage Register col B, **Days Open**, **KPI 26** |
| `status` | text | Open / Investigating / Chase carrier / Killed (README §13) |
| `credit_recovered_gbp` | numeric | Leakage Register col N, **KPI 25** |
| `root_cause`, `issue_type` | text | from Lists (16 values) |

`Days Open = TODAY() − date_raised` is currently **NOT COMPUTABLE** and is rendered blank rather than guessed.

### 6.3 An independent label source

All 3,634 non-FBA W27 orders have **exactly one** `order_shipping_billing_detail` row. Therefore
`Labels in BL ≡ Self-Labelled + Wayfair` **by construction**.

The workbook's Gap control enters label count *independently* and compares. Here both sides derive from the
same order set, so **the Gap is arithmetically incapable of being non-zero** and KPI 22's "100% PASS" would
validate nothing. This is why KPI 22 is reported as NOT COMPUTABLE.

**Required:** a label feed from the shipping platform that is *not* derived from the order table — e.g. a
`label_purchased` table sourced from the carrier/label API, one row per label actually bought.

### 6.4 ISO week columns

`iso_week_number` (`to_char(order_date,'IW')`) and `iso_week_year` (`to_char(order_date,'IYYY')`) —
README §20 requires these as stored columns. Currently computed at query time.

### 6.5 Other ETL gaps

| Gap | Evidence | Unblocks |
|---|---|---|
| eBay return-label fees not ingested | 39 label-evidenced returns, **1** fee row | Return cost accuracy, KPI 31 |
| CS-helpdesk feed absent | no table | Daily Control col M |
| `blos.postage_history` never written | 0 rows | Rate-change audit |

---

## §7 · Calculated / derived fields

| Field | Formula (workbook) | Computable today? |
|---|---|---|
| Labels | `Self-Labelled + Wayfair` | ✅ but see §6.3 — tautological |
| **Forecast £** | `Qty × Rate × (1 + VAT%)` | ❌ needs Lookup Key (§3.2) + rate card (§5) |
| **Invoice £** | `invoice_received_amount` | ❌ **does not exist** (§6.1) |
| **Variance £** | `Invoice − Forecast` | ❌ both operands unavailable |
| Variance % | `Variance £ ÷ Forecast £`, `IFERROR(...,0)` | ❌ |
| Status | `Others→KILL` · `\|Δ£\|≥trigger AND \|Δ%\|>pct→LEAK` · `\|Δ£\|≥trigger→CHECK` · else `OK` | ⚠️ runs on substitute inputs |
| **£ Leakage** | `Invoice − Forecast` (**signed**) | ❌ |
| Days Open | `TODAY() − Date Raised` | ❌ (§6.2) |
| Closure Status | `Total = FBA+WF+SL` AND customer Gap = 0 AND service Gap = 0 | ❌ needs `label_type` |
| Lookup Key | `carrier + service_tier + weight_band + destination_zone` | ❌ 3 of 4 columns absent |

**Interim substitutes currently in the dashboard** (must be removed once the above land):

- `Forecast £` → **8-week historical mean of `carrier_charge`** per carrier, labelled
  *"Estimated Cost (Historical Baseline)"*.
- `Invoice £` → **`carrier_charge`**. ⚠️ Mislabelled in the UI; see §6.1.

---

## §8 · Priority order for the database team

| # | Item | Owner | Effort | Unlocks |
|---|---|---|---|---|
| 1 | `carrier_name_map` (261 values) | ETL | **Low** | Every per-carrier figure; removes the `ILIKE` heuristic |
| 2 | `blos.postage.destination_zone` + `price_with_tax` on all 753 rows | ETL | **Low** | Half the Lookup Key; Forecast £ |
| 3 | **DHL + GLS rate cards** into `blos.postage` | ETL | Low | £3,038/wk of spend currently unpriceable |
| 4 | Fix 27 genuine `carrier_charge` NULLs; set Wayfair to `0.00` | ETL | Low | Removes silent understatement |
| 5 | `order_shipping_billing_detail.label_type` | Schema | Med | KPI 22, 29, 30; Closure Status |
| 6 | `service_tier`, `weight_band_kg`, `destination_zone` | Schema | Med | Completes Lookup Key → **Forecast £** |
| 7 | **`carrier_invoice` table + ingestion** | Schema + ETL | **High** | **Weekly Invoice Check becomes real** |
| 8 | `dispute` / `credit_recovered` | Schema | Med | KPI 25, 26; Leakage Register |
| 9 | Independent `label_purchased` feed | Schema + ETL | High | Makes the Gap control meaningful |
| 10 | `iso_week_number` / `iso_week_year` | Schema | Low | README §20 |
| 11 | Rate-card refresh cadence ≤30 days | Process | Low | KPI 28 (currently 189 d → FAIL) |

Items 1–4 are **data population, not schema change**, and unlock the most value per hour.
Item 7 is the only one that makes the system's headline purpose — catching carrier overbilling — actually work.

---

## §9 · Status summary

| Category | Count |
|---|---:|
| Dashboard calculation bugs | **0** |
| Columns to add | 8 |
| Tables to create | 3 |
| Data-population / ETL fixes | 7 |
| Reference lists to reconcile | 3 (weight bands: 9 vs 22 vs 17) |

**The dashboard is not the blocker. Data availability is.** Until §6.1 lands, the Weekly Invoice Check
cannot detect overbilling, and no amount of dashboard work will change that.
