# Local development

```bash
cd skyline
cp .env.example .env
# ENABLE_DEMO_MODE=true
# leave ONTATAPE_API_BASE empty to run fixtures
npm install
npm test
npm run dev
```

Open `http://localhost:8080`.

## Against Diego's local Partner API

On the Mac where `/v1` is serving:

```
ONTATAPE_API_BASE=http://127.0.0.1:8099
ONTATAPE_API_KEY=ott_dev_verify_key_2026
ENABLE_DEMO_MODE=true
```

Cloud agents cannot reach that bind address. If health stays `fixture`, the probe failed — check `/api/health` `upstream.last_error`.

## Demo / simulator

Only when `ENABLE_DEMO_MODE=true`:

- On-page buttons (one payout, ×5, supercar, ×8, helicopter, disconnect)
- `POST /api/simulate` `{ "scenario": "multi"|"supercar"|"topup"|"burst"|"disconnect" }`

Production must set `ENABLE_DEMO_MODE=false` (or omit it). There is no silent demo path.

## Tests

```
npm test
```

Covers decimal money, verification/normalization, payout-engine dedupe, firm map.

## Prototype reference

Unmodified handoff canvas/demo lives in `prototype/` if you need to diff visuals.
