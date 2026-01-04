import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// List of sensitive headers to exclude from logging
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'x-api-key', 'x-user-id'];

// Sanitize headers for logging
const sanitizeHeaders = (headers: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Sanitize body for logging (exclude sensitive fields)
const sanitizeBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'paymentId', 'paymentIntentId', 'keySecret'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request (without sensitive data)
  logger.info('Incoming request:', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers as Record<string, unknown>),
    body: sanitizeBody(req.body),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};

