#!/usr/bin/env node
/**
 * Builds Partner /v1-shaped fixtures from captured OnTheTape public /api
 * responses. Used when /v1 is not reachable (404 until onthetape PR #34).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawDir = process.argv[2] || '/tmp/ott-raw';
const outDir = join(root, 'fixtures', 'v1');
mkdirSync(outDir, { recursive: true });

const money = (n) => {
  if (n == null || Number.isNaN(Number(n))) return null;
  return { amount: Number(n).toFixed(2), currency: 'USD' };
};

const envelope = (data, extra = {}) => ({
  data,
  meta: {
    as_of: extra.as_of || new Date().toISOString(),
    generated_at: new Date().toISOString(),
    request_id: extra.request_id || `fix_${Date.now().toString(36)}`,
    source: 'fixture',
    captured_from: 'onthetape.io /api 2026-09-14',
    ...extra,
  },
});

function mapFirm(f) {
  return {
    id: f.firmId,
    slug: f.firmId,
    name: f.name,
    logo_url: f.logoUrl || null,
    total: money(f.totalUsd),
    payout_count: f.payoutCount ?? 0,
    avg: money(f.avgUsd),
    largest: money(f.largestUsd),
    median: money(f.medianUsd),
    growth_pct: f.growthPct ?? 0,
    rank_delta: f.rankDelta ?? 0,
    last_payout_at: f.lastPayoutAt || null,
    last_payout: money(f.lastPayoutUsd),
    mix: {
      rise: f.mix?.rise ?? 0,
      chain: f.mix?.chain ?? 0,
      discord: f.mix?.discord ?? 0,
    },
    evidence: f.evidence || null,
    note: f.note || null,
  };
}

const windows = ['24h', '7d', '30d', '365d', 'ytd', 'alltime'];
const firmsByWindow = {};
for (const w of windows) {
  const stats = JSON.parse(readFileSync(join(rawDir, `stats-${w}.json`), 'utf8'));
  const firms = (stats.firms || []).map(mapFirm);
  firmsByWindow[w] = firms;
  const payload = envelope(firms, {
    window: w,
    as_of: stats.asOf || new Date().toISOString(),
    request_id: `fix_firms_${w}`,
  });
  payload.pagination = { next_cursor: null, limit: firms.length };
  writeFileSync(join(outDir, `firms-${w}.json`), JSON.stringify(payload, null, 2));

  const street = envelope({
    total: money(stats.totalUsd),
    payout_count: stats.payoutCount ?? 0,
    firm_count: stats.firmCount ?? firms.length,
    largest: money(stats.largestUsd),
    window: w,
  }, { window: w, request_id: `fix_stats_${w}` });
  writeFileSync(join(outDir, `stats-${w}.json`), JSON.stringify(street, null, 2));
}

const events = JSON.parse(readFileSync(join(rawDir, 'events.json'), 'utf8'));
const payouts = (Array.isArray(events) ? events : events.data || []).map((e) => {
  const discord = String(e.source || '').toUpperCase() === 'DISCORD';
  return {
    id: e.id,
    firm_id: e.firmId,
    firm_name: e.name,
    amount: money(e.amountUsd),
    status: discord ? 'unverified' : 'verified',
    source: e.source,
    verified_at: e.verifiedAt || null,
    ts: e.ts || null,
    proof_url: e.proofUrl || null,
    tx_ref: e.txRef || null,
    payee_tag: null,
  };
});
writeFileSync(join(outDir, 'payouts.json'), JSON.stringify(envelope(payouts, {
  request_id: 'fix_payouts',
  as_of: payouts[0]?.verified_at || new Date().toISOString(),
}), null, 2));

const inflowsRaw = JSON.parse(readFileSync(join(rawDir, 'inflows.json'), 'utf8'));
const inflowRows = (inflowsRaw.inflows || []).slice(0, 40).map((d) => ({
  id: d.id,
  firm_id: d.firmId,
  amount: money(d.amountUsd),
  tx_ref: d.txRef || null,
  proof_url: d.proofUrl || null,
  at: d.verifiedAt || null,
  direction: 'in',
  token: inflowsRaw.token || 'RiseUSD',
}));
writeFileSync(join(outDir, 'inflows.json'), JSON.stringify(envelope(inflowRows, {
  request_id: 'fix_inflows',
  as_of: inflowsRaw.asOf,
}), null, 2));

const cash = {};
for (const t of inflowsRaw.treasuries || []) {
  cash[t.firmId] = envelope({
    firm_id: t.firmId,
    amount: money(t.balanceUsd),
    token: inflowsRaw.token || 'RiseUSD',
    explorer: t.explorer || null,
  }, { as_of: t.lastDepositAt || inflowsRaw.asOf, request_id: `fix_cash_${t.firmId}` });
}
writeFileSync(join(outDir, 'cash-on-hand.json'), JSON.stringify(cash, null, 2));

const firmIndex = {};
for (const f of firmsByWindow.alltime || firmsByWindow['24h']) firmIndex[f.id] = f;
writeFileSync(join(outDir, 'firm-index.json'), JSON.stringify(firmIndex, null, 2));

console.log(`Wrote v1 fixtures to ${outDir}`);
console.log(`firms 24h=${firmsByWindow['24h'].length} payouts=${payouts.length} inflows=${inflowRows.length}`);
