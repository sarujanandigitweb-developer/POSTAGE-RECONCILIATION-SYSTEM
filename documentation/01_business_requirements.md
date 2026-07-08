# 01 · Business Requirement Summary

Extracted from the project `README.md` and the workbook's self-documenting `0. README` sheet
(Sections 1–22, v3.0 → v3.4). Nothing here is assumed; every rule traces to a source.

---

## 1. Objective

Replace manual spreadsheet viewing with an **automatically updated, read-only HTML dashboard**
that:

- Retrieves data from PostgreSQL.
- Refreshes automatically.
- Preserves business calculations.
- Never introduces different business logic.
- Remains read-only.

## 2. Scope

### In scope (workbook README Section 1 + Section 21 correction)
- All self-labelled parcels across **UK, DE, US** warehouses.
- All directly-booked carriers: **Royal Mail, DHL, Evri, Amazon Shipping, USPS, DPD, GLS, Smart Track**.
- **Wayfair** 3rd-party labels (counted, not costed — marketplace pays).
- Forecast £ per booking from the rate card.
- Weekly variance vs carrier invoice.
- Dispute lifecycle from Open → Recovered.
- **Returns postage** (in scope since v3.3): `Return Label In` (marketplace-billed) and
  `Return Label Out` (carrier-billed).
- **Service labels** (since v3.1): Replacement Out, Missing Part Out, Collection In, Other Service.

### Out of scope (workbook README Section 1)
- FBA shipments (Amazon invoices these separately).
- Inbound freight (landed-cost analysis).
- Pallet shipments (separate workbook).
- Customs / duty charges (finance).

## 3. Project scope for the dashboard build

| Allowed | Not allowed |
|---------|-------------|
| Read PostgreSQL | Modify production data |
| Create HTML dashboard | Change PostgreSQL schema |
| Create JavaScript | Change business rules |
| Create SQL | Change BLOS thresholds |
| Create documentation | Replace / re-derive workbook calculations |
| Create validation reports | Write back to any production system |

## 4. Business rules (canonical — do not re-interpret)

These are lifted from the workbook. The dashboard must reproduce, not redesign, them.

### 4.1 Label & booking model
- **Order** ≠ **parcel** ≠ **label**. One order → possibly many parcels/labels.
- A **booking** = one `(Date × Carrier × Service × Weight Band × Destination × Label Type)` bucket
  with a summed Qty. Not one row per parcel.
- **Label Type** taxonomy (7 values, v3.3): `Customer Order`, `Replacement Out`, `Missing Part Out`,
  `Collection In`, `Return Label In`, `Return Label Out`, `Other Service`.
  - **Customer Order** includes Wayfair + all self-labelled outbound.
  - The **6 non-Customer-Order** types are collectively "Service labels".

### 4.2 Forecast £ (the core calculation)
```
Lookup Key   = Carrier | Service | Weight Band | Destination      (pipe-joined, no spaces around |)
Rate Ex VAT  = VLOOKUP/INDEX-MATCH(Lookup Key → Rate Card),  0 on miss  (IFERROR)
Forecast Ex  = Qty × Rate Ex VAT
VAT %        = VLOOKUP/INDEX-MATCH(Lookup Key → Rate Card VAT%), 0 on miss
VAT £        = Forecast Ex × VAT %
Forecast Inc = Forecast Ex + VAT £
```
- **VAT is per-row, not flat 20%.** UK Tracked = 20%; UK RM 1st/2nd (Universal Service) = 0%;
  DE Domestic = 19%; International = 0%; USA = 0%; Smart Track UK = 20% (reseller, no RM exemption).
- A rate lookup miss yields Forecast £ = **£0**, which is intentional — it surfaces unmapped
  bookings as a visible problem (do not hide it).

### 4.3 Daily closure (Daily Control)
A day reads **✓ Closed** only when **all three** are true:
1. `Total Orders = FBA Excluded + Wayfair + Self-Labelled` (order math), AND
2. Customer Gap `(Self-Labelled + Wayfair) − Customer labels in Booking Log = 0`, AND
3. Service Gap `Service Labels expected − Service Labels in Booking Log = 0`.

Otherwise the status is `Mismatch — Order Math` / `Mismatch — Customer` / `Mismatch — Service`.
Hard rule: **a day cannot close until ✓ Closed.**

### 4.4 Weekly invoice check → status
Per carrier per week, `Variance £ = Invoice £ − Forecast £ Inc VAT`, `Variance % = Var £ ÷ Forecast`:
```
IF Carrier = "Others"                                  → KILL
ELSE IF |Var £| ≥ leakage_trigger_gbp AND |Var %| > leakage_pct_max → LEAK
ELSE IF |Var £| ≥ leakage_trigger_gbp                  → CHECK
ELSE                                                    → OK
```

### 4.5 Leakage & recovery
- A LEAK/KILL creates a Leakage Register dispute (`GAP-NNN`).
- `£ Leakage = Invoice £ − Forecast £`.
- `Days Open = TODAY() − Date Raised` (calendar days) unless Status ∈ {Recovered, Closed} → `—`.
- **Open total** sums only Status ∈ {Open, Investigating, Chase carrier}.
- **Recovery rate = Σ Credit Recovered £ ÷ Σ Leakage £**; target ≥ 80% (`recovery_rate_min`).

### 4.6 Dispute lifecycle (monotonic, cannot move backward)
`Open → Investigating → Chase carrier → Credit expected → Recovered → Closed`
(plus `Killed` for un-reclassifiable Others). Escalation windows: L1 = 7 days
(`dispute_l1_days`), L2 = 14 days (`dispute_l2_days`), max age = 14 days (`dispute_age_max_days`).

### 4.7 BLOS thresholds (never hardcode)
All numeric thresholds live in the `BLOS Thresholds` sheet and are referenced via named ranges.
**Editing a threshold inside a formula is a governance violation.** The dashboard must read
thresholds from the BLOS source (embedded from the workbook / production BLOS API), not inline them.

### 4.8 Ownership rule
Every responsibility maps to a **named person**, never a job title. Workbook shows
`TBD — [Carrier]` placeholders where Sathees has not yet assigned a person; these must be
displayed as-is (not invented).

## 5. Mandatory KPIs (Dashboard KPI table, rows 22–31)

| # | KPI | BLOS key | Target | Direction |
|---|-----|----------|--------|-----------|
| 22 | Daily reconciliation accuracy | `postage.daily_recon_target` | 100% | higher better |
| 23 | Weekly leakage £ | `postage.leakage_trigger_gbp` | £0 (PASS if 0 or < trigger) | lower better |
| 24 | Weekly leakage % | `postage.leakage_pct_max` | ≤ 1.0% | lower better |
| 25 | Recovery rate | `postage.recovery_rate_min` | ≥ 80% | higher better |
| 26 | Avg dispute age (days) | `postage.dispute_age_max_days` | ≤ 14 (displayed target 7 = L1) | lower better |
| 27 | Others share | `postage.others_share_max` | ≤ 2.0% | lower better |
| 28 | Rate card age (days) | `postage.rate_card_age_max_days` | ≤ 30 | lower better |
| 29 | Service spend % | `postage.service_spend_pct_max` | ≤ 5.0% | lower better |
| 30 | Service-to-customer ratio | `postage.service_ratio_max` | ≤ 3.0% | lower better |
| 31 | Return rate | `postage.return_rate_max` | ≤ 2.0% | lower better |

PASS rule: lower-is-better → `Actual ≤ Target`; higher-is-better → `Actual ≥ Target`.

## 6. Success criteria (project README)

- Dashboard automatically updates from PostgreSQL.
- Business values **match the spreadsheet**.
- No manual data entry.
- No duplicate business logic.

## 7. Validation requirements (project README)

Three independent validations must pass:
1. **Accounts Team validation** (business).
2. **Technical validation** (Sajeesan).
3. **Business validation** (values match workbook).

Detailed procedure in `06_validation_plan.md`.

## 8. Required deliverables (project README)

PostgreSQL discovery · data mapping · SQL query pack · HTML dashboard · JavaScript data layer ·
automatic refresh · validation report · evidence pack · documentation.

## 9. Duplicate-risk summary (Mini-AIOS "Existing Asset First" rule)

The current project repo is **empty** (git only). No existing HTML/CSS/JS/SQL dashboard asset
exists anywhere searched. Therefore the dashboard itself is **New Required**. The Mini-AIOS
workspace provides **reusable folder/governance patterns** (Reuse), and the workbook README sheet
provides the reusable business spec (Reuse as reference). Full classification in the final report
and in the Skill file. **Conclusion: low duplication risk — nothing to overwrite or merge.**
