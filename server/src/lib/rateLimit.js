/** A small in-memory limiter suitable for a single Node process. */
export function createRateLimiter({ windowMs = 60_000, max = 20 } = {}) {
  const clients = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = clients.get(key);
    const entry = !current || now >= current.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    clients.set(key, entry);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many analyses. Please try again shortly.' });
    }

    return next();
  };
}
