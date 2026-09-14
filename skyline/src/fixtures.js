import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unwrapEnvelope } from './normalize.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'v1');

function load(name) {
  return JSON.parse(readFileSync(join(dir, name), 'utf8'));
}

let cache;
function store() {
  if (!cache) {
    cache = {
      firms: {
        '24h': load('firms-24h.json'),
        '7d': load('firms-7d.json'),
        '30d': load('firms-30d.json'),
        '365d': load('firms-365d.json'),
        ytd: load('firms-ytd.json'),
        alltime: load('firms-alltime.json'),
      },
      stats: {
        '24h': load('stats-24h.json'),
        '7d': load('stats-7d.json'),
        '30d': load('stats-30d.json'),
        '365d': load('stats-365d.json'),
        ytd: load('stats-ytd.json'),
        alltime: load('stats-alltime.json'),
      },
      payouts: load('payouts.json'),
      inflows: load('inflows.json'),
      cash: load('cash-on-hand.json'),
      firmIndex: load('firm-index.json'),
    };
  }
  return cache;
}

function withMeta(payload, extra) {
  const env = unwrapEnvelope(payload);
  return {
    data: env.data,
    meta: { ...env.meta, ...extra, source: 'fixture' },
    pagination: env.pagination,
  };
}

export function fixtureAsOf(window = '24h') {
  return store().firms[window]?.meta?.as_of || store().payouts.meta.as_of;
}

export function getFixtureFirms(window, { limit = 8, cursor = null } = {}) {
  const all = unwrapEnvelope(store().firms[window] || store().firms['24h']).data || [];
  const start = cursor ? Number(cursor) || 0 : 0;
  const slice = all.slice(start, start + limit);
  const next = start + limit < all.length ? String(start + limit) : null;
  return withMeta({
    data: slice,
    meta: (store().firms[window] || store().firms['24h']).meta,
    pagination: { next_cursor: next, limit },
  }, { window });
}

export function getFixtureStats(window) {
  return withMeta(store().stats[window] || store().stats['24h'], { window });
}

export function getFixtureFirm(id, window) {
  const list = unwrapEnvelope(store().firms[window] || store().firms.alltime).data || [];
  const found = list.find((f) => f.id === id || f.slug === id) || store().firmIndex[id];
  if (!found) return null;
  return withMeta({ data: found, meta: { as_of: fixtureAsOf(window) } }, { window });
}

export function getFixtureFirmPayouts(id, { limit = 20, cursor = null } = {}) {
  const all = (unwrapEnvelope(store().payouts).data || []).filter((p) => p.firm_id === id);
  const start = cursor ? Number(cursor) || 0 : 0;
  const slice = all.slice(start, start + limit);
  return {
    data: slice,
    meta: { ...store().payouts.meta, source: 'fixture' },
    pagination: { next_cursor: start + limit < all.length ? String(start + limit) : null, limit },
  };
}

export function getFixtureCash(id) {
  const row = store().cash[id];
  if (!row) return null;
  return withMeta(row, {});
}

export function getFixturePayouts({ limit = 30, afterId = null } = {}) {
  let rows = unwrapEnvelope(store().payouts).data || [];
  if (afterId) {
    const idx = rows.findIndex((p) => p.id === afterId);
    if (idx >= 0) rows = rows.slice(0, idx);
  }
  return withMeta({ data: rows.slice(0, limit), meta: store().payouts.meta }, {});
}

export function getFixtureInflows({ limit = 30, afterId = null } = {}) {
  let rows = unwrapEnvelope(store().inflows).data || [];
  if (afterId) {
    const idx = rows.findIndex((p) => p.id === afterId);
    if (idx >= 0) rows = rows.slice(0, idx);
  }
  return withMeta({ data: rows.slice(0, limit), meta: store().inflows.meta }, {});
}
