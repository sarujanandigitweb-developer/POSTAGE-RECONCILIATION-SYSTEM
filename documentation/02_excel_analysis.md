# 02 · Excel Workbook Analysis

**File:** `Accounts postage_reconciliation_v3_merged.xlsx`
**Version:** v3.4 (README sheet header says v3.0; changelog sections carry it to v3.4)
**Worksheets:** 11 (all `state="visible"` — no hidden sheets)
**Charts:** none (status shown via conditional-formatting pills)
**Comments:** 3 comment parts (`comments1-3.xml`) — column hover-help added in v3.4
**Defined names:** 25 (15 BLOS keys + 10 list/rate-card ranges)
**Method:** parsed the raw OOXML (sharedStrings + worksheet XML) so every value **and formula**
was read directly — see `scripts`/scratchpad parser. Dates are Excel serials (epoch 1899-12-30);
`46147 = 2026-05-05`, so the sample reporting week is **W19 2026 (05–11 May)**.

---

## 0. `0. README` — self-documenting specification

- **Purpose:** the single source of truth for the whole workbook. 22 sections, ~180 content rows,
  merged banner cells, colour-coded section headers.
- **Business owner:** Sajeesan (schema/content) + Sathees (process).
- **Content:** purpose & scope; role-based quick start; glossary; carrier catalogue; sheet map;
  data-flow diagram; **field-level annotations for every operational column**; **plain-English
  formula reference**; BLOS register; ownership map; daily/weekly workflow; dispute lifecycle;
  known edge cases; **postgres column mapping**; audit checklist; extension procedures; version
  history & sign-offs; v3.1/v3.2/v3.3/v3.4 changelogs.
- **Dashboard role:** **Reference, not a page.** This becomes the developer/LLM spec and the
  "About / Definitions" content. It is *not* rendered as an operational dashboard tab (optional
  collapsible "Glossary & rules" drawer only).

## 1. `1. Dashboard` — the KPI view (THE primary page to reproduce)

- **Purpose:** live KPI view of the current reporting week + open disputes.
- **Grain:** one row per carrier (10 rows) + a KPI table.
- **Owner:** auto-computed only, no manual entry.
- **Components:**
  - **Banner (row 2):** dynamic reporting-week label, e.g.
    `REPORTING WEEK: W19 2026 · 05 May – 11 May 2026` — computed from MIN/MAX of Daily Control dates.
  - **5 top KPI cards (row 5–6):** Total Orders (week), Self-Labelled, Forecast £ (week),
    Leakage £ (open), Open Disputes. Each is a `SUMIF`/`COUNTIF`/direct ref into operational sheets.
  - **Weekly Carrier Summary (rows 9–18):** 10 carriers × {Labels, Forecast £, Invoice £,
    Variance £, Variance %, Status, Owner}. Every cell is a **direct reference** to
    `5. Weekly Invoice Check` (no recomputation → single source of truth).
  - **Mandatory KPI table (rows 21–31):** 10 KPIs, each with Target (BLOS named range), Actual
    (formula), BLOS Key, Status (`PASS`/`FAIL`). See `01_business_requirements.md` §5.
  - **Build-prerequisites note (row 33):** the 5 production blockers.
- **Conditional formatting:** status pills — Carrier Status `G10:G18` (OK green / CHECK amber /
  LEAK|KILL red); KPI Status `E22:E31` (PASS green / FAIL red).
- **Sample-data note:** several KPIs currently **FAIL** in the dummy data (Recovery rate = 0,
  Avg dispute age ≈ 69 days, leakage £/%). These are real formula outputs on sample data.
- **⚠ Fudge factors in sample data:** some Weekly Invoice Check "Invoice £" cells are simulated by
  multiplying Forecast (e.g. Evri `=F7*1.22`, DPD `=F10*1.32`). In production Invoice £ is real
  (manual entry / ingested). The dashboard must **not** hardcode these multipliers.

## 2. `2. Daily Control` — daily reconciliation

- **Purpose:** reconcile Orders → Labels → Forecast per calendar day, both customer and service side.
- **Grain:** one row per day (sample rows 5–11 = the 7 days of W19; row 12 = weekly total).
- **Owner:** Postage team operator (cols B/C/D/E/M manual); rest auto.
- **Columns:** A Date · B Total Orders · C FBA Excluded · D Wayfair · E Self-Labelled (expected) ·
  F Labels in Booking Log (`SUMIFS` Customer Order by date) · G Order vs Label Gap `=(D+E)-F` ·
  H Forecast £ Inc VAT (`SUMIFS` BL col N by date) · I Closure Status (3-condition `IF`) ·
  J Closed By · K Notes · L Day Status pill · **M** Service Labels expected · **N** Service Labels
  in BL (`SUMIFS` over 6 service types) · **O** Service Gap `=M-N` · **P** Service Forecast £ ·
  **Q** Week Label (`"W"&TEXT(ISOWEEKNUM,...)`).
- **Conditional formatting:** 9 blocks (closure / gap / day-status pills).
- **Dashboard role:** operational **page** (Daily Control tab) + feeds top KPI cards + KPI 22/29/30.

## 3. `3. Booking Log` — the transactional grain (backend data)

- **Purpose:** every parcel booking, broken down by 4 dimensions + Label Type.
- **Grain:** one row per `(Date × Carrier × Service × Weight × Destination × Label Type)` bucket.
- **Populated rows:** ~187 (data rows 5–~192); formulas filled to row 1000.
- **Owner:** Postage/warehouse operator (prod: postgres trigger).
- **Columns:** A Booking ID (`BKG-NNNNN`) · B Date · C Order ID (postgres placeholder) · D Carrier ·
  E Service · F Destination · G Weight Band · H Qty Labels · **I Lookup Key** `=D&"|"&E&"|"&G&"|"&F` ·
  **J Rate Ex VAT** `=IFERROR(INDEX(RateCardRate,MATCH(I,RateCardKey,0)),0)` · K Forecast Ex `=H*J` ·
  **L VAT %** `=IFERROR(INDEX(RateCardVAT,MATCH(I,RateCardKey,0)),0)` · M VAT £ `=K*L` ·
  **N Forecast Inc** `=K+M` · O Status · **P Label Type** (dropdown) · Q Week Label.
- **Data validation:** list dropdowns on Carrier (D), Destination (F), Weight Band (G), Label Type (P).
- **Conditional formatting:** 4 blocks.
- **Dashboard role:** **backend data** (embedded JSON) + optional **drill-down table** with filters.

## 4. `4. Rate Card` — master price lookup (lookup table)

- **Purpose:** master price list; drives every Forecast £.
- **Grain:** one row per `(Carrier × Service × Weight Band × Destination)`.
- **Populated rows:** ~214 (rows 5–~218; named ranges use A5:A219 / G5:G219 / H5:H219).
- **Owner:** Sathees signs off · Pratheepan ETL maintains.
- **Columns:** A Lookup Key · B Carrier · C Service · D Weight Band · E Max kg · F Destination ·
  **G Rate Ex VAT £** · **H VAT %** · I Effective From (`rate_card_age_max_days`) · J Notes.
- **Named ranges:** `RateCardKey` (A), `RateCardRate` (G), `RateCardVAT` (H).
- **Dashboard role:** **lookup table** (embedded) — used only to reproduce/verify Forecast £; in
  production the Forecast £ is computed in SQL, so the rate card is reference/validation data.

## 5. `5. Weekly Invoice Check` — weekly carrier reconciliation

- **Purpose:** weekly Forecast £ vs Invoice £ per carrier; produces the OK/CHECK/LEAK/KILL status.
- **Grain:** one row per carrier per week (sample rows 5–13 = 9 carrier rows; row 14 = TOTAL).
- **Owner:** admin owner per carrier enters Invoice £ (col G); rest auto.
- **Columns:** A Week Start · B Week End · C Carrier · D Labels (`SUMIFS` BL Qty by carrier+week) ·
  E Forecast Ex · F Forecast Inc · **G Invoice £ Inc VAT (manual)** · **H Variance £** `=G-F` ·
  **I Variance %** `=IFERROR(H/F,0)` · **J Status** (KILL/LEAK/CHECK/OK) · K Owner (VLOOKUP Owners) ·
  L Customer Labels · M Service Labels · N Customer Forecast £ · O Service Forecast £ · P Week Label.
- **Dashboard role:** operational **page** (Weekly Invoice Check tab); the Carrier Summary block on
  the Dashboard mirrors this sheet directly.

## 6. `6. Leakage Register` — dispute tracker

- **Purpose:** open disputes, auto-flagged from Weekly Check + manual order-level entries.
- **Grain:** one row per dispute (`GAP-NNN`); sample rows 5–11 = 7 disputes; row 12 = OPEN TOTAL.
- **Owner:** carrier owner per row; Sathees triages.
- **Columns:** A Gap ID · B Date Raised · C Week Start · D Carrier · E Issue Type · F Trigger Source ·
  G Forecast £ (VLOOKUP WIC) · H Invoice £ (VLOOKUP WIC) · **I £ Leakage** `=H-G` · **J Days Open**
  (`IF status∈{Recovered,Closed} "—" else TODAY()-DateRaised`) · K Owner · L Root Cause/Notes ·
  **M Status** (lifecycle) · **N Credit Recovered £ (manual)** · O Label Type · P Week Label.
  Row 12 OPEN TOTAL: sums G/H/I only for Status ∈ {Open, Investigating, Chase carrier}.
- **Conditional formatting:** 5 blocks (Days Open L1/L2 escalation colours; status).
- **Dashboard role:** operational **page** (Leakage / Disputes tab) + feeds Leakage £ card, Open
  Disputes card, Recovery-rate KPI, Avg-dispute-age KPI.

## 7. `7. Gap Analysis` — static capability comparison

- **Purpose:** one-time comparison of Team Tracker vs GPT v2 vs this v3 template across ~18 areas.
- **Grain:** one row per capability area.
- **Owner:** Sajeesan; updated only on scope change.
- **Dashboard role:** **Reference** (not an operational page). Optional static "Why v3" info panel.
  Useful context for reviewers; no live data.

## 8. `8. Lists` — dropdown source (lookup / filter source)

- **Purpose:** the source of every data-validation dropdown; drives named ranges.
- **Grain:** one item per list per category (columns are independent lists).
- **Columns / named ranges:**
  - A **Carriers** (10): Royal Mail, DHL, Evri, Amazon Shipping, USPS, DPD, GLS, Smart Track,
    Wayfair, Others → `Carriers`.
  - B **Statuses** (7): Open, Investigating, Chase carrier, Credit expected, Recovered, Closed,
    Killed → `Statuses`.
  - C **Issue Types** (16) → `IssueTypes`.
  - D **Owners** (10, all `TBD — …` placeholders) → `Owners`.
  - E **Destinations** (23) → `Destinations`.
  - F **Weight Bands** (9: 0.5/1/2/3/5/10/15/30kg, n/a) → `WeightBands`.
  - G **Label Types** (7) → `LabelTypes`.
- **Dashboard role:** **filters + lookup** (embedded) — populate dropdown/filter controls; validate
  incoming Postgres enums.

## 9. `9. SOP` — procedure & hard rules

- **Purpose:** daily/weekly procedure + hard rules (day cannot close with non-zero gap; no
  hardcoded thresholds; recovery ≥ 80%; dispute > 14 days escalates).
- **Grain:** one step per row.
- **Owner:** Sathees.
- **Dashboard role:** **Reference** (optional "How this works" drawer). No live data.

## 10. `BLOS Thresholds` — threshold register (config)

- **Purpose:** every threshold value used in formulas; production fetches via BLOS API.
- **Grain:** one row per BLOS key. **15 keys.**
- **Owner:** **Vithursali only.**
- **Columns:** A BLOS Key · B Description · C **Current Value** · D Unit (pct/gbp/days).
- **The 15 keys** (value):
  `leakage_pct_max` 0.01 · `leakage_trigger_gbp` 5.0 · `others_share_max` 0.02 ·
  `invoice_coverage_target` 1.0 · `recovery_rate_min` 0.8 · `dispute_age_max_days` 14 ·
  `rate_card_age_max_days` 30 · `daily_recon_target` 1.0 · `cost_variance_max` 0.03 ·
  `dispute_l1_days` 7 · `dispute_l2_days` 14 · `service_spend_pct_max` 0.05 ·
  `service_ratio_max` 0.03 · `replacement_per_order_max` 2 · `return_rate_max` 0.02.
- **Dashboard role:** **config / lookup** (embedded) — every KPI target and status threshold reads
  from here. **Never inline these numbers in dashboard code.**

---

## Formula inventory (what the dashboard must reproduce, by category)

| Category | Where | Reproduction approach in dashboard |
|----------|-------|------------------------------------|
| Lookup Key concat | Booking Log I | Build in SQL / JS from 4 dims |
| Rate & VAT lookup (INDEX/MATCH) | Booking Log J,L | Join Booking → Rate Card in SQL (or precomputed) |
| Forecast Ex/VAT/Inc | Booking Log K,M,N | Arithmetic on looked-up rate |
| Daily SUMIFS (by date, by label type) | Daily Control F,H,N,P | SQL GROUP BY date / label_type |
| Closure 3-condition logic | Daily Control I | JS/SQL boolean reproduction |
| Weekly SUMIFS (by carrier, week) | Weekly Invoice Check D,E,F,L–O | SQL GROUP BY carrier within week |
| Variance & status (OK/CHECK/LEAK/KILL) | Weekly Invoice Check H,I,J | JS/SQL against BLOS thresholds |
| Leakage & Days Open | Leakage Register I,J | SQL/JS; `Days Open` uses "as-of" date |
| Open totals (status-filtered SUMIF) | Leakage Register 12 | SQL filtered aggregate |
| KPI actuals (SUMIF/COUNTIF/ratios) | Dashboard C22–C31 | JS/SQL; compare to BLOS target |
| PASS/FAIL & pill classification | Dashboard E; cond. formatting | JS class logic (lower/higher-is-better) |
| Reporting week label (ISO week) | Dashboard row 2; Q columns | JS ISO-8601 week from dates |

**Non-reproducible-as-is caveats to carry into design:**
- `TODAY()`-based fields (Days Open, Rate card age) must use a **defined "as-of" date** (the data
  snapshot date), not the viewer's clock, so embedded values stay consistent and match the workbook
  at snapshot time. See `04_dashboard_plan.md` §Refresh and `06_validation_plan.md`.
- The sample-data invoice **fudge multipliers** are not business logic — ignore them; use real
  Invoice £ from Postgres/manual source.
