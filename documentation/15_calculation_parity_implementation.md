# 15 · Calculation Parity — Implementation Report

**Date:** 2026-07-09 · **Snapshot as-of:** 2026-07-09 · **Week:** W27 2026 (2026-06-29 → 2026-07-05)
**Scope:** dashboard implementation only. **No schema changes. No PostgreSQL writes. No invented data.**

---

## PART 1 · IMPLEMENTED (Priority 2 — incorrect calculations, all fixed)

| # | Issue | Before | After | Where fixed |
|---|---|---|---|---|
| 1 | **Leakage £ (Others)** | hardcoded `0.00` | **`-87.55`** = `Invoice £ − Forecast £` (signed, README Sheet 6 col I) | `data.js` |
| 2 | **KPI 22 Daily reconciliation** | `100% PASS` | **NOT COMPUTABLE** + tooltip | `data.js` + dashboard JS |
| 3 | **KPI 26 Avg dispute age** | contradictory (`N/A` while register showed Days Open = 2) | **NOT COMPUTABLE**, and Days Open now blank in the register — one consistent rule | `data.js` + dashboard JS |
| 4 | **Variance %** | Wayfair rendered blank | **`0%`** via the workbook's `IFERROR(...,0)` | `data.js` |
| 5 | **"Expected £"** | mislabelled as Forecast | renamed **"Estimated Cost (Historical Baseline)"** everywhere (cards, tables, notes, metadata) | dashboard JS + `data.js` |
| 6 | **Stale snapshot** | as-of 2026-07-08 | **regenerated from PostgreSQL**, as-of 2026-07-09 | `data.js` |

### Why KPI 22 is NOT COMPUTABLE (two independent reasons)
1. **Closure Status** (README v3.4) requires `Total = FBA+WF+SL` **AND** customer Gap = 0 **AND** Service Gap = 0.
   Service Gap needs `shipment.label_type` → unavailable. A day cannot be *proven* closed.
2. **The customer Gap is structurally 0.** PostgreSQL proof: **all 3,634 non-FBA completed orders have exactly
   one shipment row**. So `Labels in BL ≡ Self-Labelled + Wayfair` by construction — the gap can never reveal a
   missing label. In the workbook col F is entered *independently*; here it is derived from the same order set.

### Why KPI 26 is NOT COMPUTABLE (the consistent rule)
`Days Open = TODAY() − Date Raised`. **Date Raised is a manual field** (README Sheet 6 col B) with no PostgreSQL
source. A synthetic Date Raised would fabricate the metric. Rule applied everywhere: **if Date Raised cannot be
sourced, Days Open is blank and KPI 26 is NOT COMPUTABLE.** The register no longer shows a Days Open value.

### Snapshot refresh — the week is still mutating
| Metric | Old (2026-07-08) | New (2026-07-09) | Δ |
|---|---:|---:|---:|
| Total Orders | 4,020 | **4,027** | +7 |
| FBA Excluded | 389 | **393** | +4 |
| Self-Labelled | 3,484 | **3,487** | +3 |
| Labels | 3,631 | **3,634** | +3 |
| Actual cost | £12,517.31 | **£12,525.72** | +£8.41 |
| Others labels | 24 | **23** | −1 |

Rows are being **back-dated into the closed W27 window** (`max(order_date)` = 2026-07-09). W27 is **not immutable**;
any snapshot must carry an explicit as-of, which it now does.

### Recomputed values (all verified against PostgreSQL)
- Order math holds all 7 days: `393 + 147 + 3,487 = 4,027` ✓
- Carrier status by README rule: **Royal Mail CHECK · DHL LEAK · Evri LEAK · Amazon/Wayfair/DPD/GLS OK · Others KILL**
- Estimated Cost total £12,632.55 · Actual £12,525.72 · Variance **−£106.83 (−0.85%)**
- Leakage OPEN TOTAL = **£97.46** (DHL only — Others is *Killed*, excluded per README §13)
- **Open Disputes = 1** (was 2; "Killed" is not an open status)
- KPI 24 = 97.46 ÷ 12,632.55 = **0.77%** · KPI 27 = 23 ÷ 3,634 = **0.63%** · KPI 31 = 149 ÷ 3,634 = **4.10%**
- KPI 28 = **311 days** (newest Effective From 2025-09-01 → as-of 2026-07-09)

**Automated verification: 42/42 calculation checks pass** (order math, gap, signed leakage, status rule,
OPEN TOTAL, open-dispute count, KPI 24/27/31, IFERROR, totals tie-out, blank-consistency).

---

## PART 2 · IMPLEMENTED (Phase 2 — no silent blanks)

Every blocked field now renders an **`Unavailable`** pill with a tooltip naming the exact requirement.
23 such fields. Reasons surfaced:

| Reason shown | Fields |
|---|---|
| `Requires public.shipment.label_type (schema)` | DC N/O · WIC L–O · BL P · LR O · Closure Status · KPI 22/29/30 |
| `Requires order_shipping_billing_detail.service_tier (schema)` | Booking Log E |
| `Requires order_shipping_billing_detail.weight_band_kg (schema)` | Booking Log G |
| `Requires the rate card in PostgreSQL — blos.postage exists but has 0 rows (ETL backfill)` | DC H/P · BL J/N · WIC E |
| `Requires a dispute / credit_recovered table (schema)` | LR B/J/N · KPI 25/26 |
| `Requires the CS-helpdesk feed into PostgreSQL (ETL)` | Daily Control M |
| `Manual entry — no PostgreSQL source by design (README)` | DC J/K · LR L |

---

## PART 3 · NOT IMPLEMENTED (documented only, per instruction)

No schema work performed. No PostgreSQL writes. The following remain untouched:
`service_tier` · `shipment.label_type` · `destination_zone` · `invoice_received_*` · `credit_recovered` ·
dispute tables · `weight_band_kg` · `iso_week_number/year`.

---

## PART 4 · Remaining blockers, by owner

### Blocked by PostgreSQL — SCHEMA (Sajeesan)
| Missing object | Unblocks |
|---|---|
| `public.shipment.label_type` | Closure Status (3rd condition), **KPI 22**, KPIs 29/30, DC M–P, WIC L–O, BL P, LR O, Return Label Out |
| `order_shipping_billing_detail.service_tier` | Booking Log E → Lookup Key |
| `order_shipping_billing_detail.weight_band_kg` | Booking Log G → Lookup Key |
| `order_shipping_billing_detail.destination_zone` | Booking Log F (zone enum) |
| `invoice_received_amount / _date / _batch_id` | WIC G — real Invoice £, real Variance/Leakage |
| dispute / credit-recovered table | **KPI 25, KPI 26**, LR Date Raised / Days Open / Credit Recovered £ |
| `iso_week_number` / `iso_week_year` | README §20 production rule |
| **Independent label source** | The Gap control is currently structurally incapable of failing |

### Blocked by ETL (Pratheepan)
| Issue | Unblocks |
|---|---|
| **`blos.postage` has 0 rows** — backfill from workbook Sheet 4 (208 rows) | Rate Card in PG; removes workbook dependency; KPI 28 from source |
| Royal Mail invoice ingestion ≥95% | Invoice £ |
| Carrier-name normalisation table | Removes the `carrier_family` heuristic |
| eBay return-label fee ingestion (39 labels vs 1 fee row) | Return-cost accuracy |
| CS-helpdesk → PostgreSQL feed | Daily Control M |

### Blocked by Workbook (Sathees + Sajeesan)
| Issue | Impact |
|---|---|
| **Rate Card uses 22 weight bands; Lists defines 9** | Lookup Key cannot resolve even after `weight_band_kg` exists |
| Dashboard cell hardcodes `TODAY()-DATE(2025,1,1)` for rate-card age | Breaches README audit check #2; gives 553 d vs our 311 d |
| README §21 names `ebay_order_expenses.transaction_memo` + `amz_refund_expenses` | Neither exists; real sources are `amazon_returns` / `ebay_returns` |
| README §15 implies rate card needs schema | It needs a **backfill** — `blos.postage` already exists |
| README §9 lists 11 BLOS keys | The sheet holds 15 |
| 10 carrier owners still `TBD — [Carrier]` | Audit check #5 |

---

## PART 5 · Production readiness

| Category | Count | Status |
|---|---:|---|
| **Dashboard calculation bugs** | **0** | ✅ all resolved this phase |
| Blocked by PostgreSQL (schema) | 8 | ❌ requires Sajeesan |
| Blocked by ETL | 5 | ❌ requires Pratheepan |
| Blocked by Workbook | 6 | ❌ requires Sathees/Sajeesan |

**KPI outcome: 2 PASS · 3 FAIL · 5 NOT COMPUTABLE.**
The three FAILs are **real business signals**, not defects:
- **KPI 23** Leakage £97.46 — DHL +3.3% above its 8-week baseline
- **KPI 28** Rate card **311 days** stale (limit 30)
- **KPI 31** Return rate **4.10%** (limit 2%) — ~£48.5k/yr per point per README §21

### Verdict
**The dashboard implementation is now correct and internally consistent.** It no longer overstates
(no false "100% PASS", no hidden `0.00` leakage, no silent blanks) and no longer understates
(rate card and return rate are live).

**Still NOT signed off for production** — but the blocker is now *exclusively* data availability
(schema · ETL · workbook), not dashboard logic. The cheapest unlock remains **backfilling `blos.postage`**
followed by **reconciling Lists ↔ Rate Card weight bands**.
