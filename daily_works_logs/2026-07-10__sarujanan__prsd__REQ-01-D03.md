# SKILL FILE — DAILY KNOWLEDGE EXTRACTION
# DIGITWEB LK LTD · Daily Skill Increment System · v3.0

---

## MANDATORY METADATA BLOCK

| Field | Value |
|-------|-------|
| date | 2026-07-10 |
| developer | Sarujanan |
| project | Postage Reconciliation System Dashboard |
| project_code | PRSD |
| phase | REQ-02 — Workbook Parity: Rate Card, Carrier Mapping & Weekly Invoice Check |
| requirement_id | REQ-01 |
| deliverable_id | D03 |
| status | Completed (Weekly Invoice Check now matches workbook Sheet 5 cols A–P; 21/21 checks pass. Production sign-off still blocked on data availability.) |
| evidence_location | dashboard/postage_reconciliation_dashboard.html + dashboard/data.js + documentation/16_postgresql_data_requirements.md + 2026 Postage Price  list.xlsx + daily_works_logs/2026-07-10__sarujanan__prsd_daily-activities.csv (D03-A01..D03-A10) + daily_task.tbl_prsd_sarujanan |
| blos_keys_used | 15 `postage.*` keys referenced (not inlined) via the embedded `blos` object: leakage_trigger_gbp, leakage_pct_max, others_share_max, recovery_rate_min, dispute_age_max_days, rate_card_age_max_days, daily_recon_target, service_spend_pct_max, service_ratio_max, return_rate_max, invoice_coverage_target, … Thresholds resolve at render time by `blos_key`; no threshold hardcoded in dashboard logic (README audit check #2). |
| hardcoded_thresholds | None in logic. Reporting week fixed = W27 2026 (2026-06-29→2026-07-05, half-open); baseline window = prior 8 weeks (W19–W26). **Carrier-family ILIKE heuristic still hardcoded** — today proved it misclassifies **29,250 Royal Mail labels** into `OTHERS`. `carrier_name_map` is now requirement #1. |
| three_am_standard | PASS |
| llm_queryable | TRUE |
| company_knowledge_candidate | TRUE |
| domain | Accounts \| Postage Reconciliation \| Rate Card \| Data Provenance \| PostgreSQL \| Excel Parity |
| User | Accounts Team · PostgreSQL / Data Engineering Team |
| Benefit status | Pass with a material caveat. The Weekly Invoice Check now carries the workbook's exact 16 columns and Forecast £ is **real** for the first time (priced from `blos.local_postage`). But today established that **the DHL leakage FAIL was a false positive**, that **19 of 64 rate-card rows never loaded**, and that **6,958 labels can never enter a weekly report**. |

## File path (fill after saving):
# 2026-07-10__sarujanan__prsd__REQ-01-D03.md

---

## 1. SYSTEM STATE

Dashboard remains one standalone HTML file, embedded CSS/JS/data, zero external dependencies, header
`#15243d`, seven horizontal tabs, light/dark theme. Verified: JS parses, external deps = 0, SQL pack
SELECT-only.

Data as-of **2026-07-10**, reporting week **W27 2026**: 4,031 orders · 393 FBA · 147 Wayfair ·
3,491 self-labelled · **3,638 labels** · actual **£12,527.90** · baseline £12,650.46.

**Rate card is now live in PostgreSQL** — `blos.local_postage` (45) + `blos.international_postage` (708).
**Forecast £ is computed from it for the first time**: 2,313 of 3,638 labels priced (**63.6%**), £6,704.22 inc VAT.

---

## 2. WHAT CHANGED TODAY

**Weekly Invoice Check rebuilt to workbook Sheet 5, cols A–P exactly** — 16 columns, workbook order,
workbook semantics. Previously `Week Label` sat in position 3, `Forecast £ Inc VAT` was absent, and a
non-workbook column (`Estimated Cost`) sat between D and G.

The user's own column-G spec settled the provenance question raised on D02: **G is manual entry from the
carrier portal, NULL until invoice received.** So `carrier_charge` never belonged there. **G, H, I now render
`Unavailable`; Status (J) reads `NOT COMPUTABLE`** — except `Others`, whose KILL is a *carrier* rule, not a
variance rule.

**E and F are now real**, priced from `blos.local_postage` per the `SUMIFS` definition, reproducing the
dashboard's own KPI cards to the penny. Partly-priced carriers show a **coverage pill** so a bare £4,770.96
for Royal Mail cannot read as a complete forecast when 180 of its labels have no rate.

Also: **Royal Mail mapping fixed** (CRL48 / Tracked 48 RM were falling into `Others`) → 2,276 → **2,282**;
`Others` 23 → **21**. Last **`Invoice £` mislabel removed** from the Leakage Register → `Actual Charge £`;
zero occurrences remain. **Tables now fit the viewport** (`fitTables()` measures rather than hardcodes).

---

## 3. POSTGRESQL / MCP FINDING

Read-only throughout. No writes, no schema changes.

**The rate card was restructured live, mid-session.** `blos.postage` returned 753 rows; twenty minutes later
the same query threw *"relation does not exist"*. It had been dropped and split into `blos.local_postage`
(45) + `blos.international_postage` (708).

Timestamps tell the story: `created_at` **2026-07-09 16:19/16:21** by `import_2026_07_09`; `updated_at`
**2026-07-10 09:46/09:53**, identical to the microsecond across every row — a single bulk `UPDATE`.
**`updated_by` is NULL** and both history tables hold **0 rows**. There is **no record of who changed the
rate card or what it looked like before.** `postage_import_batches` also holds 0 rows.

**Third schema change under this project in one day.**

---

## 4. GAP FOUND

**(a) The DHL leakage FAIL was a false positive.** The dashboard reported DHL as the sole open leak,
**£97.46**, KPI 23 FAILing. That came from the 8-week historical baseline — the substitute built when no rate
card existed. Taking the six DHL rates **straight from the workbook** (service names match *exactly*, no
normalisation needed): 513 labels · actual £3,035.67 · forecast £3,062.11 · **variance −£26.44. DHL is UNDER
its rate card.** The dashboard was escalating a carrier for overbilling that did not happen.

**(b) 19 of 64 rate-card rows never loaded.** Excel `2026 Postage Price list.xlsx` holds 64 priced rows;
`blos.local_postage` has 45. The entire **DE SITE block (13 rows — 6 DHL, 2 GLS, Canada Post, UPS, USPS,
Intelcom, ICS)** has valid prices and was simply skipped. The other 6 are malformed *in the workbook*: two
**Excel date serials** (`46308`, `46183`) and four **text ranges** (`7.50-12`). The importer also **corrupted a
service name** — Excel and shipments both say `NEX(2kg)`; the import wrote `NEX (2kg)`.

**(c) 6,958 labels can never enter a weekly report.** Service labels *do* exist — encoded as `order_id`
prefixes (`Repla-`, `Resend-`, `manual-`), correcting my earlier claim they were absent. But
`order_shipping_billing_detail` has **zero date columns**; a label's date comes only from joining to
`order_transaction`, and these 6,958 have no order to join to. **Column E would equal column D exactly — not
because service labels are zero, but because every undateable one is silently excluded before the filter runs.**

**(d) `carrier_name` is not a carrier field.** 260 distinct values + NULL. Largest single value is the
**empty string at 231,875 rows (21.1%)** — distinct from NULL, so `IS NOT NULL` passes them. It holds
countries (`United Kingdom`), a warehouse address (`Unit 3 Marshbrook Cl`), statuses (`Issue`), badges
(`prime`) and label types (`Return 2kg Hermes`, `collection order`). The `ILIKE '%royal mail%'` heuristic
**misses 14 `Royalmail` one-word variants = 29,250 labels**, all falling into `OTHERS` — which the workbook
**auto-KILLs**.

---

## 5. VALIDATION RULE ADDED OR CHANGED

- **Silent-exclusion check.** Before trusting a filtered subset, verify the excluded rows *can be reached by
  the filter at all*. A filter that never sees a row reports **zero**, not **missing**.
- **Source-vs-sink row count.** Reconcile the source file's row count against the loaded table before trusting
  an import. A silently partial load looks identical to a complete one. (`postage_import_batches` exists for
  exactly this and holds 0 rows.)
- **Same-source detection.** When forecast and actual reconcile to **exactly 0.00** across thousands of rows,
  suspect they share a source rather than agreeing.
- **Substitute-metric audit.** When a metric built on a substitute input FAILS, re-test against the real input
  **before escalating**. The failure may be an artifact of the substitute. (DHL.)
- **Free-text-column audit.** Enumerate every distinct value before writing a matching heuristic. A regex
  written against the values you *expect* will silently bucket the ones you did not.
- **Coverage pill.** An aggregate over a partially-matched set must show its coverage. A complete-looking
  total over an incomplete set is worse than no total.

---

## 6. FAILURE MODE OR EDGE CASE

**I nearly shipped a false accusation against a carrier.** The dashboard had DHL flagged as the sole open
leakage, £97.46, KPI 23 FAIL — and I had reported that to the user twice as a "real business signal." It was
an artifact of the substitute baseline. The real rate card, which was sitting in the workbook the whole time,
shows DHL **under** by £26.44. The lesson is not "check your maths" — the maths was right. It is that **a
FAIL produced by a substitute input is not evidence; it is a hypothesis**, and it must be re-tested against
the real input before it reaches anyone who might act on it.

**Edge case — the database changed under a live session.** `blos.postage` existed, then did not, inside one
conversation. Any process that caches schema facts across a session will act on a table that no longer exists.
Re-verify at query time, not once per session.

---

## 7. DECISIONS MADE TODAY

- **Rendered G/H/I `Unavailable` rather than filling them with `carrier_charge`.** The user's own spec says G
  is manual entry, NULL until invoice received. A plausible number was available; putting it under an
  `Invoice £` header would have been a false claim of provenance.
- **Showed a coverage pill instead of hiding partly-priced forecasts.** Royal Mail's £4,770.96 is real but
  covers only 92.1% of its labels. Hiding it loses information; showing it bare overstates. The pill does both.
- **Wrote the DHL false-positive into the `GAP-W27-01` root cause** rather than silently deleting the row —
  the register should record that the flag was investigated and disproved, not pretend it never fired.
- **Did not load the 19 missing rate-card rows myself.** Read-only was the standing constraint; they went into
  the requirements document for the owning team.
- **Corrected my own earlier claim** that service labels and Return Label Out were absent. They exist, encoded
  in `order_id` prefixes. Wrong is wrong even when the conclusion (unusable) is unchanged.

---

## 8. COMPANY KNOWLEDGE EXTRACT

**A metric built on a substitute is a hypothesis, not a finding.** DHL "leaked" £97.46 against a historical
baseline and was **£26.44 under** against its real rate card. Before escalating any FAIL, ask: *is this input
the real thing, or the thing I used because the real thing was missing?*

**When a reconciliation returns exactly zero, suspect a shared source.** Smart Track's forecast matched its
actual to the penny across 2,094 labels — because `carrier_charge` is *generated from* the same rate card.
Perfect agreement between two numbers is evidence they are the same number, not that they agree.

**A silently partial import is indistinguishable from a complete one.** 45 of 64 rows loaded and nothing
raised. The table looked populated. Always reconcile source row count to sink row count.

**Absence is the most perishable fact in a database.** Three claimed blockers were falsified within days: a
table backfilled, a table dropped and split, a table that never existed. Never carry a schema fact forward.

---

## 9. LLM STANDARD CHECK

| Check | Result |
|---|---|
| Deterministic and reproducible | PASS — every figure re-derived from live PostgreSQL and the workbook, read-only, on 2026-07-10 |
| No invented data | PASS — blocked fields render `Unavailable`; no PostgreSQL data fabricated, no workbook value faked |
| No hardcoded thresholds in logic | PASS — resolved by `blos_key` at render |
| Secrets redacted | PASS — no credentials, tokens or keys recorded |
| PII handling | FLAGGED — customer PII in `order_shipping_billing_detail`; excluded from all artefacts |
| Self-correction recorded | PASS — DHL leak disproved; service-label absence claim corrected |
| Automated verification | PASS — 21/21 checks; JS parses; 0 external deps; 0 `Invoice £` mislabels remain |
| 3 AM standard | PASS |

---

### NEXT ACTIONS

1. **Load the 13 DE SITE rate-card rows** (DHL, GLS, Canada Post, UPS, USPS, Intelcom, ICS) — this alone
   prices the #2 carrier and **retires the false KPI 23 FAIL**.
2. **Stop the importer inserting whitespace** into `service_name` — Excel already matches shipments byte-for-byte.
3. **Fix the 6 malformed workbook price cells** (2 date serials, 4 text ranges).
4. **`carrier_name_map`** (261 values) — now priority #1, above `label_type`. 29,250 labels are misclassified today.
5. **`label_created_date`** on `order_shipping_billing_detail` — higher priority than `label_type`; without it
   6,958 labels can never enter a weekly report.
6. **Backfill `label_type`** from the `order_id` prefix convention — the information already exists.
7. **`carrier_invoice` table** — still the only thing that makes the Weekly Invoice Check detect overbilling.
8. **Audit trail on `blos`** — populate `updated_by`, write history rows, record import batches.
9. Ask the data team whether `blos` rates are **list or negotiated** — list rates overstate Forecast by 25–40%.
10. **D02 (2026-07-09) is still not in `daily_task.tbl_prsd_sarujanan`** — its prompt was prepared but never run.
