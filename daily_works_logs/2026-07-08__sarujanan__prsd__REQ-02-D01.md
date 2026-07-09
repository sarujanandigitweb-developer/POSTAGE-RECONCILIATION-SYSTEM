# SKILL FILE — DAILY KNOWLEDGE EXTRACTION
# DIGITWEB LK LTD · Daily Skill Increment System · v3.0

---

## MANDATORY METADATA BLOCK

| Field | Value |
|-------|-------|
| date | 2026-07-08 |
| developer | Sarujanan |
| project | Postage Reconciliation System Dashboard |
| project_code | PRSD |
| phase | REQ-02 — Dashboard UI Refinement & Data Validation |
| requirement_id | REQ-02 |
| deliverable_id | D01 |
| status | Completed (A09 responsive device-test = validation_needed) |
| evidence_location | dashboard/postage_reconciliation_dashboard.html + dashboard/data.js + dashboard/sql/dashboard_queries.sql (Q1–Q9) + documentation/10_ui_and_validation_report.md + daily_works_logs/2026-07-08__sarujanan__prsd_daily-activities.csv (D01-A01..D01-A09) + CHANGELOG.md (0.3.2). Pending memory: daily_task.tbl_prsd_sarujanan (table not yet created). |
| blos_keys_used | none live — the 15 `postage.*` keys (leakage_trigger_gbp, leakage_pct_max, others_share_max, recovery_rate_min, dispute_age_max_days, rate_card_age_max_days, daily_recon_target, service_spend_pct_max, service_ratio_max, return_rate_max, …) are read from the embedded `blos` object sourced from the workbook, because the DB `blos` schema is EMPTY and the BLOS API is not live. Values are referenced, not inlined, in dashboard logic. |
| hardcoded_thresholds | Sourced from workbook, referenced via the embedded `blos` object (flagged for BLOS migration): leakage_trigger = £5.00, leakage_pct_max = 1.0%, others_share_max = 2.0%, recovery_rate_min = 80%, dispute_age_max_days = 14. Reporting week fixed = W27 2026 (2026-06-29→2026-07-05); expected-cost baseline window = prior 8 weeks (W19–W26); carrier-family ILIKE match order = Smart Track → Wayfair → Evri/Hermes → DHL → GLS → DPD → USPS → Amazon → Royal Mail → Others. |
| three_am_standard | PASS |
| llm_queryable | TRUE |
| company_knowledge_candidate | TRUE |
| domain | Accounts \| Postage Reconciliation \| Dashboard \| Data Validation \| PostgreSQL |
| User | Accounts Team |
| Benefit status | Pass — dashboard is business-ready (full-width compact KPI cards, professional enterprise dark mode), the cost model is corrected to real data, and all 11 Excel worksheets are validated against PostgreSQL (9 PASS / 2 PASS-with-GAP / 0 FAIL). |

## File path (fill after saving):
# 2026-07-08__sarujanan__prsd__REQ-02-D01.md

---

## 1. SYSTEM STATE

- After Phase 3 a **standalone single-file dashboard** existed (`dashboard/postage_reconciliation_dashboard.html`, embedded `data.js`) but with three defects: KPI cards left **empty space on the right** (grid used `auto-fill`), cards were **too tall** with secondary text, and **dark mode was washed-out / too bright**.
- The financial model was **wrong**: "Forecast £" summed `order_shipping_billing_detail.shipping_template_price`, which made **every carrier show a large false LEAK** and every reconciliation look broken.
- `data.js` was a stale snapshot on that flawed basis; there was **no evidence-based, per-worksheet validation** against PostgreSQL.
- Source of truth = PostgreSQL (read-only via Claude MCP); business reference = `Accounts_postage_reconciliation_v3_merged.xlsx` (v3.4) which itself holds **dummy sample data for week W19 2026**.

---

## 2. WHAT CHANGED TODAY

- **Full-width, compact KPI cards.** Changed `.cards` grid from `auto-fill` to **`auto-fit` + `minmax(150px,1fr)` + `width:100%`** and set `main` to `width:100%`, so the KPI strip stretches edge-to-edge with no right gap. Reduced card height (`padding 9×12`, `min-height:0`, centered, single-line label/value/sub with ellipsis) and cut to **8 important-first metrics**: Total Orders, Self-Labelled, Bookings, Actual Cost, Expected, Variance, Open Disputes, Daily Recon.
- **Enterprise dark mode.** Reworked `html[data-theme="dark"]` variables to a slate palette (bg `#0e141f`, surface `#171f2c`, border `#2b3648`, text `#e7ecf4`, accent `#5b9bf0`) with de-saturated status pills; the brand **header stays `#15243d` in both themes**. Added `:focus-visible` outlines.
- **Corrected cost model.** Actual £ = `carrier_charge` (reliable); Expected £ = **prior-8-week (W19–W26) average `carrier_charge` per carrier × current-week labels** (the workbook README "default per carrier" fallback, since no rate card exists); Variance = Actual − Expected; Status by the workbook rule.
- **Rebuilt `data.js`** for reporting week **W27 2026** entirely from read-only PostgreSQL (no mock data); made it byte-identical to the object embedded in the HTML.
- **Added query Q9** (corrected carrier reconciliation, SELECT-only) to `dashboard/sql/dashboard_queries.sql`.
- **Validated all 11 worksheets** Excel → PostgreSQL → Dashboard and wrote `documentation/10_ui_and_validation_report.md`; logged CHANGELOG `0.3.2`.

---

## 3. POSTGRESQL / MCP FINDING

- **`shipping_template_price` is 67% zero** for the reporting week → **unusable as a forecast** (this was the root cause of the false all-LEAK dashboard).
- **`carrier_charge` is the reliable actual postage cost** — only **4.8% NULL** in W27, avg **£3.62/label**; it is the single trustworthy financial column.
- **Missing sources (confirmed absent):** no rate-card table, no invoice-ingestion columns, no dispute/recovery table, and no `label_type` / `service_tier` / `weight_band_kg` / `destination_zone` columns on `order_shipping_billing_detail`. The `blos` schema exists but is **empty**.
- **`carrier_name` is free text** embedding carrier+service+weight (e.g. `ROYAL MAIL TRACKED 48 NEX(2kg)`, `Smart Track Hermes 2Kg`) → requires heuristic family classification; **precedence matters** (Smart Track / Wayfair matched before Royal Mail / Amazon).
- **FBA definition verified:** `fba_sales = TRUE AND source_name = 'AMAZON'` = 389 rows (all FBA is Amazon; none non-Amazon).
- **W27 2026 (2026-06-29→07-05) is the last COMPLETE ISO week**; `order_transaction.order_date` runs to 2026-07-08. Headline (read-only): **4,020 orders · 389 FBA · 147 Wayfair · 3,484 self-labelled · 3,631 labels · £12,517.31 actual cost.**
- **Memory-table finding (during import step):** `daily_task.tbl_prsd_sarujanan` **does not exist** — sibling tables `tbl_psld_sarujanan`, `tbl_wlsp_sarujanan`, `tbl_ospm_sarujanan` exist, so the PRSD table's CREATE DDL was generated but never executed.

---

## 4. GAP FOUND

- **No rate-card table** → "Expected £" is a **derived 8-week baseline**, not a true rate-card forecast (labelled in the UI).
- **No invoice ingestion** → "Actual £" uses `carrier_charge`, not an ingested carrier statement.
- **No `label_type`** → Service Labels (Daily Control M–P), Service spend %, Service-to-customer ratio and Return rate KPIs are **N/A** (not fabricated).
- **No dispute/recovery table** → Recovery rate and Avg dispute age are **N/A**; the Leakage Register is auto-flagged from the cost-variance check only (2 rows: DHL LEAK, Others KILL).
- **`carrier_charge` mixes GBP + EUR** with no FX table → cross-currency £ totals are **indicative**.
- **`carrier_family` is a heuristic** — no official carrier normalisation map exists.
- **`daily_task.tbl_prsd_sarujanan` missing** → today's daily-activities CSV cannot be imported to memory until the table is created.

---

## 5. VALIDATION RULE ADDED OR CHANGED

- **Cost model rule (NEW / GOVERNING):**
  `IF a source "expected/template" column is mostly zero/null (shipping_template_price = 67% zero) THEN do NOT use it as Forecast. Actual £ = carrier_charge. Expected £ = (prior-8-week AVG(carrier_charge) per carrier) × current-week labels.`
  `Status: IF carrier='Others' → KILL; ELSE IF |Var £| >= £5 AND |Var %| > 1% → LEAK; ELSE IF |Var £| >= £5 → CHECK; ELSE OK.`
- **Worksheet validation rule (NEW):**
  `A worksheet PASSES when Dashboard == PostgreSQL EXACTLY and structure/logic == Excel. The Excel workbook holds dummy W19 data, so its totals are reference-only and a week-mismatch is NOT a failure.`
- **Order-math rule (RE-AFFIRMED):**
  `Total Orders = FBA + Wayfair + Self-Labelled; Gap = (Self-Labelled + Wayfair) − Labels-in-Booking-Log; a day reconciles when Gap = 0 (held on all 7 days).`
- **Read-only rule (RE-AFFIRMED):** `the SQL pack (Q1–Q9) is SELECT-only; no INSERT/UPDATE/DELETE/DDL against production.`

---

## 6. FAILURE MODE OR EDGE CASE

- **Sparse-column trap:** summing a mostly-zero column (`shipping_template_price`) as a business metric produces a plausible-but-wrong result (every carrier LEAK). Always check the null/zero rate of a column before trusting it.
- **Mixed-currency totals:** GBP + EUR summed without an FX table overstates £; treat as indicative and flag it.
- **Heuristic mis-classification:** `carrier_name` strings like `Smart Track Royalmail 2nd` or `Smart Track AMAZON SHIPPING` must match **Smart Track first** — wrong CASE order would mis-bucket them into Royal Mail / Amazon.
- **Reference-vs-live confusion:** comparing the dashboard to the Excel dummy W19 totals and calling the difference a bug — the criterion is Dashboard == PostgreSQL, not Dashboard == Excel.
- **Missing memory table:** the daily-activities import fails fast because `daily_task.tbl_prsd_sarujanan` was never created (DDL generated, not executed).

---

## 7. DECISIONS MADE TODAY

- **Use `carrier_charge` as the financial truth** and **derive** the expected baseline from a trailing 8-week average (the README "default per carrier" fallback) instead of inventing a rate card.
- **Never fabricate missing-source values** — leakage/recovery/service/return KPIs render **N/A** with the missing column/table named.
- **`auto-fit` grid, not `auto-fill`**, so KPI columns stretch to fill the full width; keep the **brand header colour fixed** across light/dark.
- **Validate sheet-by-sheet** with a three-way table (source-of-truth DB vs reference workbook vs dashboard) and an explicit PASS / PASS-with-GAP / FAIL verdict, rather than a single overall claim.
- **Do not create the memory table on a false premise** — stop and confirm before any schema change.

---

## 8. COMPANY KNOWLEDGE EXTRACT

Reusable intelligence for future projects/departments:

- **Sparse-column guard (REUSABLE PATTERN):** before using any "expected / template / target" column in a calculation, measure its NULL/zero rate; if it is largely empty, it is not a usable baseline — derive one instead.
- **Trailing-window baseline (REUSABLE PATTERN):** when a true reference (rate card, budget, plan) is missing, derive a per-entity expected value = `AVG(reliable_actual over a trailing N-week window) × current volume`. It surfaces rate/mix drift as a real signal and is honest about its basis.
- **Source-of-truth framing (REUSABLE RULE):** when the human reference (a workbook/spreadsheet) contains dummy or lagging data and the database is live, the validation target is **Dashboard == Database**; the reference governs **structure and logic only**. State this before comparing, or a week-mismatch is misread as a defect.
- **Full-width KPI strip (REUSABLE UI):** CSS grid `auto-fit` + `minmax(min,1fr)` + `width:100%` stretches cards edge-to-edge with no trailing gap; keep cards single-line and equal-height for a compact enterprise KPI row.
- **Enterprise dark mode (REUSABLE UI):** theme with CSS custom properties on `html[data-theme]`, keep the brand colour fixed across themes, and **de-saturate** status colours so cards are not washed-out or glaring.
- **Honest gap discipline (REUSABLE RULE):** where a required source is absent, show **N/A** and name the exact missing column/table/join — never invent a value to fill a KPI.

---

## 9. LLM STANDARD CHECK

- Terminology consistent (actual/expected, carrier_charge, baseline, carrier_family, source of truth): **TRUE**
- Business rules expressed as IF/THEN with concrete conditions/thresholds: **TRUE**
- Assumptions documented (derived baseline, indicative £, Excel dummy vs live DB): **TRUE**
- Edge cases documented (sparse column, mixed currency, heuristic order, missing table): **TRUE**
- Evidence referenced (4,020 / 3,631 / £12,517.31; Q9; 9 PASS/2 PASS-with-GAP; report + changelog + CSV): **TRUE**
- Another developer/LLM can continue independently (gaps + next actions stated): **TRUE**
- LLM queryable / 3 AM standard: **TRUE / PASS**

### NEXT ACTIONS
1. **Create `daily_task.tbl_prsd_sarujanan`** (DDL ready in `sql/create_tbl_prsd_sarujanan.sql`), then import `2026-07-08__sarujanan__prsd_daily-activities.csv` via the idempotent UPSERT on `(project_code, activity_id)`.
2. **Ingest a real rate card + carrier invoices** to replace the derived 8-week baseline with a true Forecast £ / Invoice £.
3. **Add `label_type` / `service_tier` / `weight_band_kg` / `destination_zone`** columns so Service and Return KPIs move from N/A to live.
4. **Replace the `carrier_family` heuristic** with an official carrier normalisation table.
5. **Device-test the responsive layout** (A09) on real tablet/mobile hardware before UAT sign-off.
