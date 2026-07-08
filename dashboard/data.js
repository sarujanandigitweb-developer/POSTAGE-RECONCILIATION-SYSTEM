/* =============================================================================
 * POSTAGE RECONCILIATION SYSTEM · EMBEDDED DASHBOARD DATA
 * Phase 2 output · Generated from PostgreSQL via Claude MCP (READ-ONLY)
 * =============================================================================
 * Generated (as-of) : 2026-07-08
 * Reporting week      : W27 2026  (Mon 2026-06-29  ->  Sun 2026-07-05)
 * Source              : PostgreSQL — public.order_transaction,
 *                       public.order_shipping_billing_detail, public.ebay_order_expenses
 * Query pack          : dashboard/sql/dashboard_queries.sql
 * Business reference   : Accounts postage_reconciliation_v3_merged.xlsx (v3.4)
 *
 * DATA-INTEGRITY NOTES (read before using any figure):
 *  • COUNTS (orders, labels, per-carrier label counts) are AUTHORITATIVE — sourced
 *    directly and internally consistent (Σ carrier labels = Σ daily shipments = 3631).
 *  • FINANCIALS are DB-EQUIVALENTS, not the workbook's rate-card model:
 *       forecast_gbp  <- shipping_template_price  (DB "expected"; ~0% null this week)
 *       actual_gbp    <- carrier_charge           (DB actual; 4.79% null this week)
 *    The workbook computes Forecast £ from a Rate Card (which does NOT exist in the DB)
 *    and Invoice £ from manual carrier statements (NOT ingested). These DB columns are
 *    the closest real equivalents and are labelled by their true meaning. Treat £ as
 *    INDICATIVE. Currency is MIXED (GBP + EUR, no FX table) — summed as stored.
 *  • carrier_family is a DOCUMENTED HEURISTIC classifying the free-text carrier_name
 *    into the 10 workbook carriers (see dashboard/sql Q0). NOT an official mapping.
 *  • MISSING (no DB source; NOT fabricated): service_tier, weight_band, destination_zone,
 *    label_type, rate card, invoice ingestion, leakage/dispute/recovery, BLOS API.
 *    See metadata.gaps and documentation/ (Phase-2 reports).
 *
 * This file contains DATA ONLY. No HTML/CSS/UI. STOP condition per Phase-2 brief.
 * ============================================================================= */

const dashboardData = {

  /* --- Overview KPI cards (Dashboard sheet top cards, week W27 2026) --------- */
  overview: {
    reporting_week: "W27 2026",
    week_start: "2026-06-29",
    week_end: "2026-07-05",
    total_orders: 4020,          // completed orders (distinct order_id)
    fba_excluded: 389,           // source_name=AMAZON style FBA (fba_sales=true)
    wayfair: 147,                // source_name=WAYFAIR (3rd-party label, £0 to us)
    self_labelled: 3484,         // completed, non-FBA, non-Wayfair
    labels_shipments: 3631,      // shipment rows for the week (proxy for labels)
    forecast_gbp: 5651.37,       // Σ shipping_template_price   [INDICATIVE]
    actual_gbp: 12517.31,        // Σ carrier_charge            [INDICATIVE]
    daily_recon_accuracy: 1.0,   // 7/7 days order-vs-label gap = 0  -> 100%
    // The following workbook KPI cards have NO PostgreSQL source (see metadata.gaps):
    leakage_gbp_open: null,      // no leakage/dispute table
    open_disputes: null          // no dispute table
  },

  /* --- Daily Control (sheet 2), one row per day, week W27 -------------------- */
  dailyControl: [
    { date:"2026-06-29", week_label:"W27 2026", total_orders:610, fba_excluded:43, wayfair:17, self_labelled:550, labels_shipments:567, order_vs_label_gap:0, forecast_gbp:820.75, actual_gbp:1942.64, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-06-30", week_label:"W27 2026", total_orders:614, fba_excluded:54, wayfair:18, self_labelled:542, labels_shipments:560, order_vs_label_gap:0, forecast_gbp:842.14, actual_gbp:1917.09, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-07-01", week_label:"W27 2026", total_orders:594, fba_excluded:69, wayfair:18, self_labelled:507, labels_shipments:525, order_vs_label_gap:0, forecast_gbp:896.81, actual_gbp:1889.99, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-07-02", week_label:"W27 2026", total_orders:545, fba_excluded:58, wayfair:21, self_labelled:466, labels_shipments:487, order_vs_label_gap:0, forecast_gbp:708.43, actual_gbp:1644.96, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-07-03", week_label:"W27 2026", total_orders:504, fba_excluded:50, wayfair:22, self_labelled:432, labels_shipments:454, order_vs_label_gap:0, forecast_gbp:760.67, actual_gbp:1567.07, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-07-04", week_label:"W27 2026", total_orders:522, fba_excluded:58, wayfair:21, self_labelled:443, labels_shipments:464, order_vs_label_gap:0, forecast_gbp:660.30, actual_gbp:1524.37, closure_status:"✓ Closed (customer-side proxy)" },
    { date:"2026-07-05", week_label:"W27 2026", total_orders:631, fba_excluded:57, wayfair:30, self_labelled:544, labels_shipments:574, order_vs_label_gap:0, forecast_gbp:962.27, actual_gbp:2031.19, closure_status:"✓ Closed (customer-side proxy)" }
    // NOTE: service side (Service Labels expected/in-BL/gap, cols M-P) is ABSENT —
    // no label_type column in the DB. order_vs_label_gap covers customer side only.
  ],

  /* --- Weekly Invoice Check (sheet 5), per carrier_family, week W27 ---------- */
  weeklyInvoice: [
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"Royal Mail",      labels:2273, forecast_gbp:1835.59, actual_gbp:6473.21, variance_gbp:4637.62, variance_pct:2.5265, null_charge_rows:0,   status:"LEAK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"DHL",             labels:514,  forecast_gbp:1593.18, actual_gbp:3038.22, variance_gbp:1445.04, variance_pct:0.9070, null_charge_rows:0,   status:"LEAK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"Evri",            labels:348,  forecast_gbp:2039.80, actual_gbp:1587.25, variance_gbp:-452.55, variance_pct:-0.2219, null_charge_rows:10, status:"LEAK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"Amazon Shipping", labels:223,  forecast_gbp:0.00,    actual_gbp:970.05,  variance_gbp:970.05,  variance_pct:0.0000, null_charge_rows:0,   status:"CHECK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"Wayfair",         labels:146,  forecast_gbp:0.00,    actual_gbp:null,    variance_gbp:null,    variance_pct:0.0000, null_charge_rows:146, status:"OK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"DPD",             labels:78,   forecast_gbp:80.17,   actual_gbp:315.90,  variance_gbp:235.73,  variance_pct:2.9404, null_charge_rows:0,   status:"LEAK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"GLS",             labels:25,   forecast_gbp:27.45,   actual_gbp:113.50,  variance_gbp:86.05,   variance_pct:3.1348, null_charge_rows:0,   status:"LEAK" },
    { week_start:"2026-06-29", week_end:"2026-07-05", carrier:"Others",          labels:24,   forecast_gbp:75.18,   actual_gbp:19.18,   variance_gbp:-56.00,  variance_pct:-0.7449, null_charge_rows:18, status:"KILL" }
    // status computed vs WORKBOOK BLOS values (leakage_trigger_gbp=5, leakage_pct_max=0.01)
    // applied to the INDICATIVE £ figures — see integrity notes. Others -> KILL by rule.
  ],

  /* --- Carrier Summary (Dashboard sheet mirror) — same figures, display order --- */
  carrierSummary: [
    { carrier:"Royal Mail",      labels:2273, forecast_gbp:1835.59, actual_gbp:6473.21, variance_gbp:4637.62, variance_pct:2.5265, status:"LEAK", owner:"TBD — Royal Mail" },
    { carrier:"DHL",             labels:514,  forecast_gbp:1593.18, actual_gbp:3038.22, variance_gbp:1445.04, variance_pct:0.9070, status:"LEAK", owner:"TBD — DHL" },
    { carrier:"Evri",            labels:348,  forecast_gbp:2039.80, actual_gbp:1587.25, variance_gbp:-452.55, variance_pct:-0.2219, status:"LEAK", owner:"TBD — Evri" },
    { carrier:"Amazon Shipping", labels:223,  forecast_gbp:0.00,    actual_gbp:970.05,  variance_gbp:970.05,  variance_pct:0.0000, status:"CHECK", owner:"TBD — Amazon Shipping" },
    { carrier:"Wayfair",         labels:146,  forecast_gbp:0.00,    actual_gbp:null,    variance_gbp:null,    variance_pct:0.0000, status:"OK",   owner:"TBD — Wayfair" },
    { carrier:"DPD",             labels:78,   forecast_gbp:80.17,   actual_gbp:315.90,  variance_gbp:235.73,  variance_pct:2.9404, status:"LEAK", owner:"TBD — DPD" },
    { carrier:"GLS",             labels:25,   forecast_gbp:27.45,   actual_gbp:113.50,  variance_gbp:86.05,   variance_pct:3.1348, status:"LEAK", owner:"TBD — GLS" },
    { carrier:"Others",          labels:24,   forecast_gbp:75.18,   actual_gbp:19.18,   variance_gbp:-56.00,  variance_pct:-0.7449, status:"KILL", owner:"TBD — Others / kill" }
    // NOTE: USPS + Smart Track have 0 shipments in this UK/DE-dominant week's completed
    // orders that carry a carrier_name; they exist in the wider table (see gaps).
  ],

  /* --- Mandatory KPI table (Dashboard rows 22-31). Targets from WORKBOOK BLOS. -
   * status: PASS / FAIL / N/A(no source). actual=null where no DB source exists. */
  kpis: [
    { row:22, kpi:"Daily reconciliation accuracy",       blos_key:"postage.daily_recon_target",      target:1.0,   actual:1.0,     direction:"higher", status:"PASS", note:"7/7 days customer gap = 0 (service side not checkable)" },
    { row:23, kpi:"Weekly leakage £",                blos_key:"postage.leakage_trigger_gbp",      target:0,     actual:null,    direction:"lower",  status:"N/A",  note:"no leakage/dispute source in DB" },
    { row:24, kpi:"Weekly leakage %",                     blos_key:"postage.leakage_pct_max",          target:0.01,  actual:null,    direction:"lower",  status:"N/A",  note:"depends on true Forecast vs Invoice (rate card + invoice ingestion missing)" },
    { row:25, kpi:"Recovery rate",                        blos_key:"postage.recovery_rate_min",        target:0.80,  actual:null,    direction:"higher", status:"N/A",  note:"no credit-recovered / dispute source" },
    { row:26, kpi:"Avg dispute age (days)",               blos_key:"postage.dispute_age_max_days",     target:14,    actual:null,    direction:"lower",  status:"N/A",  note:"no dispute table" },
    { row:27, kpi:"Others share",                         blos_key:"postage.others_share_max",         target:0.02,  actual:0.0066,  direction:"lower",  status:"PASS", note:"DERIVED: heuristic Others family 24/3631 labels = 0.66%" },
    { row:28, kpi:"Rate card age (days)",                 blos_key:"postage.rate_card_age_max_days",   target:30,    actual:null,    direction:"lower",  status:"N/A",  note:"no rate card table in DB" },
    { row:29, kpi:"Service spend %",                      blos_key:"postage.service_spend_pct_max",    target:0.05,  actual:null,    direction:"lower",  status:"N/A",  note:"no label_type; £ split not possible" },
    { row:30, kpi:"Service-to-customer ratio",            blos_key:"postage.service_ratio_max",        target:0.03,  actual:null,    direction:"lower",  status:"N/A",  note:"no label_type; see serviceProxies for partial signal" },
    { row:31, kpi:"Return rate (returns / customer)",     blos_key:"postage.return_rate_max",          target:0.02,  actual:null,    direction:"lower",  status:"N/A",  note:"eBay SHIPPING_LABEL only 45 rows, none return-linked" }
  ],

  /* --- Booking Log (sheet 3) best-effort buckets: date × carrier_family × country -
   * TRUE grain (Carrier×Service×Weight×Destination×LabelType) NOT reconstructable.
   * Buckets with >= 5 labels shown (long single-order tail suppressed). ------- */
  bookingLog: [
    { date:"2026-06-29", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:353, forecast_gbp:223.91, actual_gbp:970.88 },
    { date:"2026-06-29", carrier:"DHL",             destination_country:"Germany",        qty_labels:70,  forecast_gbp:107.51, actual_gbp:306.75 },
    { date:"2026-06-29", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:39,  forecast_gbp:0.00,   actual_gbp:169.65 },
    { date:"2026-06-29", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:20,  forecast_gbp:24.14,  actual_gbp:47.08 },
    { date:"2026-06-29", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:13,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-06-29", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:12,  forecast_gbp:25.89,  actual_gbp:48.60 },
    { date:"2026-06-29", carrier:"Evri",            destination_country:"Ireland",        qty_labels:10,  forecast_gbp:66.58,  actual_gbp:67.65 },
    { date:"2026-06-29", carrier:"DHL",             destination_country:"France",         qty_labels:7,   forecast_gbp:63.44,  actual_gbp:87.57 },
    { date:"2026-06-29", carrier:"Evri",            destination_country:"Italy",          qty_labels:7,   forecast_gbp:67.74,  actual_gbp:35.65 },
    { date:"2026-06-29", carrier:"Evri",            destination_country:"Germany",        qty_labels:7,   forecast_gbp:45.76,  actual_gbp:38.71 },
    { date:"2026-06-29", carrier:"GLS",             destination_country:"Germany",        qty_labels:5,   forecast_gbp:0.00,   actual_gbp:22.70 },
    { date:"2026-06-30", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:357, forecast_gbp:250.70, actual_gbp:1003.36 },
    { date:"2026-06-30", carrier:"DHL",             destination_country:"Germany",        qty_labels:53,  forecast_gbp:88.82,  actual_gbp:232.35 },
    { date:"2026-06-30", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:30,  forecast_gbp:0.00,   actual_gbp:130.50 },
    { date:"2026-06-30", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:24,  forecast_gbp:45.10,  actual_gbp:55.32 },
    { date:"2026-06-30", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:20,  forecast_gbp:28.14,  actual_gbp:81.00 },
    { date:"2026-06-30", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:18,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-06-30", carrier:"Evri",            destination_country:"Italy",          qty_labels:10,  forecast_gbp:88.79,  actual_gbp:65.18 },
    { date:"2026-06-30", carrier:"Evri",            destination_country:"Germany",        qty_labels:9,   forecast_gbp:53.27,  actual_gbp:52.24 },
    { date:"2026-06-30", carrier:"Evri",            destination_country:"France",         qty_labels:9,   forecast_gbp:75.10,  actual_gbp:49.18 },
    { date:"2026-06-30", carrier:"DHL",             destination_country:"Italy",          qty_labels:6,   forecast_gbp:55.20,  actual_gbp:75.06 },
    { date:"2026-06-30", carrier:"DHL",             destination_country:"France",         qty_labels:6,   forecast_gbp:56.16,  actual_gbp:75.06 },
    { date:"2026-06-30", carrier:"GLS",             destination_country:"Germany",        qty_labels:5,   forecast_gbp:9.15,   actual_gbp:22.70 },
    { date:"2026-07-01", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:321, forecast_gbp:246.08, actual_gbp:923.75 },
    { date:"2026-07-01", carrier:"DHL",             destination_country:"Germany",        qty_labels:67,  forecast_gbp:91.64,  actual_gbp:296.40 },
    { date:"2026-07-01", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:27,  forecast_gbp:0.00,   actual_gbp:117.45 },
    { date:"2026-07-01", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:21,  forecast_gbp:46.08,  actual_gbp:48.49 },
    { date:"2026-07-01", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:16,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-07-01", carrier:"Evri",            destination_country:"Germany",        qty_labels:14,  forecast_gbp:89.88,  actual_gbp:81.77 },
    { date:"2026-07-01", carrier:"Evri",            destination_country:"Italy",          qty_labels:11,  forecast_gbp:97.69,  actual_gbp:65.18 },
    { date:"2026-07-01", carrier:"Evri",            destination_country:"France",         qty_labels:9,   forecast_gbp:77.36,  actual_gbp:49.77 },
    { date:"2026-07-01", carrier:"DHL",             destination_country:"France",         qty_labels:8,   forecast_gbp:72.51,  actual_gbp:100.08 },
    { date:"2026-07-01", carrier:"Evri",            destination_country:"Ireland",        qty_labels:5,   forecast_gbp:29.97,  actual_gbp:30.12 },
    { date:"2026-07-01", carrier:"GLS",             destination_country:"Germany",        qty_labels:5,   forecast_gbp:0.00,   actual_gbp:22.70 },
    { date:"2026-07-01", carrier:"DHL",             destination_country:"Italy",          qty_labels:5,   forecast_gbp:44.65,  actual_gbp:62.55 },
    { date:"2026-07-02", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:304, forecast_gbp:243.52, actual_gbp:872.05 },
    { date:"2026-07-02", carrier:"DHL",             destination_country:"Germany",        qty_labels:49,  forecast_gbp:87.51,  actual_gbp:208.65 },
    { date:"2026-07-02", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:30,  forecast_gbp:0.00,   actual_gbp:130.50 },
    { date:"2026-07-02", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:20,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-07-02", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:19,  forecast_gbp:23.45,  actual_gbp:42.91 },
    { date:"2026-07-02", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:19,  forecast_gbp:14.07,  actual_gbp:76.95 },
    { date:"2026-07-02", carrier:"Evri",            destination_country:"Germany",        qty_labels:13,  forecast_gbp:109.43, actual_gbp:74.36 },
    { date:"2026-07-02", carrier:"Evri",            destination_country:"Italy",          qty_labels:8,   forecast_gbp:75.33,  actual_gbp:49.18 },
    { date:"2026-07-02", carrier:"GLS",             destination_country:"Germany",        qty_labels:5,   forecast_gbp:9.15,   actual_gbp:22.70 },
    { date:"2026-07-03", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:286, forecast_gbp:240.13, actual_gbp:796.08 },
    { date:"2026-07-03", carrier:"DHL",             destination_country:"Germany",        qty_labels:48,  forecast_gbp:86.93,  actual_gbp:220.95 },
    { date:"2026-07-03", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:23,  forecast_gbp:0.00,   actual_gbp:100.05 },
    { date:"2026-07-03", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:22,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-07-03", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:18,  forecast_gbp:29.34,  actual_gbp:42.94 },
    { date:"2026-07-03", carrier:"Evri",            destination_country:"Germany",        qty_labels:11,  forecast_gbp:64.06,  actual_gbp:70.12 },
    { date:"2026-07-03", carrier:"Evri",            destination_country:"France",         qty_labels:9,   forecast_gbp:81.54,  actual_gbp:57.18 },
    { date:"2026-07-03", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:9,   forecast_gbp:4.69,   actual_gbp:36.45 },
    { date:"2026-07-04", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:293, forecast_gbp:233.70, actual_gbp:823.12 },
    { date:"2026-07-04", carrier:"DHL",             destination_country:"Germany",        qty_labels:58,  forecast_gbp:110.16, actual_gbp:250.50 },
    { date:"2026-07-04", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:36,  forecast_gbp:0.00,   actual_gbp:156.60 },
    { date:"2026-07-04", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:19,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-07-04", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:15,  forecast_gbp:28.94,  actual_gbp:35.73 },
    { date:"2026-07-04", carrier:"Evri",            destination_country:"Ireland",        qty_labels:7,   forecast_gbp:42.76,  actual_gbp:38.71 },
    { date:"2026-07-04", carrier:"Evri",            destination_country:"Italy",          qty_labels:7,   forecast_gbp:62.49,  actual_gbp:41.18 },
    { date:"2026-07-04", carrier:"Evri",            destination_country:"Germany",        qty_labels:6,   forecast_gbp:53.27,  actual_gbp:35.65 },
    { date:"2026-07-04", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:5,   forecast_gbp:2.69,   actual_gbp:20.25 },
    { date:"2026-07-05", carrier:"Royal Mail",      destination_country:"United Kingdom", qty_labels:351, forecast_gbp:314.71, actual_gbp:987.97 },
    { date:"2026-07-05", carrier:"DHL",             destination_country:"Germany",        qty_labels:72,  forecast_gbp:140.73, actual_gbp:309.15 },
    { date:"2026-07-05", carrier:"Amazon Shipping", destination_country:"United Kingdom", qty_labels:38,  forecast_gbp:0.00,   actual_gbp:165.30 },
    { date:"2026-07-05", carrier:"Wayfair",         destination_country:"United Kingdom", qty_labels:29,  forecast_gbp:0.00,   actual_gbp:null },
    { date:"2026-07-05", carrier:"Evri",            destination_country:"United Kingdom", qty_labels:15,  forecast_gbp:37.33,  actual_gbp:34.81 },
    { date:"2026-07-05", carrier:"Evri",            destination_country:"Germany",        qty_labels:13,  forecast_gbp:104.16, actual_gbp:79.30 },
    { date:"2026-07-05", carrier:"DHL",             destination_country:"France",         qty_labels:12,  forecast_gbp:108.72, actual_gbp:150.12 },
    { date:"2026-07-05", carrier:"DPD",             destination_country:"United Kingdom", qty_labels:10,  forecast_gbp:4.69,   actual_gbp:40.50 },
    { date:"2026-07-05", carrier:"DHL",             destination_country:"Italy",          qty_labels:7,   forecast_gbp:59.53,  actual_gbp:87.57 },
    { date:"2026-07-05", carrier:"Evri",            destination_country:"France",         qty_labels:6,   forecast_gbp:56.11,  actual_gbp:35.06 },
    { date:"2026-07-05", carrier:"GLS",             destination_country:"Germany",        qty_labels:5,   forecast_gbp:9.15,   actual_gbp:22.70 }
  ],

  /* --- Leakage Register (sheet 6) — NO PostgreSQL SOURCE ---------------------
   * No leakage / dispute / recovery table exists in the public schema. This is a
   * MANUAL-INPUT / production-trigger dataset in the workbook. Left EMPTY (not
   * fabricated). Populate in a future phase when a dispute source exists. ---- */
  leakage: [],

  /* --- Supporting: 6-week order trend (context, not a workbook sheet) -------- */
  weeklyTrend: [
    { iso_week:"2026-W22", week_start:"2026-05-25", week_end:"2026-05-31", orders:3691 },
    { iso_week:"2026-W23", week_start:"2026-06-01", week_end:"2026-06-07", orders:4425 },
    { iso_week:"2026-W24", week_start:"2026-06-08", week_end:"2026-06-14", orders:4249 },
    { iso_week:"2026-W25", week_start:"2026-06-15", week_end:"2026-06-21", orders:3681 },
    { iso_week:"2026-W26", week_start:"2026-06-22", week_end:"2026-06-28", orders:3513 },
    { iso_week:"2026-W27", week_start:"2026-06-29", week_end:"2026-07-05", orders:4020 }
  ],

  /* --- Supporting: service-label PROXIES (source_name based; partial signal) --
   * The workbook Label Types don't exist as a column. Closest real proxy below.
   * NOT merged into label_type logic — shown separately for transparency. ---- */
  serviceProxies: {
    basis: "order_transaction.source_name (proxy only — not the workbook label_type)",
    week: "W27 2026",
    counts: [
      { proxy:"MANUAL OM",   orders:51 },
      { proxy:"REPLACEMENT", orders:7 },
      { proxy:"RESEND",      orders:2 }
    ]
  },

  /* --- Lookups (from the WORKBOOK — Lists sheet + BLOS Thresholds sheet) ------
   * These are business reference values (Lists has no DB table; blos schema is
   * empty). Embedded from the workbook so filters/thresholds work offline. --- */
  lookups: {
    source: "workbook (Accounts postage_reconciliation_v3_merged.xlsx v3.4)",
    carriers: ["Royal Mail","DHL","Evri","Amazon Shipping","USPS","DPD","GLS","Smart Track","Wayfair","Others"],
    statuses: ["Open","Investigating","Chase carrier","Credit expected","Recovered","Closed","Killed"],
    issueTypes: ["Relabelling","Surcharge applied","Volumetric reweigh","Wrong zone billed","Format reclass","Service tier mismatch","Missing invoice","Duplicate billing","Unmapped carrier","Manual entry gap","Replacement label not invoiced","Collection label not invoiced","Service label rate mismatch","Repeat replacement (3+) for one order","Return label rate mismatch","Return label not invoiced (marketplace)"],
    destinations: ["UK Domestic","DE Domestic","DE","FR","IE","IT","ES","NL","BE","AT","PL","SE","CH","PT","US Domestic","Cyprus","Malta","Croatia","Denmark","Iceland","Greece","Hungary","Norway"],
    weightBands: ["0.5kg","1kg","2kg","3kg","5kg","10kg","15kg","30kg","n/a"],
    labelTypes: ["Customer Order","Replacement Out","Missing Part Out","Collection In","Return Label In","Return Label Out","Other Service"],
    owners: ["TBD — Royal Mail","TBD — DHL","TBD — Evri","TBD — Amazon Shipping","TBD — USPS","TBD — DPD","TBD — GLS","TBD — Smart Track","TBD — Wayfair","TBD — Others / kill"]
  },

  /* --- BLOS thresholds (from the WORKBOOK BLOS Thresholds sheet; blos schema empty) */
  blos: {
    source: "workbook (blos schema in DB is empty; BLOS API not live)",
    "postage.leakage_pct_max": 0.01,
    "postage.leakage_trigger_gbp": 5.00,
    "postage.others_share_max": 0.02,
    "postage.invoice_coverage_target": 1.00,
    "postage.recovery_rate_min": 0.80,
    "postage.dispute_age_max_days": 14,
    "postage.rate_card_age_max_days": 30,
    "postage.daily_recon_target": 1.00,
    "postage.cost_variance_max": 0.03,
    "postage.dispute_l1_days": 7,
    "postage.dispute_l2_days": 14,
    "postage.service_spend_pct_max": 0.05,
    "postage.service_ratio_max": 0.03,
    "postage.replacement_per_order_max": 2,
    "postage.return_rate_max": 0.02
  },

  /* --- Metadata + data-quality + gap register ------------------------------- */
  metadata: {
    generated_as_of: "2026-07-08",
    snapshot_source: "PostgreSQL via Claude MCP (read-only)",
    reporting_week: "W27 2026",
    week_start: "2026-06-29",
    week_end: "2026-07-05",
    source_tables: ["public.order_transaction","public.order_shipping_billing_detail","public.ebay_order_expenses"],
    order_filter: "order_status = 'Completed'",
    carrier_mapping: "heuristic (see dashboard/sql/dashboard_queries.sql Q0) — NOT an official normalisation map",
    financial_basis: {
      forecast_gbp: "shipping_template_price (DB expected price) — INDICATIVE, not workbook rate-card Forecast",
      actual_gbp: "carrier_charge (DB actual) — INDICATIVE, not manual carrier-invoice",
      currency: "MIXED (GBP + EUR); no FX table; summed as stored"
    },
    data_quality_week: {
      shipment_rows: 3631,
      pct_null_carrier_charge: 4.79,
      pct_blank_carrier_name: 0.06,
      internal_consistency: "Σ carrierSummary.labels (3631) = Σ dailyControl.labels_shipments (3631) = OK"
    },
    gaps: [
      "label_type column absent -> Service Labels (M-P), Service spend %, Service ratio, Return rate NOT computable",
      "service_tier / weight_band / destination_zone columns absent -> true Booking Log grain not reconstructable",
      "rate card table absent -> workbook Forecast £ (rate-card) not reproducible; template price used as proxy",
      "invoice ingestion absent -> workbook Invoice £ not available; carrier_charge used as proxy",
      "leakage / dispute / recovery tables absent -> Leakage Register empty; recovery & dispute-age KPIs N/A",
      "blos schema empty & BLOS API not live -> thresholds sourced from workbook",
      "carrier_name is free text -> carrier_family is heuristic; official mapping table required",
      "USPS & Smart Track show 0 labels this week among carrier-tagged completed orders",
      "eBay SHIPPING_LABEL only 45 rows, none return-linked -> return-label datasets unavailable",
      "carrier_charge mixes GBP+EUR with no FX -> financial totals INDICATIVE only"
    ]
  }
};

/* Node / browser dual export (no UI). */
if (typeof module !== "undefined" && module.exports) { module.exports = dashboardData; }
