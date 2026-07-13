# 15 · Carrier & Service Catalogue

**Source:** `public.order_shipping_billing_detail` · **Method:** read-only introspection via PostgreSQL MCP
**Scope:** 1,098,137 rows · 233,271 (21.2%) have blank/null `carrier_name` · 260 distinct non-blank strings

---

## 0. Two structural findings (read these first)

### 0.1 `carrier_charge` is a RATE CARD, not actual spend

For **all 260** distinct `carrier_name` values, `MIN(carrier_charge) = MAX(carrier_charge)`.
Zero variance. Verified:

```sql
SELECT COUNT(*) FILTER (WHERE mn IS DISTINCT FROM mx) AS strings_with_variance
FROM (SELECT carrier_name, MIN(carrier_charge) mn, MAX(carrier_charge) mx
      FROM public.order_shipping_billing_detail
      WHERE carrier_name IS NOT NULL AND TRIM(carrier_name) <> ''
      GROUP BY carrier_name) t;
-- strings_with_variance = 0
```

`carrier_charge` is a deterministic lookup on the `carrier_name` string. It is an **expected/templated
rate**, not an invoiced amount. **You cannot reconcile invoices against it** — it would always net to zero.
The real invoiced amounts are not in this table (see `07_database_discovery.md` §4: invoice fields absent).

### 0.2 `carrier_name` is three fields mashed into one string

```
Smart Track   |  Royalmail 2nd  |  100g LL
[platform/acct]  [carrier+service]  [weight band + format]

Trossingen schmutter | DHL | Paket International
[warehouse+account]   [carrier] [service]
```

The `service_tier`, `weight_band_kg` and `label_type` columns that `07_database_discovery.md` reports as
**absent** are not absent — they are **trapped inside `carrier_name` as unparsed free text**.

---

## 1. Carrier families (normalized)

| # | Carrier | Rows | Priced rows | % priced | Rate-card total |
|---|---------|-----:|------------:|---------:|----------------:|
| 1 | Evri/Hermes | 274,152 | 266,297 | 97.1% | £683,930.09 |
| 2 | Royal Mail | 195,815 | 193,364 | 98.7% | £621,266.32 |
| 3 | DHL | 108,082 | 107,549 | 99.5% | £601,507.32 |
| 4 | Amazon | 100,069 | 99,773 | 99.7% | £369,002.73 |
| 5 | GLS | 37,754 | 20,304 | 53.8% | £92,180.16 |
| 6 | ParcelDenOnline | 37,043 | 0 | 0.0% | — |
| 7 | Wayfair | 25,552 | 0 | 0.0% | — |
| 8 | Stamp (postage) | 22,017 | 0 | 0.0% | — |
| 9 | DPD | 13,615 | 13,615 | 100.0% | £70,437.21 |
| 10 | Etrak / Delivery Group | 5,618 | 0 | 0.0% | — |
| 11 | UPS | 4,745 | 2,952 | 62.2% | £14,317.20 |
| 12 | Canada Post | 2,755 | 2,729 | 99.1% | £51,332.49 |
| 13 | USPS | 2,553 | 2,440 | 95.6% | £29,280.00 |
| 14 | Deutsche Post | 2,186 | 0 | 0.0% | — |
| 15 | FR carriers (Colissimo/Mondial/Chronopost) | 403 | 0 | 0.0% | — |
| 16 | Parcelforce | 35 | 0 | 0.0% | — |
| 17 | FedEx | 34 | 0 | 0.0% | — |
| 18 | Yodel | 1 | 0 | 0.0% | — |
| — | **UNCLASSIFIED / placeholder** | **32,437** | 146 | 0.5% | £30.00 |

**~18 real carriers.** Rate-card totals are NOT actual spend (see §0.1).

---

## 2. Royal Mail — SIX billing streams, not one

Confirmed by the accounts team: Royal Mail is billed through more than one account. The data shows
**at least six distinct prefixes**, each with its own rate card.

| Stream | Rows | Identifier in string | Nature |
|--------|-----:|----------------------|--------|
| A. Smart Track (broker) | 29,246 | `Smart Track Royalmail …` | Reseller/broker |
| B. NEX | 56,101 | `… NEX` / `NEX(2kg)` | Reseller? **confirm** |
| C. Royal Mail Internal | 40,336 | `Royal Mail Internal` | Flat £4.00 on every row |
| D. CRL | 37,563 | `CRL48 …`, `CRL Royal Mail 24 …` | Reseller? **confirm** |
| E. Tracked RM (direct) | 21,084 | `Tracked 24/48 RM … Non Signature` | Direct account |
| F. International | 9,547 | `Royal Mail International Tracked Parcel` (+ `- HVK`) | £12.00 flat |
| G. TPN | 20 | `TPN Royal Mail Tracked 24 …` | Reseller? **confirm** |

> **Open question for accounts:** are `NEX`, `CRL`, `TPN` separate **billing accounts** or merely
> **service codes**? This changes the reconciliation grain. Cannot be determined from data alone.

### 2.1 Proof of separate rate cards — same service, two prices

| Service | Smart Track | CRL48 (direct) | Gap |
|---|---:|---:|---:|
| 2nd class 100g Large Letter | £1.15 | £2.29 | **+99%** |
| 2nd class 250g Large Letter | £1.62 | £1.91 | **+18%** |

Identical weight band + service, two prices → two rate cards → two accounts.

### 2.2 Royal Mail service/rate matrix

| Stream | Service | Weight/format | Rate | Rows |
|---|---|---|---:|---:|
| Smart Track | 2nd class | 100g LL | £1.15 | 13,602 |
| Smart Track | 2nd class | 250g LL | £1.62 | 9,017 |
| Smart Track | 2nd class | 1kg packet | £3.18 | 4,378 |
| Smart Track | 2nd class | 2kg packet | £3.44 | 1,372 |
| Smart Track | 1st class | 100g LL | £1.83 | 224 |
| Smart Track | 1st class | 250g LL | £1.88 | 185 |
| Smart Track | 1st class | 1kg packet | £4.76 | 443 |
| CRL48 | — | 100g LL | £2.29 | 18,267 |
| CRL48 | — | 250g LL | £1.91 | 16,126 |
| CRL48 | — | 500g LL | £1.91 | 2,682 |
| NEX | Tracked 48 | 2kg | £2.72 | 40,079 |
| NEX | Tracked 48 | 5kg | £3.48 | 3,227 |
| NEX | 48 | Large Letter | £2.44 | 12,795 |
| Direct | Tracked 48 Non-Sig | 750g LL | £2.52 | 12,919 |
| Direct | Tracked 48 Non-Sig | 2kg | £3.77 | 6,605 |
| Direct | Tracked 48 Non-Sig | 5kg | £4.05 | 358 |
| Direct | Tracked 48 Non-Sig | 15kg | £4.05 | 74 |
| Direct | Tracked 24 Non-Sig | 750g LL | £2.80 | 370 |
| Direct | Tracked 24 Non-Sig | 1kg | £5.46 | 575 |
| Direct | Tracked 24 Non-Sig | 2kg | £5.46 | 183 |
| Internal | — | — | £4.00 | 40,336 |
| International | Tracked Parcel | — | £12.00 | 8,466 |
| International | Tracked Parcel HVK | — | £12.00 | 1,081 |

---

## 3. Evri/Hermes — 3 streams, and Smart Track is the EXPENSIVE one here

| Stream | Service | Weight | Rate | Rows |
|---|---|---|---:|---:|
| Smart Track | — | 2Kg | £2.61 | 119,143 |
| Smart Track | — | 5Kg | £3.34 | 12,338 |
| Smart Track | — | 15Kg | £2.93 | 111 |
| Evri direct | 48h | 2Kg | £2.09 | 106,784 |
| Evri direct | 48h | 5Kg | £2.27 | 9,060 |
| Evri direct | 48h | 15Kg | £2.27 | 71 |
| Evri direct | 24h | 2Kg | £2.29 | 4,915 |
| Evri direct | 24h | 5Kg | £2.67 | 996 |
| Evri direct | 24h | 15Kg | £2.67 | 785 |
| Evri direct | International | 2Kg | £5.53 | 8,128 |
| Evri direct | International | 5Kg | £8.00 | 3,038 |
| Evri direct | International | 15Kg | unpriced | 306 |
| myHermes | Door-to-door | — | £2.44 | 928 |

> **Note the reversal:** for Royal Mail, Smart Track is *cheaper* than direct.
> For Hermes, Smart Track (£2.61 @ 2Kg) is **25% more expensive** than Evri direct 48h (£2.09).
> On the 119,143 `Smart Track Hermes 2Kg` rows that is a **£0.52/parcel** rate-card premium.

---

## 4. DHL & GLS — the German warehouse accounts (`kronen` vs `schmutter`)

`Trossingen` is the German warehouse. `kronen` and `schmutter` appear to be **two sub-accounts** at that
site — the same pattern as Royal Mail's multiple streams.

| Account | Service | Rate | Rows |
|---|---|---:|---:|
| Trossingen kronen | DHL Kleinpaket | £3.90 | 41,170 |
| Trossingen schmutter | DHL Kleinpaket | £3.90 | 15,480 |
| Trossingen kronen | DHL Paket | £5.25 | 8,809 |
| Trossingen schmutter | DHL Paket | £5.25 | 26,485 |
| Trossingen kronen | DHL Paket International | £12.51 | 2,281 |
| Trossingen schmutter | DHL Paket International | £12.51 | 13,331 |
| Trossingen schmutter | GLS | £4.54 | 20,304 |
| Trossingen kronen | GLS | unpriced | 1,870 |
| Trossingen (no acct) | GLS | unpriced | 6,994 |
| Duisburg | GLS | unpriced | 2,936 |

Unlike Royal Mail, `kronen` and `schmutter` carry **identical rates** — so they are two accounts on the
same rate card (cost-centre split), not two commercial agreements.

---

## 5. Amazon

| Stream | Service | Rate | Rows |
|---|---|---:|---:|
| Amazon direct | Amazon Shipping | £4.35 | 63,411 |
| Smart Track | 2 Day Large Letter | £2.16 | 19,188 |
| Smart Track | 2 Day Small | £2.90 | 11,544 |
| Smart Track | 2 Day Standard | £3.24 | 5,630 |
| Smart Track | 2 Day Medium | unpriced | 27 |

## 6. Other priced carriers

| Carrier | Service | Rate | Rows |
|---|---|---:|---:|
| DPD | Next Day UK | £4.05 | 7,701 |
| DPD | Two Day UK | £4.05 | 3,704 |
| DPD | International | £12.00 | 1,882 |
| DPD | (generic) | £5.07 | 328 |
| UPS | Standard | £4.85 | 2,952 |
| Canada Post | Expedited | £18.81 | 2,729 |
| USPS | Parcel Select Ground | £12.00 | 2,440 |
| Purolator | Ground | £15.00 | 2 |
| — | `collection order` | £0.00 | 144 |

---

## 7. Rate-card anomalies (non-monotonic weight bands)

Heavier should never cost less. These break that rule and are worth challenging:

| Carrier | Anomaly | Detail |
|---|---|---|
| Smart Track Hermes | **15Kg cheaper than 5Kg** | 5Kg = £3.34, 15Kg = £2.93 |
| CRL48 | **100g dearer than 250g** | 100g LL = £2.29, 250g LL = £1.91 |
| CRL48 | 250g = 500g | both £1.91 |
| Tracked 48 RM | 5Kg = 15Kg | both £4.05 |
| Evri 48h | 5Kg = 15Kg | both £2.27 |
| Evri 24h | 5Kg = 15Kg | both £2.67 |
| DPD | Next Day = Two Day | both £4.05 |

The **CRL48 100g vs 250g inversion** affects 18,267 rows and looks like a genuine rate-card error:
the lightest band is the most expensive.

---

## 8. Unpriced volume — the reconciliation blind spot

Carriers with **zero** priced rows, yet significant volume:

| Carrier / label | Rows | Note |
|---|---:|---|
| ParcelDenOnline | 37,043 | Standard Package + Standard Parcel |
| Wayfair Shipping | 25,552 | Marketplace-fulfilled |
| Stamp | 22,017 | Trossingen/Duisburg franking |
| Etrak / Delivery Group | 5,618 | |
| Deutsche Post | 2,186 | |
| Parcelforce / FedEx / Yodel | 70 | |

Plus **32,437 rows** of `UNCLASSIFIED / placeholder` strings that carry no carrier at all:
`Standard` (6,815), `95g LL` (10,129), `245g LL` (4,467), `900g parcel` (1,328), `express24` (3,294),
`NextDay`, `Other`, `Issue`, `CSV`, `Not Set`, `United Kingdom`, `Unit 3 Marshbrook Cl`, `Std UK Dom_1`…

Several of these (`95g LL`, `245g LL`, `900g parcel`) are **weight bands with the carrier stripped out** —
almost certainly Royal Mail, but unattributable with confidence.

### Total blind spot
- 233,271 rows (21.2%) — blank/null `carrier_name`
- ~155,000 rows — carrier known but **no rate**
- ⇒ roughly **35% of shipments have no cost figure at all**

---

## 9. Recommended next steps

1. **Do not build reconciliation on `carrier_charge`.** It is a rate card (§0.1). Locate the actual
   carrier invoices — they are not in this database.
2. **Confirm with accounts:** are `NEX`, `CRL`, `TPN` accounts or service codes? (§2)
3. **Challenge the CRL48 100g rate** (£2.29 > £1.91 for 250g) — 18,267 rows affected. (§7)
4. **Challenge the Smart Track Hermes premium** — £0.52/parcel over Evri direct on 119,143 rows. (§3)
5. **Build a `carrier_normalization` mapping table** (`raw_string → platform, carrier, service, weight_band`)
   to recover the three "missing" columns for ~78% of shipments.
6. **Resolve the 35% no-cost blind spot** before publishing any leakage number.

---

*Generated 2026-07-09 from live DB. All figures verified by query; no DDL/DML issued.*
