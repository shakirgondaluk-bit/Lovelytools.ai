# Amazon Product Finder

AI-ranked Amazon product discovery at `/product-finder`. Takes a keyword, a full
Amazon URL or a bare ASIN; returns the top three products scored 0–100 with the
reasoning behind every number, a side-by-side comparison, and affiliate links.

## Architecture

```
input → ProductDiscoveryService → IProductProvider → NormalizedProduct
      → filter pipeline → IRankingEngine → API route → UI
```

Two seams carry the whole design:

| Seam | File | Why it exists |
|---|---|---|
| `IProductProvider` | `lib/product-finder/provider.ts` | Where product data comes from |
| `IRankingEngine` | `lib/product-finder/ranking.ts` | How products are judged |

Business logic above these interfaces never sees a provider-specific field name,
transport, selector or error type. `ProductProviderError` is the only failure
type that crosses the boundary.

### Files

| Path | Role |
|---|---|
| `lib/product-finder/types.ts` | The normalized product model — the contract every provider satisfies |
| `lib/product-finder/config.ts` | The one place env is read (server-only) |
| `lib/product-finder/input.ts` | Keyword / URL / ASIN classification. Pure; shared with the client for the live hint |
| `lib/product-finder/text.ts` | Shared tokenizer + term matcher |
| `lib/product-finder/provider.ts` | `IProductProvider` + the provider registry |
| `lib/product-finder/providers/catalog-provider.ts` | Phase 1 default — the site's own curated catalog |
| `lib/product-finder/providers/canopy-provider.ts` | Canopy API — the live source currently in use |
| `lib/product-finder/providers/http-provider.ts` | Generic JSON API provider, entirely env-configured |
| `lib/product-finder/providers/composite-provider.ts` | Primary + fallback pairing, so a metered provider fails soft |
| `lib/product-finder/filters.ts` | The ordered filter pipeline, with relaxation |
| `lib/product-finder/ranking.ts` | `IRankingEngine` + the deterministic scoring engine |
| `lib/product-finder/claude-ranking.ts` | Optional Claude-written analysis, layered on the above |
| `lib/product-finder/discovery-service.ts` | The orchestrator + composition root |
| `lib/product-finder/affiliate-product-adapter.ts` | Discovery output → `AffiliateProduct`, so the existing template renders it |
| `lib/affiliate-link.ts` | Affiliate Link Service — the only place an Amazon URL is built |

## Connecting a live data source

> **PA-API 5.0 is gone.** Amazon deprecated it on 30 April 2026 and retired it on
> 15 May 2026; calls now return HTTP 403 and the old docs URL redirects to a
> deprecation notice. Its replacement is the **Creators API**, which needs an
> approved Associates account plus **10 qualifying sales in the trailing 30 days
> on that specific marketplace** (10 sales on amazon.com does not unlock
> amazon.co.uk). Auth moved from AWS SigV4 to OAuth2 bearer tokens, and new
> credentials start at 1 req/sec.

### Currently active: Canopy

`PRODUCT_PROVIDER=canopy` with `CANOPY_API_KEY` in `apps/web/.env.local`
(gitignored). Set that key on the Hostinger deploy too — without it the provider
throws `unauthorized` and every search falls through to the catalog.

| Variable | Notes |
|---|---|
| `CANOPY_API_KEY` | From canopyapi.co. Free tier is 100 requests/month |
| `PRODUCT_ENRICH_RESULTS` | `true` fetches specs + description for each shortlisted product. Costs 4 requests per search instead of 1 — on the free tier that is 25 searches/month rather than 100. Off by default |

Canopy needed a dedicated provider rather than `http` because its two endpoints
do not share a response envelope (`data.amazonProductSearchResults.productResults.results`
vs `data.amazonProduct`) and it addresses stores by short code (`UK`) rather
than hostname. Search results are lean — no brand, specs, description or stock —
so the ranking engine drops its "listing detail" dimension and renormalises
when nothing in the set has specs. The rich payload arrives on the detail page,
which calls `getByAsin`.

Sponsored rows are filtered out. A tool whose premise is "here is the best one"
must not rank a paid placement first.

### With another licensed JSON API — no code

Set `PRODUCT_PROVIDER=http` and the env below. The catalog automatically slides
underneath as the fallback, so exhausting a free-tier quota shows our own
reviews rather than an error page.

### With the Creators API, or any other source — one file

1. Write `lib/product-finder/providers/creators-provider.ts` implementing
   `IProductProvider` (`id`, `label`, `coverage`, `search`, `getByAsin`,
   optionally `findAlternatives`). Translate its shapes into
   `NormalizedProduct`, and its failures into `ProductProviderError` codes —
   `rate_limited`, `timeout`, `provider_unavailable`, `unauthorized` and
   `malformed_response` all degrade to the fallback; `invalid_input` and
   `not_found` deliberately do not.
2. Register it in the `PROVIDERS` map in `provider.ts`.
3. Set `PRODUCT_PROVIDER=creators`.

Nothing else changes — not the filters, the ranking engine, the API routes, the
comparison logic, the affiliate engine, or any page.

### What is deliberately not built

Scraping Amazon's storefront. Their Conditions of Use prohibit automated data
extraction with no carve-out for "just the public product page", datacentre IPs
get CAPTCHA-walled in practice, and — the part that actually matters here —
doing it from the same domain that serves `lovelytools-21` links puts the
Associates account at risk. The affiliate-product-adder skill driving a browser
a few times a week with a human present is a different thing from a server
parsing listings on every visitor's search.

## Configuration

All server-only. Every value has a working default, so the finder runs with no
configuration at all (against the curated catalog).

### Core

| Variable | Default | Notes |
|---|---|---|
| `PRODUCT_PROVIDER` | `catalog` | `catalog` \| `canopy` \| `http` |
| `PRODUCT_FALLBACK_PROVIDER` | `catalog` | Used when the primary misses or is unavailable. Same value as `PRODUCT_PROVIDER` (the default state) means no pairing is built |
| `PRODUCT_MARKETPLACE` | `amazon.co.uk` | Used when the query is a keyword rather than a URL |
| `AMAZON_AFFILIATE_TAG` | `lovelytools-21` | Applied by the Affiliate Link Service |
| `PRODUCT_CANDIDATE_LIMIT` | `40` | Candidates requested before filtering |
| `PRODUCT_RESULT_LIMIT` | `5` | Products shown |
| `PRODUCT_TOP_BRAND_COUNT` | `3` | Of those, the best product from this many distinct brands |
| `PRODUCT_CHEAPER_ALTERNATIVE_COUNT` | `2` | Of those, cheaper products that still match every search word |
| `PRODUCT_REQUIRE_FREE_DELIVERY` | `true` | Amazon-side refinement. `false` to disable |
| `PRODUCT_REQUIRE_FAST_DELIVERY` | `false` | Amazon-side "Get It Tomorrow". `true` to enable — see below |
| `PRODUCT_PROVIDER_TIMEOUT_MS` | `45000` | A refined search measured 35.7s; the old 12s ceiling aborted it |
| `PRODUCT_CACHE_TTL_MS` | `600000` | Per-process discovery cache. `0` disables |

### `PRODUCT_PROVIDER=http`

Point it at any product API you are licensed to call. No code changes.

| Variable | Notes |
|---|---|
| `PRODUCT_PROVIDER_SEARCH_URL` | Template. `{keyword}` `{marketplace}` `{limit}` are substituted and URL-encoded |
| `PRODUCT_PROVIDER_LOOKUP_URL` | Template. `{asin}` `{marketplace}` |
| `PRODUCT_PROVIDER_API_KEY` | |
| `PRODUCT_PROVIDER_API_KEY_HEADER` | Default `x-api-key` |
| `PRODUCT_PROVIDER_API_KEY_PREFIX` | e.g. `Bearer ` |
| `PRODUCT_PROVIDER_HEADERS` | JSON object of extra static headers |
| `PRODUCT_PROVIDER_RESULTS_PATH` | Dot-path to the results array. Default `search_results` |
| `PRODUCT_PROVIDER_FIELD_MAP` | JSON object mapping our field names to their dot-paths. Merged over the defaults in `config.ts` |

Example:

```
PRODUCT_PROVIDER=http
PRODUCT_PROVIDER_SEARCH_URL=https://api.example.com/search?q={keyword}&domain={marketplace}&limit={limit}
PRODUCT_PROVIDER_LOOKUP_URL=https://api.example.com/product?asin={asin}&domain={marketplace}
PRODUCT_PROVIDER_API_KEY=…
PRODUCT_PROVIDER_RESULTS_PATH=data.products
PRODUCT_PROVIDER_FIELD_MAP={"name":"product_title","reviewCount":"reviews.count"}
```

### Optional Claude-written analysis

| Variable | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Absent ⇒ deterministic engine only. This is a supported state, not a degraded one |
| `PRODUCT_FINDER_LLM_MODEL` | Default `claude-opus-5` |
| `PRODUCT_FINDER_LLM_TIMEOUT_MS` | Default `45000` |

The deterministic engine always runs first and owns the **numbers** — AI score,
rank order, the weighted breakdown. Claude only writes the **prose**. A model
outage therefore cannot reshuffle results; it can only fall back to the
signal-derived wording, which it does silently.

> The Messages API is called over `fetch` rather than `@anthropic-ai/sdk`
> because this workspace's pnpm store cannot take a new dependency outside a
> full reinstall. Swap in the SDK when the lockfile is next rebuilt — the call
> shape maps one-to-one onto `client.beta.messages.create`.

## Scoring

Six weighted signals, summing to 1. The displayed score is exactly this weighted
sum — there are no hidden multipliers, and the breakdown shown in "Why it ranked
#N" fully accounts for the number above it.

| Signal | Weight | Source |
|---|---|---|
| Match to your search | 0.30 | Term coverage (60%) blended with the provider's own result position (40%) |
| Customer rating | 0.24 | Rating, damped by review-count confidence |
| Value for money | 0.16 | Price vs shortlist median, adjusted by rating |
| Reliability signal | 0.12 | Review volume, log-scaled |
| Offer & availability | 0.10 | Discount, free delivery, stock |
| Listing detail | 0.08 | Published specification count and description depth |

Relevance carries the heaviest weight deliberately: an excellent product that
half-matches the query is a worse answer than a good product that matches it
exactly. Weighted lower, a heavily-reviewed cordless *tyre inflator* outranked an
actual cordless *drill* on the query "cordless drill".

Two independent signals feed it, because either alone is fooled. **Term
coverage** alone can't tell a product from an accessory that shares its
vocabulary — a camping cable reel whose title ends "…and EV Charging Cables"
matches every term in a query about EV charging cables. **Provider position**
alone would promote an irrelevant bestseller. Together they work: that reel sat
at Amazon position 20, and folding position into the score is what demotes it.

Pasting an Amazon link derives a query from the product's own title
(`deriveProductQuery` in `text.ts`, shared with the provider so the search and
the scoring can't diverge) and scores alternatives against it. The pasted
product is exempt — it is the query, not a match for it.

Signals a provider cannot report score a neutral 50 with a note saying so,
rather than a guess. An ASIN the user pasted is always listed first — they asked
for it — but the comparison "Winner" is still the highest scorer.

## Filters

### Amazon-side, inside the search request

These are refinements from Amazon's own sidebar, passed in the search query. They
cost **no extra quota** and narrow the pool *before* the candidate page is cut,
which beats filtering locally where a rejected product has already used a slot.

| Refinement | Amazon option | Default |
|---|---|---|
| `eligible_for_free_delivery` | "Free UK Delivery by Amazon" | on |
| `delivery_day` | "Get It Tomorrow" | off |

Option labels are localised, so `REFINEMENT_LABELS` in the Canopy provider is
keyed by marketplace. An unknown marketplace gets no refinement rather than a
guessed label — Canopy silently ignores an unrecognised refinement, and we would
otherwise report a filter as applied when Amazon had ignored it. The live set for
any search is discoverable via the `availableRefinements` field.

**Amazon publishes no "within a week" option.** "Get It Tomorrow" is the only
delivery-speed refinement, and it is stricter — enabling it excludes items
arriving in 2–6 days. It is therefore off by default.

### Local, applied in order

`exclude` stages cut; `prefer` stages feed the offer signal.

0. Colour/size variants merged — Amazon lists each variant under its own ASIN,
   and "wireless headphones" returned the same Sony model in three colours
1. Keyword relevance (exclude — weighted term coverage ≥ 0.34)
2. Every search word in the product name (exclude — AND, not OR; skipped for
   queries derived from a pasted link, and for single-term queries)
3. Rating ≥ 4.0 (exclude — unknown ratings are kept)
4. Free delivery (exclude — only a confirmed *paid* delivery is cut)
5. Discounted products preferred (prefer)
6. Availability (exclude — only a confirmed *out of stock* is cut)
7. AI ranking

Three rules keep the results page honest:

- **Relaxation.** If survivors fall below a stage's floor, it is rolled back and
  the chip is marked "loosened". The floor is `PRODUCT_RESULT_LIMIT` for most
  stages, but **1** for the two relevance stages — padding a shortlist back up
  with products that do not match the query is not a better answer than showing
  the two that do.
- **Applicability.** A stage no candidate carries data for is reported inactive
  and its chip is not shown, rather than claiming a filter that judged nothing.
- **Unknown is not bad.** Stages 3–6 never drop a product for missing data.

## Shortlist composition

Rank order alone returns the same brand three times over, and a page of one
seller's near-identical listings is not a choice. So the shortlist is composed,
not sliced (`selectShortlist` in `discovery-service.ts`):

| Slot | Count | Rule |
|---|---|---|
| `pinned` | 0–1 | The product whose link was pasted. Leads, and never competes for the slots below |
| `top-brand` | 3 | Best-ranked product from each distinct brand |
| `cheaper-alternative` | 2 | Beats the **cheapest** brand pick on price *and* still matches every search word |

A cheaper pick must undercut the cheapest product above it, not merely the top
one, so it is genuinely cheaper than everything shown before it. Products with no
published price are excluded from that tier — "cheaper" is a claim an unknown
price cannot support.

Both tiers degrade rather than pad: too few brands and the remainder fills by
rank; no cheaper match and the shortlist is simply shorter.

## Auto-publishing to the Buyer's Guide

Every finder search persists its shortlist to Supabase, and the Buyer's Guide
lists those alongside the hand-written reviews. Curated entries always lead and
are labelled differently ("Read review" vs "See the analysis", plus an
*Auto-listed* badge) — a visitor should be able to tell an editorial page from a
generated one before clicking.

**Setup** — run `docs/supabase-discovered-products.sql`, then set
`SUPABASE_SERVICE_ROLE_KEY`. Without it the whole feature is inert: writes
no-op, the listing is empty, and the finder is unaffected.

| Variable | Notes |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS — never expose it to the browser and never prefix it `NEXT_PUBLIC_` |
| `PRODUCT_FINDER_AUTO_ADD` | `false` stops new products being published. Existing rows stay |
| `PRODUCT_FINDER_AUTO_ADD_NOINDEX` | `true` makes every auto-published page `noindex`, effective on the next request with no redeploy |

Writes are server-side only. The table grants public `select` and **no** write
policy, so the anon key that ships in the browser cannot create a page — the
finder route is the only way in.

`/products/[slug]` sets `dynamicParams = true` so these resolve; the curated
reviews are still pre-rendered by `generateStaticParams` and stay static.

### Known trade-offs

These are real and were accepted deliberately:

- **Images are hotlinked from Amazon's CDN**, not downloaded to `public/` as the
  affiliate-product-adder skill does — there is no build step to download into.
  They can break if Amazon rotates a URL.
- **The payload is a snapshot.** Price and rating are frozen at discovery; the
  page always routes to Amazon for the live figure, and the copy says "at last
  check".
- **Content is thin** next to a written review — search results carry no specs,
  so generated pages lean on the score breakdown rather than editorial.
- **Scaled auto-generated affiliate pages carry SEO and Associates-programme
  risk.** `PRODUCT_FINDER_AUTO_ADD_NOINDEX` and a `delete from
  discovered_products` are the two levers if that ever bites.

The `search_count` column is the useful by-product: it ranks what visitors
actually look for, which is the shortlist worth turning into real reviews.

## Routes

| Route | Rendering |
|---|---|
| `/product-finder` | Static shell + client island |
| `/product-finder/compare?asins=…&market=…` | Static shell + island; re-fetches on cold load, so shared links work |
| `/product-finder/product/[asin]?market=…` | Dynamic. Renders through `AffiliateProductTemplate` — no second template |
| `POST /api/product-finder/search` | Dynamic |
| `POST /api/product-finder/lookup` | Dynamic |

Products that already have a hand-written review link to `/products/{slug}`
instead of the generated page.
