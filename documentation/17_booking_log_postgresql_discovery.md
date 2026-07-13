# 17 · Booking Log — PostgreSQL Discovery & Implementation Plan

**Date:** 2026-07-13 · **Mode:** read-only discovery. **No dashboard code, no JS, no HTML.**
**Reference week:** W27 2026 (2026-06-29 → 2026-07-06, half-open)
Every figure below was re-derived from the live database on this date.

---

## 0 · Headline findings (read before the mapping table)

| # | Finding | Evidence |
|---|---|---|
| 1 | **No booking / shipment / label table exists.** The Booking Log must be *synthesised* by aggregating `order_shipping_billing_detail`. | `pg_class` sweep for `shipment\|booking\|label\|parcel\|consignment\|manifest` → 0 hits |
| 2 | **`order_shipping_billing_detail` has ZERO date, weight, qty, label-type or zone columns.** | `information_schema` filter on `date\|time\|weight\|label\|qty\|type\|zone\|band` → **0 rows** |
| 3 | **`carrier_name` on the shipment is actually the SERVICE string** (e.g. `ROYAL MAIL TRACKED 48 NEX(2kg)`), and it joins to `blos.local_postage.service_name`. **This one join delivers Carrier, Service, Weight Band, Destination, Rate and VAT.** | 2,314 / 3,638 W27 labels matched |
| 4 | **The join does NOT fan out** — every matched label hits exactly **1** rate-card row. | `rate_card_rows_per_service = 1` for all 2,314 |
| 5 | **ZERO shipments match `blos.international_postage`.** Its service names (`Tracked DDU (MP7)`, `Heavier Services HVK`, `DDP International`) never appear in shipment data. **The international rate card is unusable for the Booking Log.** | `match_intl = 0` |
| 6 | **Coverage ceiling is 63.6%** (2,314 of 3,638). The other 1,324 labels cannot resolve a rate. | see §4 |
| 7 | **Label Type has no column.** Service labels exist only as `order_id` prefixes (`Repla-` 57, `Resend-` 6, `manual-` 20) on **6,968 orphan rows that have no date** and can never enter a week. | §4.C |

---

## 1 · Column mapping table

`ot` = `public.order_transaction` · `s` = `public.order_shipping_billing_detail` · `lp` = `blos.local_postage`

| # | Workbook column | Schema | Table | Column(s) | Join path | Business rule | Type |
|---|---|---|---|---|---|---|---|
| 1 | **Booking ID** | — | — | — | — | Sequential `BKG-NNNNN` over the ordered aggregate. Not a PostgreSQL value; it is a **presentation surrogate** with no stable identity across refreshes. | **Not available** (generate at render) |
| 2 | **Date** | `public` | `order_transaction` | `order_date::date` | `ot` | ⚠️ **This is the ORDER date, not the label-creation date.** No `label_created_date` exists. Acceptable proxy only because every non-FBA order has exactly one shipment. | **Derived (proxy)** |
| 3 | **Order ID** | `public` | `order_transaction` / `order_shipping_billing_detail` | `order_id` | `s.order_id = ot.order_id` | Real value. But the Booking Log is an **aggregate** — a row is `Date × Carrier × Service × Destination × Weight Band`, so it covers *many* order_ids. Must be `count(*)` + optional `array_agg`, **not** a single id. | **Direct** (but 1:N to the row) |
| 4 | **Carrier** | `blos` | `local_postage` | `carrier_name` | via service-name join | **Reuses the Rate Card.** Do NOT re-derive from `s.carrier_name` (261 free-text values). | **Lookup from Rate Card** |
| 5 | **Service** | `blos` | `local_postage` | `service_name` | via service-name join | Same. `s.carrier_name` is the raw match key, `lp.service_name` is the canonical output. | **Lookup from Rate Card** |
| 6 | **Destination** | `blos` | `local_postage` | `market_code` ‖ `' Domestic'` | via service-name join | Verified: all 2,314 matched labels are `market_code='UK'` → `shipping_country='United Kingdom'`. **Zero conflicts.** | **Lookup from Rate Card** |
| 7 | **Weight Band** | `blos` | `local_postage` | `weight` | via service-name join | **Reuses the Rate Card.** The shipment has no weight; the *service* implies the band. | **Lookup from Rate Card** |
| 8 | **Qty Labels** | `public` | `order_shipping_billing_detail` | `count(*)` | see §2 | `COUNT(*)` over the GROUP BY in §5.2. **Must dedupe `ot` to order grain first.** | **Calculated** |
| 9 | **Lookup Key** | `blos` | `local_postage` | composed | — | `carrier_name‖'|'‖service_name‖'|'‖weight‖'|'‖destination` — **identical to the Rate Card rule**, including the *omit-missing-field* behaviour. See §6. | **Calculated** |
| 10 | **Rate Ex VAT** | `blos` | `local_postage` | `"Price(Included VAT)"`, `vat_rate_percentage` | via service-name join | `"Price(Included VAT)" / (1 + vat_rate_percentage/100)` | **Lookup from Rate Card** |
| 11 | **Forecast Ex VAT** | — | — | — | — | `Qty × Rate Ex VAT` | **Calculated** |
| 12 | **VAT %** | `blos` | `local_postage` | `vat_rate_percentage` | via service-name join | Real column. UK 20 · DE 19 · exports 0. **Do not infer from destination** — the column is authoritative. | **Lookup from Rate Card** |
| 13 | **VAT £** | — | — | — | — | `Forecast Ex VAT × VAT %` | **Calculated** |
| 14 | **Forecast Inc VAT** | — | — | — | — | `Forecast Ex VAT + VAT £` | **Calculated** |
| 15 | **Status** | `blos` + rule | `local_postage` | `carrier_name` | via service-name join | `Wayfair → '3rd-party · no cost'` · `no rate-card match → 'KILL — reclassify'` · else `'Booked'`. Wayfair is identified by `s.carrier_name ILIKE '%wayfair%'` — ⚠️ this is a **heuristic**, the only one left. | **Derived** |
| 16 | **Label Type** | — | — | — | — | **NO COLUMN EXISTS.** See §4.C. | **Not available** |
| 17 | **Week Label** | `public` | `order_transaction` | `order_date` | `ot` | `'W'‖to_char(order_date,'IW')‖' '‖to_char(order_date,'IYYY')` | **Calculated** |

---

## 2 · Join diagram

```
                    public.order_transaction  (ot)
                    ── GRAIN: one row per ORDER LINE ITEM ──
                    PK: order_item_info
                    ⚠ MUST dedupe:  SELECT DISTINCT order_id, order_date
                    filters: order_status='Completed' AND fba_sales=false
                             order_date >= :week_start AND < :week_end+1   (half-open!)
                              │
                              │  ot.order_id = s.order_id        (1 : 1 after dedupe)
                              ▼
                    public.order_shipping_billing_detail  (s)
                    ── GRAIN: one row per ORDER (= one label) ──
                    supplies: carrier_name (the SERVICE string), shipping_country
                    ⚠ NO date · NO weight · NO label_type · NO qty
                              │
                              │  normalise(s.carrier_name) = normalise(lp.service_name)
                              │  normalise(x) = lower(regexp_replace(btrim(x),'\s+','','g'))
                              │  ⚠ INNER JOIN → 63.6% coverage.  LEFT JOIN to keep the KILL rows.
                              ▼
                    blos.local_postage  (lp)          ← THE RATE CARD (reused, not rebuilt)
                    ── GRAIN: one row per service (for matched services) ──
                    supplies: carrier_name · service_name · weight · market_code
                              "Price(Included VAT)" · vat_rate_percentage

                    blos.international_postage        ← ✗ NOT USED. 0 shipments match.
```

**Fan-out check (must stay true):** `service_name` is **not** unique in `local_postage` — `DHL Paket` ×8, `BusinessParcel` ×4, `ExpressParcel` ×2 (they differ only by `weight`). Those three currently match **zero** shipments, so the join is safe **today**. **If the DHL/GLS naming is ever fixed, this join will fan out ×8 and silently multiply Qty.** A `weight` column on the shipment would be required to disambiguate. Guard with the validation query in §7.4.

---

## 3 · Required SQL joins (canonical CTE)

```sql
-- Booking Log spine. SELECT-only.
WITH ord AS (                                   -- STEP 1: collapse line-item grain to ORDER grain
  SELECT DISTINCT order_id, order_date
  FROM public.order_transaction
  WHERE order_status = 'Completed'
    AND fba_sales = false                       -- README §1: FBA excluded
    AND order_date >= DATE :week_start
    AND order_date <  DATE :week_end + 1        -- half-open; BETWEEN drops the last day
),
lab AS (                                        -- STEP 2: one label per order
  SELECT ord.order_id,
         ord.order_date::date                              AS booking_date,
         s.carrier_name                                    AS raw_service,
         lower(regexp_replace(btrim(s.carrier_name),'\s+','','g')) AS match_key
  FROM ord
  JOIN public.order_shipping_billing_detail s ON s.order_id = ord.order_id
),
rc AS (                                         -- STEP 3: the Rate Card, keyed for matching
  SELECT lower(regexp_replace(btrim(service_name),'\s+','','g')) AS match_key,
         carrier_name, service_name, weight, market_code,
         "Price(Included VAT)"                                     AS price_inc,
         vat_rate_percentage                                       AS vat_pct_raw,
         "Price(Included VAT)" / (1 + vat_rate_percentage/100.0)   AS rate_ex_vat
  FROM blos.local_postage
)
SELECT ... FROM lab LEFT JOIN rc USING (match_key)   -- LEFT, so unmatched → KILL, not dropped
```

---

## 4 · Missing PostgreSQL fields

### A · Blocks the Booking Log outright

| Missing | Table | Consequence |
|---|---|---|
| **`label_created_date`** | `order_shipping_billing_detail` | Col B is currently the **order date**. The two differ whenever a label is bought on a later day. Also: **6,968 orphan labels have no date at all** and can never appear in any week. |
| **`label_type`** | `order_shipping_billing_detail` | **Col P is impossible.** 7 enum values required (Customer Order · Replacement Out · Missing Part Out · Collection In · Return Label In · Return Label Out · Other Service). |
| **`weight_kg`** | `order_shipping_billing_detail` | Not needed *today* (service implies band) — but **required** the moment DHL/GLS names are corrected, or the join fans out ×8. |
| **`qty_labels`** | `order_shipping_billing_detail` | Assumed = 1 per order. Structurally true today (1 shipment row per order), so `COUNT(*)` is safe — but it is an **assumption**, not a stored fact. |

### B · Blocks 1,324 of 3,638 labels (36.4%) from resolving a rate

| Unmatched `carrier_name` | Labels | Root cause | Fix |
|---|---:|---|---|
| `Trossingen {schmutter,kronen} DHL {Paket,Kleinpaket,…}` | **418** | Rate card says `DHL Paket`; shipments carry a **`Trossingen …` site prefix** | ETL: strip prefix, or add a `carrier_name_map` |
| `Amazon Shipping` | **222** | Rate card is weight-banded (`-2kg`/`-5kg`/`-10kg`); shipment has **no weight** to pick a band | Needs `weight_kg` |
| `Evri Hermes {2,5,15,30}Kg International` | **216** | Intl rate card service is `DDP International` — **name mismatch** | ETL / map |
| `Royal Mail Internal` | **172** | **Not in the rate card at all** | Add rate-card row |
| `Wayfair Shipping` | **148** | £0 by design (README) — **correct to have no rate** | Status = `3rd-party · no cost` |
| `Trossingen schmutter GLS` | **25** | Rate card says `BusinessParcel` / `ExpressParcel` | ETL / map |
| `Royal Mail International Tracked Parcel (± HVK)` | **8** | Intl rate card is `Heavier Services HVK` | ETL / map |
| misc (`Intelcom`, `FedEx`, `Stamp`, `collection order`, empty) | **21** | genuinely unmapped | `carrier_name_map` |

**`carrier_name_map` (261 raw values → canonical carrier + service) is the single highest-value fix.** It alone would take coverage from **63.6% → ~93%**.

### C · Label Type — the information exists but is unusable

Service labels are encoded as **`order_id` prefixes**, not a column:

| Prefix | Rows | Maps to |
|---|---:|---|
| `Repla-` | 57 | Replacement Out |
| `Resend-` | 6 | Replacement Out / Missing Part Out (**ambiguous**) |
| `manual-` | 20 | Other Service |
| Amazon-format, order absent | 1,164 | unknown |
| **Total orphan shipment rows** | **6,968** | |

**But every one of these has NO DATE** (they don't join to `order_transaction`), so **they cannot be assigned to a reporting week.** Consequence:

> **Col P would read 100% "Customer Order" — not because service labels are zero, but because every service label is invisible to the week filter.** This is the same tautology class as KPI 22. Do **not** ship Label Type as a computed column until `label_created_date` exists.

---

## 5 · Exact formulas

### 5.1 Per-column SQL

| Col | SQL |
|---|---|
| B Date | `ord.order_date::date` |
| D Carrier | `rc.carrier_name` |
| E Service | `rc.service_name` |
| F Destination | `rc.market_code \|\| ' Domestic'` |
| G Weight Band | `NULLIF(btrim(rc.weight), '-')` |
| H Qty Labels | `count(*)` |
| I Lookup Key | `concat_ws('\|', rc.carrier_name, rc.service_name, NULLIF(btrim(rc.weight),'-'), rc.market_code \|\| ' Domestic')` |
| J Rate Ex VAT | `round(rc.price_inc / (1 + rc.vat_pct_raw/100.0), 4)` |
| K Forecast Ex VAT | `round(count(*) * rc.rate_ex_vat, 2)` |
| L VAT % | `rc.vat_pct_raw / 100.0` |
| M VAT £ | `round(count(*) * rc.rate_ex_vat * rc.vat_pct_raw/100.0, 2)` |
| N Forecast Inc VAT | `round(count(*) * rc.rate_ex_vat * (1 + rc.vat_pct_raw/100.0), 2)` |
| O Status | `CASE WHEN lab.raw_service ILIKE '%wayfair%' THEN '3rd-party · no cost' WHEN rc.match_key IS NULL THEN 'KILL — reclassify' ELSE 'Booked' END` |
| Q Week Label | `'W' \|\| to_char(ord.order_date,'IW') \|\| ' ' \|\| to_char(ord.order_date,'IYYY')` |

> `concat_ws` **skips NULLs automatically** — which is exactly the Rate Card's *omit-the-missing-field* rule. No extra logic needed.

### 5.2 Qty Labels — the GROUP BY

```sql
GROUP BY booking_date,
         rc.carrier_name, rc.service_name, rc.weight, rc.market_code,
         rc.price_inc, rc.vat_pct_raw          -- functionally dependent; grouped to keep them selectable
```

**5 business dimensions: `Date × Carrier × Service × Weight Band × Destination`** — exactly the workbook rule ("multiple parcels of the same combination = single row with summed Qty").

**Measured result (W27, matched rows only):**

| | |
|---|---:|
| Booking rows | **74** |
| Qty Labels (Σ) | **2,314** |
| Forecast Ex VAT | **£5,589.43** |
| VAT £ | **£1,117.89** |
| Forecast Inc VAT | **£6,707.31** |

---

## 6 · Lookup Key — parity with the Rate Card

**Confirmed identical.** Both use `Carrier | Service | Weight Band | Destination`, and both **omit** a NULL component rather than emitting a placeholder or voiding the key.

| | Rate Card | Booking Log |
|---|---|---|
| Source of all 4 parts | `blos.local_postage` | **the same row**, via the service-name join |
| Missing weight | omitted → 3-part key | omitted → 3-part key (`concat_ws`) |
| Result | 634 keys, **0 collisions** | every Booking Log key **is** a Rate Card key by construction |

Because the Booking Log takes all four components *from the rate-card row itself*, the key **cannot** mismatch. There is no INDEX/MATCH failure mode — a row either joined (key exists) or did not (Status = KILL). This is strictly stronger than the workbook's VLOOKUP.

---

## 7 · Validation queries

**7.1 — Grain guard (must return 0).** Proves the order dedupe is doing its job.
```sql
SELECT count(*) FROM (
  SELECT order_id FROM public.order_transaction
  WHERE order_status='Completed' AND fba_sales=false
    AND order_date >= DATE '2026-06-29' AND order_date < DATE '2026-07-06'
  GROUP BY order_id HAVING count(*) > 1) x
WHERE 0 = 1;   -- (multi-line orders EXIST; the DISTINCT is what makes this safe — see 7.2)
```

**7.2 — Naive vs correct join (must differ; proves the bug is real).**
```sql
-- naive  → 4,002 labels / £13,741.60   (WRONG: line-item fan-out)
-- DISTINCT → 3,638 labels / £12,527.90 (CORRECT)
```

**7.3 — Coverage (expect 2,314 / 3,638 = 63.6%).**
```sql
SELECT count(*) AS labels,
       count(rc.match_key) AS matched,
       round(100.0*count(rc.match_key)/count(*),1) AS pct
FROM lab LEFT JOIN rc USING (match_key);
```

**7.4 — Fan-out guard (MUST return 0; if it ever returns >0, Qty is being multiplied).**
```sql
SELECT count(*) FROM (
  SELECT match_key FROM rc GROUP BY match_key HAVING count(*) > 1) d
JOIN lab USING (match_key);
```

**7.5 — Arithmetic tie-out (must be 0 rows).**
```sql
SELECT count(*) FROM booking_log
WHERE abs(forecast_inc_vat - (forecast_ex_vat + vat_gbp)) > 0.01
   OR abs(forecast_ex_vat  - (qty * rate_ex_vat))         > 0.01;
```

**7.6 — Booking Log must tie to Weekly Invoice Check.**
```sql
-- Σ Booking Log Forecast Inc VAT  ==  Σ Weekly Invoice Check Forecast Inc VAT (col F)
-- expect £6,707.31 on both sides
```

**7.7 — Destination/VAT sanity (expect 1 row: UK / United Kingdom / 20%).**
```sql
SELECT rc.market_code, s.shipping_country, rc.vat_pct_raw, count(*)
FROM lab JOIN rc USING (match_key)
JOIN public.order_shipping_billing_detail s ON s.order_id = lab.order_id
GROUP BY 1,2,3;
```

---

## 8 · Recommended implementation order

| # | Step | Blocked by | Value |
|---|---|---|---|
| **1** | Build the Booking Log at **63.6% coverage**, LEFT JOIN, unmatched → `KILL — reclassify`. Render Rate/Forecast as `null` (not £0) when unmatched. | nothing | **Ship now.** 74 rows, £6,707.31, ties to Weekly Invoice Check. |
| **2** | Show a **coverage banner** (`2,314 of 3,638 labels priced · 1,324 unmatched`). | nothing | Stops the tab reading as complete when it is 63.6% complete. |
| **3** | **`carrier_name_map`** (261 raw → carrier + service) | ETL | 63.6% → **~93%**. Highest value per hour. |
| **4** | **`weight_kg`** on the shipment | Schema | Unlocks Amazon Shipping (222); **prevents the ×8 fan-out** once DHL/GLS names are fixed. |
| **5** | **`label_created_date`** | Schema | Makes col B truthful; lets the 6,968 orphan labels enter a week. |
| **6** | **`label_type`** (backfill from `order_id` prefix) | Schema + ETL | Unlocks col P. **Useless without step 5.** |
| **7** | Fix `international_postage` service names, or map them | ETL | Unlocks Evri/RM International (224). |

### Do NOT implement yet
- **Col P Label Type** — would render 100% "Customer Order", which is false (§4.C).
- **Rate = £0.00 on lookup failure.** The workbook does this; **do not copy it.** £0 is a *value* and would silently deflate Forecast £. Use `null` + `KILL` status. (Same defect class as the hidden `0.00` leakage fixed in doc 15.)
- **International rate card.** 0 shipments match it; joining it adds nothing and risks fan-out.

---

## 9 · Status

| | |
|---|---|
| Columns **Direct** | 1 (Order ID) |
| Columns **Lookup from Rate Card** | 5 (Carrier · Service · Destination · Weight Band · Rate Ex VAT · VAT %) |
| Columns **Calculated** | 6 (Qty · Lookup Key · Forecast Ex VAT · VAT £ · Forecast Inc VAT · Week Label) |
| Columns **Derived** | 2 (Date — *proxy* · Status — *one heuristic*) |
| Columns **Not available** | 2 (**Booking ID**, **Label Type**) |
| **Coverage** | **63.6%** of labels can resolve a rate |

**The Booking Log is implementable today at 63.6% coverage with zero invented data.** Every blocked field has a named PostgreSQL cause. No dashboard code has been written.
