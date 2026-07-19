# lovelytools.ai — Calculator Engine (`engine/calc/`)

Pure-TypeScript engine powering the Calculators family (46 tools). No canvas,
no workers, no dependencies except `decimal.js` — calculators must be **exact**,
instant (compute on keystroke), and deterministic (same inputs → same outputs,
shareable via URL params).

## Layout

```
engine/calc/
├── types.ts          # calculator definition contract, field specs, results
├── decimal.ts        # money-safe arithmetic wrapper (decimal.js, 20 sig digits)
├── registry.ts       # calculator registry: slug → definition (drives SEO pages)
├── use-calculator.ts # React hook: fields → validated inputs → live results
└── calculators/
    ├── loan.ts       # amortized loans: payment, schedule, total interest
    ├── mortgage.ts   # loan + property tax / insurance / PMI / extra payments
    ├── compound-interest.ts # periodic contributions, any compounding frequency
    ├── percentage.ts # X% of Y · X is what % of Y · % change
    ├── bmi.ts        # metric + imperial, WHO bands
    ├── date-diff.ts  # calendar-exact date math (y/m/d + business days)
    ├── unit-convert.ts # length/mass/volume/temp/area/speed/data (exact ratios)
    └── tip-split.ts  # tip + bill splitting with rounding modes
```

## The definition contract

Every calculator is **data + a pure function**, registered once:

```ts
defineCalculator({
  slug: 'loan-calculator',
  fields: [ { id: 'amount', kind: 'money', min: 1, ... }, ... ],
  compute(inputs, ctx): CalcResult   // pure, exact, throws CalcError on bad domain
})
```

- **Fields** are typed specs (`money`, `number`, `percent`, `integer`, `date`,
  `select`, `unit`) — the UI renders them generically; validation (min/max/step,
  required) happens in the hook, not per page.
- **Results** are typed rows: `primary` (the big number), `secondary` rows,
  optional `schedule` (table) and `series` (chart data). Formatting metadata
  (currency, unit, precision) travels with each value — the UI never guesses.
- **Explanations**: every result carries `formula` (human-readable) and
  `steps[]` — the "show your work" panel that makes these tools rank and win
  trust.

## Correctness rules

- **All money math through `decimal.ts`** (decimal.js). `0.1 + 0.2 === 0.3`.
  Floats are only allowed in `series` chart output.
- **Rounding is explicit**: money rounds half-even (banker's) at display time
  only; intermediate values keep full precision.
- **Date math is calendar-exact** — native `Date` UTC arithmetic with explicit
  month-length/leap-year handling, no "30-day months" approximations, DST-proof.
- **Unit conversions store exact ratios** to SI base units; temperature uses
  affine transforms. Ratios come from NIST definitions.
- Every calculator ships with a test-vector table (`vectors` export) checked in
  CI — regressions in a formula are impossible to miss.

## URL state

`use-calculator.ts` syncs inputs to query params (`?amount=250000&rate=6.5`)
with debounce — every calculator state is a shareable, SEO-crawlable URL, and
back/forward work. No localStorage needed; no data leaves the device.
