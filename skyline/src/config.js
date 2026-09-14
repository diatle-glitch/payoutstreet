const truthy = new Set(['1', 'true', 'yes', 'on']);

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return truthy.has(String(raw).toLowerCase());
}

function trimSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  return {
    port: Number(env.PORT) || 8080,
    nodeEnv,
    ottBase: trimSlash(env.ONTATAPE_API_BASE || ''),
    ottKey: env.ONTATAPE_API_KEY || env.API_V1_DEV_KEY || '',
    demoMode: bool('ENABLE_DEMO_MODE', false),
    publicBaseUrl: trimSlash(env.PUBLIC_BASE_URL || ''),
    allowedOrigins: (env.CORS_ORIGINS || env.PUBLIC_BASE_URL || 'http://localhost:8080,http://127.0.0.1:8080')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    accessToken: env.STAGING_ACCESS_TOKEN || '',
    pollMs: Number(env.PAYOUT_POLL_MS) || 12000,
    rankingRefreshMs: Number(env.RANKING_REFRESH_MS) || 60000,
    requestTimeoutMs: Number(env.UPSTREAM_TIMEOUT_MS) || 8000,
    fixtureOnly: bool('FORCE_FIXTURE_MODE', false),
    isProd,
  };
}
