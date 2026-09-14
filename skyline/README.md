# PayoutStreet SKYLINE (staging)

Interactive payout district from the developer handoff zip: eight buildings, walkers, equipment tiers, supercar ≥ $50k, rooftop ads, helicopter top-ups. Wired to a same-origin BFF that talks to the OnTheTape Partner `/v1` API — or captured fixtures when `/v1` is not deployed.

**This is not the GitHub Pages receiving yard.** Yard pages stay on `main`. Do not merge this app over Pages unless Diego asks.

## Quick start

```bash
cd skyline
cp .env.example .env
npm install
npm test
npm start
```

Then `http://localhost:8080`. With empty `ONTATAPE_API_BASE` the session chip reads **FIXTURE MODE**.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [API field mappings](docs/API_FIELD_MAPPINGS.md)
- [Local dev](docs/LOCAL_DEV.md)
- [Deploy / rollback](docs/DEPLOY.md)
- [Staging handoff](docs/STAGING_HANDOFF.md)

## Env (names only)

`ONTATAPE_API_BASE`, `ONTATAPE_API_KEY` / `API_V1_DEV_KEY`, `ENABLE_DEMO_MODE`, `PUBLIC_BASE_URL`, `CORS_ORIGINS`, `STAGING_ACCESS_TOKEN`, `FORCE_FIXTURE_MODE`.

See `.env.example`.
