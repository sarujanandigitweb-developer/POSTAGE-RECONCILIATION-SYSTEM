# Claude Code Prompt — Save PRSD D03 Daily Progress to PostgreSQL

Copy everything inside the fenced block below into Claude Code as a single prompt.

---

````text
Use the connected PostgreSQL MCP to save today's PRSD daily progress record.

## TARGET
Schema: daily_task
Table:  daily_task.tbl_prsd_sarujanan

## SOURCE
CSV:   daily_works_logs/2026-07-10__sarujanan__prsd_daily-activities.csv
Skill: daily_works_logs/2026-07-10__sarujanan__prsd__REQ-01-D03.md
Rows:  10  (activity_id D03-A01 .. D03-A10, all activity_date = 2026-07-10)

## STEP 1 — EXISTENCE CHECK (do this first, do not assume)
Run:
    SELECT to_regclass('daily_task.tbl_prsd_sarujanan') AS tbl;

- Returns NULL   -> the table does NOT exist. Do STEP 2, then STEP 3.
- Returns a name -> the table EXISTS. SKIP STEP 2. Go straight to STEP 3.

Do not trust any prior claim about whether this table exists. Verify with the query.
This database has been restructured mid-session before — re-verify, do not assume.

## STEP 2 — CREATE (only if STEP 1 returned NULL)
    CREATE SCHEMA IF NOT EXISTS daily_task;

    CREATE TABLE IF NOT EXISTS daily_task.tbl_prsd_sarujanan (
      project_code                 text        NOT NULL,
      activity_id                  text        NOT NULL,
      activity_date                date        NOT NULL,
      developer                    text        NOT NULL,
      project_name                 text,
      requirement_id               text,
      deliverable_id               text,
      activity_type                text        NOT NULL,
      activity_title               text        NOT NULL,
      activity_summary             text        NOT NULL,
      systems_touched              text,
      files_touched                text,
      evidence_refs                text,
      reusable_asset_created       boolean     NOT NULL DEFAULT false,
      reusable_pattern             text,
      validation_rule              text,
      gap_or_risk                  text,
      next_action                  text,
      status                       text        NOT NULL,
      priority                     text        NOT NULL,
      llm_queryable                boolean     NOT NULL DEFAULT true,
      company_knowledge_candidate  boolean     NOT NULL DEFAULT false,
      memory_tags                  text,
      source_skill_file            text,
      source_type                  text        NOT NULL,
      created_at                   timestamptz NOT NULL DEFAULT now(),
      updated_at                   timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT pk_tbl_prsd_sarujanan PRIMARY KEY (project_code, activity_id)
    );

## STEP 3 — INSERT (idempotent)
Insert all 10 rows from the CSV.

Primary key is (project_code, activity_id). Use an UPSERT so re-running never duplicates:

    INSERT INTO daily_task.tbl_prsd_sarujanan (...25 columns...)
    VALUES (...), (...), ...
    ON CONFLICT (project_code, activity_id) DO UPDATE SET
      activity_date               = EXCLUDED.activity_date,
      developer                   = EXCLUDED.developer,
      project_name                = EXCLUDED.project_name,
      requirement_id              = EXCLUDED.requirement_id,
      deliverable_id              = EXCLUDED.deliverable_id,
      activity_type               = EXCLUDED.activity_type,
      activity_title              = EXCLUDED.activity_title,
      activity_summary            = EXCLUDED.activity_summary,
      systems_touched             = EXCLUDED.systems_touched,
      files_touched               = EXCLUDED.files_touched,
      evidence_refs               = EXCLUDED.evidence_refs,
      reusable_asset_created      = EXCLUDED.reusable_asset_created,
      reusable_pattern            = EXCLUDED.reusable_pattern,
      validation_rule             = EXCLUDED.validation_rule,
      gap_or_risk                 = EXCLUDED.gap_or_risk,
      next_action                 = EXCLUDED.next_action,
      status                      = EXCLUDED.status,
      priority                    = EXCLUDED.priority,
      llm_queryable               = EXCLUDED.llm_queryable,
      company_knowledge_candidate = EXCLUDED.company_knowledge_candidate,
      memory_tags                 = EXCLUDED.memory_tags,
      source_skill_file           = EXCLUDED.source_skill_file,
      source_type                 = EXCLUDED.source_type,
      updated_at                  = now()
    RETURNING activity_id, (xmax = 0) AS inserted;

Rules:
- Escape single quotes by doubling them ('').
- Cast booleans explicitly: reusable_asset_created, llm_queryable, company_knowledge_candidate.
- Do NOT insert created_at / updated_at literals — let the defaults fire.
- Do NOT alter, drop or truncate anything. INSERT and CREATE only.
- Write ONLY to daily_task.tbl_prsd_sarujanan. Touch no other schema.
- Never write customer PII into this table. D03-A10 references order 203-4879249-8301944
  by ID only — no name, address, phone or email.

## STEP 4 — VALIDATION (STOP on any failure)
Abort and report if any of these fail. Do not "fix and continue".

1. Row count for 2026-07-10 is exactly 10.
2. activity_id values are exactly D03-A01 .. D03-A10 — no gaps, no duplicates.
3. No NOT NULL column is null.
4. The 2026-07-08 rows (D01-A01..D01-A09) are UNTOUCHED — compare their max(updated_at)
   before and after; it must not change.
5. RETURNING reports 10 inserted on a first run, or 0 inserted / 10 updated on a re-run.
   Any other split means the key is wrong — STOP.

## STEP 5 — CONFIRM WITH A SELECT (required before closing)
Run all four and print the results:

    -- 5a. The 10 rows just written
    SELECT activity_id, activity_date, activity_type, priority, status, activity_title
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-10'
    ORDER BY activity_id;

    -- 5b. Count + integrity across all days
    SELECT activity_date, count(*) AS rows,
           count(*) FILTER (WHERE status = 'completed') AS completed,
           count(DISTINCT activity_id) AS distinct_ids
    FROM daily_task.tbl_prsd_sarujanan
    GROUP BY activity_date ORDER BY activity_date;
    -- expect: 2026-07-08 -> 9 rows, 2026-07-10 -> 10 rows

    -- 5c. Prove the D01 rows were not disturbed
    SELECT count(*) AS d01_rows, max(updated_at) AS d01_last_touched
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-08';

    -- 5d. The critical findings are queryable
    SELECT activity_id, priority, gap_or_risk
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-10' AND priority = 'critical'
    ORDER BY activity_id;
    -- expect 5 rows: D03-A01 (6,958 undateable labels), D03-A02 (29,250 misclassified),
    -- D03-A03 (rate card restructured with no audit trail), D03-A04 (forecast tautology /
    -- list-vs-negotiated), D03-A05 (19 of 64 rate-card rows never loaded)

## STEP 6 — REPORT
State plainly:
- Whether the table already existed or was created.
- Rows inserted vs updated (from the RETURNING split).
- The output of 5a, 5b, 5c and 5d.
- Confirm the 2026-07-08 rows are untouched.

If any STEP 4 validation fails, report the failure and the exact SQL that failed.
Do not report success. Do not summarise around a failure.
````

---

## Record being saved — 10 activities (2026-07-10, D03)

| activity_id | Type | Priority | Title |
|---|---|---|---|
| D03-A01 | investigation | **critical** | Service labels exist in `order_id` prefixes, but 6,958 labels have no date and can never enter a weekly report |
| D03-A02 | investigation | **critical** | All 261 `carrier_name` values enumerated; ILIKE heuristic misclassifies 29,250 Royal Mail labels into `OTHERS` |
| D03-A03 | investigation | **critical** | Rate card restructured **live mid-session**; `blos.postage` dropped and split, with no audit trail |
| D03-A04 | analysis | **critical** | Smart Track forecast is a tautology (variance exactly £0.00); list rates overstate by 25–40% |
| D03-A05 | validation | **critical** | Excel vs PostgreSQL: 19 of 64 rate-card rows never loaded, including **all DHL and GLS** |
| D03-A06 | analysis | high | **DHL leakage FAIL is a false positive** — against the workbook's own rates DHL is £26.44 *under* |
| D03-A07 | implementation | high | Weekly Invoice Check rebuilt to workbook Sheet 5, cols A–P (16 columns, 21/21 checks pass) |
| D03-A08 | implementation | medium | Royal Mail mapping fixed (CRL48/Tracked 48 RM); last `Invoice £` mislabel removed |
| D03-A09 | implementation | low | Tables now fit the viewport height (`fitTables()` measures rather than hardcodes) |
| D03-A10 | analysis | medium | Sample orders traced end to end; domestic classification is inferred, not stored; PII flagged |

## ⚠️ D02 was never inserted

`daily_task.tbl_prsd_sarujanan` currently holds **only D01** (2026-07-08, 9 rows). The **D02 prompt
(2026-07-09) was prepared but never executed** — its CSV and skill file exist on disk but the rows are not
in the database.

If you want D02 in the table, run
`daily_works_logs/2026-07-09__prompt__save_prsd_d02_to_postgres.md` **first**, then this one. Both are
idempotent UPSERTs on `(project_code, activity_id)`, so the order only affects `created_at`.

Note also that D02's skill file carries `requirement_id = REQ-02` while its filename says `REQ-03`. D03 uses
**`REQ-02`** consistently in both the CSV and the skill file.
