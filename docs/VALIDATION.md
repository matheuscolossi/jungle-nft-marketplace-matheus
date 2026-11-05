# Reproducible validation

## Commands

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
```

Playwright starts the optimized production preview on `http://127.0.0.1:4173`. An already running preview can be reused outside CI; stop it or rebuild it after source changes. Chromium uses the installed Google Chrome channel. On a machine without Chrome, install it or change the Playwright channel to an installed Chromium browser. The test suite does not need a private backend, extension, blockchain wallet or payment service.

Each test gets a separate browser context and mock database. Tests use the default fixtures; the pending-order reconnection scenario fixes Date with Playwright’s clock while keeping network timers real. Fault/event controls are sent as actual browser `fetch` requests through MSW's `/api/demo` handlers. UI requests use the application Axios client. Realtime scenarios travel through the MSW WebSocket interception, Socket.IO binding and real `socket.io-client`; tests do not call application setters or Query cache methods.

## Coverage

The same scenarios execute at 1440×1000 and 390×844 in Chromium; a layout sweep also checks 768×1024. The suite covers:

- Search, composed filters, sorting, pagination, URL/history/refresh restoration, empty results, and out-of-order responses.
- Direct NFT routes, missing resources/routes, gallery selection, sold-out editions and quantity limits.
- Registration validation/conflict, invalid login, protected-route return, recovered session, expiration, logout and account isolation.
- Optimistic favorites, failed mutation rollback, retry and persistence.
- Visitor/account cart persistence and merge, quantity edits/removal, invalid/expired/valid coupons and decimal totals.
- Collector validation, simulated wallet connection refusal/connect/disconnect, keyboard focus and purchase review.
- Confirmed/refused payments, repeated clicks, true post-creation timeout recovery, idempotency payload conflicts and private order permissions.
- Immutable receipt snapshot, bought-quantity removal and cart preservation after refusal.
- Profile, uploaded avatar, password, primary/secondary wallets, server validation and refresh persistence.
- Session expiration during checkout with cart/draft resumption.
- Socket.IO price/stock updates during review, stale quote rejection, duplicate/old event rejection, disconnected pending order recovery and terminal-state preservation.
- Slow-loading skeletons, transient failures, retry, keyboard navigation, dialog focus and responsive overflow.

Visual comparisons cover home, NFT detail, cart and checkout in both desktop/mobile projects. Baselines live in `tests/__screenshots__`. To intentionally regenerate after reviewing a visual change:

```sh
npm run test:update
```

The HTML report is `reports/playwright/index.html`. Failure screenshots and retained traces are in `reports/test-results`. Open a failure trace with `npx playwright show-trace path/to/trace.zip`.

## Lighthouse

Use the optimized build with normal imagery, fonts, mocks and interactions:

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# In a second terminal:
npm run audit
```

`scripts/audit.mjs` launches a fresh headless Chrome profile for each run, using Lighthouse simulated throttling. It audits `/` and `/nft/1`, three measurements per page and mobile/desktop profile: twelve reports in total. Desktop emulation uses 1440×1000, a 40 ms round trip, 10 Mbps throughput and no CPU slowdown; mobile uses Lighthouse defaults. No audit-specific application branch is used.

Optional environment values: `AUDIT_BASE_URL`, `AUDIT_DETAIL_PATH`, `CHROME_PATH`; `AUDIT_RUNS` controls the number of measurements and defaults to three. Reports record Lighthouse/browser versions, OS, Node, CPU, memory, warnings, scores, LCP, CLS and TBT. `reports/lighthouse/summary.json` and its accompanying README contain the measured medians and any categories below the requested thresholds.

Targets: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90. These local simulated measurements depend on CPU load, browser version and the host; published network conditions can produce different results. Reported measurements must come from a completed audit, not estimates.

## Execution record

The completed local run and audit summaries are recorded below after verification.

## Measured Lighthouse results — 2026-11-05

Twelve completed measurements: three per route/profile, using the unchanged production application with local images, MSW and Socket.IO. No test browsers ran concurrently with the final audit.

| Route  | Profile | Performance | Accessibility | Best practices | SEO | LCP ms |     CLS | TBT ms |
| ------ | ------- | ----------: | ------------: | -------------: | --: | -----: | ------: | -----: |
| home   | mobile  |          94 |           100 |            100 | 100 |   3068 | 0.00001 |     59 |
| home   | desktop |         100 |           100 |            100 | 100 |    712 | 0.00000 |      0 |
| detail | mobile  |          94 |           100 |            100 | 100 |   3078 | 0.02232 |     39 |
| detail | desktop |         100 |           100 |            100 | 100 |    737 | 0.01489 |      0 |

All requested thresholds were met. Lighthouse 13.6.0, v24.22.1, win32 10.0.26300 x64; CPU: 12th Gen Intel(R) Core(TM) i5-12450H, 16 GB RAM. Browser: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36.

Full reports and conditions: [Lighthouse summary](../reports/lighthouse/README.md) and [JSON measurements](../reports/lighthouse/summary.json). Mobile LCP is around 3.1 seconds; the report retains the normal client bootstrap, mock network startup and full artwork rather than substituting lighter audit-only content.

The first audit exposed a desktop detail layout shift; reserving its loading region reduced the final median CLS to 0.01489. Touch target spacing and the cart accessible name were also corrected before the final audit.

## Final end-to-end run

On 2026-11-05, `npx playwright test --workers=2 --update-snapshots` completed **54/54 tests successfully** in 3.1 minutes, using Playwright 1.65.0 and the Chrome channel on Windows. Both 1440×1000 desktop and 390×844 mobile projects ran; the tablet sweep checked 768×1024. All tests start in isolated browser contexts. The final HTML report is [reports/playwright/index.html](../reports/playwright/index.html). Eight full-page visual baselines cover home, detail, cart and checkout in both projects.

The additional reset test verifies that persisted private state, catalog values and event subscriptions return to a known scenario. Earlier failures identified and fixed registration IDs, private-route redirect recursion, logout ordering, public-query removal on session recovery, and Socket.IO transport matching. The final run has no failing traces; the checked-in configuration retains traces automatically when a future test fails.

A separate non-updating visual run (`npx playwright test --grep=baselines --workers=2 --reporter=list --output=reports/visual-checks`) passed **4/4 tests** after baseline generation, comparing all eight captures without changing them.
