import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../utils/errors';

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export const createRouteRateLimiter = (options: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    for (const [storeKey, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(storeKey);
      }
    }

    // Use Express-resolved IP only; avoid trusting raw x-forwarded-for directly.
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userSegment = req.userId || 'anonymous';
    const key = `${options.keyPrefix || req.path}:${userSegment}:${ip}`;

    const existing = rateLimitStore.get(key);
    if (!existing || existing.resetAt <= now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.maxRequests) {
      throw new TooManyRequestsError('Too many requests. Please try again shortly.');
    }

    next();
  };
};
