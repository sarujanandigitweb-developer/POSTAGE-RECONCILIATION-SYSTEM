# 10 · UI Refinement & Full Validation Report

**Date:** 2026-07-08 · **Reporting week:** W27 2026 (2026-06-29 → 2026-07-05) · **As-of:** 2026-07-08
**Scope:** UI refinement + evidence-based validation of every worksheet: Excel → PostgreSQL → Dashboard.

> **Critical framing (read first).** The Excel workbook contains **dummy sample data for week
> W19 2026**. **PostgreSQL is the live source of truth** and the dashboard shows the latest complete
> week, **W27 2026**. Therefore the dashboard's numbers are **not expected to equal the workbook's
> dummy totals** — they are different weeks and the workbook data is illustrative. The validation
> criterion is: **Dashboard == PostgreSQL (exact)**, and **Dashboard structure/logic == Excel**.
> Excel dummy totals are shown only for reference.

---

## PART 1 · UI Changes Made

| # | Issue raised | Fix applied |
|---|--------------|-------------|
| 1 | KPI cards left empty space on the right | `.cards` grid changed from `auto-fill` → **`auto-fit`** with `minmax(150px,1fr)` and `width:100%`; `main` set to `width:100%` (no max-width cap, 18px side padding). Cards now stretch edge-to-edge. |
| 2 | Cards too tall / too much text | Card height reduced (padding 9×12, `min-height:0`, centered); value 21px; label/value/sub single-line with ellipsis; **8 compact cards, important-first**: Total Orders · Self-Labelled · Bookings · Actual Cost · Expected · Variance · Open Disputes · Daily Recon. Secondary text removed. |
| 3 | Dark mode washed-out / too bright | New **enterprise slate palette**: bg `#0e141f`, surface `#171f2c`, borders `#2b3648`, text `#e7ecf4` (high contrast); pills de-saturated; **header keeps `#15243d`** in both themes; hover uses `--accent-weak`. |
| 8 | General polish | Added `:focus-visible` outlines (keyboard); consistent section headers, sticky table headers, zebra rows, hover states, transitions; tightened spacing. |

Architecture unchanged: still one standalone HTML file, embedded CSS/JS/data, same 7 tabs, same
vanilla-JS render/sort/filter engine. **0 external dependencies** (verified).

---

## PART 2 · Per-Worksheet Validation (all 11 worksheets)

SQL references are queries in `dashboard/sql/dashboard_queries.sql`. "Excel Total" = workbook dummy
(W19). "PG Total" and "Dashboard Total" = live W27 2026.

### Sheet 0 · README
- **Dashboard section:** Reference tab / inline notes. **PG tables:** none (narrative spec).
- **Excel:** 22-section self-documenting spec. **Dashboard:** rules/definitions surfaced in notes + Reference.
- **Verdict: PASS** (documentation faithfully reflected; no data to reconcile).

### Sheet 1 · Dashboard
- **Dashboard section:** Overview (KPI cards + Carrier Summary + KPI table). **PG tables:** `order_transaction`, `order_shipping_billing_detail`. **SQL:** Q1, Q3, Q9.
- **Metric evidence (PG == Dashboard):**

  | Metric | Excel (dummy W19) | PostgreSQL (W27) | Dashboard (W27) | PASS |
  |--------|------------------:|-----------------:|----------------:|:----:|
  | Total Orders (week) | 2,975 | 4,020 | 4,020 | ✅ |
  | Self-Labelled | 2,742 | 3,484 | 3,484 | ✅ |
  | Bookings / labels | 2,832 | 3,631 | 3,631 | ✅ |
  | Actual postage cost £ | — | 12,517.31 | 12,517.31 | ✅ |
  | Expected £ (8-wk baseline) | 5,650.62* | 12,622.01 | 12,622.01 | ✅ |
  | Open disputes | 7 | 2 (auto-flagged) | 2 | ✅ |
- *Excel "Forecast £" is a rate-card figure that does not exist in PG; the dashboard uses the derived 8-week baseline (labelled). **Verdict: PASS.**

### Sheet 2 · Daily Control
- **Dashboard section:** Daily Control tab. **PG tables:** `order_transaction` (counts), `order_shipping_billing_detail` (labels, cost). **SQL:** Q2.
- **Weekly totals (PG == Dashboard):**

  | | Total Orders | FBA | Wayfair | Self-Labelled | Labels | Actual £ |
  |--|-----------:|----:|-------:|-------------:|------:|--------:|
  | Excel dummy (W19) | 2,975 | 143 | 90 | 2,742 | 2,832 | — |
  | PostgreSQL (W27) | 4,020 | 389 | 147 | 3,484 | 3,631 | 12,517.31 |
  | Dashboard (W27) | 4,020 | 389 | 147 | 3,484 | 3,631 | 12,517.31 |
  | PASS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
- Business rule verified per day: **Total = FBA + Wayfair + Self-Labelled** and **Gap = (Self+Wayfair) − Labels = 0** on all 7 days. **Verdict: PASS.** (Service-side columns M–P absent — see gaps.)

### Sheet 3 · Booking Log
- **Dashboard section:** Booking Log tab. **PG tables:** `order_shipping_billing_detail` ⋈ `order_transaction`. **SQL:** Q4.
- **Evidence:** buckets (date × carrier × destination, qty≥5) = **72**; labels in those buckets = **3,496**; total labels = **3,631** (135 in the <5 long tail). Dashboard shows exactly **72 rows / 3,496 labels**, footnoted.

  | | Buckets (≥5) | Labels covered | Total labels |
  |--|-----------:|--------------:|------------:|
  | PostgreSQL | 72 | 3,496 | 3,631 |
  | Dashboard | 72 | 3,496 | 3,631 |
- **Verdict: PASS** (grain reduced to available dimensions — Service/Weight/Label-Type absent; £ = real `carrier_charge`).

### Sheet 4 · Rate Card
- **Dashboard section:** Rate Card tab. **PG tables:** none — **no rate-card table exists in PostgreSQL.**
- **Excel:** 214-row Carrier×Service×Weight×Destination price list. **Dashboard:** shows the **derived 8-week baseline rate per carrier** (the README "default per carrier" fallback), clearly labelled, instead of a full rate card.
- **Verdict: PASS-with-GAP** (source missing; nothing fabricated; substitute documented). See Part 5.

### Sheet 5 · Weekly Invoice Check
- **Dashboard section:** Weekly Invoice Check tab + Overview Carrier Summary. **PG tables:** `order_shipping_billing_detail` ⋈ `order_transaction`. **SQL:** Q3, Q9.
- **Per-carrier (PG == Dashboard), corrected model (Actual = carrier_charge; Expected = 8-wk baseline × labels):**

  | Carrier | Labels | Expected £ | Actual £ | Variance £ | Status |
  |---------|------:|----------:|--------:|----------:|:-----:|
  | Royal Mail | 2,273 | 6,533.84 | 6,473.21 | −60.63 | CHECK |
  | DHL | 514 | 2,940.76 | 3,038.22 | +97.46 | LEAK |
  | Evri | 348 | 1,636.59 | 1,587.25 | −49.34 | LEAK |
  | Amazon Shipping | 223 | 970.05 | 970.05 | 0.00 | OK |
  | Wayfair | 146 | — | — | — | OK |
  | DPD | 78 | 315.90 | 315.90 | 0.00 | OK |
  | GLS | 25 | 113.50 | 113.50 | 0.00 | OK |
  | Others | 24 | 111.37 | 19.18 | −92.19 | KILL |
  | **TOTAL** | **3,631** | **12,622.01** | **12,517.31** | **−104.70** | CHECK |
- Every row matches PostgreSQL and `data.js`/dashboard exactly. Status uses the workbook formula (trigger £5, leakage 1%, Others→KILL). **Verdict: PASS.** (Excel "Invoice £" from ingested carrier statements is absent; carrier_charge used — see gaps.)

### Sheet 6 · Leakage Register
- **Dashboard section:** Leakage Register tab. **PG tables:** none dedicated — **no dispute/recovery table in PostgreSQL.**
- **Dashboard:** auto-flags carriers over the cost-variance threshold (DHL +£97.46 LEAK; Others KILL) = **2 rows**, labelled "derived from 8-week baseline". Recovery £, credit dates, dispute lifecycle are **not available**.
- **Verdict: PASS-with-GAP** (auto-flag logic reproduced; true dispute tracking needs a source). See Part 5.

### Sheet 7 · Gap Analysis
- **Dashboard section:** Reference (context). **PG tables:** none (static comparison). **Verdict: PASS** (reference only; no live data).

### Sheet 8 · Lists
- **Dashboard section:** filter dropdowns + `lookups`. **PG tables:** none (workbook-owned lists).
- **Evidence:** embedded lists match the workbook exactly — Carriers **10**, Statuses **7**, Label Types **7**, Weight Bands **9**, Destinations **23** (full set retained in earlier docs).
- **Verdict: PASS** (values copied verbatim from the workbook; Lists has no DB table).

### Sheet 9 · SOP
- **Dashboard section:** Reference. **PG tables:** none. **Verdict: PASS** (procedure; no data to reconcile).

### Sheet BLOS Thresholds
- **Dashboard section:** `blos` object → KPI targets + status thresholds. **PG tables:** `blos` schema **empty** (API not live).
- **Evidence:** all **15** keys embedded with workbook values (e.g. `leakage_trigger_gbp`=£5.00, `leakage_pct_max`=1%, `recovery_rate_min`=80%, `others_share_max`=2%). Dashboard KPI targets read from these.
- **Verdict: PASS** (verbatim from workbook; DB source empty by design).

### Per-worksheet PASS/FAIL summary

| # | Worksheet | Verdict |
|---|-----------|---------|
| 0 | README | ✅ PASS |
| 1 | Dashboard | ✅ PASS |
| 2 | Daily Control | ✅ PASS |
| 3 | Booking Log | ✅ PASS |
| 4 | Rate Card | ⚠️ PASS-with-GAP (no rate-card table) |
| 5 | Weekly Invoice Check | ✅ PASS |
| 6 | Leakage Register | ⚠️ PASS-with-GAP (no dispute table) |
| 7 | Gap Analysis | ✅ PASS |
| 8 | Lists | ✅ PASS |
| 9 | SOP | ✅ PASS |
| — | BLOS Thresholds | ✅ PASS |

**9 full PASS · 2 PASS-with-GAP · 0 FAIL.** No dashboard value contradicts PostgreSQL.

---

## PART 3 · PostgreSQL Validation

- Access: **read-only** via Claude MCP. No INSERT/UPDATE/DELETE/DDL issued.
- Tables used: `public.order_transaction`, `public.order_shipping_billing_detail`.
- Headline re-confirmed 2026-07-08: 4,020 orders · 389 FBA (`fba_sales AND source_name='AMAZON'`) · 147 Wayfair · 3,484 self-labelled · 3,631 labels · £12,517.31 actual cost.
- Internal consistency: Σ carrier labels = Σ daily labels = overview labels = **3,631**; Σ carrier actual = Σ daily actual = overview actual = **£12,517.31**.

## PART 4 · Dashboard Validation (Dashboard == PostgreSQL)

Automated check confirms `data.js` and the HTML-embedded object are **byte-identical** for
`carrierSummary`, `dailyControl` and `bookingLog`, and that every total equals the PostgreSQL result.
Order-math holds on all 7 days. Result: **CONSISTENT & VALIDATED**.

## PART 5 · Remaining Data Gaps (Excel requires / PostgreSQL lacks — nothing invented)

| Excel need | Missing in PostgreSQL | Consequence in dashboard |
|------------|-----------------------|--------------------------|
| Label Type (7 types) | `shipment.label_type` (table/column absent) | Service side, Service spend %, Service ratio, Return rate = **N/A** |
| Service / Weight / Destination-zone | `service_tier`, `weight_band_kg`, `destination_zone` columns absent | Booking Log grain reduced to date × carrier × country |
| Rate card | no rate-card table | "Expected £" uses derived 8-week baseline (labelled) |
| Invoice ingestion | `invoice_received_amount/date/batch_id` absent | "Actual £" uses `carrier_charge` (real cost) |
| Dispute / recovery | no dispute table | Recovery rate, dispute age, credit £ = **N/A**; Leakage auto-flagged only |
| BLOS thresholds | `blos` schema empty / API not live | thresholds sourced from the workbook |
| Carrier normalisation | free-text `carrier_name` | `carrier_family` is a documented heuristic |
| Currency | `carrier_charge_currency` mixes GBP+EUR, no FX | £ totals treated as indicative for cross-currency rows |

## PART 6 · Files Modified (this phase)

- `dashboard/postage_reconciliation_dashboard.html` — full-width `auto-fit` cards, compact card height, enterprise dark palette, focus states, spacing/polish. Corrected data embedded.
- `dashboard/data.js` — rewritten to the corrected model; now byte-identical to the HTML embedded data.
- `dashboard/sql/dashboard_queries.sql` — added **Q9** (corrected carrier reconciliation) previously.
- `documentation/10_ui_and_validation_report.md` — this report.
- `CHANGELOG.md` — version entry.
- `dashboard/README.md` — data-basis note updated to the corrected model.

## PART 7 · Remaining Limitations

- The dashboard is an **interim operational view**: order/label volumes, carrier mix, actual postage
  cost and daily reconciliation are production-grade; leakage/recovery and the service/return
  dimensions await the missing sources above.
- "Expected £" is a **derived 8-week baseline**, not a rate-card forecast — flagged in the UI.
- Booking Log shows buckets ≥5 labels (72 buckets / 3,496 of 3,631 labels); the small long tail is summarised, not per-parcel.
