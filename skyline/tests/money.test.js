import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addUnits,
  compareUnits,
  formatDecimal,
  parseMoney,
  toVisualNumber,
} from '../src/money.js';

test('parses Partner money strings without float drift', () => {
  const a = parseMoney({ amount: '0.10', currency: 'USD' });
  const b = parseMoney({ amount: '0.20', currency: 'USD' });
  const sum = addUnits(a.units, b.units);
  assert.equal(formatDecimal(sum), '0.30');
  assert.equal(formatDecimal(parseMoney('1234.56').units), '1234.56');
});

test('rejects malformed amounts', () => {
  assert.equal(parseMoney('12.3456789'), null);
  assert.equal(parseMoney('1e2'), null);
  assert.equal(parseMoney({ amount: 'n/a' }), null);
});

test('visual number is a display conversion only', () => {
  const m = parseMoney('75000.00');
  assert.equal(toVisualNumber(m.units), 75000);
  assert.ok(compareUnits(m.units, parseMoney('74999.99').units) > 0);
});
