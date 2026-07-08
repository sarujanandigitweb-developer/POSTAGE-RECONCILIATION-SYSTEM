# SKILL · Postage Reconciliation System

**Type:** Project Skill / Instruction file (Mini-AIOS)
**Owner:** Sarujanan (Technical) · **Coordinator:** Sathees · **Tech reviewer:** Sajeesan
**Governance:** Mini-AIOS Master Instruction & Skill Guide
**Status:** Phase 1 (Discovery) complete · Phase 2 gated on GPT review
**Last updated:** 2026-07-08

This Skill file is the standing instruction for anyone (human or LLM) working on the Postage
Reconciliation dashboard. Read it before touching this project.

---

## 1. Purpose
Build and maintain a **temporary, read-only HTML dashboard** that reproduces the postage
reconciliation workbook for the Accounts Team, automatically loading data from **PostgreSQL** via
the Claude MCP, with an **embedded data snapshot** and **automatic refresh**, preserving every
business calculation exactly.

## 2. Business objective
Replace manual spreadsheet viewing with an auto-updated dashboard so the Accounts Team can see
reconciliation status (Forecast vs Invoice, leakage, disputes, KPIs) at a glance, without re-keying
data and without diverging from the workbook's business logic.

## 3. Project scope
- **Allowed:** read PostgreSQL; create HTML/JS/SQL; create documentation & validation reports.
- **Not allowed:** modify production data; change PostgreSQL schema; change business rules; change
  BLOS thresholds; replace or re-derive the workbook's calculations; write back to any system.

## 4. Technology stack
PostgreSQL (source of truth, read-only via Claude MCP) · HTML + CSS + JavaScript (standalone
dashboard) · Python (build/embed & refresh scripts) · Git (versioning). No backend framework;
the deliverable is a single self-contained HTML file with an embedded JSON snapshot.

## 5. Source of truth
**PostgreSQL** is the data source of truth. The **workbook** (`Accounts
postage_reconciliation_v3_merged.xlsx`, v3.4) is the **business reference** — the definition of
correct logic and expected values — until the dashboard is validated.

## 6. Business reference
The workbook's `0. README` sheet (22 sections) is the canonical specification: glossary, formula
reference, BLOS register, ownership map, workflows, dispute lifecycle, edge cases, postgres mapping.
When logic is unclear, this sheet — not assumption — is the authority. If it can't answer a
question, **STOP and escalate** (Sajeesan for schema/logic, Sathees for process, Vithursali for BLOS).

## 7. Dashboard principles
1. Faithful reproduction, not redesign. 2. Read-only. 3. Standalone single file with embedded data.
4. Single source of truth per value. 5. BLOS-driven thresholds (never inlined). 6. Self-explanatory
(hover help). 7. Theme-aware (light/dark). 8. Responsive, no horizontal body scroll.

## 8. Existing-asset rule (Mini-AIOS "Existing Asset First")
Before creating anything, search for existing HTML/CSS/JS/SQL/docs/skills/query-packs/evidence.
Result of this project's search: **project repo empty; no prior dashboard asset exists** → the
dashboard is *New Required*. Reuse the Mini-AIOS folder/governance patterns and the workbook spec.
Re-run this search before any future significant addition.

## 9. Duplicate prevention
- One dashboard file; one data-layer; one formula per KPI (no double-derivation).
- No second copy of business logic — reproduce the workbook's, don't reinvent it.
- Before adding a query/script/doc, check `sql/`, `scripts/`, `documentation/` for an existing one
  to extend rather than duplicate. Record any duplicate risk in a duplicate-risk note.

## 10. Evidence requirements
"No evidence = no completed work." Every phase writes to `evidence/`: screenshots, value-parity
export, refresh logs, browser/responsive captures, and a `VALIDATION_RESULT.md`. **Never** store
passwords/tokens/keys/.env — use `[REDACTED_SECRET_PATTERN]`.

## 11. Validation workflow
Technical (Sajeesan) → Business value-parity vs workbook (penny-exact) → Accounts Team UAT. All
three must pass. Procedure and acceptance tests in `06_validation_plan.md`. Source-data gaps are
acceptable and must be flagged; **logic errors are not acceptable**.

## 12. Claude execution workflow (Mini-AIOS)
`User → GPT (brain) → GPT-authored Claude prompt → Claude Code (worker) executes → output back to
GPT → GPT reviews → next prompt`. Claude does discovery/implementation/validation within the
assigned scope only. **No phase advances without GPT review.** Store each prompt in `prompts/`.

## 13. Folder standards
Per root `README.md`: `documentation/`, `evidence/`, `prompts/`, `sql/`, `scripts/`, `dashboard/`,
`assets/{css,js,images}/`, `validation/`, `handover/`. Use per-task subfolders where a task
produces multiple artefacts (mirrors the Mini-AIOS `FOLDER_MAP` pattern). Never save to the wrong
folder; never invent a new top-level folder without updating this Skill + README.

## 14. Coding standards
- Readable, commented where non-obvious; match surrounding style.
- No hardcoded thresholds — read from the embedded BLOS config object.
- No hardcoded "current date" logic — use the snapshot `as_of_date`.
- Currency `£#,##0.00`; percent `0.0%`; dates `dd mmm yyyy`; ISO-8601 week labels `Wxx YYYY`.
- Accessibility: colour + text on every status; keyboard-navigable; sufficient contrast in both themes.
- Keep the dashboard self-contained (inline assets for the delivered file; CSP-safe, no external hosts).

## 15. PostgreSQL usage rules
- **Read-only. Always.** Use the Claude MCP (`mcp__claude_ai_postgres__*`).
- Discovery first: `list_schemas` → `list_objects` → `get_object_details` before writing queries.
- Confirm real table/column names against `05_postgresql_mapping.md`; update that doc with findings.
- Never issue DDL/DML; never alter schema; never write.
- Where a source is missing, surface null/"awaiting source" — **never fabricate values.**

## 16. HTML dashboard rules
- One standalone `dashboard.html`; opens by double-click; renders from embedded data offline.
- Tabs = Overview / Daily Control / Weekly Invoice Check / Leakage / Bookings (+ optional Rate Card,
  Glossary drawer). Status via pills (OK/CHECK/LEAK/KILL; PASS/FAIL) with text, not colour alone.
- Reproduce the workbook's Dashboard cards + Carrier Summary + 10-row KPI table exactly.
- No write-back controls of any kind.

## 17. Embedded-data strategy
Embed a `DATA` JSON object in a `<script>` block: `bookings, dailyControl, weeklyInvoiceCheck,
leakage, rateCard, lists, blos, meta{snapshot_at, reporting_week, as_of_date, source}`. The file
renders entirely from this snapshot. A Python build script generates/refreshes it from PostgreSQL.
Build-time embed, view-time static.

## 18. Automatic refresh strategy
Primary: scheduled build-time refresh (cron / Mini-AIOS routine / manual) regenerates the snapshot
and `snapshot_at`. Optional (if hosted): a same-origin `data.json` poll every N minutes with silent
fallback to the embedded snapshot. Always display "Data as of `snapshot_at`".

## 19. Pass / Fail criteria
**PASS** only when: every worksheet analysed (done in Phase 1); dashboard values match the workbook
for the snapshot week (penny-exact where the workbook is correct); no manual data entry; no
duplicated business logic; no hardcoded thresholds; refresh works and is deterministic; evidence
pack complete; three validations signed off. **FAIL** on any logic divergence, hardcoded threshold,
write-back path, fabricated value, or missing evidence.

## 20. Known risks
- **Data gaps:** required columns (`service_tier`, `weight_band_kg`, `destination_zone`,
  `shipment.label_type`, invoice fields) don't exist yet; RM invoice ingestion ~10%. → interim
  dashboard with flagged gaps.
- **BLOS API not live** → interim thresholds from the workbook (needs Vithursali sign-off).
- **Sample-data artefacts** (simulated invoice multipliers) must be excluded from the parity baseline.
- **`TODAY()` drift** → pin to `as_of_date`.
- **Carrier free-text** inconsistency → normalisation map required.
- **Scope creep** → stay read-only; reproduce, don't redesign.

## 21. Future implementation phases
- **Phase 2:** Postgres introspection → SQL pack → data-layer/embed script → `dashboard.html` →
  validation → evidence → UAT → handover.
- **Phase 3 (production):** once B2 blockers (see `06`) close — schema columns added, invoice
  ingestion fixed, BLOS API live, owners named — cut over to live queries and full coverage.

## 22. Unknown-developer handover requirements
A developer who has never seen this project must be able to run it from the repo alone. The
handover package (`handover/`) must include: this Skill file; the `documentation/00–06` set; the
SQL pack with comments; the build/refresh script with a README (how to run, env vars referenced by
name only, no secrets); the produced `dashboard.html`; the validation report + evidence; a
`HANDOVER_SUMMARY.md` (task id, files changed, validation performed, known issues, rollback method,
evidence location, memory candidates, approval status = "Pending Team Lead Review"); and a
`ROLLBACK_NOTE.md` (commit hash + procedure). No step may require tacit knowledge or human contact
to operate.
