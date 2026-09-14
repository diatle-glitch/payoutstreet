import { unwrapEnvelope } from './normalize.js';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export class UpstreamError extends Error {
  constructor(message, { status = 502, code = 'upstream_error', retryAfter = null, body = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
    this.body = body;
  }
}

export function createOttClient({ base, key, timeoutMs = 8000, fetchImpl = fetch }) {
  const trimmed = String(base || '').replace(/\/+$/, '');

  async function request(path, { query, signal } = {}) {
    if (!trimmed) {
      throw new UpstreamError('ONTATAPE_API_BASE is not set', { status: 503, code: 'upstream_unconfigured' });
    }
    const url = new URL(trimmed + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v != null && v !== '') url.searchParams.set(k, String(v));
      }
    }
    const headers = { Accept: 'application/json' };
    if (key) {
      headers.Authorization = `Bearer ${key}`;
      headers['X-Api-Key'] = key;
    }

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const onAbort = () => ctrl.abort();
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      try {
        const res = await fetchImpl(url, { headers, signal: ctrl.signal });
        const retryAfter = res.headers.get('retry-after');
        const text = await res.text();
        let json = null;
        if (text) {
          try {
            json = JSON.parse(text);
          } catch {
            json = null;
          }
        }
        if (res.status === 401 || res.status === 403) {
          throw new UpstreamError('Upstream authentication failed', { status: 502, code: 'upstream_auth' });
        }
        if (RETRYABLE.has(res.status) && attempt < 2) {
          const wait = retryAfter && /^\d+$/.test(retryAfter)
            ? Number(retryAfter) * 1000
            : 250 * 2 ** attempt;
          await sleep(wait);
          lastErr = new UpstreamError(`Upstream ${res.status}`, { status: res.status, retryAfter });
          continue;
        }
        if (!res.ok) {
          throw new UpstreamError(`Upstream ${res.status}`, {
            status: res.status === 404 ? 404 : 502,
            code: res.status === 404 ? 'upstream_missing' : 'upstream_error',
            retryAfter,
            body: json,
          });
        }
        if (!json) throw new UpstreamError('Upstream returned a non-JSON body', { code: 'invalid_response' });
        return unwrapEnvelope(json);
      } catch (err) {
        if (err instanceof UpstreamError) {
          if (RETRYABLE.has(err.status) && attempt < 2) {
            lastErr = err;
            await sleep(250 * 2 ** attempt);
            continue;
          }
          throw err;
        }
        if (err.name === 'AbortError') {
          lastErr = new UpstreamError('Upstream timeout', { status: 504, code: 'upstream_timeout' });
        } else {
          lastErr = new UpstreamError(err.message || 'Upstream unreachable', { status: 503, code: 'upstream_unreachable' });
        }
        if (attempt < 2) {
          await sleep(250 * 2 ** attempt);
          continue;
        }
        throw lastErr;
      } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
      }
    }
    throw lastErr;
  }

  return {
    base: trimmed,
    configured: Boolean(trimmed),
    request,
    firms: (window, { limit = 8, sort = '-total', cursor } = {}) =>
      request('/v1/firms', { query: { window, limit, sort, cursor } }),
    stats: (window) => request('/v1/stats', { query: { window } }),
    firm: (id, window) => request(`/v1/firms/${encodeURIComponent(id)}`, { query: { window } }),
    firmPayouts: (id, { window, limit, cursor } = {}) =>
      request(`/v1/firms/${encodeURIComponent(id)}/payouts`, { query: { window, limit, cursor } }),
    cash: (id) => request(`/v1/firms/${encodeURIComponent(id)}/cash-on-hand`),
    payouts: ({ limit = 30, updated_since, cursor } = {}) =>
      request('/v1/payouts', { query: { limit, updated_since, cursor } }),
    inflows: ({ limit = 30, updated_since, cursor } = {}) =>
      request('/v1/inflows', { query: { limit, updated_since, cursor } }),
    streamInfo: () => request('/v1/stream'),
  };
}
