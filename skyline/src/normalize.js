import { brandFor, shortenName } from './brands.js';
import { formatDecimal, parseMoney, toVisualNumber } from './money.js';

export const API_WINDOWS = ['24h', '7d', '30d', '365d', 'ytd', 'alltime'];
export const UI_PERIODS = [
  { id: '24h', label: '24h', api: '24h' },
  { id: '7d', label: '7d', api: '7d' },
  { id: '30d', label: '30d', api: '30d' },
  { id: '90d', label: '90d', api: '365d', mapsTo: '365d', note: 'UI 90d maps to Partner window 365d (closest supported).' },
  { id: 'alltime', label: 'All Time', api: 'alltime' },
];

export function mapUiPeriod(period) {
  const found = UI_PERIODS.find((p) => p.id === period || p.api === period);
  if (found) return found;
  if (API_WINDOWS.includes(period)) return { id: period, label: period, api: period };
  return UI_PERIODS[0];
}

export function unwrapEnvelope(payload) {
  if (!payload || typeof payload !== 'object') {
    throw invalidResponse('Payload is not an object');
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      data: payload.data,
      meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {},
      pagination: payload.pagination || null,
    };
  }
  return { data: payload, meta: {}, pagination: null };
}

export function invalidResponse(message) {
  const err = new Error(message);
  err.code = 'INVALID_RESPONSE';
  return err;
}

export function sourceFromMix(mix = {}) {
  const rise = Number(mix.rise) || 0;
  const chain = Number(mix.chain) || 0;
  const discord = Number(mix.discord) || 0;
  if (rise >= chain && rise >= discord && rise > 0) return { type: 'rise', label: 'Rise' };
  if (chain >= rise && chain >= discord && chain > 0) return { type: 'chain', label: 'On-chain' };
  if (discord > 0) return { type: 'discord', label: 'Discord' };
  return { type: 'unknown', label: 'Unknown' };
}

export function discordIsDominant(mix = {}) {
  const rise = Number(mix.rise) || 0;
  const chain = Number(mix.chain) || 0;
  const discord = Number(mix.discord) || 0;
  return discord > 0 && discord >= rise && discord >= chain;
}

/**
 * Firm verified only when the API confirms a non-discord primary mix
 * and evidence is not DISCORD_BOT. Never infer from a provider label alone.
 */
export function isFirmVerified(firm) {
  const evidence = String(firm?.evidence || '').toUpperCase();
  if (evidence === 'DISCORD_BOT') return false;
  const mix = firm?.mix || {};
  if (discordIsDominant(mix)) return false;
  const rise = Number(mix.rise) || 0;
  const chain = Number(mix.chain) || 0;
  return rise > 0 || chain > 0;
}

/**
 * Payout verified only when status === "verified" and source is not Discord.
 */
export function isPayoutVerified(payout) {
  const status = String(payout?.status || '').toLowerCase();
  const source = String(payout?.source || '').toLowerCase();
  if (source === 'discord' || source === 'discord_bot') return false;
  return status === 'verified';
}

export function sourceLabelFromPayout(payout) {
  const raw = String(payout?.source || '').toUpperCase();
  if (raw === 'RISE') return 'Rise';
  if (raw === 'CHAIN' || raw === 'ON-CHAIN' || raw === 'ONCHAIN') return 'On-chain';
  if (raw === 'DISCORD' || raw === 'DISCORD_BOT') return 'Discord';
  if (raw) return raw.charAt(0) + raw.slice(1).toLowerCase();
  return 'Unknown';
}

export function normalizeFirm(raw) {
  if (!raw || typeof raw !== 'object') throw invalidResponse('Firm row is not an object');
  const id = String(raw.id || raw.slug || raw.firm_id || '').trim();
  if (!id) throw invalidResponse('Firm is missing id');
  const name = String(raw.name || id);
  const total = parseMoney(raw.total ?? raw.totalPaid);
  const avg = parseMoney(raw.avg);
  const median = parseMoney(raw.median);
  const largest = parseMoney(raw.largest);
  const lastPayout = parseMoney(raw.last_payout);
  const mix = raw.mix && typeof raw.mix === 'object' ? raw.mix : {};
  const source = sourceFromMix(mix);
  const brand = brandFor(id, name);
  const verified = isFirmVerified({ mix, evidence: raw.evidence });
  return {
    id,
    slug: String(raw.slug || id),
    name,
    shortName: raw.shortName || brand.shortName || shortenName(name),
    totalPaid: total ? formatDecimal(total.units) : '0.00',
    totalPaidUnits: total ? total.units : 0n,
    totalPaidVisual: total ? toVisualNumber(total.units) : 0,
    payoutCount: Number(raw.payout_count ?? raw.payoutCount ?? 0) || 0,
    avg: avg ? formatDecimal(avg.units) : null,
    avgVisual: avg ? toVisualNumber(avg.units) : null,
    median: median ? formatDecimal(median.units) : null,
    medianVisual: median ? toVisualNumber(median.units) : null,
    largest: largest ? formatDecimal(largest.units) : null,
    growthPct: raw.growth_pct ?? raw.growthPct ?? null,
    rankDelta: raw.rank_delta ?? raw.rankDelta ?? 0,
    lastPayoutAt: raw.last_payout_at || null,
    lastPayout: lastPayout ? formatDecimal(lastPayout.units) : null,
    mix: {
      rise: Number(mix.rise) || 0,
      chain: Number(mix.chain) || 0,
      discord: Number(mix.discord) || 0,
    },
    source: source.label,
    sourceType: source.type,
    verified,
    unverified: !verified,
    evidence: raw.evidence || null,
    evidenceUrl: raw.proof_url || raw.evidenceUrl || null,
    logoUrl: raw.logo_url || raw.logoUrl || null,
    note: raw.note || null,
    color: brand.color,
    mark: brand.mark,
    cameo: brand.cameo,
    currency: (total && total.currency) || 'USD',
  };
}

export function normalizePayout(raw) {
  if (!raw || typeof raw !== 'object') throw invalidResponse('Payout is not an object');
  const id = String(raw.id || '').trim();
  const firmId = String(raw.firm_id || raw.firmId || '').trim();
  if (!id) throw invalidResponse('Payout is missing id');
  if (!firmId) throw invalidResponse('Payout is missing firm_id');
  const money = parseMoney(raw.amount);
  if (!money) throw invalidResponse('Payout amount is invalid');
  const verified = isPayoutVerified(raw);
  return {
    id,
    firmId,
    firmName: raw.firm_name || raw.firmName || firmId,
    amount: formatDecimal(money.units),
    amountUnits: money.units,
    amountVisual: toVisualNumber(money.units),
    currency: money.currency,
    verified,
    status: raw.status || (verified ? 'verified' : 'unverified'),
    source: sourceLabelFromPayout(raw),
    sourceRaw: raw.source || null,
    evidenceUrl: raw.proof_url || raw.evidenceUrl || null,
    occurredAt: raw.verified_at || raw.occurredAt || raw.at || null,
    ts: raw.ts ?? null,
    txRef: raw.tx_ref || raw.txRef || null,
  };
}

export function normalizeInflow(raw) {
  if (!raw || typeof raw !== 'object') throw invalidResponse('Inflow is not an object');
  const id = String(raw.id || '').trim();
  const firmId = String(raw.firm_id || raw.firmId || '').trim();
  if (!id) throw invalidResponse('Inflow is missing id');
  if (!firmId) throw invalidResponse('Inflow is missing firm_id');
  const money = parseMoney(raw.amount);
  if (!money) throw invalidResponse('Inflow amount is invalid');
  return {
    id,
    firmId,
    amount: formatDecimal(money.units),
    amountUnits: money.units,
    amountVisual: toVisualNumber(money.units),
    currency: money.currency,
    evidenceUrl: raw.proof_url || raw.evidenceUrl || null,
    occurredAt: raw.at || raw.verified_at || raw.occurredAt || null,
    txRef: raw.tx_ref || raw.txRef || null,
    direction: raw.direction || 'in',
    token: raw.token || 'RiseUSD',
  };
}

export function normalizeStats(raw) {
  const body = raw && raw.total != null ? raw : {};
  const total = parseMoney(body.total);
  return {
    totalPaid: total ? formatDecimal(total.units) : '0.00',
    totalPaidUnits: total ? total.units : 0n,
    totalPaidVisual: total ? toVisualNumber(total.units) : 0,
    payoutCount: Number(body.payout_count ?? 0) || 0,
    firmCount: Number(body.firm_count ?? 0) || 0,
    largest: body.largest ? parseMoney(body.largest) : null,
    window: body.window || null,
  };
}

export function normalizeCash(raw) {
  const money = parseMoney(raw?.amount);
  return {
    firmId: raw?.firm_id || raw?.firmId || null,
    amount: money ? formatDecimal(money.units) : null,
    amountVisual: money ? toVisualNumber(money.units) : null,
    currency: money?.currency || 'USD',
    token: raw?.token || null,
    explorer: raw?.explorer || null,
  };
}

export function serializeFirm(firm) {
  const { totalPaidUnits, ...rest } = firm;
  return { ...rest, totalPaidUnits: firm.totalPaid };
}

export function toClientFirm(firm) {
  return {
    id: firm.id,
    slug: firm.slug,
    name: firm.name,
    shortName: firm.shortName,
    value: firm.totalPaidVisual,
    totalPaid: firm.totalPaid,
    count: firm.payoutCount,
    avg: firm.avg,
    median: firm.median,
    source: firm.source,
    verified: firm.verified,
    unverified: firm.unverified,
    evidenceUrl: firm.evidenceUrl,
    color: firm.color,
    mark: firm.mark,
    cameo: firm.cameo,
    lastPayoutAt: firm.lastPayoutAt,
    mix: firm.mix,
    note: firm.note,
  };
}

export function toClientPayout(payout) {
  return {
    id: payout.id,
    firmId: payout.firmId,
    firmName: payout.firmName,
    amount: payout.amountVisual,
    amountExact: payout.amount,
    verified: payout.verified,
    status: payout.status,
    source: payout.source,
    evidenceUrl: payout.evidenceUrl,
    occurredAt: payout.occurredAt,
  };
}

export function toClientInflow(inflow) {
  return {
    id: inflow.id,
    firmId: inflow.firmId,
    amount: inflow.amountVisual,
    amountExact: inflow.amount,
    evidenceUrl: inflow.evidenceUrl,
    occurredAt: inflow.occurredAt,
    token: inflow.token,
  };
}
