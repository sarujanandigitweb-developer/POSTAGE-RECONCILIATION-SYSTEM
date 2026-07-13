# SKILL FILE — DAILY KNOWLEDGE EXTRACTION
# DIGITWEB LK LTD · Daily Skill Increment System · v3.0

---

## MANDATORY METADATA BLOCK

| Field | Value |
|-------|-------|
| date | 2026-07-09 |
| developer | Sarujanan |
| project | Postage Reconciliation System Dashboard |
| project_code | PRSD |
| phase | REQ-03 — Calculation Parity Implementation & PostgreSQL Requirements Handover |
| requirement_id | REQ-02 |
| deliverable_id | D02 |
| status | Completed (0 dashboard calculation bugs remain; production sign-off blocked on data availability, not dashboard logic) |
| evidence_location | dashboard/postage_reconciliation_dashboard.html + dashboard/data.js + documentation/15_calculation_parity_implementation.md + documentation/16_postgresql_data_requirements.md + CHANGELOG.md (0.4.1) + daily_works_logs/2026-07-09__sarujanan__prsd_daily-activities.csv (D02-A01..D02-A09) + daily_task.tbl_prsd_sarujanan |
| blos_keys_used | 15 `postage.*` keys referenced (not inlined) via the embedded `blos` object: leakage_trigger_gbp, leakage_pct_max, others_share_max, recovery_rate_min, dispute_age_max_days, rate_card_age_max_days, daily_recon_target, service_spend_pct_max, service_ratio_max, return_rate_max, invoice_coverage_target, … Thresholds resolve at render time by `blos_key`; no threshold is hardcoded in dashboard logic (README audit check #2). |
| hardcoded_thresholds | None in logic. Reporting week fixed = W27 2026 (2026-06-29→2026-07-05, half-open); baseline window = prior 8 weeks (W19–W26). **Carrier-family ILIKE heuristic remains hardcoded** and is formally raised as requirement #1 (`carrier_name_map`, 261 distinct raw values). |
| three_am_standard | PASS |
| llm_queryable | TRUE |
| company_knowledge_candidate | TRUE |
| domain | Accounts \| Postage Reconciliation \| Data Provenance \| PostgreSQL \| Requirements Engineering |
| User | Accounts Team · PostgreSQL / Data Engineering Team |
| Benefit status | Pass with a material caveat. All six Priority-2 calculation defects are fixed and 42/42 automated checks pass. **However, today's investigation established that the Weekly Invoice Check cannot detect carrier overbilling** — no carrier invoice exists in the database — and that three previously documented blockers were factually wrong. A requirements document was produced for the database team. |

## File path (fill after saving):
# 2026-07-09__sarujanan__prsd__REQ-03-D02.md

---

## 1. SYSTEM STATE

The dashboard remains one standalone HTML file with embedded CSS/JS/data, zero external dependencies,
header `#15243d`, seven horizontal tabs, light/dark theme. Verified this session: JS parses, external
deps = 0, SQL pack remains SELECT-only (0 write statements).

Data as-of **2026-07-09**, reporting week **W27 2026**: 4,027 orders · 393 FBA excluded · 147 Wayfair ·
3,487 self-labelled · 3,634 labels · actual £12,525.72 · estimated £12,632.55 · variance −£106.83 (−0.85%).

**KPI outcome: 2 PASS · 3 FAIL · 5 NOT COMPUTABLE.** The three FAILs are real business signals, not defects:
leakage £97.46 (DHL), rate card 189 days stale (limit 30), return rate 4.10% (limit 2%).

**Zero dashboard calculation bugs remain.** Every remaining gap is schema, ETL or workbook.

---

## 2. WHAT CHANGED TODAY

Six Priority-2 calculation defects fixed:

1. **Leakage £ (Others)** — was hardcoded `0.00`; now `−87.55`, the signed `Invoice − Forecast`.
2. **KPI 22** — was reporting a false `100% PASS`; now `NOT COMPUTABLE`.
3. **KPI 26** — contradiction resolved; Days Open and Date Raised now blank consistently.
4. **Variance %** — workbook `IFERROR(...,0)` applied; Wayfair renders `0%`, not blank.
5. **"Expected £" → "Estimated Cost (Historical Baseline)"** everywhere; 0 occurrences of the old label.
6. **Snapshot refreshed** to as-of 2026-07-09.

Plus, uninstructed but necessary: **Open Disputes corrected 2 → 1** ("Killed" is not an open status, README §13).

**23 blocked fields** now render an `Unavailable` pill whose tooltip names the exact blocking table.column
and whether the blocker is schema or ETL. No silent blanks remain.

Documents produced: `documentation/15_calculation_parity_implementation.md`,
`documentation/16_postgresql_data_requirements.md`, `CHANGELOG.md [0.4.1]`.

---

## 3. POSTGRESQL / MCP FINDING

Read-only throughout. No writes, no schema changes.

**`blos.postage` is no longer empty — it holds 753 rows.** It was documented in reports 13–15 as existing
with 0 rows. Someone backfilled it. But it is still not usable as a rate card:

| Finding | Evidence |
|---|---|
| `destination_zone` 100% NULL | 753 / 753 |
| `price_with_tax` populated on 45 rows only | 45 / 753; the other 708 carry price only in `postage_value` |
| **No DHL rows. No GLS. No Wayfair.** | `dhl_rows = 0` — yet DHL is 514 labels / **£3,038.22** in W27 |
| `'Royal Mail'` and `'ROYAL MAIL'` coexist | 537 + 15 rows, two different carriers to a join |
| All rows share `effective_date = 2026-01-01` | → 189 days stale, KPI 28 FAIL |
| `blos.postage_history` | 0 rows — no rate-change audit trail |

**`public.shipment` does not exist at all** (`to_regclass` → NULL). Every prior document of mine says
"add `public.shipment.label_type`". That ticket is unactionable. `label_type` belongs on
`public.order_shipping_billing_detail`.

**No carrier invoice exists anywhere.** A sweep of every column in every schema for `%invoice%` returned
exactly two hits: `amazon_returns.invoice_number` (a marketplace return reference) and
`supplier.invoices.invoice_date` (inbound container freight, 22 rows, 0 in W27). Neither is carrier postage.

---

## 4. GAP FOUND

**The Weekly Invoice Check is structurally incapable of doing its job.**

The column headed `Invoice £ (G)` is bound to key `actual_gbp`, which is
`SUM(order_shipping_billing_detail.carrier_charge)`. `carrier_charge` is what *we* recorded when the label
was bought. It never passed through the carrier's billing system.

So the tab compares `carrier_charge` against an 8-week moving average **of itself**. It measures cost
*drift*, not billing *accuracy*. **If DHL invoices £5,000 for £3,038 of labels, no figure in the dashboard
moves.** Catching that is the tab's entire reason for existing.

The number is correct and reproduces to the penny. The **column name** is a false claim of provenance. A
footnote does not undo a header. This is the same class of defect as the `100% PASS` I removed from KPI 22:
the surface overstates what the data supports.

Secondary gaps: 173/3,634 labels (4.8%) have `carrier_charge IS NULL` (146 legitimately Wayfair, **27
genuine**), silently summed away. 261 distinct free-text `carrier_name` values resolved by a hardcoded
`ILIKE` heuristic. Customer PII (name, address, phone, email) sits in `order_shipping_billing_detail` and
must never reach the standalone HTML, `data.js`, or any CSV export — none are access-controlled.

---

## 5. VALIDATION RULE ADDED OR CHANGED

- **Order-grain rule.** `public.order_transaction` is one row per **line item** (`order_item_info`), not per
  order. Joining it to `order_shipping_billing_detail` fans out and duplicates postage. Always
  `SELECT DISTINCT order_id` first. Naive join: 4,002 labels / **£13,741.60**. Correct: 3,634 / **£12,525.72**.
  **Overstatement: £1,215.88 (≈10%).**
- **Half-open date ranges.** `order_date` is a `timestamp`, not a `date`. `BETWEEN '2026-06-29' AND '2026-07-05'`
  truncates the last day to `00:00:00` and silently drops it (−£601.32 of DHL alone). Use `>= start AND < end+1`.
- **NULL ≠ zero.** A known-zero cost must be stored `0.00`. `SUM()` skips NULLs, so unknowns vanish rather
  than raise.
- **NOT COMPUTABLE rule.** A KPI whose input does not exist must render `NOT COMPUTABLE`, never a passing
  value. The blank must propagate consistently to every field derived from the same missing input.
- **Provenance rule.** A substitute value must be **renamed on the surface**, not footnoted.
- **Re-verification rule.** Never carry a schema fact forward from a prior report.

---

## 6. FAILURE MODE OR EDGE CASE

**I reproduced the grain bug myself, live, mid-investigation.** Asked to verify the DHL figure, I wrote the
obvious join and got £3,209.13 against the £3,038.22 in `data.js`. My first instinct was that the dashboard
was wrong. It was not — my query was. The join had fanned out across line items. I caught it only because
the control total refused to tie out.

Two lessons. First, the obvious query against this schema is wrong, which means **every downstream consumer
will get it wrong the same way**, silently, by about 10%. Second, a figure that fails to reconcile is
information — the reflex to trust the fresh query over the stored one is exactly backwards when the stored
one was reconciled and the fresh one was not.

Edge case: **W27 is not immutable.** `max(order_date)` = 2026-07-09, inside a window that closed 2026-07-05.
Rows are back-dated into a closed week. Two reports run days apart will legitimately disagree
(4,020 → 4,027 orders; £12,517.31 → £12,525.72) and be mistaken for a bug. Every figure now carries an as-of.

---

## 7. DECISIONS MADE TODAY

- **KPI 26 → NOT COMPUTABLE rather than computing "2 days."** `Date Raised` is a manual field with no
  PostgreSQL source. A computed age would have been synthetic. Chose the blank, and propagated it to the
  Leakage Register so the register and the KPI cannot contradict each other.
- **KPI 22 → NOT COMPUTABLE for two independent reasons**, both recorded: closure needs `label_type`; and
  the customer Gap is structurally 0 because all 3,634 non-FBA orders have exactly one shipment row, so
  `Labels ≡ Self-Labelled + Wayfair` **by construction**. The control cannot fail. A "100% PASS" from a
  control that cannot fail is worse than no control.
- **Did not silently fix the `Invoice £` header.** Reported it, explained the consequence, and asked. It is
  a semantic change to a figure the Accounts team reads, not a bug fix.
- **Did not create, alter or write to any table.** Read-only was the standing constraint; the requirements
  went into a document for the owning team instead.
- **Superseded my own prior documentation** rather than quietly patching it. Three claims in reports 13–15
  are now false; §0 of report 16 names them.

---

## 8. COMPANY KNOWLEDGE EXTRACT

**A control that cannot fail is not a control.** KPI 22 reported `100% PASS` for weeks. Both sides of its
comparison derived from the same order set, so the gap was arithmetically pinned to zero. It was not
validating the data; it was validating that `x = x`. Before trusting any reconciliation, ask what independent
source the two sides come from. If there is only one source, the check is decorative.

**A substitute value must be renamed, not footnoted.** `carrier_charge` standing in for an invoice is
defensible engineering. Labelling the column `Invoice £` is not. Users read headers, not footnotes. Any
figure that is a proxy must say so where it is read.

**Re-verify absences before you ship them as requirements.** Three blockers I had documented were wrong
within days: a table had been backfilled (753 rows), a table I asked to be extended never existed, and a
staleness figure was computed from the wrong source. Absence is the most perishable fact in a database.

**Know the grain before you aggregate.** One join, one wrong grain, £1,215.88 of phantom postage — about 10%.

---

## 9. LLM STANDARD CHECK

| Check | Result |
|---|---|
| Deterministic and reproducible | PASS — every figure re-derived from live PostgreSQL, read-only, on 2026-07-09 |
| No invented data | PASS — no PostgreSQL data fabricated, no workbook value faked; blocked fields render `Unavailable` |
| No hardcoded thresholds in logic | PASS — resolved by `blos_key` at render |
| Secrets redacted | PASS — no credentials, tokens or keys recorded |
| PII handling | FLAGGED — customer PII exists in `order_shipping_billing_detail`; excluded from all artefacts |
| Self-correction recorded | PASS — 3 prior findings disproved and superseded in §0 of report 16 |
| Automated verification | PASS — 42/42 calculation checks; JS parses; 0 external deps; SQL pack 0 write statements |
| 3 AM standard | PASS |

---

### NEXT ACTIONS

1. **Submit `documentation/16_postgresql_data_requirements.md`** to the PostgreSQL team.
2. **Decide the `Invoice £` → `Actual Charge £` rename** (awaiting user approval; dashboard-only, no schema).
3. **Population wins first** (no schema change): `carrier_name_map` (261 values) → `blos.postage.destination_zone`
   + `price_with_tax` → DHL/GLS rate cards → fix 27 genuine `carrier_charge` NULLs, set Wayfair to `0.00`.
4. **Then schema**: `label_type`, `service_tier`, `weight_band_kg`, `destination_zone` on
   `order_shipping_billing_detail` → unlocks `Forecast £`.
5. **Then the one that matters**: `carrier_invoice` table + ingestion. Until it exists, the Weekly Invoice
   Check cannot detect overbilling and no dashboard work will change that.
6. Reconcile weight bands — Lists defines **9**, the workbook Rate Card uses **22**, `blos.postage` has **17**.
7. Correct or supersede reports 13–15, which contain three now-false schema claims.
