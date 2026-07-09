# 11 · README Compliance Validation & Implementation Review

**Date:** 2026-07-09 · **Spec:** `0. README` sheet, v3.4 (Sections 1–22) — the **only** business specification
**Data:** PostgreSQL (read-only, Claude MCP) · Reporting week **W27 2026** (2026-06-29 → 2026-07-05), as-of 2026-07-08
**Type:** Validation phase — not a redesign. Architecture, tabs and embedded-data approach preserved.

> **Source-of-truth framing.** The Excel workbook holds **dummy sample data for W19 2026**; PostgreSQL is
> the live source of truth (W27 2026). The pass criterion is **Dashboard == PostgreSQL exactly**, and
> **Dashboard structure/logic == README**. A week-mismatch against the workbook's dummy numbers is not a failure.

---

## PART 1 · Execution schedule (Step 2 — README-sourced only, nothing invented)

| # | Item | README cadence | Source |
|---|------|----------------|--------|
| 1 | **Dashboard refresh** | **Live** (auto from formulas); reviewed Friday EOD by Sathees | S5 sheet map; S12 step 6 |
| 2 | **Daily Control** | **Daily** — pulls before **10am** (Total/FBA/Wayfair; production: auto-fed); closure check before **5pm** | S5; S11 steps 1–5, 9 |
| 3 | **Booking Log** | **Throughout the day** as labels are booked; **production: postgres trigger** (real-time) | S5; S11 steps 6–8 |
| 4 | **Weekly Invoice Check** | **Weekly — Monday** (confirm Forecast £); Invoice £ entered **Tue–Wed**; Status auto-updates **Wednesday** | S5; S12 steps 1–3 |
| 5 | **Leakage Register** | **Live** — auto-flagged; rows created **Wednesday** from LEAK/KILL (production: auto-trigger); investigated **Thu–Fri** | S5; S12 steps 4–5 |
| 6 | Rate Card | **Quarterly + ad-hoc** when a carrier issues a new rate (age gate 30 days) | S5; BLOS `rate_card_age_max_days` |
| 7 | BLOS Thresholds | Production: **live from BLOS API**; in workbook: manual (Vithursali only) | S5; S15 |
| 8 | Lists / SOP / Gap Analysis / README | On change (new carrier/status/issue type; process; scope; schema) | S5 |

**Data classification (README):**
- **Live / automated:** Dashboard, Leakage Register auto-flag, Booking Log (prod trigger), all formulas (SUMIFS/VLOOKUP), BLOS API.
- **Daily:** Daily Control.
- **Weekly:** Weekly Invoice Check; Friday EOD Dashboard review.
- **Quarterly/ad-hoc:** Rate Card.
- **Manual entry only (README S6):** Daily Control **B/C/D/E** (+ **M** service count), Weekly Invoice Check **G** (Invoice £), Leakage Register **E/L/M/N** (issue type / notes / status / credit recovered), plus Closed By & Notes.

**Recommended production automation schedule (derived strictly from the above):**
```
real-time    Booking Log ingest .................. postgres trigger        (S5, S11)
daily 10:00  Daily Control auto-feed ............. order_transaction pulls (S11 2-4)
daily 17:00  Daily closure gate ................. Closure Status = ✓ Closed (S11 9)
Mon          Weekly Invoice Check forecast refresh (S12 1)
Tue-Wed      Invoice £ ingestion ................ invoice_* fields         (S12 2)
Wed          Status recompute + leakage auto-flag  (S12 3-4)
Thu-Fri      Dispute investigation window ....... owner updates           (S12 5)
Fri EOD      Dashboard KPI review ............... every FAIL logged        (S12 6)
quarterly    Rate Card refresh .................. + ad-hoc on rate change  (S5)
continuous   Dashboard render ................... live                     (S5)
```

---

## PART 2 · Worksheet validation (Step 3) — PASS / FAIL

| # | Worksheet | Before | After fixes | Notes |
|---|-----------|:------:|:-----------:|-------|
| 0 | README | PASS | ✅ PASS | Spec only; rules surfaced in-UI |
| 1 | Dashboard | FAIL | ✅ PASS | KPI targets were hardcoded → now derived from `blos` |
| 2 | Daily Control | FAIL | ⚠️ PASS-with-GAP | Added Week Label (Q), Forecast £ (H), service side (M–P), Closed By (J), Notes (K) — render “—” (no source) |
| 3 | Booking Log | FAIL | ⚠️ PASS-with-GAP | Added Booking ID, Order ID, Service, Weight Band, Rate, Forecast, Label Type, Week Label — “—” where absent |
| 4 | Rate Card | FAIL | ⚠️ PASS-with-GAP | Now shows README's 10-column sheet (empty) + the README-sanctioned derived baseline |
| 5 | Weekly Invoice Check | FAIL | ⚠️ PASS-with-GAP | Added Week Start/End/Label, Forecast Ex VAT, Owner, Customer/Service split (L–O) |
| 6 | Leakage Register | **FAIL** | ✅ PASS | Invented Issue Types removed; now README enum or NULL. Added Week Start/Label, Trigger Source, Root Cause, Credit Recovered £, Label Type |
| 7 | Gap Analysis | PASS | ✅ PASS | Reference only |
| 8 | Lists | **FAIL** | ✅ PASS | Was 9 issue types incl. 2 invented + missing 4 lists. Now exact: 10/7/**16**/**7**/**23**/**9**/**10** |
| 9 | SOP | PASS | ✅ PASS | Procedure; no data |
| — | BLOS Thresholds | PASS | ✅ PASS | 15 keys (11 + 3 v3.1 + 1 v3.3), all referenced by key |

**Result: 6 full PASS · 5 PASS-with-GAP · 0 FAIL.** Every gap is a missing PostgreSQL source, not a logic error.

---

## PART 3 · KPI validation (rows 22–31) — targets read from BLOS

| Row | KPI | BLOS key | Target | Actual | Status |
|----:|-----|----------|-------:|-------:|:------:|
| 22 | Daily reconciliation accuracy | `daily_recon_target` | 100% | 100% | ✅ PASS |
| 23 | Weekly leakage £ | `leakage_trigger_gbp` | £0 | £97.46 | ❌ FAIL *(DHL above baseline)* |
| 24 | Weekly leakage % | `leakage_pct_max` | 1.00% | 0.77% | ✅ PASS |
| 25 | Recovery rate | `recovery_rate_min` | 80% | — | ⚠️ N/A (no Credit Recovered £) |
| 26 | Avg dispute age | `dispute_age_max_days` | 14 | — | ⚠️ N/A (no dispute table) |
| 27 | Others share | `others_share_max` | 2.00% | 0.66% | ✅ PASS |
| 28 | Rate card age | `rate_card_age_max_days` | 30 | — | ⚠️ N/A (no rate card) |
| 29 | Service spend % | `service_spend_pct_max` | 5.00% | — | ⚠️ N/A (no `label_type`) |
| 30 | Service-to-customer ratio | `service_ratio_max` | 3.00% | — | ⚠️ N/A (no `label_type`) |
| 31 | Return rate | `return_rate_max` | 2.00% | — | ⚠️ N/A (see README defect below) |

**3 PASS · 1 FAIL (real business signal) · 6 N/A.** No threshold is hardcoded (README audit check #2 ✅).

---

## PART 4 · Business logic / formula validation (Step 7)

| Rule / formula | README | Dashboard | Verdict |
|---|---|---|:--:|
| Order math | Total = FBA + Wayfair + Self-Labelled | holds all 7 days | ✅ PASS |
| Booking Gap (G) | (Self-Labelled + Wayfair) − Labels in BL | = 0 all 7 days | ✅ PASS |
| Daily Closure (I) | order math AND customer gap = 0 **AND service gap = 0** | customer side only | ⚠️ PARTIAL (no `label_type`) |
| Variance £ (H) | Invoice − Forecast | Actual − Expected | ✅ PASS (substituted inputs, same formula) |
| Variance % (I) | H ÷ F, IFERROR 0 | same | ✅ PASS |
| Status (J) | Others→KILL · \|Δ£\|≥trigger AND \|Δ%\|>pct→LEAK · \|Δ£\|≥trigger→CHECK · else OK | identical, thresholds from BLOS | ✅ PASS |
| £ Leakage (I) | Invoice − Forecast | same | ✅ PASS |
| Others % | Others labels ÷ total weekly labels | 24 / 3,631 = 0.66% | ✅ PASS |
| Week numbering | ISO-8601 `Wxx YYYY` | matches PG `to_char(...,'IW')` = **W27 2026** | ✅ PASS |
| KPI PASS/FAIL | lower-is-better ≤ target; higher-is-better ≥ target | implemented | ✅ PASS |
| BLOS thresholds | never hardcoded | derived from `blos` at render | ✅ PASS |
| Forecast £ (N) | Qty × Rate × (1 + VAT %) | **not computable** — no rate card | ❌ BLOCKED (gap) |
| Recovery Rate | Σ Credit ÷ Σ Leakage | **not computable** — no credit source | ❌ BLOCKED (gap) |
| Service Gap / Spend % / Ratio / Return Rate | per v3.1 / v3.3 | **not computable** — no `label_type` | ❌ BLOCKED (gap) |

---

## PART 5 · PostgreSQL mapping verification (Step 5) — live introspection

| README-required field | Table | Exists? | Verdict |
|---|---|:---:|:--:|
| `carrier_name`, `carrier_charge` | `order_shipping_billing_detail` | ✅ | PASS (used) |
| `service_tier` | `order_shipping_billing_detail` | ❌ | **production gap** |
| `weight_band_kg` | `order_shipping_billing_detail` | ❌ | **production gap** |
| `destination_zone` | `order_shipping_billing_detail` | ❌ | **production gap** |
| `invoice_received_amount` / `_date` / `_batch_id` | `order_shipping_billing_detail` | ❌ | **production gap** (biggest blocker per S15) |
| `iso_week_number` / `iso_week_year` | `order_shipping_billing_detail` | ❌ | **production gap** (S20 production rule) |
| `label_type` | `public.shipment` | ❌ **table absent** | **production gap** |
| rate card | — | ❌ table absent | **production gap** |
| dispute / leakage / recovery | — | ❌ table absent | **production gap** |
| BLOS thresholds | `blos` schema | ⚠️ schema **empty** | workbook values used |
| `transaction_type`, `return_id` | `ebay_order_expenses` | ✅ | present |
| **`transaction_memo`** | `ebay_order_expenses` | ❌ | **README DEFECT — see below** |
| `amz_refund_expenses` | — | ❌ table absent | **production gap** |

### ⚠ Defect found **in the README itself** (Section 21)
README Section 21 states the Return Label In mapping is *"Available · works today"*:
`public.ebay_order_expenses WHERE transaction_type='SHIPPING_LABEL' AND transaction_memo ILIKE '%return%'`
Live introspection proves **`transaction_memo` does not exist**, `amz_refund_expenses` does not exist, and
`transaction_type='SHIPPING_LABEL'` yields only **45 rows all-time** (none linked to a `return_id`).
**Return Label In is therefore NOT available today**, contrary to the README. Return rate (KPI 31) is N/A.
→ Escalate to **Sajeesan** (schema) + **Pratheepan** (ETL) to correct README Section 21 and the mapping.

---

## PART 6 · Data validation (Step 4) — Dashboard vs PostgreSQL

| Metric | PostgreSQL (W27) | Dashboard | Verdict |
|---|---:|---:|:--:|
| Total Orders | 4,020 | 4,020 | ✅ |
| FBA Excluded (`fba_sales AND source_name='AMAZON'`) | 389 | 389 | ✅ |
| Wayfair (`source_name='WAYFAIR'`) | 147 | 147 | ✅ |
| Self-Labelled | 3,484 | 3,484 | ✅ |
| Labels (shipments) | 3,631 | 3,631 | ✅ |
| Actual cost (`Σ carrier_charge`) | £12,517.31 | £12,517.31 | ✅ |
| ISO week label (`to_char(...,'IW')`) | W27 2026 | W27 2026 | ✅ |

Internal consistency: Σ carrier labels = Σ daily labels = overview = **3,631**; Σ carrier actual = overview = **£12,517.31**.
**No stale or incorrect data → no regeneration of embedded data was required.** `data.js` re-synced to the corrected object.

---

## PART 7 · UI validation (Step 6)

| Check | Verdict |
|---|:--:|
| Header colour `#15243d` (both themes) | ✅ PASS |
| Full-width layout, cards span window (`auto-fit` + `width:100%`) | ✅ PASS |
| Compact KPI cards, equal heights, no wasted whitespace | ✅ PASS |
| Responsive (desktop / laptop / tablet / mobile) | ✅ PASS |
| Light + dark mode (enterprise slate; `localStorage`) | ✅ PASS |
| Sticky header + sticky table headers, tab navigation | ✅ PASS |
| Accessibility (`:focus-visible`, colour **and** text on pills) | ✅ PASS |
| Consistent colours / status pills (OK·CHECK·LEAK·KILL, PASS·FAIL·N/A) | ✅ PASS |
| 0 external dependencies; embedded CSS/JS/data | ✅ PASS |
No redesign performed — only column additions and the KPI/BLOS wiring.

---

## PART 8 · Corrections implemented (Step 8)

1. **Lists (Sheet 8) restored to README** — issue types 9→**16** (removed 2 invented values), added **labelTypes (7)**, **destinations (23)**, **weightBands (9)**, **owners (10)**.
2. **Leakage Register** — invented Issue Types removed; now README enum (`Unmapped carrier`) or **NULL = uncategorised**. Added Week Start, Week Label, Trigger Source, Root Cause, Credit Recovered £, Label Type.
3. **Week Label `Wxx YYYY` (Section 20)** added to Booking Log, Weekly Invoice Check and Leakage Register (Daily Control + banner already had it).
4. **No hardcoded thresholds** — KPI Target and PASS/FAIL now derived at render from the `blos` object via `blos_key` (README audit check #2).
5. **Every README field now present** on Daily Control (H, J, K, M–P, Q), Booking Log (A, C, E, G, J, N, P, Q), Weekly Invoice Check (A, B, E, K, L–O, P), Leakage Register (C, F, L, N, O, P) — rendering **“—”** where PostgreSQL has no source. Nothing fabricated.
6. **Rate Card tab** now shows the README's 10-column sheet (empty) plus the derived baseline as an explicitly-labelled substitute.
7. **Filters** — Status and Issue Type dropdowns added on Leakage, sourced from Lists.
8. **`data.js` re-synced** to the corrected object; JS syntax and consistency verified.

---

## PART 9 · Production blockers & next actions

**Blockers (all are missing PostgreSQL sources — none are dashboard defects):**
1. `public.shipment.label_type` → unblocks Service side, Service spend %, Service ratio, Return rate, and full v3.1 closure.
2. Rate-card table → unblocks Forecast £ = Qty × Rate × (1+VAT%), and Rate-card-age KPI.
3. `invoice_received_amount/date/batch_id` (+ Royal Mail ingestion ≥95%) → unblocks true Invoice £ / Variance / Leakage.
4. Dispute/recovery table → unblocks Recovery rate, Days Open lifecycle, Credit Recovered £.
5. `service_tier`, `weight_band_kg`, `destination_zone` → unblocks the true Booking Log grain.
6. `blos` schema empty / BLOS API not live → thresholds currently read from workbook values.
7. Carrier normalisation table → replaces the documented `carrier_family` heuristic.
8. `iso_week_number` / `iso_week_year` stored columns (Section 20 production rule).

**Next actions:**
- **Sajeesan + Pratheepan:** add the missing columns/tables (blockers 1–5, 8).
- **Pratheepan (urgent):** fix Royal Mail invoice ingestion (README S15 calls this the single biggest blocker).
- **Sajeesan:** **correct README Section 21** — `ebay_order_expenses.transaction_memo` does not exist and `amz_refund_expenses` is absent, so Return Label In is *not* "available today".
- **Vithursali:** stand up the BLOS API so thresholds are live rather than workbook-sourced.
- **Sathees:** assign the 10 named carrier owners (all still `TBD — [Carrier]`).
- **Carrier owner (DHL):** investigate GAP-W27-01 (+£97.46 vs baseline) and set its Issue Type from Lists.
