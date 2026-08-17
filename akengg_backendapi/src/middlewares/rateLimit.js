// src/middlewares/rateLimit.js
// Lightweight in-memory, fixed-window rate limiter keyed by client IP. No
// dependency. Suitable for a single API instance (the current setup); when you
// scale to multiple instances, swap the Map for a shared store (e.g. Redis).
// Primarily guards public, unauthenticated POSTs (contact form, newsletter)
// against spam/abuse.
const AppError = require("../utils/appError");

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 10,
  message = "Too many requests. Please try again in a little while.",
} = {}) => {
  const hits = new Map(); // ip -> { count, resetAt }

  const sweep = (now) => {
    for (const [ip, rec] of hits) {
      if (rec.resetAt <= now) {
        hits.delete(ip);
      }
    }
  };

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket?.remoteAddress || "unknown";

    let rec = hits.get(ip);
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(ip, rec);
    }
    rec.count += 1;

    // Opportunistic cleanup so the map can't grow unbounded under churn.
    if (hits.size > 5000) {
      sweep(now);
    }

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - rec.count));

    if (rec.count > max) {
      res.setHeader("Retry-After", Math.ceil((rec.resetAt - now) / 1000));
      return next(new AppError(message, 429));
    }

    next();
  };
};

module.exports = { createRateLimiter };
