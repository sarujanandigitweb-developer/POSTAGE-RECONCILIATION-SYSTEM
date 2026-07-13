# 14 · Missing Data Validation Report

**Date:** 2026-07-09 · **Week:** W27 2026 (2026-06-29 → 2026-07-05), as-of 2026-07-08
**Spec:** workbook v3.4 · **Data:** PostgreSQL (read-only, swept across all schemas, tables and views)
**Method:** missing-field list derived programmatically from `dashboard/data.js` against each sheet's
workbook column set — not from memory.

**Headline: 23 of 66 workbook columns cannot be populated. 4 of 10 KPIs are uncomputable.**
Every gap has a documented cause. Nothing is guessed or fabricated.

---

## 1. Summary by worksheet

| Worksheet | Workbook cols | Populated | **Missing** | Verdict |
|---|---:|---:|---:|:--:|
| 2. Daily Postage Control | 17 (A–Q) | 10 | **7** | ⚠️ PASS-WITH-GAP |
| 3. Booking Log | 17 (A–Q) | 8 | **9** | ⚠️ PASS-WITH-GAP |
| 4. Rate Card | 10 (A–J) | 10 (208 rows) | **0** | ✅ PASS |
| 5. Weekly Invoice Check | 16 (A–P) | 11 | **5** | ⚠️ PASS-WITH-GAP |
| 6. Leakage Register | 16 (A–P) | 14 | **2** | ⚠️ PASS-WITH-GAP |
| 1. Dashboard (KPIs 22–31) | 10 | 6 | **4 N/A** | ⚠️ PASS-WITH-GAP |
| 0. README · 7. Gap Analysis · 8. Lists · 9. SOP · BLOS Thresholds | — | all | 0 | ✅ PASS |

---

## 2. Exact missing columns (evidence-derived)

### Sheet 2 — Daily Postage Control (7 missing)
| Col | Column | Cause |
|---|---|---|
| H | Forecast £ Inc VAT | **Mapping cascade** — depends on Booking Log N |
| J | Closed By | **Manual entry** (by design) |
| K | Notes | **Manual entry** (by design) |
| M | Service Labels (expected) | **Source** — CS helpdesk not queryable |
| N | Service Labels in BL | **Source** — `shipment.label_type` absent |
| O | Service Gap | **Mapping cascade** — depends on M, N |
| P | Service Forecast £ | **Mapping cascade** — depends on N + rate card |

⚠️ Consequence: **Closure Status (col I) is verified on the customer side only.** The v3.1 rule requires
customer gap = 0 **AND** service gap = 0; the service condition cannot be evaluated.

### Sheet 3 — Booking Log (9 missing)
| Col | Column | Cause |
|---|---|---|
| E | Service | **Source** — `service_tier` column does not exist |
| G | Weight Band | **Source** — `weight_band_kg` column does not exist |
| I | Lookup Key | **Mapping cascade** — needs D·E·G·F |
| J | Rate Ex VAT £ | **Mapping cascade** — needs Lookup Key |
| K | Forecast £ Ex VAT | **Mapping cascade** — H × J |
| L | VAT % | **Mapping cascade** — needs Lookup Key |
| M | VAT £ | **Mapping cascade** — K × L |
| N | Forecast £ Inc VAT | **Mapping cascade** — K + M |
| P | Label Type | **Source** — `public.shipment` table absent |

✅ Populated and verified legitimate: **A** `BKG-00001…` (README auto-format, 72 unique), **B** Date,
**C** the README's literal placeholder `"(order batch — see postgres.order_transaction)"`, **D** Carrier
(heuristic), **F** Destination (raw `shipping_country`), **H** Qty, **O** Status (README rule, 0 violations), **Q** Week Label.

### Sheet 5 — Weekly Invoice Check (5 missing)
| Col | Column | Cause |
|---|---|---|
| E | Forecast £ Ex VAT | **Mapping cascade** — Booking Log K |
| L | Customer Labels | **Source** — `label_type` absent |
| M | Service Labels | **Source** — `label_type` absent |
| N | Customer Forecast £ | **Source** — `label_type` + rate card |
| O | Service Forecast £ | **Source** — `label_type` + rate card |

### Sheet 6 — Leakage Register (2 missing)
| Col | Column | Cause |
|---|---|---|
| N | Credit Recovered £ | **Source** — no dispute/credit table anywhere; **manual** field |
| O | Label Type | **Source** — `label_type` absent |

*(Also: `issue_type` and `root_cause` are NULL on 1 of 2 rows — README-permitted "uncategorised" pending
owner investigation, not a data gap.)*

### Sheet 1 — Dashboard KPIs (4 uncomputable)
| Row | KPI | Cause |
|---:|---|---|
| 25 | Recovery rate | needs Credit Recovered £ (no source) |
| 26 | Avg dispute age | no dispute table |
| 29 | Service spend % | needs `label_type` |
| 30 | Service-to-customer ratio | needs `label_type` |

---

## 3. ⚠️ Populated, but NOT spec-true (substituted inputs)

These columns render values, but the values are **not** what the workbook defines. This is the most
important caveat in the report — they must not be read as workbook-accurate.

| Sheet · Col | Workbook definition | What the dashboard actually shows |
|---|---|---|
| WIC · F (Forecast £ Inc VAT) | `Qty × Rate × (1+VAT%)` from Rate Card | **prior-8-week average carrier rate × labels** (README §15 "default per carrier" fallback) |
| WIC · G (Invoice £ Inc VAT) | carrier's invoice line | **`carrier_charge`** (invoice ingestion absent) |
| Leakage · G, H (Forecast/Invoice £) | VLOOKUP into WIC F/G | inherits both substitutions above |
| Booking Log · D (Carrier) | enum from Lists | **heuristic classification** of free-text `carrier_name` |
| Booking Log · F (Destination) | 23-value zone enum | **raw `shipping_country`** |

Consequence: **Variance £, Variance %, Status and £ Leakage are formula-exact but input-substituted.**
The £97.46 DHL leakage is a *rate-drift-vs-baseline* signal, not a carrier-invoice dispute.

---

## 4. Root-cause classification

### A) Source data — schema does not exist (proven absent across all schemas + views)
| Missing object | Blocks |
|---|---|
| `order_shipping_billing_detail.service_tier` | Booking Log E → Lookup Key chain |
| `order_shipping_billing_detail.weight_band_kg` | Booking Log G → Lookup Key chain |
| `order_shipping_billing_detail.destination_zone` | Booking Log F (only raw country exists) |
| `public.shipment.label_type` (**table absent**) | BL P · DC M–P · WIC L–O · LR O · KPIs 29/30 · Return Label Out |
| `invoice_received_amount / _date / _batch_id` | WIC G (true Invoice £) |
| dispute / credit-recovered table | LR N · KPIs 25, 26 |
| `iso_week_number` / `iso_week_year` | README §20 production rule |

**Disproved candidate:** `supplier.invoices` is container/FOB/HS-code **inbound freight** (22 rows, 0 in W27)
— out of scope per README §1, not carrier postage invoices.

### B) Data-generation / ETL — table exists, data does not
| Issue | Evidence |
|---|---|
| **`blos.postage` = 0 rows** | Rate-card table exists with correct shape → **backfill gap, not schema gap** |
| **`blos.postage_history` = 0 rows** | blocks `Effective From` in PG |
| **eBay return-label fee ingestion incomplete** | 39 labels evidenced vs **1** `SHIPPING_LABEL` fee row in W27 |
| **No carrier-name normalisation table** | forces the `carrier_family` heuristic |
| Royal Mail invoice ingestion | README §15 calls this the single biggest blocker |
| CS-helpdesk feed | blocks DC col M |

### C) Mapping logic — cascade failures (not independently missing)
`Lookup Key (I)` → `Rate Ex VAT (J)` → `Forecast Ex VAT (K)` → `VAT % (L)` → `VAT £ (M)` → `Forecast Inc VAT (N)`
→ then Daily Control **H**, Weekly Invoice **E/F**, and true Variance/Leakage.

**The entire Forecast £ chain is dead because two of the four Lookup Key dimensions do not exist.**

### D) Workbook specification error (Category G)
**Rate Card uses 22 distinct weight bands; Lists defines only 9.** README says Rate Card col D is an
"enum from Lists · one of 9 bands". 13 bands violate the spec:
`100g, 110g, 250g, 500g, 750g, 1.03kg, 4kg, 6kg, 7kg, 8kg, 12kg, 20kg, 31.5kg`
→ Even after `weight_band_kg` is added, **the Lookup Key still would not resolve.**

### E) Manual-entry fields (by design — not defects)
DC **J** Closed By · **K** Notes · **M** Service Labels expected · LR **L** Root Cause · **M** Status · **N** Credit Recovered £.

### F) Dashboard bugs
**None outstanding.** Two were found and fixed: a duplicate `returns` JS key silently overriding verified
data, and hardcoded KPI thresholds (now read from `blos` via `blos_key`).

---

## 5. What is NOT missing

- **Counts are complete and exact vs PostgreSQL:** 4,020 orders · 389 FBA · 147 Wayfair · 3,484 self-labelled ·
  3,631 labels · £12,517.31 actual cost. Order-math and the 0-gap reconciliation hold on all 7 days.
- **Rate Card:** 208 rows, now populated from workbook Sheet 4.
- **Lists:** 10 carriers · 7 statuses · 16 issue types · 7 label types · 23 destinations · 9 weight bands · 10 owners.
- **BLOS:** 15 keys, values match the workbook; no hardcoded thresholds anywhere.
- **Return Label In:** 149 labels (Amazon 110 + eBay 39) — recovered from `amazon_returns` / `ebay_returns`.

---

## 6. Recommended corrections (priority order)

| # | Correction | Type | Owner | Unlocks |
|---|---|---|---|---|
| 1 | **Backfill `blos.postage`** from workbook Sheet 4 (208 rows) | ETL | Pratheepan | Rate Card in PG; KPI 28 from source |
| 2 | **Reconcile Lists ↔ Rate Card weight bands** (9 vs 22) | Workbook | Sathees + Sajeesan | Lookup Key can resolve *at all* |
| 3 | Add `service_tier`, `weight_band_kg`, `destination_zone` | Schema | Sajeesan | **BL E,G,I,J,K,L,M,N · DC H · WIC E,F** — the whole Forecast £ chain |
| 4 | Create `public.shipment.label_type` | Schema | Sajeesan + Pratheepan | **BL P · DC M–P · WIC L–O · LR O · KPIs 29,30 · full Closure** |
| 5 | Invoice ingestion + Royal Mail feed ≥95% | ETL | Pratheepan | **WIC G** → real Variance/Leakage |
| 6 | Create dispute / credit-recovered table | Schema | Sajeesan | **LR N · KPIs 25, 26** |
| 7 | Fix README §15, §20, §21, §9 | Docs | Sajeesan | spec integrity |
| 8 | Carrier normalisation table; fix eBay fee ingestion | ETL | Pratheepan + Sathees | removes heuristic; return-cost accuracy |
| 9 | Add `iso_week_number` / `iso_week_year` | Schema | Sajeesan | README §20 compliance |
| 10 | CS-helpdesk → PostgreSQL feed | ETL | Pratheepan + Sathees | **DC M** |
| 11 | Automated refresh script | Build | Sarujanan | `data.js` currency |
| 12 | Sathees names the 10 carrier owners | Governance | Sathees | audit check #5 |

---

## 7. Act now — three KPIs fail on *real* data

These are not gaps. The dashboard is working correctly and surfacing genuine problems:

| KPI | Actual | Limit | Action |
|---|---:|---:|---|
| 28 Rate card age | **310 days** | 30 | Sathees to refresh the rate card (10 months stale) |
| 31 Return rate | **4.10%** | 2.0% | README §21 values this at ~£48.5k/year per point — largest ROI lever |
| 23 Weekly leakage £ | **£97.46** | £0 | DHL owner to investigate GAP-W27-01 (+3.3% vs baseline) |

---

## 8. Verdict

**Not production-ready.** The blocker is **data availability, not dashboard correctness**:
- 7 source/schema gaps
- 6 ETL/data-generation gaps
- 6 mapping cascades (all downstream of the above)
- 1 workbook specification error
- 0 outstanding dashboard bugs

Sign-off requires items **1–6** at minimum. Items **1 and 2 are cheap and unblock the most** — do them first.
