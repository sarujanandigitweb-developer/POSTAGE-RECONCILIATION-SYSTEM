# 13 · Zero-Trust Final Audit — Pre-Production

**Date:** 2026-07-09 · **Method:** workbook re-parsed from the `.xlsx` file (no prior analysis reused);
PostgreSQL swept read-only across **all schemas, tables and views**.
**Workbook:** `Accounts postage_reconciliation_v3_merged.xlsx`, internally **v3.4**, unchanged since 2026-07-08 12:23.
**Data week:** W27 2026 (2026-06-29 → 2026-07-05), as-of 2026-07-08.

---

## PART 1 · Fresh workbook parse (evidence)

| Sheet | Visible | Populated rows | Formulas |
|---|:--:|---:|---:|
| 0. README | ✓ | narrative | 0 |
| 1. Dashboard | ✓ | KPI table + 10 carriers | 102 |
| 2. Daily Control | ✓ | 7 days + total | 36 |
| 3. Booking Log | ✓ | **189** | 384 |
| 4. Rate Card | ✓ | **208** | 0 |
| 5. Weekly Invoice Check | ✓ | 9 carriers + total | 77 |
| 6. Leakage Register | ✓ | 7 + OPEN TOTAL | 20 |
| 7. Gap Analysis | ✓ | 18 areas | 0 |
| 8. Lists | ✓ | 10/7/16/10/23/9/7 | 0 |
| 9. SOP | ✓ | steps | 0 |
| BLOS Thresholds | ✓ | **15 keys** | 0 |

Booking Log columns confirmed **A–Q** (17). Leakage Register **A–P** (16). Lists: Carriers 10 · Statuses 7 ·
Issue Types 16 · Owners 10 · Destinations 23 · Weight Bands 9 · Label Types 7. BLOS values match the dashboard exactly.

### 🔴 NEW FINDING — the Rate Card is in the workbook, and it is stale
Sheet 4 holds **208 populated rows**, all with `Effective From` (only two dates: `2025-01-01`, `2025-09-01`).
Newest = **2025-09-01**. As-of 2026-07-08 that is **310 days**, versus the BLOS limit of 30.
→ **KPI 28 (Rate card age) = 310 → FAIL.** Previously reported as "N/A — no rate card". **Now implemented.**

---

## PART 2 · PostgreSQL zero-trust sweep (Step 3)

Searched **every** non-system schema, every base table **and view** for: `service_tier`, `weight_band*`,
`total_weight`, `dest*zone*`, `label_type`, `rate_card`, `vat`, `invoice_*`, `credit_recover*`, `dispute*`, `iso_week*`.

| Target | Result | Evidence |
|---|---|---|
| `service_tier` | **does not exist anywhere** | 0 rows in `information_schema.columns` |
| `weight_band_kg` / `total_weight` | **do not exist anywhere** | 0 rows |
| `destination_zone` | exists **only** on `blos.postage` | which has **0 rows** |
| `label_type` (7-value taxonomy) | `public.shipment` **absent**; `amazon_returns.label_type` is Amazon's own 2-value enum | Q10 |
| rate card | `blos.postage` + `blos.postage_history` **exist, 0 rows** | Q11 |
| invoice ingestion | `invoice_received_*` absent. `supplier.invoices` = container/FOB/HS-code **inbound freight** (22 rows, 0 in W27) → out of scope per README §1 | column list |
| dispute / credit recovered | **no table anywhere** (only unrelated `staging_ai` views) | sweep |
| `iso_week_number/year` | **do not exist** (README §20 production rule unmet) | sweep |
| Return Label In | **EXISTS**: `amazon_returns` (110) + `ebay_returns` (39 label-evidenced) | Q10 |

**"Never stop after the first table" honoured** — `supplier.invoices`, `ebay_returns`, `shopify_returns`,
`amazon_returns`, `blos.postage` were each opened and either used or disproved.

---

## PART 3 · FINAL MATRIX — every workbook column

Legend: **PG** = PostgreSQL · **WB** = workbook · **Gen** = generated/derived.
Categories: **A** data exists, dashboard bug · **B** SQL mapping missing · **C** join missing ·
**D** workbook manual field · **E** ETL missing · **F** schema missing · **G** workbook spec error.

### Sheet 2 — Daily Postage Control
| Col | Column | Dashboard field | Source | Status | Reason | Action |
|---|---|---|---|:--:|---|---|
| A | Date | `date` | PG `order_transaction.order_date` | ✅ PASS | — | — |
| B | Total Orders | `total_orders` | PG (Completed) | ✅ PASS | 4,020 | — |
| C | FBA Excluded | `fba_excluded` | PG `fba_sales AND source_name='AMAZON'` | ✅ PASS | 389 | — |
| D | Wayfair | `wayfair` | PG `source_name='WAYFAIR'` | ✅ PASS | 147 | — |
| E | Self-Labelled | `self_labelled` | Gen (B−C−D) | ✅ PASS | 3,484 | — |
| F | Labels in BL | `labels` | PG shipments | ⚠️ GAP | counts **all** labels; cannot isolate Customer Order without `label_type` | F |
| G | Order vs Label Gap | `gap` | Gen | ✅ PASS | 0 all 7 days | — |
| H | Forecast £ Inc VAT | `forecast_inc_vat` | WB Rate Card | ❌ GAP | Lookup Key unbuildable (no Service/Weight/Zone) | **F** |
| I | Closure Status | `closure` | Gen | ⚠️ GAP | customer side only; service gap unverifiable | F |
| J | Closed By | `closed_by` | manual | ⚠️ GAP | no source | **D** |
| K | Notes | `notes` | manual | ⚠️ GAP | no source | **D** |
| L | Day Status | pill | Gen | ✅ PASS | — | — |
| M | Service Labels (expected) | `service_expected` | CS helpdesk | ❌ GAP | not queryable | **E** |
| N | Service Labels in BL | `service_in_bl` | `label_type` | ❌ GAP | column absent | **F** |
| O | Service Gap | `service_gap` | Gen | ❌ GAP | depends on M,N | **F/E** |
| P | Service Forecast £ | `service_forecast_gbp` | Gen | ❌ GAP | depends on N + rate card | **F** |
| Q | Week Label | `week_label` | Gen ISO | ✅ PASS | W27 2026 = PG `to_char(...,'IW')` | — |

### Sheet 3 — Booking Log
| Col | Column | Source | Status | Reason | Cat |
|---|---|---|:--:|---|:--:|
| A | Booking ID | auto `BKG-NNNNN` | ⚠️ GAP | not generated at bucket grain | D |
| B | Date | PG | ✅ PASS | — | — |
| C | Order ID | PG `order_id` | ⚠️ GAP | exists at row grain; buckets aggregate many orders | D |
| D | Carrier | PG `carrier_name` (free text) | ⚠️ GAP | heuristic `carrier_family`; no normalisation table | E |
| E | Service | `service_tier` | ❌ FAIL | **column does not exist** | **F** |
| F | Destination | `shipping_country` | ⚠️ GAP | raw country, not the 23-value zone enum | F/E |
| G | Weight Band | `weight_band_kg` | ❌ FAIL | **column does not exist** | **F** |
| H | Qty Labels | PG COUNT | ✅ PASS | — | — |
| I | Lookup Key | Gen concat | ❌ FAIL | needs E,F,G | **F** |
| J | Rate Ex VAT | WB Rate Card VLOOKUP | ❌ FAIL | needs Lookup Key | **F** |
| K | Forecast Ex VAT | H×J | ❌ FAIL | ↑ | F |
| L | VAT % | Rate Card VLOOKUP | ❌ FAIL | ↑ | F |
| M | VAT £ | K×L | ❌ FAIL | ↑ | F |
| N | Forecast Inc VAT | K+M | ❌ FAIL | ↑ | F |
| O | Status | Gen (Others→KILL…) | ⚠️ GAP | derivable, not yet rendered | E |
| P | Label Type | `shipment.label_type` | ❌ FAIL | **table absent** | **F** |
| Q | Week Label | Gen ISO | ✅ PASS | — | — |
| — | *Actual £ (extra)* | PG `carrier_charge` | ✅ PASS | real cost | — |

### Sheet 4 — Rate Card
| Col | Column | Source | Status |
|---|---|---|:--:|
| A–J | Lookup Key, Carrier, Service, Weight Band, Max kg, Destination, Rate Ex VAT, VAT %, Effective From, Notes | **WB Sheet 4 (208 rows)** | ✅ **PASS — now implemented** |

Rate card age **310 days → KPI 28 FAIL**. `blos.postage` empty → **E (ETL backfill)**.

> 🔴 **Workbook defect (Category G):** Rate Card col D uses **22 distinct weight bands**, but Lists col F defines only **9**.
> README Sheet-4 annotation says col D is "enum from Lists · one of 9 bands". **13 bands violate the spec**:
> `100g, 110g, 250g, 500g, 750g, 1.03kg, 4kg, 6kg, 7kg, 8kg, 12kg, 20kg, 31.5kg`.
> Consequence: even with `weight_band_kg` in PG, the Lookup Key would not resolve against Lists-conformant values.
> **Sathees/Sajeesan must reconcile Lists ↔ Rate Card before cutover.**

### Sheet 5 — Weekly Invoice Check
| Col | Column | Source | Status | Cat |
|---|---|---|:--:|:--:|
| A/B/P | Week Start / End / Week Label | Gen ISO | ✅ PASS | — |
| C | Carrier | PG heuristic | ⚠️ GAP | E |
| D | Labels Generated | PG | ✅ PASS | — |
| E/F | Forecast £ Ex/Inc VAT | Booking Log | ❌ FAIL | F |
| G | Invoice £ Inc VAT | `invoice_received_amount` | ❌ FAIL | **F/E** |
| H/I/J | Variance £ / % / Status | Gen | ✅ PASS *(formula exact; inputs substituted)* | — |
| K | Owner | Lists VLOOKUP | ✅ PASS (`TBD — …`) | D |
| L–O | Customer/Service Labels & £ | `label_type` | ❌ FAIL | F |

### Sheet 6 — Leakage Register
| Col | Column | Status | Cat |
|---|---|:--:|:--:|
| A,B,C,P | Gap ID, Date Raised, Week Start, Week Label | ✅ PASS (auto-generated) | — |
| D,F | Carrier, Trigger Source | ✅ PASS | — |
| E | Issue Type | ✅ PASS (Lists enum, or NULL = uncategorised) | D |
| G,H,I,J | Forecast, Invoice, Leakage, Days Open | ✅ PASS *(on substituted inputs)* | — |
| K | Owner | ✅ PASS | D |
| L,M | Root Cause, Status | ⚠️ GAP (manual) | D |
| N | Credit Recovered £ | ❌ FAIL — **no table anywhere** → Recovery rate N/A | **F** |
| O | Label Type | ❌ FAIL | F |

### Sheet 1 — Dashboard KPIs (targets read from `blos`; no hardcoded thresholds)
| Row | KPI | Actual | Target | Status |
|---:|---|---:|---:|:--:|
| 22 | Daily reconciliation accuracy | 100% | 100% | ✅ PASS |
| 23 | Weekly leakage £ | £97.46 | £0 | ❌ **FAIL** |
| 24 | Weekly leakage % | 0.77% | 1.00% | ✅ PASS |
| 25 | Recovery rate | — | 80% | ⚠️ N/A |
| 26 | Avg dispute age | — | 14 | ⚠️ N/A |
| 27 | Others share | 0.66% | 2.00% | ✅ PASS |
| 28 | **Rate card age** | **310 d** | 30 d | ❌ **FAIL (new)** |
| 29 | Service spend % | — | 5.00% | ⚠️ N/A |
| 30 | Service-to-customer ratio | — | 3.00% | ⚠️ N/A |
| 31 | **Return rate** | **4.10%** | 2.00% | ❌ **FAIL** |

**3 PASS · 3 FAIL · 4 N/A.** All three FAILs are **real business signals**, not defects.

### Sheets 7 / 8 / 9 / BLOS — ✅ PASS
Gap Analysis (reference), Lists (10/7/16/10/23/9/7 verbatim), SOP (procedure), BLOS Thresholds (15 keys, values match).

---

## PART 4 · Formula validation (Step 6)

| Formula | Recalculated | Verdict |
|---|---|:--:|
| Order math `B = C+D+E` | holds all 7 days | ✅ |
| Booking Gap `(E+D) − F` | 0 all 7 days | ✅ |
| Variance £ `G − F` | −£104.70 net | ✅ |
| Variance % `H ÷ F` | −0.83% | ✅ |
| Status (Others→KILL · ≥trigger & >pct→LEAK · ≥trigger→CHECK · else OK) | RM CHECK, DHL LEAK, Evri LEAK, Others KILL | ✅ |
| £ Leakage `H − G` | £97.46 (DHL) | ✅ |
| Others % | 24/3,631 = 0.66% | ✅ |
| Week Label (ISO) | W27 2026 == PG `to_char(...,'IW')` | ✅ |
| KPI PASS/FAIL direction | lower/higher-is-better honoured | ✅ |
| BLOS referencing | all 10 KPI targets from `blos[blos_key]` | ✅ |
| Forecast £ `Qty × Rate × (1+VAT%)` | **not computable** | ❌ blocked |
| VAT % per row | rate card has {0, 19%, 20%} matching README §4 | ✅ spec-valid, unusable without Lookup Key |
| Recovery rate `ΣCredit ÷ ΣLeakage` | **not computable** | ❌ blocked |
| Service Gap / Spend % / Ratio | **not computable** | ❌ blocked |

---

## PART 5 · README defects (Step 7)

| # | Defect | Evidence |
|---|---|---|
| 1 | **§21 return mapping is wrong.** Names `ebay_order_expenses.transaction_memo` (column absent) and `amz_refund_expenses` (table absent). | sweep + Q10 |
| 2 | **§21 quantities are wrong.** Claims "35 eBay return labels over 7 months"; actual `SHIPPING_LABEL` = **45 all-time, 1 in W27**, while `ebay_returns` shows 79 requests / 39 labels in W27 alone. | Q10 |
| 3 | **§15 rate-card framing misleading.** `blos.postage` already exists → the action is **backfill**, not schema. | Q11 |
| 4 | **§20 production rule unmet.** `iso_week_number` / `iso_week_year` do not exist. | sweep |
| 5 | **Lists ↔ Rate Card conflict (workbook, Category G).** Rate Card uses 22 weight bands; Lists defines 9. | fresh parse |
| 6 | §9 lists 11 BLOS keys; the sheet actually holds **15** (v3.1 +3, v3.3 +1). Sheet is right, §9 is stale. | fresh parse |

---

## PART 6 · Implementation review (Step 8)

| Artefact | State |
|---|---|
| `dashboard_queries.sql` | SELECT-only (0 write statements). Q0–Q11. Header corrected. |
| `data.js` | Synced; parses; provenance per block documented. |
| `postage_reconciliation_dashboard.html` | 0 external deps; JS parses; header `#15243d`; all workbook columns present (rendered “—” when unavailable). |
| `dashboard/README.md` | Refreshed (stale "no rate-card table" / "Leakage empty" claims removed). |
| Refresh script | **Does not exist** — `data.js` is a manual snapshot. |

---

## PART 7 · Final conclusion

**1. Does the dashboard fully match the workbook?** **No — and it cannot today.** Every workbook column is
*present*; **17 of them cannot be populated** because PostgreSQL lacks the data.

**2. What remains?** Forecast £ chain (Lookup Key → Rate → VAT → Forecast), the entire service side,
Invoice £, Credit Recovered £/Recovery rate, Label Type, and Booking Log's Service/Weight/Destination-zone.

**3. PostgreSQL limitations (schema — Category F):** `service_tier`, `weight_band_kg`, `destination_zone`,
`public.shipment.label_type`, invoice fields, dispute/credit table, `iso_week_number/year`.

**4. ETL problems (Category E):** `blos.postage` **0 rows**; carrier-name normalisation table missing;
eBay return-label fee ingestion incomplete (39 labels vs 1 fee); Royal Mail invoice ingestion; CS-helpdesk feed.

**5. Dashboard bugs:** **None outstanding.** Two were found and fixed this cycle — a duplicate `returns`
JS key overriding verified data, and hardcoded KPI thresholds. Verified by re-parse.

**6. Workbook problems (Category G):** Rate Card weight bands (22) contradict Lists (9).

**7. README problems:** the six defects in Part 5.

**8. Can it be signed off for production?** **NO — not yet.**

### Blockers, priority order
| # | Blocker | Type | Unlocks |
|---|---|---|---|
| 1 | **Backfill `blos.postage`** from workbook Sheet 4 (208 rows) | ETL | Rate Card in PG; removes WB dependency |
| 2 | **Reconcile Lists ↔ Rate Card weight bands** (22 vs 9) | Workbook | Lookup Key can resolve at all |
| 3 | Add `service_tier`, `weight_band_kg`, `destination_zone` | Schema | Lookup Key → **Forecast £, VAT, Variance, true Leakage** |
| 4 | Add `public.shipment.label_type` | Schema | Service side, KPIs 29/30, full Closure, Return Label Out |
| 5 | Invoice ingestion + Royal Mail feed ≥95% | ETL | Invoice £ → real Variance/Leakage |
| 6 | Dispute/credit table | Schema | Recovery rate (KPI 25), Days Open, KPI 26 |
| 7 | Correct README §15/§20/§21 + §9 key count | Docs | Spec integrity |
| 8 | Carrier normalisation table; fix eBay fee ingestion | ETL | Removes heuristic; return-cost accuracy |
| 9 | `iso_week_number/year` columns | Schema | README §20 compliance |
| 10 | Automated refresh script | Build | `data.js` currency |
| 11 | Sathees: name the 10 carrier owners | Governance | Audit check #5 |
| 12 | BLOS API live | Governance | Thresholds from API not workbook |

### Act now (independent of the blockers)
Three KPIs are **failing on real data** and are actionable today:
- **Rate card 310 days stale** (limit 30) — Sathees refresh.
- **Return rate 4.10%** (limit 2%) — README §21 values this at ~£48.5k/year per point; largest ROI lever.
- **DHL +£97.46** above its 8-week baseline — DHL owner to investigate GAP-W27-01.
