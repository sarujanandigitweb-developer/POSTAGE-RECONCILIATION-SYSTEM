# 03 · Worksheet Mapping

Classifies each of the 11 worksheets into its dashboard role: **dashboard page**, **backend data**,
**lookup table**, **filter source**, or **reference**. This is the bridge between the workbook
structure (`02`) and the dashboard design (`04`).

---

## Master mapping table

| # | Worksheet | Grain | Primary role | Becomes… | Feeds |
|---|-----------|-------|--------------|----------|-------|
| 0 | `0. README` | narrative | Reference | Optional "Glossary & rules" drawer (collapsed) | developer/reviewer context |
| 1 | `1. Dashboard` | carrier + KPI | **Dashboard page** | **Home / Overview tab** | — (it is the destination) |
| 2 | `2. Daily Control` | per day | **Dashboard page** | **Daily Control tab** | Top KPI cards; KPI 22, 29, 30 |
| 3 | `3. Booking Log` | per booking bucket | **Backend data** | Embedded dataset + **Bookings drill-down table** | Daily Control, Weekly Check, KPIs 27, 31 |
| 4 | `4. Rate Card` | per price row | **Lookup table** | Embedded lookup (+ optional Rate Card reference tab) | Forecast £ reproduction/validation; KPI 28 |
| 5 | `5. Weekly Invoice Check` | carrier × week | **Dashboard page** | **Weekly Invoice Check tab** | Dashboard Carrier Summary; KPIs 23, 24 |
| 6 | `6. Leakage Register` | per dispute | **Dashboard page** | **Leakage / Disputes tab** | Leakage £ & Open Disputes cards; KPIs 25, 26 |
| 7 | `7. Gap Analysis` | per capability area | Reference | Optional "Why v3" info panel | — |
| 8 | `8. Lists` | per list item | **Filter source + lookup** | Filter dropdowns; enum validation | all filterable tabs |
| 9 | `9. SOP` | per step | Reference | Optional "How it works" drawer | — |
| — | `BLOS Thresholds` | per BLOS key | **Config / lookup** | Embedded thresholds object | every KPI target & status rule |

---

## Which sheets become dashboard PAGES (tabs)

1. **Overview / Home** ← `1. Dashboard` (KPI cards + Carrier Summary + KPI table).
2. **Daily Control** ← `2. Daily Control`.
3. **Weekly Invoice Check** ← `5. Weekly Invoice Check`.
4. **Leakage / Disputes** ← `6. Leakage Register`.
5. **Bookings (drill-down)** ← `3. Booking Log` (filterable table).
6. *(optional)* **Rate Card** ← `4. Rate Card` (read-only reference table).
7. *(optional, drawers)* **Glossary & Rules** ← `0. README` + `9. SOP` + `7. Gap Analysis`.

## Which sheets become BACKEND DATA (embedded, not directly shown as a page)

- `3. Booking Log` — the transactional fact table; everything aggregates from it.
- `4. Rate Card` — dimension/lookup for Forecast £ reproduction & validation.
- `BLOS Thresholds` — config values for KPI targets and status logic.

## Which sheets become LOOKUP TABLES

- `4. Rate Card` (Lookup Key → Rate, VAT%).
- `8. Lists` (enum domains; Owners map).
- `BLOS Thresholds` (key → value).

## Which sheets become FILTERS

Driven by `8. Lists`:
- **Carrier** (10 values) — primary filter across all pages.
- **Week** (from ISO Week Labels) — reporting-week selector.
- **Label Type** (7 values) — Customer vs Service split.
- **Destination** (23), **Weight Band** (9) — Bookings drill-down filters.
- **Status** (7) — Leakage/Disputes filter; **Issue Type** (16) — Leakage filter.

---

## Relationships (data-flow, from README Section 6)

```
Lists + BLOS Thresholds ──▶ (dropdowns + thresholds) ──▶ all sheets
Rate Card ──▶ Booking Log        (Lookup Key → Rate, VAT% → Forecast £)
Booking Log ──▶ Daily Control    (SUMIFS by date / label type)
Booking Log ──▶ Weekly Invoice Check (SUMIFS by carrier within week)
Weekly Invoice Check ──▶ Leakage Register (auto-flag LEAK/KILL)
All ──▶ Dashboard                (cards + carrier mirror + KPI table)
Dashboard ──▶ Friday review       (FAIL rows → EOD note)
```

The dashboard reproduces this exact dependency graph, but sourced from PostgreSQL instead of
cross-sheet formulas. **Booking Log is the single fact table**; Daily Control, Weekly Invoice
Check, Leakage Register and the Dashboard are all aggregations/views of it plus the manual inputs
(Invoice £, Credit Recovered £, Status, Service-expected counts).

## Drill-down behaviour (target)

- **Overview KPI card → source page:** Leakage £ card → Leakage tab; Open Disputes → Leakage tab
  filtered to open statuses; Forecast £ → Weekly Invoice Check.
- **Carrier Summary row → carrier detail:** clicking a carrier filters Weekly Invoice Check,
  Bookings, and Leakage to that carrier.
- **Weekly Check LEAK/KILL row → dispute:** links to the matching Leakage Register row(s).
- **Daily Control day → bookings:** clicking a day filters Bookings to that date.
- **Bookings row with Forecast £ = £0 & Qty > 0 → "unmapped" flag** (audit check 4).

## Manual-input fields that have no Postgres source yet (must be surfaced, not invented)

| Field | Sheet | Phase-2 handling |
|-------|-------|------------------|
| Invoice £ Inc VAT | Weekly Invoice Check G | From Postgres invoice ingestion when available; until then null/"awaiting invoice" |
| Credit Recovered £ | Leakage Register N | From dispute tracking; until then 0/null |
| Status (dispute) | Leakage Register M | From dispute tracking source |
| Service Labels expected | Daily Control M | From CS helpdesk integration |
| Closed By / Notes / Root Cause | Daily Control J/K, Leakage L | Audit-trail text; may stay blank |
| Owner (named person) | Lists D | Display `TBD — [Carrier]` until Sathees assigns |

These gaps are the reason the dashboard is "temporary" and why validation compares against the
workbook rather than treating Postgres as complete. See `05_postgresql_mapping.md`.
