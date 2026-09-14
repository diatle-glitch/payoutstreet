import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isFirmVerified,
  isPayoutVerified,
  mapUiPeriod,
  normalizeFirm,
  normalizeInflow,
  normalizePayout,
  sourceFromMix,
  toClientFirm,
} from '../src/normalize.js';
import { parseWindow } from '../src/validate.js';

test('90d UI period maps to 365d', () => {
  const mapped = mapUiPeriod('90d');
  assert.equal(mapped.api, '365d');
  assert.match(mapped.note, /365d/);
});

test('unknown windows are rejected at the BFF boundary', () => {
  assert.throws(() => parseWindow('nope'), /Unsupported window/);
});

test('mix majority labels Rise / On-chain / Discord', () => {
  assert.equal(sourceFromMix({ rise: 80, chain: 20, discord: 0 }).label, 'Rise');
  assert.equal(sourceFromMix({ rise: 10, chain: 90, discord: 0 }).label, 'On-chain');
  assert.equal(sourceFromMix({ rise: 0, chain: 0, discord: 100 }).label, 'Discord');
});

test('Topstep Discord-bot mix is unverified', () => {
  const firm = normalizeFirm({
    id: 'topstep',
    name: 'Topstep',
    total: { amount: '6464.00', currency: 'USD' },
    payout_count: 2,
    mix: { rise: 0, chain: 0, discord: 100 },
    evidence: 'DISCORD_BOT',
  });
  assert.equal(firm.verified, false);
  assert.equal(firm.unverified, true);
  assert.equal(firm.source, 'Discord');
  assert.equal(isFirmVerified({ mix: { discord: 100 }, evidence: 'DISCORD_BOT' }), false);
});

test('Rise-majority firm is verified', () => {
  const firm = normalizeFirm({
    id: 'tradeify-futures',
    name: 'Tradeify',
    total: { amount: '1612609.45', currency: 'USD' },
    payout_count: 1019,
    mix: { rise: 100, chain: 0, discord: 0 },
    evidence: null,
  });
  assert.equal(firm.verified, true);
  assert.equal(firm.color, '#cea992');
  assert.equal(firm.cameo, 'brett');
  assert.equal(toClientFirm(firm).value, 1612609.45);
});

test('never infers payout verified from provider label alone', () => {
  assert.equal(isPayoutVerified({ status: 'pending', source: 'RISE' }), false);
  assert.equal(isPayoutVerified({ source: 'RISE' }), false);
  assert.equal(isPayoutVerified({ status: 'verified', source: 'RISE' }), true);
  assert.equal(isPayoutVerified({ status: 'verified', source: 'DISCORD' }), false);
});

test('normalizes payout and inflow shapes from local /v1 samples', () => {
  const payout = normalizePayout({
    id: '0xabc:0x228d:1584.4:6',
    firm_id: 'myfundedfutures',
    firm_name: 'MyFundedFutures',
    amount: { amount: '1584.40', currency: 'USD' },
    status: 'verified',
    source: 'RISE',
    verified_at: '2026-09-14T21:55:16Z',
    proof_url: 'https://arbiscan.io/tx/0xabc',
    tx_ref: '0xabc',
    payee_tag: null,
  });
  assert.equal(payout.verified, true);
  assert.equal(payout.amount, '1584.40');
  assert.equal(payout.occurredAt, '2026-09-14T21:55:16Z');

  const inflow = normalizeInflow({
    id: 'dep:0x90d:0x228d:1300000.0:1',
    firm_id: 'myfundedfutures',
    amount: { amount: '1300000.00', currency: 'USD' },
    at: '2026-09-14T20:09:28Z',
    direction: 'in',
    token: 'RiseUSD',
  });
  assert.equal(inflow.amountVisual, 1300000);
  assert.equal(inflow.token, 'RiseUSD');
});
