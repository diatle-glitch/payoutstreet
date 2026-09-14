/**
 * Staging-only event simulator. Never enabled unless ENABLE_DEMO_MODE=true.
 */
const scenarios = {
  multi: [
    { kind: 'payout', firmId: 'tradeify-futures', amount: '850.00', verified: true },
    { kind: 'payout', firmId: 'myfundedfutures', amount: '4500.00', verified: true },
    { kind: 'payout', firmId: 'fundednext', amount: '16500.00', verified: true },
    { kind: 'payout', firmId: 'blueguardian', amount: '2100.00', verified: true },
    { kind: 'payout', firmId: 'topstep', amount: '3000.00', verified: false, source: 'DISCORD' },
  ],
  supercar: [
    { kind: 'payout', firmId: 'tradeify-futures', amount: '75000.00', verified: true },
  ],
  topup: [
    { kind: 'inflow', firmId: 'myfundedfutures', amount: '250000.00' },
  ],
  burst: [
    { kind: 'payout', firmId: 'tradeify-futures', amount: '750.00', verified: true },
    { kind: 'payout', firmId: 'myfundedfutures', amount: '2400.00', verified: true },
    { kind: 'payout', firmId: 'fundednext', amount: '75000.00', verified: true },
    { kind: 'payout', firmId: 'blueguardian', amount: '1600.00', verified: true },
    { kind: 'payout', firmId: 'futureselite', amount: '6500.00', verified: true },
    { kind: 'payout', firmId: 'fundingpips', amount: '24000.00', verified: true },
    { kind: 'payout', firmId: 'fundedtradermarkets', amount: '1100.00', verified: true },
    { kind: 'payout', firmId: 'alphacapitalgroup', amount: '85000.00', verified: true },
  ],
};

export function createSimulator() {
  const extraPayouts = [];
  const extraInflows = [];
  let disconnectUntil = 0;
  let seq = 0;

  function nowIso() {
    return new Date().toISOString();
  }

  function run(name) {
    if (name === 'disconnect') {
      disconnectUntil = Date.now() + 12_000;
      return { scenario: 'disconnect', until: new Date(disconnectUntil).toISOString(), events: [] };
    }
    const list = scenarios[name];
    if (!list) {
      const err = new Error('Unknown scenario');
      err.status = 400;
      err.code = 'invalid_scenario';
      throw err;
    }
    const minted = [];
    for (const item of list) {
      seq += 1;
      if (item.kind === 'inflow') {
        const row = {
          id: `sim:dep:${seq}:${item.firmId}`,
          firm_id: item.firmId,
          amount: { amount: item.amount, currency: 'USD' },
          tx_ref: null,
          proof_url: null,
          at: nowIso(),
          direction: 'in',
          token: 'RiseUSD',
        };
        extraInflows.unshift(row);
        minted.push({ kind: 'inflow', id: row.id });
      } else {
        const row = {
          id: `sim:tx:${seq}:${item.firmId}`,
          firm_id: item.firmId,
          firm_name: item.firmId,
          amount: { amount: item.amount, currency: 'USD' },
          status: item.verified ? 'verified' : 'unverified',
          source: item.source || 'RISE',
          verified_at: nowIso(),
          ts: Math.floor(Date.now() / 1000),
          proof_url: null,
          tx_ref: null,
          payee_tag: null,
        };
        extraPayouts.unshift(row);
        minted.push({ kind: 'payout', id: row.id, verified: !!item.verified });
      }
    }
    return { scenario: name, events: minted };
  }

  return {
    run,
    blocked() {
      return Date.now() < disconnectUntil;
    },
    payouts() {
      return extraPayouts;
    },
    inflows() {
      return extraInflows;
    },
  };
}
