# Live API integration contract

The visual engine expects eight firms indexed from `0` to `7`. For production,
prefer stable string firm IDs from your API and translate them to the visible
building index after rankings are sorted.

## 1. Rankings snapshot

Recommended endpoint: `GET /api/payouts/summary?period=1d`

```json
{
  "asOf": "2026-09-14T21:40:00Z",
  "currency": "USD",
  "firms": [
    {
      "id": "topstep",
      "name": "Topstep",
      "shortName": "Topstep",
      "totalPaid": 179500,
      "payoutCount": 25,
      "source": {
        "type": "direct_api",
        "label": "Wise",
        "verified": true,
        "evidenceUrl": null
      },
      "brand": { "color": "#e1f784", "mark": "T" }
    }
  ]
}
```

Map the response to the current `initial` array in `dist/app.js`:

| API field | Current UI field |
| --- | --- |
| `name` | `name` |
| `shortName` | `short` |
| `totalPaid` | `value` |
| `payoutCount` | `count` |
| `source.label` | `source` |
| `brand.color` | `color` |
| `brand.mark` | `mark` |
| `!source.verified` | `unverified` |

## 2. Real-time payout event

Recommended transport: Server-Sent Events at `GET /api/payouts/stream` or a
WebSocket if the existing backend already provides one.

```json
{
  "id": "payout_01K5...",
  "type": "payout.completed",
  "occurredAt": "2026-09-14T21:41:02Z",
  "firmId": "topstep",
  "amount": 2450,
  "currency": "USD",
  "source": "wise",
  "verified": true,
  "evidenceUrl": null
}
```

Convert each event to `{ id, firm, amount }`, where `firm` is the current
visible building index, then pass it to `receivePayouts([event])`. Event IDs
must remain stable because `PayoutEngine` ignores duplicates.

## 3. Firm top-up event

```json
{
  "id": "topup_01K5...",
  "type": "firm.topup",
  "occurredAt": "2026-09-14T21:42:00Z",
  "firmId": "tradeify",
  "amount": 250000,
  "currency": "USD"
}
```

Map `firmId` to the building index and call `launchTopup(index, amount)`.

## 4. Production rules

- Normalize all amounts to USD server-side and retain the original currency
  and FX rate in your database for auditability.
- Never infer `verified: true` from a provider label alone.
- Validate positive amounts and ISO timestamps at the API boundary.
- Paginate historical detail views; do not send full payout history in the
  rankings snapshot.
- Reconnect streams with a last-event ID and replay missed events.
- Keep provider credentials and evidence URLs requiring authentication on the
  server. Return a safe public evidence link only when intended for visitors.
- Escape all API-sourced labels before rendering. The current renderer uses
  HTML templates and therefore needs explicit sanitization before accepting
  untrusted strings.

## 5. Recommended migration order

1. Replace the hard-coded `initial` array with the rankings snapshot fetch.
2. Maintain a `firmId -> building index` map after every ranking refresh.
3. Connect payout events to `receivePayouts`.
4. Connect top-up events to `launchTopup`.
5. Disable the automatic demo timers and demo buttons in production.
6. Add loading, stale-data, reconnecting, and API-error states.
7. Add firm history endpoints to the existing detail dialog.

