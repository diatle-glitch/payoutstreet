# API field mappings

Partner base: `{ONTATAPE_API_BASE}/v1`  
Auth (server only): `Authorization: Bearer <ONTATAPE_API_KEY>` or `X-Api-Key`.

Money objects are `{ "amount": "1234.56", "currency": "USD" }`. `amount` is a **string**. The BFF parses with decimal/BigInt math. Canvas/engine numbers are derived after that parse.

## Windows

| UI chip | Partner `window` | Notes |
| --- | --- | --- |
| 24h | `24h` | Daily |
| 7d | `7d` | |
| 30d | `30d` | |
| 90d | `365d` | Closest supported Partner window. Banner notes the mapping. |
| All Time | `alltime` | |
| (internal) | `ytd` | Available on BFF if requested |

## Rankings — `GET /v1/firms?window=&limit=8&sort=-total`

| Partner field | Frontend firm | Notes |
| --- | --- | --- |
| `id` / `slug` | `id` | Building map key |
| `name` | `name` | HTML-escaped |
| `name` + brand table | `shortName` | Sensible shorten |
| `total.amount` | `value` / `totalPaid` | Decimal parse → visual number |
| `payout_count` | `count` | |
| `avg` / `median` | `avg` / `median` | Used in firm dialog |
| `mix` majority | `source` | rise→Rise, chain→On-chain, discord→Discord |
| `mix` + `evidence` | `verified` | See verification rules |
| `proof_url` | `evidenceUrl` | Public links only |
| brand table by id | `color`, `mark`, `cameo` | Defaults for unknown ids |

Street totals: `GET /v1/stats?window=` → `total`, `payout_count`, `firm_count`.

## Verification

**Firm** is verified only when:

- `evidence` is not `DISCORD_BOT`, and
- Discord is not the dominant (or tied-dominant) mix share, and
- Rise or on-chain share is &gt; 0

Never inferred from a provider label alone.

**Payout** is verified only when `status === "verified"` **and** `source` is not Discord.

Unverified payouts still appear on the tape with a badge. They do **not** increment totals and do **not** spawn walkers.

Topstep (`mix.discord=100`, `evidence=DISCORD_BOT`) is unverified.

## Live payouts — `GET /v1/payouts?limit=30`

| Partner | Engine event |
| --- | --- |
| `id` | stable dedupe key |
| `firm_id` | `firmId` → building index via current ranking map |
| `amount.amount` | visual `amount` after decimal parse |
| `status` + `source` | `verified` |
| `proof_url` | `evidenceUrl` |
| `verified_at` | `occurredAt` |

Poll every 12s (BFF `/api/payouts`). First successful page **primes** the dedupe set so historical rows are not replayed as new animations. SSE (`GET /v1/stream` → site `/api/stream`) is documented but not required; poll is the reliability path.

## Top-ups — `GET /v1/inflows`

| Partner | Helicopter |
| --- | --- |
| `id` | dedupe |
| `firm_id` | `launchTopup(index, amount)` |
| `amount` | display only |
| `at` | `occurredAt` |
| `direction: in`, `token: RiseUSD` | ignored for totals |

**Never** add inflows to trader payout totals or walker accounting.

## Firm detail

- `GET /v1/firms/{id}?window=`
- `GET /v1/firms/{id}/payouts?window=&limit=&cursor=`
- `GET /v1/firms/{id}/cash-on-hand`

## BFF surface (frontend only talks here)

Same-origin:

- `GET /api/health` — `mode: live|fixture`, demo flag, `as_of`
- `GET /api/config`
- `GET /api/rankings?window=`
- `GET /api/stats?window=`
- `GET /api/firms/:id`
- `GET /api/firms/:id/payouts`
- `GET /api/firms/:id/cash-on-hand`
- `GET /api/payouts`
- `GET /api/inflows`
- `POST /api/simulate` — only if `ENABLE_DEMO_MODE=true`

## Fixture fallback

If `ONTATAPE_API_BASE` is unset, times out, or `/v1` 404s (current onthetape.io and Railway staging), the BFF serves fixtures captured from public `/api/stats`, `/api/events`, `/api/inflows` on 2026-09-14 and rewritten into the Partner envelope. The UI labels **FIXTURE MODE** and never claims live.
