# PayoutStreet developer handoff

This archive contains the complete source currently used by the PayoutStreet
prototype, including all artwork and animation assets.

## Run locally

The site is static and has no build step:

```bash
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`.

## Deploy

Upload the contents of `dist/` to any static host (Cloudflare Pages, Netlify,
Vercel static hosting, S3/CloudFront, or equivalent). The existing
`.openai/hosting.json` is included for reference; its `project_id` belongs to
the current private ChatGPT Site and should be removed or replaced when
deploying as a separate project.

## Connect live APIs

The current demo dataset and event simulator are in `dist/app.js`. See
`API_INTEGRATION.md` for the recommended payloads and connection points.

Important: never place private API keys in `dist/` or browser JavaScript. Use a
backend/API gateway for authenticated upstream providers, then expose only the
normalized public data required by this interface.

## Included files

- `dist/index.html` — page structure and metadata
- `dist/style.css` — complete responsive design
- `dist/app.js` — rankings, UI, animation drawing, and demo events
- `dist/payout-engine.js` — deterministic payout queue and movement engine
- `dist/assets/` — all building, character, vehicle, helicopter, and cameo art
- `dist/favicon.svg` — site icon
- `.openai/hosting.json` — current Sites hosting reference
- `API_INTEGRATION.md` — live API contract and implementation notes

