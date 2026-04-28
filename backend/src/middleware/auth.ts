import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

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

const parseStaffUserIds = (): Set<string> => {
  const rawValue = process.env.STAFF_USER_IDS || '';
  const userIds = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return new Set(userIds);
};

export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.userId;
  if (!userId) {
    throw new UnauthorizedError('User ID is required');
  }

  const staffUserIds = parseStaffUserIds();
  if (!staffUserIds.has(userId)) {
    throw new ForbiddenError('Staff access is required');
  }

  next();
};

