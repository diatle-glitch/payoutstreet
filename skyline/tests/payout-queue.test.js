import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { applyVerifiedPayout, EventDedupe, FirmSlots } from '../src/street-state.js';

const require = createRequire(import.meta.url);
require('../public/payout-engine.js');
const PayoutEngine = globalThis.PayoutEngine;

test('engine ignores duplicate payout ids and keeps accounting queue', () => {
  const engine = new PayoutEngine({ width: 1080 });
  const first = engine.enqueue([
    { id: 'p1', firm: 0, amount: 850 },
    { id: 'p1', firm: 0, amount: 850 },
    { id: 'p2', firm: 2, amount: 75000 },
  ]);
  assert.equal(first.length, 2);
  assert.equal(engine.pending.length, 2);
  assert.equal(first[1].tier, 4);
  const again = engine.enqueue([{ id: 'p2', firm: 2, amount: 75000 }]);
  assert.equal(again.length, 0);
});

test('dedupe set drops only after capacity, never the latest id', () => {
  const seen = new EventDedupe(3);
  assert.equal(seen.add('a'), true);
  assert.equal(seen.add('a'), false);
  seen.add('b');
  seen.add('c');
  seen.add('d');
  assert.equal(seen.has('a'), false);
  assert.equal(seen.has('d'), true);
});

test('verified payout updates slot totals; unverified does not', () => {
  const slots = [{ id: 'topstep', value: 1000, count: 1 }];
  const skip = applyVerifiedPayout(slots, { firmId: 'topstep', amount: 3000, verified: false });
  assert.equal(skip.applied, false);
  assert.equal(slots[0].value, 1000);
  const ok = applyVerifiedPayout(slots, { firmId: 'topstep', amount: 2450, verified: true });
  assert.equal(ok.applied, true);
  assert.equal(slots[0].value, 3450);
  assert.equal(slots[0].count, 2);
});

test('firmId map is rebuilt from sorted rankings without losing occupants', () => {
  const map = new FirmSlots();
  map.reset([
    { id: 'b', value: 10 },
    { id: 'a', value: 50 },
  ]);
  assert.deepEqual(map.map(), { a: 0, b: 1 });
  map.applySnapshot([
    { id: 'a', value: 60 },
    { id: 'c', value: 40 },
    { id: 'b', value: 5 },
  ]);
  assert.equal(map.indexOf('a'), 0);
  assert.equal(map.slots.some((f) => f.id === 'c'), true);
});
