# Reproducible validation

## Current review — 2026-11-06

The application source under review is commit `b3027e733ca8ab4c1833d419d0b6ef58a9505e48`. It includes the original Figma artwork, SVGs, local Roboto Mono, revised screen compositions, complete account/checkout fields and performance corrections. Documentation and generated reports are recorded after that application commit.

The suite lists **90 entries: 86 executions and four intentional skips**. The duplicate mobile entries for the four layout sweeps are skipped because those cases already set explicit widths in the desktop project. The local production preview is `http://127.0.0.1:4180`, selected with `E2E_BASE_URL`.

The final complete run passed **86 tests with four intentional skips in 4.6 minutes**, without snapshot updates. All eight visual references matched.

All eight visual references were regenerated after the UI review. The dedicated baseline execution passed **4/4 scenarios in 14.6 seconds**, covering home, detail, cart and checkout in desktop/mobile. The final complete suite runs without snapshot updates and also compares those references. Baselines detect regressions against the implementation's own reviewed images; they do not certify pixel equality with Figma.

Typecheck, lint and production build passed for the current application source. The [GitHub Actions run](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42211615877) passed types, lint, build and **86 tests with four intentional skips in 9.6 minutes**, without snapshot updates. It checked commit `98b3ebf`, whose only change after application commit `b3027e7` is the README.

The twelve completed Lighthouse measurements meet every requested threshold by median. The table below records the current measurements; the individual home-mobile performance scores were 88, 91 and 90, giving a median of 90. No test browsers ran concurrently with this audit. Public deployment validation remains pending until a final Vercel URL is available.

## Commands

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
```

Without `E2E_BASE_URL`, Playwright builds and starts an optimized preview on `http://127.0.0.1:4173`. With that variable set, it uses the existing preview without rebuilding. Rebuild after application source changes before verifying it. Chromium uses the installed Google Chrome channel; if absent, install it with `npx playwright install chrome`. The suite needs no private backend, extension, blockchain wallet or payment service.

The completed baseline command and the complete-suite command are:

```sh
npx playwright test --grep=baselines --update-snapshots=all --workers=2 --reporter=list --output=reports/visual-checks/baseline-generation
npx playwright test --workers=2
```

Use snapshot updates only after reviewing a visual change. Explicit `all` regenerates every reference; the default update mode can retain an older image when a small change stays within tolerance. Subsequent verification must omit updates.

Each test gets an isolated browser context and mock database. Tests use normal fixtures. The pending-order reconnection scenario fixes Date with Playwright's clock while keeping network timers real. Fault/event controls use browser `fetch` requests intercepted by MSW's `/api/demo` handlers. Application requests use Axios; realtime scenarios use MSW WebSocket interception, the Socket.IO binding and the real `socket.io-client`. Tests do not call application setters or Query-cache methods.

The HTML report is [reports/playwright/index.html](../reports/playwright/index.html). Failure screenshots and retained traces are in `reports/test-results/`; open a retained trace with `npx playwright show-trace path/to/trace.zip`. Later executions replace the HTML report, so its current result must match the result being reported.

## Coverage and layout checks

The scenarios execute at **1440×1000** and **390×844** in Chrome, except for the intentionally deduplicated layout sweeps. Coverage includes:

- Search, composed filters, inclusive minimum/maximum prices, displayed-price sorting, popularity, pagination, URL/history/refresh restoration, empty results and out-of-order responses.
- Direct NFT routes, missing routes/resources, gallery selection, sold-out editions, quantity limits, stock falling from eight to two, explicit removal at zero and availability across editions.
- Registration validation/conflicts, invalid login, protected-route return, recovered/expired sessions, logout and account isolation.
- Optimistic favorites with rollback/retry/persistence; visitor/account cart persistence and merge; quantities/removal; invalid, expired and valid coupons; precise decimal totals.
- Collector validation, simulated wallet connection refusal/connect/disconnect, accessible REST errors, focus and purchase review.
- Confirmed/refused/pending payments, repeated clicks, post-creation timeout recovery, idempotency payload conflicts and private order permissions.
- Immutable receipt snapshots, removal of only bought quantities, preservation of later additions and cart preservation after refusal.
- Profile, avatar upload/removal, password, primary/secondary wallets, extended fields, server validation and refresh persistence. Profile drafts survive background refresh and fields remain locked through saving.
- Checkout session expiration and draft/cart resumption; Socket.IO price/stock updates, stale quote rejection, duplicate/old-event rejection, disconnected pending-order recovery and terminal-state preservation.
- Schema 2→3 artwork migration with session, prices, stock, versions, cart, coupon, favorites, idempotent recovery and the original receipt snapshot preserved.
- Slow catalog/detail/cart-summary skeletons, offline/transient failures, retry, dialog focus, keyboard-only purchase and focus while correcting errors.

The keyboard-only purchase uses Tab, typing, Enter and Space from login through receipt. Visited controls must match `:focus-visible` with a visible outline or box shadow. Setup navigation and fault controls are separate from the keyboard interactions being checked.

Loaded-route sweeps check home, detail, populated cart, login, registration, profile, wallets with the dialog open, populated favorites, checkout/review and confirmed receipt at **768×1024**. Further sweeps use **CSS `zoom: 2` on the document root** at viewport widths 390, 768 and 1440 px in headless Chrome on Windows. This checks CSS zoom/reflow, not the browser-menu zoom. Assertions wait for route-specific content, fonts, visible images and loading indicators, then compare scroll width with viewport width. Explicit layout widths run once in the desktop project.

Container queries use the effective content width under zoom; dialogs limit their height by the available percentage. The screenshot helper decodes visible images while on screen, restores scroll position and waits for fonts, avoiding hidden modal-backdrop images and slow-CI image cancellations. These synchronization steps preserve the actual overflow and image comparisons.

The [Figma copy supplied for review](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-) provides design contexts/screenshots for composition and assets. Required dynamic interactions use a visible catalog search, four real categories plus collections, and an Ethereum indication matching NFT fixtures. Social, editorial and support actions do not claim external success. Provenance, optimization and legacy assets are in [ASSETS.md](ASSETS.md).

## Lighthouse — completed 2026-11-06

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# In another terminal:
npm run audit
```

For the current review, `AUDIT_BASE_URL=http://127.0.0.1:4180` selected the existing production preview. `scripts/audit.mjs` starts a fresh headless Chrome profile for each measurement with Lighthouse simulated throttling: `/` and `/nft/1`, three measurements per mobile/desktop profile, twelve reports total. Desktop uses 1440×1000, a 40 ms round trip, 10 Mbps throughput and no CPU slowdown; mobile uses Lighthouse defaults. Normal artwork, fonts, mocks and Socket.IO remain enabled, with no audit-specific application branch.

| Route | Profile | Performance | Accessibility | Best practices | SEO | LCP ms | CLS | TBT ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| home | mobile | 90 | 100 | 100 | 100 | 3672 | 0.00000 | 39.5 |
| home | desktop | 99 | 100 | 100 | 100 | 916 | 0.00000 | 0 |
| detail | mobile | 90 | 100 | 100 | 100 | 3671 | 0.02275 | 47.5 |
| detail | desktop | 99 | 100 | 100 | 100 | 883 | 0.01739 | 0 |

All values are medians of three runs per cell. Targets are Performance ≥90, Accessibility ≥95, Best Practices ≥95 and SEO ≥90. The script exits with failure if a runtime error occurs or a category median falls below its target. All current `belowTarget` arrays are empty.

Environment: Lighthouse **13.6.0**, Node **v24.22.1**, Windows **10.0.26300 x64**, Intel Core **i5-12450H**, **16 GB RAM**, HeadlessChrome **156.0.0.0**. Optional configuration: `AUDIT_BASE_URL`, `AUDIT_DETAIL_PATH`, `CHROME_PATH`; `AUDIT_RUNS` defaults to three. HTML/JSON reports retain browser versions, warnings, category scores and LCP/CLS/TBT. See the [summary](../reports/lighthouse/README.md) and [raw measurements](../reports/lighthouse/summary.json).

The mobile median is at the performance threshold and simulated LCP is about 3.7 seconds. Results depend on CPU load, browser version and hosting/network conditions; this local audit does not certify published performance. The hero preload starts its request before React mounts. App-module loading overlaps worker initialization, while React and its first network calls still wait for the mocks to be ready. Heading order and mobile promo sizing were also corrected before this measurement.

## CI and publication

The Windows GitHub Actions workflow installs dependencies, checks types/lint, builds, installs Chrome and runs the complete Playwright suite with Node 22. Reports and traces are retained for 14 days. Windows matches the local baseline environment; another OS can rasterize text differently.

The [GitHub Actions run](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42211615877) passed types, lint, build and **86 tests with four intentional skips in 9.6 minutes**, without snapshot updates. It checked commit `98b3ebf`, whose only change after application commit `b3027e7` is the README.

The application has SPA fallback configuration and a locally served MSW worker. After deployment, validate anonymous access, direct/internal-route refresh, recovered session, scenarios, Socket.IO and a complete purchase at the public URL. No final public URL has been confirmed; deployment verification remains pending.

## Historical checkpoints

These records describe earlier code and do not certify the final reviewed application:

- **2026-11-05:** 54/54 local tests, eight visual comparisons and twelve Lighthouse measurements. Performance medians were 94 mobile/100 desktop, other categories 100. The matching [GitHub Actions run](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42126691066) passed.
- **2026-11-06, before original assets/layout:** 82 passed, four intentional skips, 4.5 minutes, without snapshot updates. Later popularity/migration cases increased the suite to 90 entries.
- **2026-11-06, first complete Figma revision:** 86 passed, four intentional skips, 4.8 minutes, without updates. The current performance bootstrap and mobile promo corrections were applied afterward, requiring the current final run above.

Historical HTML reports can be replaced by later executions. Current checked-in reports must be read with their corresponding source and date.
