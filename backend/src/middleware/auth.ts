import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { UnauthorizedError } from '../utils/errors';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Middleware to require authenticated Clerk user and attach userId.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const { userId } = getAuth(req);
  if (!userId) {
    throw new UnauthorizedError('User ID is required');
  }

  // Attach userId to request object for use in handlers
  req.userId = userId;
  next();
};

