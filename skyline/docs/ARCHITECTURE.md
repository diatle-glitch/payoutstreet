# Architecture

```
Browser (skyline/public)
    │  same-origin /api/*
    ▼
Node BFF (skyline/src/server.js)
    │  Bearer / X-Api-Key from env only
    ▼
OnTheTape Partner /v1   ──or──  fixtures/v1 (when /v1 is down)
```

## Why a BFF

The handoff prototype is a static canvas street. Partner `/v1` needs a secret key. Keys never go in `public/`. The BFF:

- Proxies and normalizes Partner JSON
- Escapes nothing itself (frontend escapes before `innerHTML`)
- Rate-limits and validates `window`, firm slugs, cursors
- Restricts CORS to `PUBLIC_BASE_URL` / `CORS_ORIGINS`
- Falls back to fixtures when `/v1` is 404/unreachable
- Exposes a staging simulator only when `ENABLE_DEMO_MODE=true`

## Layers

| Path | Role |
| --- | --- |
| `public/payout-engine.js` | Unchanged visual queue. Accounting is independent of the 16-actor cap. |
| `public/app.js` | Prototype render/canvas, now fed by the live client |
| `public/js/live-client.js` | Poll, reconnect, period refresh |
| `public/js/street-state.js` | firmId ↔ index, dedupe, verified accounting |
| `src/normalize.js` | Partner → frontend models |
| `src/money.js` | Decimal string math |
| `src/ott-client.js` | Timeouts, 401/429/5xx, Retry-After |
| `src/fixtures.js` | Captured /v1-shaped samples |

## Building index

On first load / period change, top 8 firms (sorted by total) occupy slots 0–7. Periodic snapshot refresh **updates values in place** so walkers keep the correct door. New firms enter empty/lowest slots. Rank badges and the books table re-sort independently.

## Production states

`/api/health` + the session chip: loading, live, fixture, reconnecting, stale, partial, outage. Temporary failures do not wipe the last good skyline. `meta.as_of` is shown in UTC.

## What stays on GitHub Pages

Repo-root yard HTML (`index.html`, `yard.html`, …) is the receiving-yard Pages site on `main`. This package is `skyline/` on the staging branch only. The Pages workflow still deploys `main` `/`.
