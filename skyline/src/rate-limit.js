export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const bucket = hits.get(ip) || { count: 0, start: now };
    if (now - bucket.start > windowMs) {
      bucket.count = 0;
      bucket.start = now;
    }
    bucket.count += 1;
    hits.set(ip, bucket);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      const retry = Math.ceil((bucket.start + windowMs - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      res.status(429).json({
        error: 'rate_limited',
        message: 'Too many requests',
        retry_after: retry,
      });
      return;
    }
    next();
  };
}
