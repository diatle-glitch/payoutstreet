import { API_WINDOWS, UI_PERIODS, mapUiPeriod } from './normalize.js';

export const FIRM_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const CURSOR_RE = /^[A-Za-z0-9._:~-]{0,200}$/;

export function parseWindow(raw) {
  const value = String(raw || '24h');
  const allowed = new Set([...API_WINDOWS, ...UI_PERIODS.map((p) => p.id), '90d']);
  if (!allowed.has(value)) {
    const err = new Error('Unsupported window');
    err.status = 400;
    err.code = 'invalid_window';
    throw err;
  }
  const mapped = mapUiPeriod(value);
  if (!API_WINDOWS.includes(mapped.api)) {
    const err = new Error('Unsupported window');
    err.status = 400;
    err.code = 'invalid_window';
    throw err;
  }
  return mapped;
}

export function parseFirmId(raw) {
  const id = String(raw || '').trim();
  if (!FIRM_ID_RE.test(id)) {
    const err = new Error('Invalid firm id');
    err.status = 400;
    err.code = 'invalid_firm_id';
    throw err;
  }
  return id;
}

export function parseLimit(raw, fallback = 30, max = 100) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.floor(n));
}

export function parseCursor(raw) {
  if (raw == null || raw === '') return null;
  const cursor = String(raw);
  if (!CURSOR_RE.test(cursor)) {
    const err = new Error('Invalid cursor');
    err.status = 400;
    err.code = 'invalid_cursor';
    throw err;
  }
  return cursor;
}
