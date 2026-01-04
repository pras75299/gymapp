import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error(`[${err.statusCode}] ${err.name}: ${err.message}`, err.details);
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details && typeof err.details === 'object' && err.details !== null ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Handle unexpected errors
  logger.error('Unexpected error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
    },
  });
};

