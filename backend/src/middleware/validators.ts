import { param, body, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';
import { ValidationError } from '../utils/errors';

// Validation rules
export const gymValidators = {
  getGymDetails: [
    param('qrIdentifier')
      .trim()
      .notEmpty()
      .withMessage('QR identifier is required')
      .isString()
      .withMessage('QR identifier must be a string')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('QR identifier contains invalid characters'),
  ],
};

export const passValidators = {
  purchase: [
    body('passId')
      .trim()
      .notEmpty()
      .withMessage('Pass ID is required')
      .isString()
      .withMessage('Pass ID must be a string'),
    body('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string'),
  ],
  confirmPayment: [
    body('passId')
      .trim()
      .notEmpty()
      .withMessage('Pass ID is required')
      .isString()
      .withMessage('Pass ID must be a string'),
    body('paymentId')
      .trim()
      .notEmpty()
      .withMessage('Payment ID is required')
      .isString()
      .withMessage('Payment ID must be a string'),
    body('deviceId')
      .optional()
      .isString()
      .withMessage('Device ID must be a string'),
  ],
  getStatus: [
    param('passId')
      .trim()
      .notEmpty()
      .withMessage('Pass ID is required')
      .isString()
      .withMessage('Pass ID must be a string'),
  ],
  validateQR: [
    query('pass_id')
      .notEmpty()
      .withMessage('Pass ID is required')
      .isString()
      .withMessage('Pass ID must be a string'),
  ],
};

export const userValidators = {
  upsert: [
    body('id')
      .trim()
      .notEmpty()
      .withMessage('User ID is required')
      .isString()
      .withMessage('User ID must be a string'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email must be a valid email address')
      .normalizeEmail(),
    body('name')
      .optional()
      .isString()
      .withMessage('Name must be a string')
      .trim(),
    body('phoneNumber')
      .optional()
      .isString()
      .withMessage('Phone number must be a string')
      .trim(),
  ],
};

// Validation middleware
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err) => err.msg);
      throw new ValidationError('Validation failed', errorMessages);
    }

    next();
  };
};
