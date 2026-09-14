# Deploy and rollback

## Do not ship this branch to GitHub Pages

Pages deploys `main` `/` (the receiving yard). This skyline app is `skyline/` on `cursor/staging-skyline-live-72d2` (or `staging/skyline-live`). Never force-push `main`. Never point Pages at this branch.

## Railway (preferred staging)

1. New service, root directory `skyline` (or deploy this folder).
2. Set env vars from `.env.example` (values, not the example file).
3. Health check: `GET /api/health`.
4. Custom domain: `staging.payoutstreet.com` → service URL. Until DNS exists, use the Railway `*.up.railway.app` preview.
5. Staging headers: `X-Robots-Tag: noindex, nofollow`, `robots.txt` disallows all. Optional `STAGING_ACCESS_TOKEN`.

### Env for a fixture-labeled staging (today)

`/v1` is **404** on `https://onthetape.io` and `https://site-staging-eb18.up.railway.app` until [onthetape PR #34](https://github.com/diatle-glitch/onthetape/pull/34).

```
ONTATAPE_API_BASE=https://site-staging-eb18.up.railway.app
ONTATAPE_API_KEY=<from Diego, never in git>
ENABLE_DEMO_MODE=true
PUBLIC_BASE_URL=https://staging.payoutstreet.com
FORCE_FIXTURE_MODE=false
```

The BFF will probe `/v1/firms` and flip to **fixture** if 404. The UI says FIXTURE MODE. After PR #34 merges, redeploy or restart — health will flip to `live` without a code change.

### Point at Diego's local /v1

Tunnel the Mac preview (`http://127.0.0.1:8099`) with Cloudflare Tunnel / ngrok, then:

```
ONTATAPE_API_BASE=https://<tunnel-host>
ONTATAPE_API_KEY=ott_dev_verify_key_2026
ENABLE_DEMO_MODE=true
```

Dev key is for local/staging tests only.

## Rollback

- Railway: redeploy the previous successful deployment.
- Git: this branch is additive. `main` yard is untouched. Revert the PR or delete the Railway service.

## HTTPS / access

Railway terminates TLS. Add `STAGING_ACCESS_TOKEN` if the preview must not be public. Share the token out of band; the UI does not embed it.
