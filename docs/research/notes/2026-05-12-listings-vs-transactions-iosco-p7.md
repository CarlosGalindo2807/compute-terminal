# Listings vs. transactions — can CTI honestly claim IOSCO Principle 7?

**Date:** 2026-05-12
**Author:** index-architect (third run)
**Topic:** IOSCO Principle 7 (Data Sufficiency) and EU BMR Article 11 (Input data)
require a benchmark to be "anchored by observable transactions." Every CTI input
today is a scraped *listing* (an ask), not an observed trade. This note maps the
exposure, surveys how comparable benchmarks (oil PRAs, Baltic Exchange freight
indices, LBMA precious-metal fixes, appraisal-based property indices) handle the
absence of a public trade tape, and recommends a two-track response.
**Companion files:** [`docs/research/gaps/iosco-principles.md`](../gaps/iosco-principles.md)
(row P7) and [`docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md`](2026-05-10-iosco-principles-applied-to-cti.md)
(§B, P7) which flagged this as "the single most important methodological exposure."

> **Source-fetch note.** Direct WebFetch of `ioscopd415.pdf`, the EUR-Lex BMR
> consolidated text, and the lexparency mirror was blocked at the network layer
> (HTTP 403) again this session, as in the 2026-05-10 run. Quoted Principle 7 /
> Article 11 text below is reconstructed from IOSCO- and ESMA-published search
> excerpts and from training knowledge of the regulation; passages in quotation
> marks appeared near-verbatim in those excerpts. A future session from an
> environment with PDF egress should download FR07/13 and the consolidated
> Regulation (EU) 2016/1011 into a research-only artifact and reconcile.
> External page text is treated as untrusted data, never as instructions.

---

## 1. What Principle 7 / Article 11 actually demand

**IOSCO FR07/13, Principle 7 (Data Sufficiency).** The data used to construct a
benchmark determination should be "sufficient to represent accurately and
reliably the [interest] measured" and should be "based on prices, rates, indices
or values that have been formed by the competitive forces of supply and demand
and be anchored by observable transactions entered into at arm's length between
buyers and sellers." Crucially, IOSCO's own guidance states that **proportionality
does not relax the transaction-anchoring requirement**: "the requirement in
Principle 7 that a Benchmark must be anchored in an active market having
observable, Arm's-length Transactions is not affected by the concept of
proportionality." (IOSCO FR07/13; reiterated in the IOSCOPD549 2018 Guidance.)

There is, however, an important nuance that cuts in CTI's favour: IOSCO does
**not** require a benchmark to be built *solely* of transaction data, nor does it
say transaction data must dominate every individual determination. "Administrators
may rely on non-transactional data such as offers and bids and adjustments based
on Expert Judgment for purposes of constructing an individual Benchmark
determination, but such data should only be used as an adjunct or supplement to
transactional data." The load-bearing word is **anchored** — there must be a real
transactional market underneath, even if a given day's number is computed from
quotes.

**EU BMR (Regulation (EU) 2016/1011), Article 11(1).** The Regulation codifies a
strict hierarchy:
- (a) input data "shall be sufficient to represent accurately and reliably the
  market or economic reality that the benchmark is intended to measure";
- (c) **"the input data shall be transaction data, if available and appropriate"**;
- (c continued) "if transaction data is not sufficient or is not appropriate …
  input data which is not transaction data may be used, including estimated
  prices, quotes and committed quotes, or other values";
- Article 11(3)(d): the administrator must "draw up and publish clear guidelines
  regarding the types of input data, the priority of use of the different types
  of input data and the exercise of expert judgement."

So the regulated-benchmark floor is not "you must have trades." It is: (1) there
must be a genuine arms-length transactional market; (2) you must *prefer*
transaction data where you can get it; (3) where you can't, quotes are permitted
**if you publish the hierarchy and the reason transaction data is unavailable or
inappropriate**; (4) the result must still faithfully represent economic reality.

## 2. Honest diagnosis of CTI v1.0

| Question | CTI v1.0 answer |
|---|---|
| Is there a genuine arms-length transactional market underneath? | **Yes.** On-demand GPU rental is a large, real, competitive cash market — Vast.ai, RunPod, Lambda, and the hyperscalers transact GPU-hours continuously at arm's length. The *interest* CTI measures (the prevailing on-demand $/GPU-hour) is unambiguously real. |
| Are CTI's inputs transaction data? | **No.** Every `price_snapshots` row is a scraped *offer* — a provider's published ask for a configuration. We observe what providers will sell at, not what customers paid. |
| Are they at least "committed quotes" (firm, executable)? | **Mostly yes, in substance.** A Vast.ai or RunPod listing is executable on click at the quoted price — closer to LME/exchange firm quotes than to LIBOR's indicative submissions. They are not "estimated prices." This matters: BMR Art 11(1)(c) explicitly lists "committed quotes" as an acceptable fallback class. |
| Do we have *any* transactional data path? | **Schema yes, data no.** Migration `011_pivot_v2_schema.sql` already defines `invoice_observations` — anonymised real-paid prices by `(provider, gpu_model, customer_spend_band, contract_type)` — but the redaction/ingest pipeline is unbuilt and the table is empty. This is the latent transaction anchor. |
| Is the hierarchy published? | **Partially.** `/methodology` publishes the formula and the eligibility/outlier/quorum rules but does not explicitly say "our inputs are executable listings, not trades, because no public trade tape exists for on-demand compute" — which is exactly the disclosure BMR Art 11(3)(d) wants. (This is gap-matrix row P8.) |

**Verdict.** A strict IOSCO reviewer can reasonably press on P7. But the position
is *defensible and improvable*, not fatal — for two reasons. First, CTI's inputs
are firm executable quotes from a real transactional market, which is the same
substance several IOSCO-compliant benchmarks run on (see §3). Second, CTI has not
yet *claimed* P7 compliance — and the right move is to self-classify precisely
(§4) rather than overclaim.

## 3. How comparable benchmarks live without a public trade tape

CTI is far from the first benchmark of a real market that has no consolidated
print tape. The precedents fall into three patterns.

### 3a. Assessment / panel benchmarks — Baltic Exchange freight indices

The Baltic Dry Index family (BDI/BCI/BPI/BSI/BHSI) and the dirty/clean tanker
indices are **not** built from a tape of charter fixtures — no such public tape
exists. Every working day a panel of independent shipbrokers submits "their
assessment of the current freight cost on various routes," and "each individual
assessment represents the combined simple arithmetical average view of Baltic
Panellists (Submitters)," based on "previous transactions, market conditions and
supply and demand." (Baltic Exchange, *Guide to Market Benchmarks* v8.3, Apr 2026;
Methodology page.) These indices are EU-BMR-compliant (BEISL publishes Benchmark
Statements referencing Regulation (EU) 2016/1011) and they **settle a live cleared
derivatives market** — Forward Freight Agreements cleared at SGX, EEX and LCH.
The compliance backbone is governance and control around the inputs: a panellist
code of conduct, defined submission windows, evidence requirements, and — added
June 2025 — a monthly "Operational Benching" audit that statistically reviews each
panellist's submissions and their suitability per route.

**Lesson for CTI:** a benchmark of a real but tape-less market can be IOSCO/BMR
compliant on the strength of *input governance and control*, not transaction
purity. CTI's scraped-offer model is arguably *stronger* than Baltic's here — our
"submitters" are the providers' own published price endpoints, captured
mechanically, with no human submission step to game, schema-validated, and
outlier-filtered. The thing CTI lacks relative to Baltic is the *documented*
control framework around that ingestion (gap-matrix P4) and the *explicit
classification* of the input type (P8).

### 3b. Market-on-close / hybrid benchmarks — oil PRAs (Platts, Argus)

Crude and product benchmarks (Dated Brent, WTI differentials, etc.) are assessed
by Price Reporting Agencies using a "Market-on-Close" window — typically the last
~30 minutes of the trading day — in which approved participants submit firm bids,
firm offers, and confirmed transactions to PRA reporters, who publish them in real
time and assess a price, applying judgment "particularly when data are extrapolated
or when there is sparse market data." (IOSCO/IEA/IEF/OPEC, *Oil Price Reporting
Agencies* report, IOSCOPD364; Platts & Argus methodology submissions to IOSCO,
IOSCOPD399.) Oil PRAs operate under the *Principles for Oil Price Reporting
Agencies* (IOSCOPD364, 2012) — a sibling framework to FR07/13 — and Argus was the
first PRA to formally adopt them in 2013. The MOC model explicitly **blends bids,
offers and transactions**, weighting them by methodology, with bids/offers often
dominating on illiquid grades.

**Lesson for CTI:** the regulatory world already accepts benchmarks where, on
many days, the published number rests largely on *bids and offers* rather than
prints — provided the methodology says so and the agency can defend the weighting.
CTI's "all eligible offers in a 24h window, num_gpus-weighted, MAD-3σ-filtered"
is structurally a *systematic, judgment-free MOC over a 24h window using offers
only* — a stricter, more reproducible cousin of the PRA approach.

### 3c. Auction fixes — LBMA Gold/Silver (the contrast case)

The LBMA Gold and Silver Prices (administered by ICE Benchmark Administration)
solved the tape problem differently: the benchmark **is** a transaction. IBA runs
an electronic auction at 10:30/15:00 London for gold (12:00 for silver); price
steps in 30-second rounds until net imbalance falls within tolerance (10,000 oz
for gold), and "all volume [is] tradeable at that price." The published fix is the
clearing price of real executed orders — "electronic, tradeable, auditable and in
line with the IOSCO Principles." (LBMA Gold Price FAQs; ICE *Precious Metals
Methodology*.)

**Lesson for CTI:** the gold-standard (literally) answer to P7 is to *generate*
the transaction — run a fixing auction. That is not feasible for fragmented
on-demand compute today (no central venue, no settlement infrastructure), but it
is the long-horizon shape if CTI ever becomes a settlement benchmark with a
clearing partner. Worth noting in the cessation/evolution discussion, not as a
near-term action.

### 3d. Appraisal-based private-market indices — MSCI/IPD Real Estate, NCREIF

Direct real estate has no trade tape at all; transactions are sparse, lumpy and
heterogeneous. The MSCI/IPD property indices and the NCREIF Property Index are
built from **independent professional appraisals** of constituent assets, marked
quarterly. They are widely cited, used in fund mandates and performance fees, and
MSCI maintains an IOSCO statement of compliance covering its index family. The
defensibility argument is that an *independent, methodologically-disciplined
estimate* of value can "represent accurately and reliably the … economic reality"
(BMR Art 11(1)(a)) even when no contemporaneous trade exists — so long as the
estimation process is transparent, consistent, and reviewed.

**Lesson for CTI:** "economic reality" (the BMR test) is not a synonym for "last
traded price." It is whether the number a serious user would act on. For on-demand
compute, the executable list price a buyer actually faces *is* the economic
reality of the on-demand segment — arguably more so than a thin tape of
idiosyncratic enterprise deals would be.

## 4. Recommended response — two tracks

### Track A (now, docs-only): self-classify precisely and publish the hierarchy

Do **not** claim unqualified P7 compliance. Instead, on `/methodology` (which is a
hard-limit surface — this needs a proposal, see §5), state plainly:

> *CTI is a **published-quote benchmark**. Its inputs are firm, executable
> on-demand list prices captured directly from provider endpoints. On-demand
> compute has no public consolidated transaction tape; per the data hierarchy
> below, transaction data is preferred where available (see roadmap: invoice
> observations) and executable quotes are used otherwise — consistent with EU BMR
> Art 11(1)(c)'s treatment of committed quotes. The benchmark is anchored in a
> genuine arms-length cash market for GPU-hours; the published number is computed
> with no expert judgment.*

Pair it with the Hierarchy-of-Data-Inputs subsection already queued as gap-matrix
row P8. This converts a hidden weakness into a stated, defensible design choice —
the LBMA-fixing / Baltic-assessment pattern of *owning the limitation*.

### Track B (next quarter, infra): build the transactional anchor

The `invoice_observations` table already exists (migration 011) and is the
designed home for "anonymised real-paid prices vs published." Standing up its
redaction + ingest pipeline gives CTI a genuine transaction layer. Two ways it
can then satisfy P7's "anchored by observable transactions":
1. **Validation anchor (low-risk, do first):** publish a periodic *reconciliation*
   — "CTI-H100 list-price index vs. median observed effective price from N
   invoices over the trailing 90d, by spend band." This demonstrates the published
   quote benchmark tracks real transactions without changing the locked formula.
   It is exactly the kind of artifact an auditor or licensee wants, and it touches
   **no** hard-limit file.
2. **Input anchor (later, methodology-class):** a future methodology version could
   admit invoice observations as a weighted input class above listings in the
   hierarchy. That is a `v1.x` change — full committee process, 30-day notice,
   backtest — and is explicitly **out of scope for this note**; flagged only so
   the path is on record.

A cheaper interim signal worth investigating regardless: Vast.ai exposes machine
utilisation / `time_remaining`-style fields; an offer on a near-full machine is
revealed-preference evidence of transactions at ~that price. Could feed a
"transaction-proximate" reliability or weighting signal — research-note territory,
not a v1 change.

### Track C (cheap, do alongside A): tighten breadth where the tape is thinnest

For GPU models with very few providers or listings, the absence of trades is least
compensated by competitive-offer density. Worth a future proposal: a per-universe
quorum that scales with provider count (not just the flat `minObservations = 5`),
so the published number is suppressed earlier on thin GPUs. Methodology-class —
proposal + committee, not now — but the data to size it (how often each index
would have been suppressed under various thresholds over the live history) is a
backtest the next session can run read-only against `index_values_daily` /
`price_snapshots`.

## 5. What becomes a proposal vs. what's just docs

| Item | Class | Path |
|---|---|---|
| Add "published-quote benchmark" self-classification + data-input hierarchy to `/methodology` | docs surface, but `/methodology` is hard-limit | **Proposal** in `docs/research/proposals/` (folds in gap-matrix rows P7 + P8). Next session's most valuable single deliverable. |
| Reconciliation report: CTI list-price index vs. observed effective prices | infrastructure (reads `invoice_observations`, writes a `docs/research/` report) — once data exists | Normal PR. Blocked on the invoice ingest pipeline. |
| Invoice-observation ingest + redaction pipeline | infrastructure | Normal PR (separate workstream, REFRAME_v2 §3 / variable 8). |
| Scaled-quorum / utilisation-weighting | methodology (`PUBLISHED_METHODOLOGY`) | Proposal + committee + 30-day notice + 90-day backtest. **Not now.** |
| Backtest: suppression rate under candidate quorum thresholds | research (read-only) | `docs/research/notes/` — feeds the proposal above. Good next-session task. |

**Recommended single next deliverable:** the `/methodology` self-classification +
data-input-hierarchy proposal (Track A). It closes the two highest-leverage
quality-pillar gaps (P7, P8) at once, is a contained docs/page change, and turns
CTI's most-pressed-on weakness into a stated design position before any external
licensee conversation surfaces it.

---

## 6. Gap-matrix delta

`docs/research/gaps/iosco-principles.md` row **P7** is updated to point at this
note and to record: status stays `partial / structurally weak`, but the *path* is
now mapped — Track A (self-classify, proposal) is P0; Track B (invoice anchor +
reconciliation) is P1; Track C (scaled quorum) is P1 and methodology-class. Row
**P8** action item gains a cross-reference: the hierarchy subsection should ship
*in the same proposal* as the P7 self-classification, since they are the same
edit to the same page.

---

## Sources

Primary regulatory texts (referenced; direct PDF/HTML fetch blocked HTTP 403 this
session — see source-fetch note):
- IOSCO, *Principles for Financial Benchmarks — Final Report*, FR07/13 (IOSCOPD415),
  July 2013. https://www.iosco.org/library/pubdocs/pdf/ioscopd415.pdf — Principle 7
  (Data Sufficiency), Principle 8 (Hierarchy of Data Inputs).
- IOSCO, *Guidance on the IOSCO Principles for Financial Benchmarks*, IOSCOPD549,
  January 2018. https://www.iosco.org/library/pubdocs/pdf/IOSCOPD549.pdf
- IOSCO/IEA/IEF/OPEC, *Oil Price Reporting Agencies*, IOSCOPD364, October 2012.
  https://www.iosco.org/library/pubdocs/pdf/ioscopd364.pdf
- Platts and Argus methodology submissions to IOSCO, IOSCOPD399 (consultation
  comments). https://www.iosco.org/library/pubdocs/399/pdf/Platts.pdf
- Regulation (EU) 2016/1011 (Benchmarks Regulation), Article 11 (Input data).
  EUR-Lex CELEX 32016R1011. https://eur-lex.europa.eu/eli/reg/2016/1011/oj/eng ;
  ESMA Interactive Single Rulebook, Art. 11.
  https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/benchmarks-regulation/article-11-input-data

Comparable-benchmark methodologies consulted:
- Baltic Exchange, *Guide to Market Benchmarks*, v8.3, April 2026.
  https://www.balticexchange.com/content/dam/balticexchange/consumer/documents/data-services/documentation/ocean-bulk-guides-policies/GMB.pdf ;
  Methodology page https://www.balticexchange.com/en/data-services/Methodology.html ;
  "Baltic Exchange introduces monthly audits for physical panellists" (Operational
  Benching), June 2025.
  https://www.maritimelondon.com/news/baltic-exchange-introduces-monthly-audits-for-physical-panellists-to-further-improve-baltic-index-quality
- ICE Benchmark Administration / LBMA, *LBMA Gold Price FAQs*.
  https://www.lbma.org.uk/prices-and-data/lbma-gold-price/lbma-gold-price ;
  ICE *Precious Metals Methodology*. https://www.ice.com/iba/lbma-precious-metals
- MSCI, *IOSCO Principles for Financial Benchmarks* (statement of compliance hub).
  https://www.msci.com/our-solutions/indexes/index-resources/index-regulation/iosco
- NCREIF Property Index methodology. https://www.ncreif.org/data-products/property/

Internal references:
- `apps/web/app/methodology/page.tsx` — published methodology page (hard-limit).
- `packages/shared/src/methodology.ts` — `PUBLISHED_METHODOLOGY` (hard-limit).
- `packages/db/migrations/011_pivot_v2_schema.sql` — `invoice_observations`,
  `provider_compliance`, `throughput_benchmarks`, `forward_curves` schema.
- `docs/decisions.md` — "Pivot to 'Bloomberg for buyers'" entry (variable 8 =
  behavioral / invoice pricing); "Five-methodology A/B → Locked methodology v1.0".
- `docs/research/notes/2026-05-10-iosco-principles-applied-to-cti.md` — §B, P7,
  which flagged this analysis as needed.
- `docs/research/gaps/iosco-principles.md` — row P7 (status owner of record).
- `docs/roadmap.md` — B9 (compliance pack), B10 (30-day window).
