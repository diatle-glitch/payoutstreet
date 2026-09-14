import express from 'express';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createOttClient, UpstreamError } from './ott-client.js';
import { createRateLimiter } from './rate-limit.js';
import { createSimulator } from './simulator.js';
import {
  getFixtureCash,
  getFixtureFirm,
  getFixtureFirmPayouts,
  getFixtureFirms,
  getFixtureInflows,
  getFixturePayouts,
  getFixtureStats,
  fixtureAsOf,
} from './fixtures.js';
import {
  normalizeCash,
  normalizeFirm,
  normalizeInflow,
  normalizePayout,
  normalizeStats,
  toClientFirm,
  toClientInflow,
  toClientPayout,
  UI_PERIODS,
} from './normalize.js';
import { parseCursor, parseFirmId, parseLimit, parseWindow } from './validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig();
const ott = createOttClient({
  base: config.ottBase,
  key: config.ottKey,
  timeoutMs: config.requestTimeoutMs,
});
const simulator = createSimulator();

const state = {
  mode: 'unknown',
  lastLiveOk: null,
  lastLiveError: null,
  lastAsOf: fixtureAsOf('24h'),
};

function publicLog(event, extra = {}) {
  const safe = { event, ...extra, t: new Date().toISOString() };
  delete safe.key;
  delete safe.authorization;
  delete safe.payee_tag;
  delete safe.payeeTag;
  console.log(JSON.stringify(safe));
}

async function probeUpstream() {
  if (config.fixtureOnly || !ott.configured) {
    state.mode = 'fixture';
    state.lastLiveError = ott.configured ? 'FORCE_FIXTURE_MODE' : 'ONTATAPE_API_BASE unset';
    return state;
  }
  try {
    const res = await ott.firms('24h', { limit: 1 });
    state.mode = 'live';
    state.lastLiveOk = new Date().toISOString();
    state.lastLiveError = null;
    state.lastAsOf = res.meta?.as_of || state.lastAsOf;
    return state;
  } catch (err) {
    state.mode = 'fixture';
    state.lastLiveError = err.code || err.message;
    return state;
  }
}

function sendEnvelope(res, { data, meta = {}, pagination = null, status = 200 }) {
  res.status(status).json({
    data,
    meta: {
      as_of: meta.as_of || state.lastAsOf,
      generated_at: new Date().toISOString(),
      request_id: meta.request_id || randomUUID(),
      mode: state.mode,
      ...meta,
    },
    pagination,
  });
}

function fail(res, err) {
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
  res.status(status).json({
    error: err.code || 'error',
    message: status === 500 ? 'Request failed' : err.message,
    mode: state.mode,
    as_of: state.lastAsOf,
  });
}

async function liveOrFixture(liveFn, fixtureFn) {
  if (simulator.blocked()) {
    throw new UpstreamError('Simulated disconnect', { status: 503, code: 'reconnecting' });
  }
  if (state.mode === 'live') {
    try {
      return { ...await liveFn(), mode: 'live' };
    } catch (err) {
      publicLog('upstream_fallback', { code: err.code, status: err.status });
      if (err.code === 'upstream_auth') throw err;
      const fallback = await fixtureFn();
      return { ...fallback, mode: 'fixture', stale: true, live_error: err.code };
    }
  }
  const fallback = await fixtureFn();
  return { ...fallback, mode: 'fixture' };
}

function mapList(items, normalize, toClient) {
  const out = [];
  const errors = [];
  for (const item of items || []) {
    try {
      out.push(toClient(normalize(item)));
    } catch (err) {
      errors.push(err.message);
    }
  }
  return { out, errors };
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; script-src 'self'");
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) {
    next();
    return;
  }
  if (config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Staging-Token');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

if (config.accessToken) {
  app.use((req, res, next) => {
    if (req.path === '/api/health' || req.path === '/robots.txt') return next();
    const header = req.headers['x-staging-token'] || '';
    const query = req.query.access || '';
    if (header === config.accessToken || query === config.accessToken) return next();
    res.status(401).json({ error: 'unauthorized', message: 'Staging token required' });
  });
}

app.use('/api', createRateLimiter({ windowMs: 60_000, max: 90 }));

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /\n');
});

app.get('/api/health', async (_req, res) => {
  await probeUpstream();
  res.json({
    ok: true,
    mode: state.mode,
    live: state.mode === 'live',
    fixture: state.mode === 'fixture',
    demoMode: config.demoMode,
    as_of: state.lastAsOf,
    upstream: {
      base: config.ottBase || null,
      configured: ott.configured,
      last_ok: state.lastLiveOk,
      last_error: state.lastLiveError,
    },
    windows: UI_PERIODS,
    poll_ms: config.pollMs,
    ranking_refresh_ms: config.rankingRefreshMs,
  });
});

app.get('/api/config', async (_req, res) => {
  await probeUpstream();
  sendEnvelope(res, {
    data: {
      demoMode: config.demoMode,
      mode: state.mode,
      windows: UI_PERIODS,
      pollMs: config.pollMs,
      rankingRefreshMs: config.rankingRefreshMs,
      sse: false,
    },
    meta: { as_of: state.lastAsOf },
  });
});

app.get('/api/rankings', async (req, res) => {
  try {
    const period = parseWindow(req.query.window || req.query.period);
    const limit = parseLimit(req.query.limit, 8, 8);
    const cursor = parseCursor(req.query.cursor);
    const result = await liveOrFixture(
      () => ott.firms(period.api, { limit, sort: '-total', cursor }),
      () => getFixtureFirms(period.api, { limit, cursor }),
    );
    const { out, errors } = mapList(result.data, normalizeFirm, toClientFirm);
    if (!out.length && errors.length) throw Object.assign(new Error('Invalid rankings payload'), { status: 502, code: 'invalid_response' });
    state.lastAsOf = result.meta?.as_of || state.lastAsOf;
    sendEnvelope(res, {
      data: out,
      meta: {
        ...result.meta,
        window: period.api,
        ui_period: period.id,
        mapping_note: period.note || null,
        mode: result.mode,
        stale: !!result.stale,
        live_error: result.live_error || null,
        dropped_rows: errors.length,
      },
      pagination: result.pagination,
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const period = parseWindow(req.query.window || req.query.period);
    const result = await liveOrFixture(
      () => ott.stats(period.api),
      () => getFixtureStats(period.api),
    );
    const stats = normalizeStats(result.data);
    sendEnvelope(res, {
      data: {
        totalPaid: stats.totalPaid,
        totalPaidVisual: stats.totalPaidVisual,
        payoutCount: stats.payoutCount,
        firmCount: stats.firmCount,
        window: period.api,
        ui_period: period.id,
      },
      meta: { ...result.meta, mode: result.mode, stale: !!result.stale, mapping_note: period.note || null },
    });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/firms/:id', async (req, res) => {
  try {
    const id = parseFirmId(req.params.id);
    const period = parseWindow(req.query.window || req.query.period);
    const result = await liveOrFixture(
      () => ott.firm(id, period.api),
      () => {
        const row = getFixtureFirm(id, period.api);
        if (!row) {
          const err = new Error('Firm not found');
          err.status = 404;
          err.code = 'not_found';
          throw err;
        }
        return row;
      },
    );
    const firm = toClientFirm(normalizeFirm(result.data));
    sendEnvelope(res, { data: firm, meta: { ...result.meta, mode: result.mode, window: period.api } });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/firms/:id/payouts', async (req, res) => {
  try {
    const id = parseFirmId(req.params.id);
    const period = parseWindow(req.query.window || req.query.period);
    const limit = parseLimit(req.query.limit, 20, 50);
    const cursor = parseCursor(req.query.cursor);
    const result = await liveOrFixture(
      () => ott.firmPayouts(id, { window: period.api, limit, cursor }),
      () => getFixtureFirmPayouts(id, { limit, cursor }),
    );
    const { out } = mapList(result.data, normalizePayout, toClientPayout);
    sendEnvelope(res, { data: out, meta: { ...result.meta, mode: result.mode }, pagination: result.pagination });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/firms/:id/cash-on-hand', async (req, res) => {
  try {
    const id = parseFirmId(req.params.id);
    const result = await liveOrFixture(
      () => ott.cash(id),
      () => {
        const row = getFixtureCash(id);
        if (!row) return { data: { firm_id: id, amount: null }, meta: { as_of: state.lastAsOf } };
        return row;
      },
    );
    sendEnvelope(res, { data: normalizeCash(result.data), meta: { ...result.meta, mode: result.mode } });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/payouts', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 30, 50);
    const cursor = parseCursor(req.query.cursor);
    const since = req.query.updated_since ? String(req.query.updated_since) : null;
    const result = await liveOrFixture(
      () => ott.payouts({ limit, cursor, updated_since: since }),
      () => getFixturePayouts({ limit, afterId: req.query.after_id }),
    );
    const extras = config.demoMode ? simulator.payouts() : [];
    const merged = [...extras, ...(result.data || [])];
    const { out } = mapList(merged, normalizePayout, toClientPayout);
    sendEnvelope(res, { data: out.slice(0, limit), meta: { ...result.meta, mode: result.mode, stale: !!result.stale } });
  } catch (err) {
    fail(res, err);
  }
});

app.get('/api/inflows', async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 30, 50);
    const cursor = parseCursor(req.query.cursor);
    const since = req.query.updated_since ? String(req.query.updated_since) : null;
    const result = await liveOrFixture(
      () => ott.inflows({ limit, cursor, updated_since: since }),
      () => getFixtureInflows({ limit, afterId: req.query.after_id }),
    );
    const extras = config.demoMode ? simulator.inflows() : [];
    const merged = [...extras, ...(result.data || [])];
    const { out } = mapList(merged, normalizeInflow, toClientInflow);
    sendEnvelope(res, { data: out.slice(0, limit), meta: { ...result.meta, mode: result.mode } });
  } catch (err) {
    fail(res, err);
  }
});

app.post('/api/simulate', (req, res) => {
  if (!config.demoMode) {
    res.status(403).json({ error: 'demo_disabled', message: 'ENABLE_DEMO_MODE is off' });
    return;
  }
  try {
    const scenario = String(req.body?.scenario || req.query.scenario || '');
    const result = simulator.run(scenario);
    sendEnvelope(res, { data: result, meta: { as_of: new Date().toISOString(), demo: true } });
  } catch (err) {
    fail(res, err);
  }
});

app.use(express.static(join(root, 'public'), {
  maxAge: config.isProd ? '1h' : 0,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  },
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.sendFile(join(root, 'public', 'index.html'));
});

await probeUpstream();
publicLog('boot', {
  mode: state.mode,
  demoMode: config.demoMode,
  upstream: ott.configured ? 'configured' : 'unset',
  port: config.port,
});

app.listen(config.port, '0.0.0.0', () => {
  publicLog('listen', { port: config.port });
});
