/**
 * Minimal in-memory rate limiter for hot endpoints (login, register, invite
 * accept). Works in a single server process. For multi-instance production
 * (Vercel scales to many), swap for Upstash Redis or similar.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type Options = { limit: number; windowMs: number };

export function rateLimit(key: string, opts: Options = { limit: 5, windowMs: 60_000 }): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterMs: opts.windowMs };
  }

  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { ok: true, remaining: opts.limit - bucket.count, retryAfterMs: bucket.resetAt - now };
}

export function clientKey(req: Request, prefix = "default"): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}`;
}
