# prompts/

The exact GPT→Claude prompts used to drive each phase. Storing them is a Mini-AIOS requirement:
the operating model is **GPT (brain) → Claude Code (worker)**, and every prompt must be traceable
(no paraphrasing) so work is reproducible and auditable.

Governance context: [../documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md](../documentation/SKILL_POSTAGE_RECONCILIATION_SYSTEM.md).

---

## Purpose
Preserve the verbatim instruction that produced each deliverable, so any reviewer can trace an
output back to the request that created it and re-run or adapt it.

## What goes here

| Prompt group | Drove | Deliverable |
|--------------|-------|-------------|
| **Discovery prompts** | Phase 1 analysis & scaffold | `documentation/00`–`06`, SKILL, folders |
| **SQL prompts** | Phase 2 DB discovery & query pack | `documentation/07`–`09`, `dashboard/sql/dashboard_queries.sql` |
| **Dashboard prompts** | Phase 3 build | `dashboard/postage_reconciliation_dashboard.html` |
| **Validation prompts** | validation & evidence | `validation/`, `evidence/` |
| **Documentation prompts** | this documentation pass | folder READMEs, INDEX, PROJECT_STRUCTURE, CHANGELOG |
| **Future prompts** | refresh automation, production cutover | `scripts/`, `sql/` |

## Prompt naming convention
```
NN_<phase>_<topic>.md        e.g. 01_discovery_excel-analysis.md
                                   02_phase2_sql-query-pack.md
                                   03_phase3_standalone-dashboard.md
```
- Two-digit ordering prefix, phase, then a short kebab-case topic.
- One prompt per file; store the **actual** prompt text, not a summary.

## Contents of each prompt file
- The verbatim prompt.
- Date, phase, and the deliverable(s) it produced.
- Any follow-up/correction prompts appended in sequence.

## Rules
- No secrets in prompts (redact with `[REDACTED_SECRET_PATTERN]`).
- Do not edit a prompt after the fact to "tidy" it — append clarifications instead; the record must
  reflect what was actually issued.
