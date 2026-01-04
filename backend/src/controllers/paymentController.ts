import { Request, Response, RequestHandler } from 'express';
import { prisma } from '../utils/prisma';
import { confirmPayment as confirmPaymentService } from '../services/paymentService';
import { logger } from '../utils/logger';
import { UnauthorizedError } from '../utils/errors';

/**
 * @deprecated This controller is kept for backward compatibility but the logic
 * has been moved to paymentService. The route in index.ts uses the service directly.
 */
export const confirmPayment: RequestHandler = async (req, res): Promise<void> => {
    try {
        const { passId, paymentId, deviceId } = req.body;
        const userId = req.userId;

        if (!userId) {
            throw new UnauthorizedError('User ID is required');
        }

        logger.info('[PaymentController] Confirming payment:', { passId, paymentId, deviceId, userId });

        // Pass userId to service for ownership verification
        const result = await confirmPaymentService(passId, paymentId, userId, deviceId);

        res.status(200).json({
            success: true,
            pass: {
                id: result.id,
                qrCode: result.qrCodeValue,
                expiry: result.expiryDate,
            },
        });
    } catch (error) {
        logger.error('[PaymentController] Error confirming payment:', error);
        throw error; // Let error handler middleware handle it
    }
}; 