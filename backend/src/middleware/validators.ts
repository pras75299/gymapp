import { param, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types/api';

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

// Validation middleware
export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorResponse: ErrorResponse = {
                error: {
                    message: 'Validation failed',
                    details: errors.array().map(err => err.msg)
                }
            };
            res.status(400).json(errorResponse);
            return;
        }

        next();
    };
}; 