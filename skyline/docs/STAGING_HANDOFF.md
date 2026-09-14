# Staging handoff

## 1. Source

Branch: `cursor/staging-skyline-live-72d2` (do not merge to `main` unless asked).  
App root: `skyline/`.  
Prototype extracted from `payoutstreet-developer-handoff(1).zip` (already on `main`).

## 2. Staging URL

Prefer `https://staging.payoutstreet.com` once DNS CNAME points at the Railway service.

Until DNS exists: the Railway/platform preview URL from the deploy step. Health: `GET {url}/api/health`.

If this agent could not complete Railway login in a headless VM, Diego can:

```bash
cd skyline
railway up
```

Set the env vars below on the service. Root directory: `skyline`.

## 3. Access

- Staging sends `X-Robots-Tag: noindex, nofollow` and `robots.txt` `Disallow: /`.
- Optional: set `STAGING_ACCESS_TOKEN` and open `/?access=<token>` or send `X-Staging-Token`.
- Demo buttons appear only when `ENABLE_DEMO_MODE=true`.

## 4. Required env vars

| Name | Purpose |
| --- | --- |
| `ONTATAPE_API_BASE` | Partner origin, no trailing `/v1` |
| `ONTATAPE_API_KEY` or `API_V1_DEV_KEY` | Server-side only |
| `ENABLE_DEMO_MODE` | `true` on staging if simulator wanted; **false** in production |
| `PUBLIC_BASE_URL` | Canonical staging origin (CORS) |
| `CORS_ORIGINS` | Extra origins (localhost) |
| `STAGING_ACCESS_TOKEN` | Optional gate |
| `FORCE_FIXTURE_MODE` | `true` to skip probe |

## 5. Live vs fixture (do not mislabel)

Probed 2026-09-14 from this environment:

- `https://onthetape.io/v1` → 404
- `https://site-staging-eb18.up.railway.app/v1` → 404
- `http://127.0.0.1:8099` → unreachable from the cloud agent

Until [onthetape PR #34](https://github.com/diatle-glitch/onthetape/pull/34) ships `/v1`, staging will run **FIXTURE MODE** using Partner-shaped captures from public `/api/stats`, `/api/events`, `/api/inflows`. The UI says so. Health JSON has `"live": false, "mode": "fixture"`.

## 6. Local

See [LOCAL_DEV.md](LOCAL_DEV.md).

## 7. Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md). Frontend never sees the API key.

## 8. Tests

```
cd skyline && npm test
```

14/14 passing: decimal money, verification/normalization, invalid window rejection, engine dedupe, firm map / unverified accounting.

Manual checklist after deploy:

- [ ] Periods 24h / 7d / 30d / 90d (maps to 365d) / All Time change totals and heights
- [ ] Keyboard: building labels, books rows (Enter/Space), dialog Escape, city-scroll focus
- [ ] `prefers-reduced-motion`: walkers skip, counts still apply
- [ ] No console errors; view-source / network has no API keys
- [ ] Demo hidden when `ENABLE_DEMO_MODE` is unset/false
- [ ] Simulator: multi, supercar, top-up, disconnect
- [ ] Unverified Topstep-style rows badge but do not add to totals
- [ ] Helicopter inflows do not change trader totals

## 9. Known limitations

- Partner `/v1` is **not** on production or Railway staging yet. Local Diego preview only until PR #34.
- SSE is specified (`GET /v1/stream` → site `/api/stream`) but the BFF uses poll (12s) for reliability.
- 90d chip → `365d` window (documented).
- Cameos follow firm id (Tradeify / MFF), not slot index, so they stay on the right firm after rank sort.
- Fixture inflows/payouts are a captured slice, not a live stream, until `/v1` exists.
- `payee_tag` is dropped and never logged.
- Railway MCP/CLI may be unavailable in this cloud VM; preview URL then needs Diego to `railway up`.

## 10. Still needed from Diego

1. Confirm `ONTATAPE_API_KEY` for the staging Railway service (do not paste into git).
2. After PR #34: set `ONTATAPE_API_BASE` to the host that actually serves `/v1` and restart. Confirm `/api/health` `"live": true`.
3. DNS for `staging.payoutstreet.com` → Railway CNAME (or accept the preview host).
4. Decide whether staging stays public or gets `STAGING_ACCESS_TOKEN`.
5. Confirm 90d→365d mapping is acceptable, or add a real `90d` window on Partner.
6. Optional: tunnel the local `:8099` `/v1` for a true live staging rehearsal before PR #34.
7. Do **not** merge this branch to `main` if Pages should keep the receiving yard.
