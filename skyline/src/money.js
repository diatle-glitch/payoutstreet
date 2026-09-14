/**
 * Decimal money helpers. Ledger math never uses IEEE floats.
 * Partner API money: { amount: "1234.56", currency: "USD" } — amount is a STRING.
 */

export const SCALE = 6n;
export const FACTOR = 10n ** SCALE;
export const MONEY_RE = /^-?\d+(?:\.\d+)?$/;

export class MoneyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function extractAmountField(value) {
  if (value == null) return null;
  if (typeof value === 'object' && value.amount != null) return value;
  return { amount: value, currency: 'USD' };
}

export function parseDecimalString(raw) {
  if (raw == null || raw === '') return null;
  const text = String(raw).trim();
  if (!MONEY_RE.test(text)) return null;
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, frac = ''] = unsigned.split('.');
  if (frac.length > Number(SCALE)) return null;
  const fracPadded = (frac + '000000').slice(0, Number(SCALE));
  const units = BigInt(whole) * FACTOR + BigInt(fracPadded || '0');
  return negative ? -units : units;
}

export function parseMoney(value, fallbackCurrency = 'USD') {
  const field = extractAmountField(value);
  if (!field) return null;
  const units = parseDecimalString(field.amount);
  if (units == null) return null;
  return {
    units,
    currency: field.currency || fallbackCurrency,
  };
}

export function requireMoney(value, label = 'amount') {
  const parsed = parseMoney(value);
  if (!parsed) throw new MoneyError(`Invalid ${label}`);
  if (parsed.units <= 0n) throw new MoneyError(`${label} must be positive`);
  return parsed;
}

export function addUnits(a, b) {
  return a + b;
}

export function compareUnits(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

export function formatDecimal(units, fractionDigits = 2) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / FACTOR;
  const frac = (abs % FACTOR).toString().padStart(Number(SCALE), '0');
  const trimmed = frac.slice(0, fractionDigits);
  const sign = negative ? '-' : '';
  return `${sign}${whole.toString()}.${trimmed}`;
}

export function moneyObject(units, currency = 'USD') {
  return { amount: formatDecimal(units), currency };
}

/** Visuals / canvas only. Do not use for ledger totals. */
export function toVisualNumber(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = Number(abs / FACTOR);
  const frac = Number(abs % FACTOR) / Number(FACTOR);
  const n = whole + frac;
  return negative ? -n : n;
}

export function sumMoneyFields(items, pick) {
  let units = 0n;
  let currency = 'USD';
  for (const item of items) {
    const parsed = parseMoney(pick(item));
    if (!parsed) continue;
    units += parsed.units;
    currency = parsed.currency;
  }
  return { units, currency };
}
