# 06 · Validation Plan, Implementation Readiness & Open Questions

Covers deliverables 10 (Implementation Readiness Report) and 11 (Clarification questions), plus the
validation strategy required by the project README and Mini-AIOS ("no evidence = no completed work").

---

## PART A — Validation Plan

### A1. Validation layers (project README)
1. **Technical validation** — Sajeesan. Schema/formula fidelity, no hardcoded thresholds, code review.
2. **Business validation** — values match the workbook (penny-exact where the workbook is correct).
3. **Accounts Team validation** — usability + trust; UAT sign-off.

### A2. Value-parity test (the core acceptance test)
For the snapshot reporting week, compare **every** dashboard number to the workbook's computed value:

| Area | Cells to reconcile | Pass condition |
|------|--------------------|----------------|
| Top KPI cards | Dashboard A6/C6/E6/G6/I6 | exact match |
| Carrier Summary | Weekly Invoice Check rows 5–13, cols D–K | exact per carrier |
| KPI table Actual | Dashboard C22–C31 | match to displayed precision |
| KPI table Status | Dashboard E22–E31 | identical PASS/FAIL |
| Daily Control | rows 5–11 cols F,G,H,I,N,O,P + total row 12 | exact |
| Leakage totals | Leakage Register row 12 (G,H,I,N) | exact |

Money compared to **£0.01**; counts exact; percentages to displayed dp. Differences logged with
cause (source-data gap vs logic error). **Source-data gaps are acceptable and expected; logic
errors are not.**

### A3. Logic-fidelity checks (mirror the workbook's own 18-point audit)
Reproduce README Sections 16 + v3.1/v3.3 audit checklist as automated assertions, e.g.:
- No hardcoded threshold in dashboard code (all from BLOS config object).
- All carriers in data ∈ Lists Carriers (10).
- Bookings with Forecast £ = £0 AND Qty > 0 AND carrier ∉ {Wayfair, Others} = 0 (or flagged).
- PASS/FAIL direction correct per KPI.
- Days Open / Rate-card-age computed from the agreed `as_of_date`, not the viewer clock.

### A4. Refresh validation
- Rebuild the snapshot twice; confirm deterministic output for the same `as_of_date`.
- Confirm "Data as of …" reflects `snapshot_at`.
- Confirm the file renders offline (file://) with no network and no console errors.

### A5. Cross-browser & responsive
- Chrome/Edge/Firefox latest; widths 1440 / 1024 / 375 px; light + dark theme.
- No horizontal body scroll; wide tables scroll within their container.

### A6. Evidence pack (Mini-AIOS requirement → `evidence/`)
Screenshots (each tab, both themes), the value-parity comparison export (CSV/MD), the refresh
determinism log, browser/responsive screenshots, and a `VALIDATION_RESULT.md`
(Performed / Result PASS|FAIL|PENDING / Evidence). **No secrets** in evidence.

---

## PART B — Implementation Readiness Report

### B1. Ready now ✅
- Complete, unambiguous **business specification** (workbook README is exhaustive).
- All **11 sheets analysed**; formulas, thresholds, statuses, lifecycle captured.
- **Folder scaffold** created; governance/Skill file written.
- **BLOS thresholds** known (15 keys + values) → embeddable config today.
- **Dashboard design** specified (tabs, cards, KPIs, filters, refresh, theming).
- **PostgreSQL MCP** available for read-only Phase-2 discovery.

### B2. Blocked / not ready ❌ (must resolve before a *production* dashboard)
| Blocker | Owner | Impact |
|---------|-------|--------|
| Missing columns `service_tier`, `weight_band_kg`, `destination_zone`, `shipment.label_type` | Sajeesan + Pratheepan | Service/weight/destination dimensions & Label Type unavailable |
| Invoice ingestion (RM ~10% coverage) + invoice_* columns | Pratheepan | Invoice £, Variance, Leakage cannot be trusted |
| Carrier-name normalisation table | Pratheepan + Sathees | Carrier grouping unreliable |
| Country→zone & CS-helpdesk & dispute-tracking sources | Sajeesan/Pratheepan | Destination, Service-expected, Recovery gaps |
| BLOS API not live | Vithursali | thresholds sourced from workbook (acceptable interim) |
| Named owners still `TBD — …` | Sathees | display placeholders; not a build blocker |
| All v3.0 production sign-offs PENDING | 5 owners + Mani | governance gate |

### B3. Readiness verdict
**READY to build a *validation/interim* dashboard** from data that exists today (order counts,
carrier-level Forecast £ where rate lookups resolve, marketplace returns, all KPIs computable from
those), with **clearly-marked "awaiting source" gaps**. **NOT READY** for a full production
cutover until B2 blockers close. This matches the workbook's own "temporary tool" framing.

### B4. Recommended Phase-2 sequence
1. GPT reviews this discovery package → approve/adjust.
2. Read-only PostgreSQL introspection (MCP) → confirm real schema → update `05`.
3. Draft SQL query pack (`sql/`) → Sajeesan/Pratheepan review.
4. Build Python embed/refresh script (`scripts/`) → produce snapshot JSON.
5. Build `dashboard.html` + assets → embed snapshot.
6. Run validation (Part A) → evidence pack → validation report.
7. Accounts Team UAT → sign-off → handover package.

---

## PART C — Open Questions (require clarification before implementation)

**Business / scope**
1. **Interim vs production:** confirm we build the *interim* dashboard now against today's data
   (with gaps flagged), rather than waiting for all B2 blockers to close?
2. **Reporting week:** should the dashboard default to the **latest week** in the data, or stay
   pinned to a fixed reporting week? Should multiple weeks be selectable?
3. **`as_of_date` for `TODAY()` fields** (Days Open, Rate-card age): use the snapshot build date, or
   a fixed business "current date"? (Sample workbook shows large ages implying a fixed reference.)

**Data / PostgreSQL**
4. Confirm exact schema and table/column names (`order_transaction`,
   `order_shipping_billing_detail`, `public.shipment`, `ebay_order_expenses`, `amz_refund_expenses`)
   — are these the correct, current names in the connected database?
5. Which database/connection does the Claude MCP point at (prod vs replica/staging)? Read-only?
6. For fields with **no source yet** (Invoice £, Service-expected, dispute Status/Credit), confirm
   the agreed display (null / "awaiting source" / 0) so we don't imply false precision.
7. Is there an existing **carrier-name normalisation** map and **country→zone** map we should reuse?

**Design**
8. Include the optional supporting **charts**, or keep strictly to the workbook's pills+tables?
9. **Delivery form:** a downloadable standalone `dashboard.html` file, a hosted page, or a claude.ai
   **Artifact**? (Affects the view-time refresh option and CSP.)
10. **Refresh cadence:** what interval/schedule does the Accounts Team need (e.g. hourly, daily 6am)?
11. Should the **Rate Card** and **Glossary/SOP** reference tabs be included, or omitted for the
    Accounts Team view?

**Governance / values**
12. Confirm we embed the **workbook BLOS values** as the interim threshold source until the BLOS API
    is live — and who signs that off (Vithursali)?
13. Any values in the sample workbook that are **known dummy artefacts** (e.g. simulated invoice
    multipliers) that must be excluded from the parity baseline — confirm the correct baseline
    dataset for validation.

---

## STOP CONDITION

Per the task and the Mini-AIOS flow: **implementation does not begin until GPT reviews this
package.** No HTML/CSS/JS/SQL has been produced. Awaiting review and answers to Part C.
