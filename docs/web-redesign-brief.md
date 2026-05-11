# Compute Index Terminal — Web Redesign Brief (for Claude Design)

**Paste this whole document into Claude Design as the design system + product brief.**

This brief is the source of truth for the next visual iteration of `computeterminal.io`. It encodes the post-pivot positioning (see `REFRAME_v2.md`), the data we already have, and the data we will have in 3-6 months — so the redesign is forward-compatible without being speculative.

---

## 1. Product positioning — one paragraph

Compute Index Terminal is **the procurement and observability terminal for teams that buy AI compute**. Not Bloomberg for the trader; **Bloomberg for the buyer**. The customer is the Head of Infrastructure, the CTO, or the CFO at an AI scaleup paying €50k–€500k/month for GPUs. They open us at 9am to answer three questions nobody else answers cleanly: *am I paying the right price?*, *how much does my workload actually cost me?*, and *which providers meet my compliance constraints?*

Underneath the terminal sits an **independently governed reference index** with a locked methodology (`filtered_vwap v1.0`), version history, and a public Committee charter. The index is the rigour signal — it's why a CFO can cite our numbers in a board deck. But the headline product is the terminal, not the index.

**Differentiation vs. Silicon Data** (the institutional reference index, distributed via Bloomberg/Refinitiv): they sell index data to portfolio managers who trade derivatives. We sell procurement intelligence to operators who sign cloud invoices. Three things we do that they structurally cannot: **tokens-equivalent pricing** (`$/M-tokens-Claude-Sonnet`, not `$/H100-hour`), **EU-compliance sub-indices** (CTI-H100-EU, CTI-H100-Sovereign, CTI-H100-Spain), and **behavioral pricing** (effective price from anonymized invoice uploads, not published list price).

---

## 2. Three product lines — what each surface needs to support

| Line | When | What we sell | Web surface impact |
|---|---|---|---|
| **L1 Terminal** | months 0–9 (live) | Subscription access to real-time prices, indices, methodology, cost calculator, EU filters | Most of the current pages — needs the deepest visual investment |
| **L2 Hedging-as-a-Service** | months 6–18 | Enterprise advisory: "your cost will drift X% next quarter, here's how to hedge" | One executive-summary view per Enterprise customer; not consumer-facing yet |
| **L3 Marketplace OTC** | months 12–24 | Match reserved-capacity surplus with demand | Brand-new surface, design later; do not over-anchor now |

**Redesign scope today: L1 only.** Leave architectural room for L2/L3 in the navigation skeleton (a placeholder slot is fine) but do not invent pages.

---

## 3. Pricing tiers (drives gating UX)

| Tier | Price | What's included | Visible to free user as… |
|---|---|---|---|
| **Free** | 0 | 24h-delayed prices, 1 GPU model (H100), 90-day chart | the default state — full UI but stale data + locked tabs |
| **Pro** | €99/mo | Real-time, all GPUs, price alerts, tokens-equivalent calculator | unlocked everything except API + EU sub-indices |
| **Team** | €299/mo | + API access, CSV/JSON exports, multi-user, EU/Spain sub-indices | unlocked + "API" tab in nav |
| **Enterprise** | from €2,500/mo | + SLA, behavioral-pricing access, custom data, hedging advisory (L2) | bespoke onboarding; private workspace |

**Locked-state visual**: a real chart you can see but can't interact with, with a small "Unlock real-time" chip in the corner. Not a paywall blur — the chart is the demo.

---

## 4. Visual identity — non-negotiables

These are constraints inherited from the existing build. Keep them.

- **Dark mode first.** Light mode is an afterthought, not a feature.
- **Typography**: `JetBrains Mono` for every number on screen (prices, percentages, counts, timestamps), `Instrument Serif` for headlines and section titles, `Inter` for UI text and labels.
- **Numbers are always tabular-nums and right-aligned in tables.**
- **Sparklines per row everywhere a row represents a time series.** Inline, ~80×16px, single colour.
- **Semantic colour**: green `#4ade80` for up / cheaper / healthy, red `#f87171` for down / expensive / failing, no other status colours. Yellow `#facc15` exclusively for "methodology change" markers (rare, important).
- **Density over whitespace.** This is a terminal. A user should see 12 GPU rows on the first screen, not 3 hero cards.
- **No drop shadows. No glass-morphism. No gradient buttons.** Borders are 1px, hairline. Backgrounds are flat.

**Reference points (positive)**: Bloomberg Terminal, Trading Economics, koyfin.com, the FT's charting, IEX's deep-iceberg view, Sentry's data tables.

**Reference points (anti-patterns to actively avoid)**: Linear's marketing site (too soft), Vercel's marketing site (too floaty), Stripe's marketing site (too rounded), any "AI startup" template (no purple gradients, no abstract wave SVGs, no 3D blobs). We are not selling vibes; we are selling a Bloomberg-replacement at 1/30th the price.

---

## 5. Information architecture

```
/                           Landing — hero + live ticker + value props + pricing
/markets                    Live grid of GPU prices · sparklines · sort/filter
  /gpu/[slug]               Single GPU deep view · 90d chart · providers list
/indices                    Index catalogue (CTI-H100, CTI-COMPOSITE, future EU/Sovereign)
  /index/[slug]             Index detail · 90d VWAP chart · methodology badge
/methodology                The governance page — formula, Committee, version history
/calculator                 Cost-per-workload calculator (currently under /api/v1)
/api                        Public API docs (Team+ tier)
/pricing                    Tier comparison
/blog                       Daily brief, weekly market, methodology notices
/login   /signup            Auth
/dashboard                  Logged-in home · alerts · saved views · API keys

/admin/*                    Internal control plane — keep functional, do NOT polish.
                            Different visual treatment OK ("ops console" look).
```

---

## 6. Data shapes the design must accommodate

The design has to work for what we have today *and* the variables landing in the next two quarters. Both are listed; build component contracts that accept both.

### What we have today (live, scraped, ~10k snapshots/day)

- **`price_snapshots`** — every offer from every provider, every 5 min. Fields: `gpu_model_id`, `provider_id`, `price_per_hour USD`, `num_gpus`, `captured_at`, `is_outlier`, `is_normalized`.
- **`gpu_models`** — catalog (28 SKUs today: H100/H200/B200/A100/L40S/MI300X/V100/A6000/RTX-Pro-6000/various consumer).
- **`providers`** — 10 providers today (Vast, RunPod, Lambda, Together, Hyperbolic, Prime Intellect, CoreWeave, AWS, GCP, Azure). Each has `reliability_score 0–1`.
- **`compute_indices` + `index_values_daily`** — published index values per day. Today: CTI-H100, CTI-COMPOSITE. Each value carries `methodology_version` (v1.0 locked).
- **`methodology_versions` + `methodology_changes`** — version history with effective dates and Committee notes.

### What's landing in 1–3 months (tables exist, data being seeded)

- **`provider_compliance`** — per-provider: `datacenter_country`, `parent_company_country`, `certifications[]` (ISO27001/SOC2/EU-CCC/HIPAA), `subject_to_cloud_act`. **Drives EU/Sovereign/Spain sub-indices and the compliance filter.** Design needs a compliance-badge component.
- **`throughput_benchmarks`** — `(gpu × LLM × precision) → tokens/sec`. **Powers the cost-per-workload calculator and the tokens-equivalent view.** Design needs unit-toggle ($/hr ↔ $/M-tokens) on every price.
- **`invoice_observations`** — anonymized customer invoices: `(provider, gpu_model, effective_price, monthly_volume, spend_band, contract_type)`. **Variable 8 — the behavioral-pricing moat.** Design needs a "published vs effective" overlay chart segmented by spend band; this is THE killer chart for the Pro→Enterprise upgrade.
- **`forward_curves`** — internal, never licensed out. Powers L2 hedging recommendations. **Not in the public design** — only inside Enterprise workspace.

---

## 7. Pages — what each one is, what each one shows

### 7.1 `/` Landing

**Job**: convince the Head-of-Infra in 8 seconds that this is the cheapest way to stop overpaying.

**Above the fold**:
- Hero line, serif: *"The reference price for compute."* Then a sub-line, smaller, mono: *"Live across 10 providers · methodology v1.0 · independently governed."*
- **Live ticker**, horizontally scrolling, of CTI-H100 / CTI-COMPOSITE / 4-5 individual GPU spot medians, each with sparkline + 24h Δ%. Updates every 30s (already ISR=30).
- One CTA: "See live prices →" (free).
- Methodology chip: small pill, top-right, reading *"v1.0 · filtered_vwap · locked"* — clickable, goes to `/methodology`.

**Mid page**:
- Three differentiators as cards, headline + 2 lines each:
  1. *Tokens, not hours* — example: "H100 spot · €2.14/hr · €0.37 per million Claude-Sonnet output tokens"
  2. *EU-compliant by default* — example: "CTI-H100-EU at €2.78/hr — 23% premium over global, IBM/OVH/Scaleway only"
  3. *Real prices, not list prices* — example: "Median invoice paid for H100 at 25k–100k volume: €1.89/hr — 12% below published"
- Each card has a tiny chart inline.

**Below**:
- Coverage strip: 10 provider logos, monochrome, "10 providers · 28 GPU models · 4.2M snapshots since launch · 99.7% scraper uptime last 30d".
- Pricing tiles (4): Free / Pro / Team / Enterprise — minimal, single CTA each.
- Footer: methodology link, blog, API docs, status page (future), GitHub link, social, legal.

### 7.2 `/markets`

**The most important page after the landing.** Treat as the daily-driver view.

- Top bar: **search box** ("h100"), **sort** (cheapest / most reliable / most providers / 24h biggest move), **filter** (provider, jurisdiction, EU-only toggle), **unit toggle** ($/hr ↔ $/M-tokens — when tokens-eq lands).
- Table: one row per `gpu_model`. Columns: `GPU` (name + spec chip e.g. "80 GB SXM5"), `spot median` (USD/hr, big mono), `24h Δ%`, `90d range` (min — max), `inline sparkline` (24h tick), `providers` (count + dot list of provider chips), `reliability` (0–1, coloured), `methodology` (chip v1.0).
- Pinned providers section at right (collapsible): the user's own "watchlist" of providers — empty for free, populated post-Pro.

### 7.3 `/gpu/[slug]`

- Hero: GPU name, spec sheet (VRAM, form factor, vendor).
- Big chart: 90d / 30d / 7d / 24h tabs. Default 30d.
- Below the chart: **provider table** — rows are providers, cols are `current price`, `24h Δ`, `7d Δ`, `last seen`, `reliability`, `compliance badges`.
- Right rail: methodology chip, "value at risk" stat ("if H100 moves 10% your monthly bill at 100 GPU-hours/day = +$X"), "subscribe to alerts" (Pro-gated).

### 7.4 `/index/[slug]`

The page where the index, as a financial instrument, lives.

- Top: index name, current value (huge), 24h Δ, version chip, "as of" timestamp.
- Big SVG chart, 90d (already built). Watermark stamp bottom-right: `v1.0 · filtered_vwap`. Yellow vertical dashed line + label at any future methodology change.
- Three stat cards: methodology version, providers contributing this print, observations count.
- Methodology charter excerpt (3 lines), "Read full →" goes to `/methodology`.
- Constituents table (for composite indices): which GPUs + what weight.

### 7.5 `/methodology`

Already exists; keep the substance, polish the typography. This is the page an auditor reads. Restrained, document-like, not "marketing".

### 7.6 `/calculator` (cost-per-workload)

The killer demo for the AI-engineer ICP.

- Inputs (left column): LLM model (claude-sonnet-4-5 / llama-3-70b / gpt-4o), workload preset (3-min voice agent / short chat / longform summary / 10-step agent loop), volume (number input + "10k / 100k / 1M" preset chips).
- Output (right column): cards per GPU, sorted by cost. Each card: GPU name, throughput (`5,800 tok/s, fp8`), price source chip (`vwap_24h_n=187`), gpu-hours needed, total USD. Cheapest card has a green outline.
- Below: "How is this computed?" expandable, shows the formula and links to `/methodology`.
- Provenance line at bottom: `methodology v1.0 · price_source vwap · throughput_source inline_default | DB`.

### 7.7 `/dashboard` (post-login)

- Alerts inbox (top): "H100 spot dropped 8% in 24h", "RunPod added 14 new B200 listings", etc.
- Saved views (left rail): the user's filters from `/markets` saved.
- API keys (Team+).
- Billing.

---

## 8. Components inventory — design these atoms

1. **PriceCell** — number, currency, optional Δ chip, optional sparkline. Used everywhere.
2. **Sparkline** — pure SVG, 80×16, single stroke, no labels. Hover shows tooltip with full chart.
3. **DeltaChip** — `▲ 4.2%` or `▼ 1.8%`, green/red, mono.
4. **ProviderChip** — 2-letter avatar + name, monochrome.
5. **MethodologyVersionChip** — small pill, `v1.0 · filtered_vwap · locked`, clickable.
6. **ComplianceBadge** — flag icon + cert names; tooltip lists `attested_at` + source.
7. **PriceTicker** — horizontal scrolling strip, one row per indexed value. Fixed at top of `/`.
8. **GPUCard** — compact card with name, current price, 24h Δ, sparkline, provider count.
9. **AlertCard** — colour-coded by severity, includes "snooze" + "view in markets".
10. **UnitToggle** — `$/hr` ↔ `$/M-tokens` ↔ `$/voice-turn`. State persists across pages.
11. **LockedTile** — used wherever a non-Pro user sees gated content. Real visual underneath, small "Unlock" chip top-right, not a blur.
12. **MethodologyChangeMarker** — yellow vertical dashed line on charts where the methodology version changes; click to see the change note.

---

## 9. Charts — the design problem at the core

We will have, in roughly this order:

1. **Spot-price-over-time** per GPU (already shipped as SVG on `/index/[slug]`). 90-day default. Works.
2. **Index value with methodology-change markers** (yellow dashed verticals). Works.
3. **Published-list vs. effective-paid** overlay per GPU, segmented by spend band (under-5k / 5–25k / 25–100k / over-100k). **This is the chart the Pro upgrade is for.** Two lines: published (median offer VWAP), effective (median of `invoice_observations`). Shaded delta band between them. Spend-band selector chips.
4. **Tokens-equivalent cost-over-time** per LLM model. X = date, Y = $/M-tokens. One line per GPU model, top 4 only. Toggle: inference / training / fine-tune workload (drives throughput row).
5. **Provider compliance map** — world map, colour-coded by `datacenter_country`, dot size = providers in country.
6. **Forward curve** (L2 internal only) — implied forward rate per tenor; spaghetti plot with confidence band. Not public.

**Chart anti-pattern**: don't use a chart library that looks like a chart library (no Chart.js / Recharts / Highcharts defaults). The 90d index chart is already pure SVG and that's the right call. Charts should look like the FT's, not like a demo of d3.

**Always-on chart elements**:
- Y-axis label units inline (top of axis): "USD/hr" or "USD/M-tokens".
- Methodology version chip in the chart's bottom-right corner.
- "Computed at <ISO timestamp>" small text below.

---

## 10. Empty states & failure modes

Don't ignore these — they're where most SaaS designs collapse.

- **No data for selected filter** (e.g. EU-only filter, no providers in EU for a GPU yet): row count "0", inline message: "No EU-compliant providers list this GPU today. Subscribe to be notified when one appears."
- **Single-provider quorum violation** (when Move 2 of P7 lands): print suppressed, replaced with: "Insufficient breadth — only 2 providers contributed today. Distinct-provider floor is 3."
- **Scraper outage**: provider chip turns grey, tooltip says "last seen <timestamp> · reliability_score 0.42 · view incident on /admin/health" (last link only for admins).
- **Methodology change in flight (30-day notice)**: yellow banner top of page, "Proposal v1.1 in 30-day comment period — view diff →".
- **Cost-per-workload throughput fallback**: when the calculator uses `inline_default` instead of DB, the provenance line shows it; don't hide it.

---

## 11. Things to consciously NOT design

- **Onboarding flow with progress bar**. Our users are senior; one screen, sign up, in.
- **Animated marketing visuals on the landing**. The live ticker IS the visual.
- **Mobile-first layouts**. This is a desk tool. Mobile is acceptable read-only.
- **Drag-and-drop dashboards**. Saved views (named filter combos) is the right abstraction; full DIY dashboards waste design budget.
- **A blog with author bios and reading-time chips.** Just date, title, body, ticker. It's a market commentary, not a Substack.

---

## 12. How to brief Claude Design with this

Suggested first prompt to Claude Design (you can paste verbatim after this brief):

> I have a complete product + design brief above (Compute Index Terminal). Your task: produce a working v0/v1 of the redesigned site at the page list in §5, respecting every non-negotiable in §4, building the components in §8, and accommodating the data shapes in §6. Start with `/` (landing) and `/markets` — those are the two pages that drive every other decision. Hand back: (a) the design tokens (CSS variables for colour, type ramp, spacing); (b) Tailwind config; (c) all components in §8 as TSX with Tailwind; (d) the two pages composed from those components, fed by mocked data with the exact shape of `price_snapshots` and `index_values_daily`. Do NOT touch `app/methodology/page.tsx` (existing content is correct; only re-style if needed). Do NOT design `/admin/*`. Do NOT invent new data shapes — if a value would be useful, propose it back to me first, don't bake it in.

Have it iterate on `/` and `/markets` before touching anything else. Once those land, the rest is composition.

---

## 13. Source files Claude Design should read

If Claude Design has filesystem access in the parallel session, point it at:

- `REFRAME_v2.md` (root) — positioning detail
- `docs/three-product-lines.md` — L1/L2/L3 detail
- `docs/cti-methodology-v1.md` — formula and governance, for the `/methodology` page
- `docs/competitive-positioning.md` — Silicon Data positioning, for the differentiator copy on `/`
- `apps/web/app/index/[slug]/page.tsx` and the inline SVG component — the chart pattern that already works
- `packages/db/migrations/011_pivot_v2_schema.sql` — the data shapes from §6
- `apps/web/app/api/v1/cost-per-workload/route.ts` — the calculator endpoint contract

Existing pages it should NOT preserve any styling from (just structure / data flow):
`apps/web/app/page.tsx`, `apps/web/app/markets/page.tsx`, `apps/web/app/gpu/[slug]/page.tsx`, `apps/web/app/layout.tsx`, `apps/web/app/globals.css`.
