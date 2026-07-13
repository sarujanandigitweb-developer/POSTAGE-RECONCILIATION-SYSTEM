# Claude Code Prompt — Save PRSD D02 Daily Progress to PostgreSQL

Copy everything inside the fenced block below into Claude Code as a single prompt.

---

````text
Use the connected PostgreSQL MCP to save today's PRSD daily progress record.

## TARGET
Schema: daily_task
Table:  daily_task.tbl_prsd_sarujanan

## SOURCE
CSV:   daily_works_logs/2026-07-09__sarujanan__prsd_daily-activities.csv
Skill: daily_works_logs/2026-07-09__sarujanan__prsd__REQ-03-D02.md
Rows:  9  (activity_id D02-A01 .. D02-A09, all activity_date = 2026-07-09)

## STEP 1 — EXISTENCE CHECK (do this first, do not assume)
Run:
    SELECT to_regclass('daily_task.tbl_prsd_sarujanan') AS tbl;

- If it returns NULL  -> the table does NOT exist. Go to STEP 2, then STEP 3.
- If it returns a name -> the table EXISTS. SKIP STEP 2. Go straight to STEP 3.

Do not trust any prior claim about whether this table exists. Verify with the query.

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
Insert all 9 rows from the CSV.

The primary key is (project_code, activity_id). Use an UPSERT so re-running this
prompt never creates duplicates:

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
- Escape single quotes by doubling them ('' ).
- Cast booleans explicitly: reusable_asset_created, llm_queryable,
  company_knowledge_candidate.
- Do NOT insert created_at / updated_at literals — let the defaults fire.
- Do NOT alter, drop or truncate anything. INSERT and CREATE only.
- Write ONLY to daily_task.tbl_prsd_sarujanan. Touch no other schema.
- Never write customer PII into this table. The activity_summary for D02-A08
  references order 203-4879249-8301944 by ID only — no name, address, phone or email.

## STEP 4 — VALIDATION (STOP on any failure)
Abort and report if any of these fail. Do not proceed, do not "fix and continue".

1. Row count for 2026-07-09 is exactly 9.
2. activity_id values are exactly D02-A01 .. D02-A09, no gaps, no duplicates.
3. No NOT NULL column is null.
4. No row from 2026-07-08 (D01-A01..D01-A09) was modified — compare updated_at
   before and after; the D01 rows must be untouched.
5. The RETURNING clause reports 9 inserted on a first run, or 0 inserted / 9
   updated on a re-run. Any other split means the key is wrong — STOP.

## STEP 5 — CONFIRM WITH A SELECT (required before closing)
Run all four and print the results:

    -- 5a. The 9 rows just written
    SELECT activity_id, activity_date, activity_type, priority, status, activity_title
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-09'
    ORDER BY activity_id;

    -- 5b. Count + integrity check
    SELECT activity_date, count(*) AS rows,
           count(*) FILTER (WHERE status = 'completed') AS completed,
           count(DISTINCT activity_id) AS distinct_ids
    FROM daily_task.tbl_prsd_sarujanan
    GROUP BY activity_date ORDER BY activity_date;
    -- expect: 2026-07-08 -> 9 rows, 2026-07-09 -> 9 rows

    -- 5c. Prove yesterday's rows were not disturbed
    SELECT count(*) AS d01_rows, max(updated_at) AS d01_last_touched
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-08';

    -- 5d. The critical findings are queryable
    SELECT activity_id, priority, gap_or_risk
    FROM daily_task.tbl_prsd_sarujanan
    WHERE activity_date = DATE '2026-07-09' AND priority = 'critical'
    ORDER BY activity_id;
    -- expect 3 rows: D02-A04 (no carrier invoice), D02-A05 (order-grain
    -- double-counting), D02-A07 (schema drift / three false blockers)

## STEP 6 — REPORT
State plainly:
- Whether the table already existed or was created.
- Rows inserted vs updated (from the RETURNING split).
- The output of 5a, 5b, 5c and 5d.
- Confirm the 2026-07-08 rows are untouched.

If any validation in STEP 4 fails, report the failure and the exact SQL that
failed. Do not report success. Do not summarise around a failure.
````

---

## Record being saved — 9 activities (2026-07-09, D02)

| activity_id | Type | Priority | Title |
|---|---|---|---|
| D02-A01 | implementation | high | Implemented all six Priority-2 calculation fixes; 42/42 automated checks pass |
| D02-A02 | implementation | high | Eliminated silent blanks: 23 blocked fields now render an Unavailable pill |
| D02-A03 | documentation | medium | Authored the calculation parity report and CHANGELOG 0.4.1 |
| D02-A04 | investigation | **critical** | Traced `Invoice £` to `carrier_charge` — the column is a mislabelled proxy |
| D02-A05 | investigation | **critical** | `order_transaction` is line-item grain; naive joins overstate postage by £1,215.88 |
| D02-A06 | investigation | high | Quantified 173 NULL `carrier_charge` rows; 146 legitimate, 27 genuine gaps |
| D02-A07 | investigation | **critical** | Re-verified live schema; disproved three of my own documented findings |
| D02-A08 | analysis | medium | Traced sample order 203-4879249-8301944; classified domestic; flagged PII |
| D02-A09 | documentation | high | Authored `documentation/16_postgresql_data_requirements.md` |

## Known metadata inconsistency (resolve before running)

The skill file's `requirement_id` reads **`REQ-02`**, while its `phase` and its own filename read
**`REQ-03`**. The CSV has been aligned to `REQ-02` to match the metadata block. If `REQ-03` is correct,
change both the CSV column and the skill file's metadata before running the import, since the value lands
in the database.
