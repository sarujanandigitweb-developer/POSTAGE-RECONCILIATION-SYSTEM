-- =============================================================================
-- POSTAGE RECONCILIATION SYSTEM · DASHBOARD QUERY PACK
-- Phase 2 · Read-only data retrieval for dashboard/data.js
-- =============================================================================
-- Author      : Sarujanan (via Claude Code)
-- Date        : 2026-07-08
-- Database     : Claude MCP (read-only). SELECT statements ONLY.
-- Governance   : No INSERT / UPDATE / DELETE / CREATE / ALTER anywhere in this file.
-- Business ref : Accounts postage_reconciliation_v3_merged.xlsx (v3.4)
-- Mapping doc  : documentation/05_postgresql_mapping.md + 02_database_discovery (Phase 2)
--
-- REPORTING WEEK : W27 2026  =  2026-06-29 (Mon)  ->  2026-07-05 (Sun)
--                  (most recent COMPLETE ISO-8601 week; W28 is partial)
-- AS-OF DATE     : 2026-07-08  (max order_date in DB; drives any "current" calc)
--
-- SOURCE TABLES (confirmed via MCP introspection):
--   public.order_transaction              (order-item grain; 1.23M rows; order_date to 2026-07-08)
--   public.order_shipping_billing_detail  (1 row ~ 1 shipment/order; NO date col -> join on order_id)
--   public.ebay_order_expenses            (marketplace fees; SHIPPING_LABEL only 45 rows all-time)
--   public.amazon_returns / public.ebay_returns / public.shopify_returns  (Return Label In — see Q10)
--
-- KNOWN MISSING (report, do NOT fabricate) — see Missing Columns Report:
--   service_tier, weight_band_kg, destination_zone, label_type  -> NOT in schema
--   rate card  -> blos.postage + blos.postage_history EXIST but have 0 ROWS (see Q11)
--                 => backfill/ETL gap, NOT a schema gap. Forecast-via-ratecard still impossible.
--   invoice ingestion fields (invoice_received_amount/date/id)  -> NOT in schema
--   leakage / dispute / recovery tables                         -> NOT in public schema
--   blos schema -> NOT empty: contains postage/postage_history tables (0 rows).
--                 Threshold VALUES still come from the workbook (BLOS API not live).
--
-- DB FINANCIAL COLUMNS USED (named by true meaning, not workbook name):
--   shipping_template_price  -> forecast_gbp  (DB "expected" price; 0% null)   [Forecast-equivalent]
--   carrier_charge           -> actual_gbp    (DB actual charge; 35% null)     [Invoice-equivalent]
--   NOTE: currencies are mixed (GBP+EUR); no FX table exists -> flagged as caveat, summed as stored.
--
-- DERIVED (heuristic, flagged): carrier_family — classifies the messy free-text
--   carrier_name into the 10 workbook carriers. NOT an official normalisation map.
--   The exact CASE logic is defined once in fn-style CTE `bl` and reused.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Q0 · REUSABLE CARRIER-FAMILY CLASSIFIER (documented heuristic)
-- Precedence matters: Smart Track & Wayfair matched BEFORE Royal Mail/Amazon,
-- because strings like 'Smart Track Royalmail 2nd' / 'Smart Track AMAZON SHIPPING'
-- belong to Smart Track. 'Others' = anything unmapped (UPS, Canada Post, blanks…).
-- (Shown here as a standalone SELECT for review; embedded inline in Q3/Q4 below.)
-- -----------------------------------------------------------------------------
SELECT
  CASE
    WHEN carrier_name ILIKE '%smart track%'                              THEN 'Smart Track'
    WHEN carrier_name ILIKE '%wayfair%'                                  THEN 'Wayfair'
    WHEN carrier_name ILIKE '%evri%' OR carrier_name ILIKE '%hermes%'    THEN 'Evri'
    WHEN carrier_name ILIKE '%dhl%'                                      THEN 'DHL'
    WHEN carrier_name ILIKE '%gls%'                                      THEN 'GLS'
    WHEN carrier_name ILIKE '%dpd%'                                      THEN 'DPD'
    WHEN carrier_name ILIKE '%usps%'                                     THEN 'USPS'
    WHEN carrier_name ILIKE '%amazon%'                                   THEN 'Amazon Shipping'
    WHEN carrier_name ILIKE '%royal mail%' OR carrier_name ILIKE '%royalmail%'
         OR carrier_name ILIKE 'rm %' OR carrier_name ILIKE '%crl48%'
         OR carrier_name ILIKE 'tracked 48 rm%'                          THEN 'Royal Mail'
    ELSE 'Others'
  END AS carrier_family,
  COUNT(*) AS shipments
FROM public.order_shipping_billing_detail
GROUP BY 1
ORDER BY shipments DESC;


-- -----------------------------------------------------------------------------
-- Q1 · OVERVIEW KPI CARDS  (reporting week W27 2026)
-- Maps to Dashboard top cards: Total Orders / Self-Labelled / Forecast £ / (Leakage £, Open Disputes = MISSING).
-- Counts are authoritative; financials are DB-equivalent (see header caveats).
-- -----------------------------------------------------------------------------
WITH wk AS (SELECT DATE '2026-06-29' AS w_start, DATE '2026-07-05' AS w_end),
ot AS (
  SELECT DISTINCT ot.order_id, ot.fba_sales, ot.source_name
  FROM public.order_transaction ot, wk
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN wk.w_start AND wk.w_end
)
SELECT
  (SELECT COUNT(*) FROM ot)                                             AS total_orders,
  (SELECT COUNT(*) FROM ot WHERE fba_sales IS TRUE)                     AS fba_excluded,
  (SELECT COUNT(*) FROM ot WHERE source_name='WAYFAIR')                 AS wayfair,
  (SELECT COUNT(*) FROM ot WHERE COALESCE(fba_sales,false)=false
                              AND source_name IS DISTINCT FROM 'WAYFAIR') AS self_labelled,
  (SELECT ROUND(SUM(s.shipping_template_price)::numeric,2)
     FROM public.order_shipping_billing_detail s
     WHERE s.order_id IN (SELECT order_id FROM ot))                     AS forecast_gbp_template,
  (SELECT ROUND(SUM(s.carrier_charge)::numeric,2)
     FROM public.order_shipping_billing_detail s
     WHERE s.order_id IN (SELECT order_id FROM ot))                     AS actual_gbp_carrier_charge;


-- -----------------------------------------------------------------------------
-- Q2 · DAILY CONTROL  (per calendar day, reporting week W27 2026)
-- Maps to sheet '2. Daily Control' customer side (cols A-H). Service side (M-P) = MISSING (no label_type).
-- Self-Labelled = Completed orders that are neither FBA nor Wayfair.
-- labels_shipments = shipment rows for those orders (proxy for 'Labels in Booking Log').
-- -----------------------------------------------------------------------------
WITH wk AS (SELECT DATE '2026-06-29' AS w_start, DATE '2026-07-05' AS w_end),
ord AS (
  SELECT DISTINCT ot.order_id, ot.order_date::date AS dt, ot.fba_sales, ot.source_name
  FROM public.order_transaction ot, wk
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN wk.w_start AND wk.w_end
)
SELECT
  o.dt                                                                  AS date,
  'W'||to_char(o.dt,'IW')||' '||to_char(o.dt,'IYYY')                    AS week_label,
  COUNT(*)                                                              AS total_orders,
  COUNT(*) FILTER (WHERE o.fba_sales IS TRUE)                           AS fba_excluded,
  COUNT(*) FILTER (WHERE o.source_name='WAYFAIR')                       AS wayfair,
  COUNT(*) FILTER (WHERE COALESCE(o.fba_sales,false)=false
                     AND o.source_name IS DISTINCT FROM 'WAYFAIR')      AS self_labelled,
  (SELECT COUNT(*) FROM public.order_shipping_billing_detail s
     WHERE s.order_id IN (SELECT order_id FROM ord o2 WHERE o2.dt=o.dt)) AS labels_shipments,
  (SELECT ROUND(SUM(s.shipping_template_price)::numeric,2)
     FROM public.order_shipping_billing_detail s
     WHERE s.order_id IN (SELECT order_id FROM ord o2 WHERE o2.dt=o.dt)) AS forecast_gbp_template
FROM ord o
GROUP BY o.dt
ORDER BY o.dt;


-- -----------------------------------------------------------------------------
-- Q3 · CARRIER SUMMARY / WEEKLY INVOICE CHECK  (per carrier_family, week W27 2026)
-- Maps to sheet '1. Dashboard' Carrier Summary + sheet '5. Weekly Invoice Check'.
-- forecast_gbp = SUM(template price); actual_gbp = SUM(carrier_charge).
-- variance_gbp = actual - forecast. Status computed against WORKBOOK BLOS values
--   (leakage_trigger_gbp=5.00, leakage_pct_max=0.01) since blos schema is empty.
-- carrier_family is the documented heuristic (Q0).
-- -----------------------------------------------------------------------------
WITH wk AS (SELECT DATE '2026-06-29' AS w_start, DATE '2026-07-05' AS w_end),
ord AS (
  SELECT DISTINCT ot.order_id
  FROM public.order_transaction ot, wk
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN wk.w_start AND wk.w_end
),
bl AS (
  SELECT
    CASE
      WHEN s.carrier_name ILIKE '%smart track%' THEN 'Smart Track'
      WHEN s.carrier_name ILIKE '%wayfair%' THEN 'Wayfair'
      WHEN s.carrier_name ILIKE '%evri%' OR s.carrier_name ILIKE '%hermes%' THEN 'Evri'
      WHEN s.carrier_name ILIKE '%dhl%' THEN 'DHL'
      WHEN s.carrier_name ILIKE '%gls%' THEN 'GLS'
      WHEN s.carrier_name ILIKE '%dpd%' THEN 'DPD'
      WHEN s.carrier_name ILIKE '%usps%' THEN 'USPS'
      WHEN s.carrier_name ILIKE '%amazon%' THEN 'Amazon Shipping'
      WHEN s.carrier_name ILIKE '%royal mail%' OR s.carrier_name ILIKE '%royalmail%'
           OR s.carrier_name ILIKE 'rm %' OR s.carrier_name ILIKE '%crl48%'
           OR s.carrier_name ILIKE 'tracked 48 rm%' THEN 'Royal Mail'
      ELSE 'Others'
    END AS carrier_family,
    s.shipping_template_price, s.carrier_charge
  FROM public.order_shipping_billing_detail s
  WHERE s.order_id IN (SELECT order_id FROM ord)
)
SELECT
  carrier_family,
  COUNT(*)                                                    AS labels,
  ROUND(SUM(shipping_template_price)::numeric,2)              AS forecast_gbp,
  ROUND(SUM(carrier_charge)::numeric,2)                       AS actual_gbp,
  ROUND((SUM(carrier_charge)-SUM(shipping_template_price))::numeric,2) AS variance_gbp,
  ROUND( CASE WHEN SUM(shipping_template_price)=0 THEN 0
    ELSE (SUM(carrier_charge)-SUM(shipping_template_price))/SUM(shipping_template_price) END ::numeric,4) AS variance_pct,
  COUNT(*) FILTER (WHERE carrier_charge IS NULL)              AS null_charge_rows
FROM bl
GROUP BY carrier_family
ORDER BY labels DESC;


-- -----------------------------------------------------------------------------
-- Q4 · BOOKING LOG (best-effort buckets, week W27 2026)
-- Maps to sheet '3. Booking Log'. TRUE grain (Carrier×Service×Weight×Destination×LabelType)
-- is NOT reconstructable (service/weight/label_type absent). Best available grain:
--   (date × carrier_family × shipping_country). Reported as buckets, gaps flagged.
-- -----------------------------------------------------------------------------
WITH wk AS (SELECT DATE '2026-06-29' AS w_start, DATE '2026-07-05' AS w_end),
ord AS (
  SELECT ot.order_id, MIN(ot.order_date::date) AS dt
  FROM public.order_transaction ot, wk
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN wk.w_start AND wk.w_end
  GROUP BY ot.order_id
)
SELECT
  o.dt AS date,
  CASE
    WHEN s.carrier_name ILIKE '%smart track%' THEN 'Smart Track'
    WHEN s.carrier_name ILIKE '%wayfair%' THEN 'Wayfair'
    WHEN s.carrier_name ILIKE '%evri%' OR s.carrier_name ILIKE '%hermes%' THEN 'Evri'
    WHEN s.carrier_name ILIKE '%dhl%' THEN 'DHL'
    WHEN s.carrier_name ILIKE '%gls%' THEN 'GLS'
    WHEN s.carrier_name ILIKE '%dpd%' THEN 'DPD'
    WHEN s.carrier_name ILIKE '%usps%' THEN 'USPS'
    WHEN s.carrier_name ILIKE '%amazon%' THEN 'Amazon Shipping'
    WHEN s.carrier_name ILIKE '%royal mail%' OR s.carrier_name ILIKE '%royalmail%'
         OR s.carrier_name ILIKE 'rm %' OR s.carrier_name ILIKE '%crl48%'
         OR s.carrier_name ILIKE 'tracked 48 rm%' THEN 'Royal Mail'
    ELSE 'Others'
  END AS carrier_family,
  COALESCE(NULLIF(s.shipping_country,''),'(unknown)') AS destination_country,
  COUNT(*) AS qty_labels,
  ROUND(SUM(s.shipping_template_price)::numeric,2) AS forecast_gbp,
  ROUND(SUM(s.carrier_charge)::numeric,2)          AS actual_gbp
FROM ord o
JOIN public.order_shipping_billing_detail s ON s.order_id = o.order_id
GROUP BY 1,2,3
HAVING COUNT(*) >= 3          -- suppress long tail of single-order buckets for a workable table
ORDER BY o.dt, qty_labels DESC;


-- -----------------------------------------------------------------------------
-- Q5 · WEEKLY TREND (last 6 complete ISO weeks) — supporting context
-- Orders + shipment financials per ISO week for a trend line.
-- -----------------------------------------------------------------------------
WITH ord AS (
  SELECT DISTINCT ot.order_id,
         to_char(ot.order_date,'IYYY')||'-W'||to_char(ot.order_date,'IW') AS iso_week,
         ot.order_date::date AS dt
  FROM public.order_transaction ot
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN DATE '2026-05-25' AND DATE '2026-07-06'
)
SELECT iso_week,
       MIN(dt) AS week_start, MAX(dt) AS week_end,
       COUNT(*) AS orders,
       (SELECT COUNT(*) FROM public.order_shipping_billing_detail s
          WHERE s.order_id IN (SELECT order_id FROM ord o2 WHERE o2.iso_week=o.iso_week)) AS shipments
FROM ord o
GROUP BY iso_week
ORDER BY iso_week;


-- -----------------------------------------------------------------------------
-- Q6 · SERVICE-LABEL PROXIES (source_name based) — FLAGGED / partial
-- The workbook Label Types (Replacement Out / etc.) do not exist as a column.
-- source_name IN ('REPLACEMENT','RESEND') is the closest real proxy. Reported
-- separately so the Accounts Team can see it, NOT merged into label_type logic.
-- -----------------------------------------------------------------------------
SELECT source_name AS service_proxy,
       COUNT(DISTINCT order_id) AS orders
FROM public.order_transaction
WHERE order_status='Completed'
  AND order_date::date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
  AND source_name IN ('REPLACEMENT','RESEND')
GROUP BY source_name
ORDER BY orders DESC;


-- -----------------------------------------------------------------------------
-- Q7 · DATA COVERAGE / QUALITY (for metadata + validation)
-- carrier_charge null %, carrier_name blank %, currency mix — for the week.
-- -----------------------------------------------------------------------------
WITH ord AS (
  SELECT DISTINCT ot.order_id
  FROM public.order_transaction ot
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
),
s AS (
  SELECT * FROM public.order_shipping_billing_detail
  WHERE order_id IN (SELECT order_id FROM ord)
)
SELECT
  COUNT(*) AS shipment_rows,
  ROUND(100.0*COUNT(*) FILTER (WHERE carrier_charge IS NULL)/NULLIF(COUNT(*),0),2)  AS pct_null_carrier_charge,
  ROUND(100.0*COUNT(*) FILTER (WHERE carrier_name IS NULL OR carrier_name='')/NULLIF(COUNT(*),0),2) AS pct_blank_carrier,
  COUNT(DISTINCT carrier_charge_currency) AS charge_currency_count,
  string_agg(DISTINCT COALESCE(carrier_charge_currency,'(null)'), ', ') AS charge_currencies
FROM s;


-- -----------------------------------------------------------------------------
-- Q8 · DAILY RECONCILIATION ACCURACY (KPI 22 proxy, week W27 2026)
-- Workbook: day is "Closed" when order math balances AND label gap = 0.
-- DB proxy: per day, self_labelled orders vs shipment count (gap). We cannot check
-- Service gap (no label_type). Reported as an accuracy proxy only.
-- -----------------------------------------------------------------------------
WITH ord AS (
  SELECT DISTINCT ot.order_id, ot.order_date::date AS dt, ot.fba_sales, ot.source_name
  FROM public.order_transaction ot
  WHERE ot.order_status='Completed'
    AND ot.order_date::date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
),
per_day AS (
  SELECT o.dt,
    COUNT(*) FILTER (WHERE COALESCE(o.fba_sales,false)=false
                       AND o.source_name IS DISTINCT FROM 'WAYFAIR') AS self_labelled,
    COUNT(*) FILTER (WHERE o.source_name='WAYFAIR')                  AS wayfair,
    (SELECT COUNT(*) FROM public.order_shipping_billing_detail s
       WHERE s.order_id IN (SELECT order_id FROM ord o2 WHERE o2.dt=o.dt)) AS shipments
  FROM ord o GROUP BY o.dt
)
SELECT dt,
       self_labelled, wayfair, shipments,
       (self_labelled + wayfair) - shipments AS order_vs_label_gap
FROM per_day ORDER BY dt;


-- =============================================================================
-- Q9 · CORRECTED CARRIER RECONCILIATION  (supersedes the template-price basis)
-- -----------------------------------------------------------------------------
-- WHY: shipping_template_price is 67% zero for the reporting week, so summing it
-- as "Forecast £" made every carrier look like a large LEAK (data mis-fetch).
-- FIX: use carrier_charge as the reliable ACTUAL postage cost, and derive an
-- EXPECTED baseline = prior-8-week (W19-W26, 2026-05-04..2026-06-28) average
-- carrier_charge per carrier_family × current-week labels — the README Section-15
-- "Forecast £ will fall back to a default per carrier" rule. Variance = Actual -
-- Expected then flags carriers charging above/below their recent norm.
-- Read-only. This query produced the corrected carrierSummary in the dashboard.
-- =============================================================================
WITH cls AS (
  SELECT s.order_id, s.carrier_charge,
    CASE
      WHEN carrier_name ILIKE '%smart track%' THEN 'Smart Track'
      WHEN carrier_name ILIKE '%wayfair%' THEN 'Wayfair'
      WHEN carrier_name ILIKE '%evri%' OR carrier_name ILIKE '%hermes%' THEN 'Evri'
      WHEN carrier_name ILIKE '%dhl%' THEN 'DHL'
      WHEN carrier_name ILIKE '%gls%' THEN 'GLS'
      WHEN carrier_name ILIKE '%dpd%' THEN 'DPD'
      WHEN carrier_name ILIKE '%usps%' THEN 'USPS'
      WHEN carrier_name ILIKE '%amazon%' THEN 'Amazon Shipping'
      WHEN carrier_name ILIKE '%royal mail%' OR carrier_name ILIKE '%royalmail%'
           OR carrier_name ILIKE 'rm %' OR carrier_name ILIKE '%crl48%' OR carrier_name ILIKE 'tracked 48 rm%' THEN 'Royal Mail'
      ELSE 'Others' END AS carrier_family
  FROM public.order_shipping_billing_detail s
),
base_orders AS (  -- prior 8 complete weeks (W19-W26)
  SELECT DISTINCT order_id FROM public.order_transaction
  WHERE order_status='Completed' AND order_date::date BETWEEN DATE '2026-05-04' AND DATE '2026-06-28'
),
wk_orders AS (    -- reporting week W27
  SELECT DISTINCT order_id FROM public.order_transaction
  WHERE order_status='Completed' AND order_date::date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
),
baseline AS (
  SELECT carrier_family,
         SUM(carrier_charge) FILTER (WHERE carrier_charge IS NOT NULL)
           / NULLIF(COUNT(*) FILTER (WHERE carrier_charge IS NOT NULL),0) AS base_rate
  FROM cls WHERE order_id IN (SELECT order_id FROM base_orders) GROUP BY carrier_family
),
wk AS (
  SELECT carrier_family, COUNT(*) AS labels,
         ROUND(SUM(carrier_charge)::numeric,2) AS actual_gbp,
         ROUND(AVG(carrier_charge)::numeric,3) AS avg_rate
  FROM cls WHERE order_id IN (SELECT order_id FROM wk_orders) GROUP BY carrier_family
)
SELECT w.carrier_family, w.labels, w.avg_rate,
       ROUND(b.base_rate::numeric,3)          AS baseline_rate,
       ROUND((b.base_rate*w.labels)::numeric,2) AS expected_gbp,
       w.actual_gbp,
       ROUND((w.actual_gbp - b.base_rate*w.labels)::numeric,2) AS variance_gbp,
       ROUND(CASE WHEN b.base_rate*w.labels=0 THEN 0
             ELSE (w.actual_gbp - b.base_rate*w.labels)/(b.base_rate*w.labels) END::numeric,4) AS variance_pct
FROM wk w LEFT JOIN baseline b USING (carrier_family)
ORDER BY w.labels DESC;

-- =============================================================================
-- Q10 · RETURN LABEL IN (README Section 21) — read-only, VERIFIED
-- -----------------------------------------------------------------------------
-- README Section 21 maps `ebay_order_expenses.transaction_memo` and
-- `amz_refund_expenses`. NEITHER EXISTS. The real sources are:
--   public.amazon_returns  (label_type, label_cost, rd_carrier, fulfilment, request_date)
--   public.ebay_returns    (return_id, carrier, tracking_no, request_date)
--   public.shopify_returns (refund_amount only -> NO label -> excluded)
-- FBA returns are OUT OF SCOPE (README Section 1). AmazonUnPaidLabel = customer-paid.
-- =============================================================================
SELECT 'Amazon FBM prepaid' AS source, 'public.amazon_returns' AS tbl,
       count(*) AS labels, round(sum(label_cost)::numeric,2) AS label_cost,
       string_agg(DISTINCT currency,'/') AS ccy
FROM public.amazon_returns
WHERE request_date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
  AND fulfilment='fbm' AND label_type='AmazonPrePaidLabel'
UNION ALL
SELECT 'eBay return w/ carrier (label evidence)', 'public.ebay_returns',
       count(DISTINCT return_id) FILTER (WHERE carrier IS NOT NULL AND btrim(carrier)<>''),
       NULL, '—'
FROM public.ebay_returns
WHERE request_date::date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05'
UNION ALL
SELECT 'eBay billed SHIPPING_LABEL fee', 'public.ebay_order_expenses',
       count(*), round(sum(COALESCE(transaction_amount,0))::numeric,2), 'GBP'
FROM public.ebay_order_expenses
WHERE transaction_type='SHIPPING_LABEL'
  AND transaction_date BETWEEN DATE '2026-06-29' AND DATE '2026-07-05';
-- Result (W27 2026): Amazon 110 · eBay label-evidenced 39 · eBay billed fee 1
-- Return Label In = 149 -> 149/3631 customer-order labels = 4.10% (KPI 31 FAIL vs 2%).


-- =============================================================================
-- Q11 · RATE-CARD PROBE — proves the table exists but is EMPTY
-- -----------------------------------------------------------------------------
-- Corrects the earlier claim "no rate-card table / blos schema is empty".
-- blos.postage has the right shape (postage_type, destination_zone, weight_from,
-- weight_to, weight_unit, postage_value) but 0 rows -> Forecast £ = Qty x Rate x
-- (1+VAT%) is NOT computable. This is a BACKFILL/ETL gap, not a schema gap.
-- =============================================================================
SELECT 'blos.postage' AS tbl, count(*) AS rows FROM blos.postage
UNION ALL
SELECT 'blos.postage_history', count(*) FROM blos.postage_history;
-- Result: 0 rows in both.
