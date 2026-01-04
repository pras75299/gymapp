import { Request, Response, NextFunction } from 'express';
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
 * Middleware to extract and validate user ID from headers
 * Note: This is a temporary solution. In production, use proper JWT/Clerk authentication
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new UnauthorizedError('User ID is required');
  }

  // Attach userId to request object for use in handlers
  req.userId = userId;
  next();
};

