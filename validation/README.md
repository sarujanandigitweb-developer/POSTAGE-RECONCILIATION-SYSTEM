# validation/

Formal validation reports and the acceptance checklist. This folder documents **how** the dashboard
is validated; the resulting artefacts are stored in [../evidence/](../evidence/README.md).

Sources: [../documentation/06_validation_plan.md](../documentation/06_validation_plan.md) (plan) and
[../documentation/08_data_mapping_completed.md](../documentation/08_data_mapping_completed.md) §D
(the Phase-2 PostgreSQL-vs-workbook validation already performed).

---

## Purpose
Prove the dashboard is trustworthy: values match the workbook where the workbook is correct, the
data is internally consistent, the UI works across browsers/devices, and the Accounts Team accepts it.

## Validation workflow
```
1. Technical validation   (Sajeesan)      — logic fidelity, no hardcoded thresholds, code review
2. Data validation        (developer)     — dashboard values vs workbook; internal consistency
3. UI validation          (developer)     — tabs, filters, sort, theme, responsive
4. Business/UAT           (Accounts Team) — usability + trust + sign-off
        ↓
   evidence/ + VALIDATION_RESULT.md  →  handover/
```

## Dashboard validation
- Reproduce the workbook's Dashboard cards, Carrier Summary and KPI table for the snapshot week.
- Confirm status pills (OK/CHECK/LEAK/KILL, PASS/FAIL/N/A) match the workbook's logic.
- Confirm "no source" datasets (Leakage, Rate Card, service/return KPIs) are shown as N/A, not faked.

## SQL validation
- `dashboard/sql/dashboard_queries.sql` is SELECT-only (no write keywords) — re-verify before each run.
- Re-running the pack for the same week + as-of date is deterministic.

## Data validation (already partly done — Phase 2 §D)
- Order-math per day: `Total = FBA + Wayfair + Self-Labelled` — holds all 7 days. **PASS**
- Label reconciliation: Σ carrier labels = Σ daily labels = `overview.labels_shipments` = 3,631. **PASS**
- Daily recon gap = 0 all days → 100%. **PASS**
- £ figures flagged **indicative**; carrier mapping flagged heuristic — **WARNING** (documented).
- Missing sources (leakage/label_type/rate card) — **FAIL (data gap)**, reported not fabricated.

## UI validation
| Check | Pass condition |
|-------|----------------|
| Tab switching | instant, no reload, correct content |
| Sorting | every column sorts asc/desc |
| Search / filters | tables & cards update live; Clear resets |
| Theme | light/dark toggle persists via `localStorage` |
| Responsive | no horizontal body scroll; tables scroll in-container at 375/1024/1440px |
| Offline | opens from `file://` with no console errors, no network calls |

## Performance validation
- Single file (~48 KB) loads instantly; all rendering is client-side over a small embedded dataset.
- Confirm smooth tab switching and sort on the target machines.

## Acceptance checklist
- [ ] Technical validation signed off (Sajeesan)
- [ ] Data value-parity vs workbook recorded in `evidence/`
- [ ] UI validation across Chrome/Edge/Firefox + mobile/tablet/desktop
- [ ] Offline render confirmed
- [ ] Indicative-£ and data-gap caveats understood by reviewers
- [ ] Accounts Team UAT sign-off
- [ ] `VALIDATION_RESULT.md` written and evidence attached
- [ ] Handover package updated

## Rules
- Every FAIL/WARNING must have a logged reason. Source-data gaps are acceptable and expected; logic
  errors are not. No secrets in any report.
