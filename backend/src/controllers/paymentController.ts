import { Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export const confirmPayment: RequestHandler = async (req, res): Promise<void> => {
    const { passId, paymentId, deviceId } = req.body;
    console.log('[PaymentController] Confirming payment:', { passId, paymentId, deviceId });

    if (!passId || !paymentId) {
        console.log('[PaymentController] Missing required fields');
        res.status(400).json({
            error: 'Missing required fields: passId and paymentId'
        });
        return;
    }

    try {
        // Find the purchased pass
        console.log('[PaymentController] Finding purchased pass:', passId);
        const purchasedPass = await prisma.purchasedPass.findUnique({
            where: { id: passId },
            include: { passType: true }
        });

        if (!purchasedPass) {
            console.log('[PaymentController] Pass not found:', passId);
            res.status(404).json({
                error: 'Pass not found'
            });
            return;
        }

        console.log('[PaymentController] Found pass:', {
            id: purchasedPass.id,
            status: purchasedPass.paymentStatus,
            passType: purchasedPass.passType.name,
            currentQR: purchasedPass.qrCodeValue
        });

        // Generate a unique QR code value
        const qrCodeValue = randomUUID();
        console.log('[PaymentController] Generated new QR code:', qrCodeValue);

        // Calculate expiry date based on pass duration
        const expiryDate = new Date(Date.now() + purchasedPass.passType.duration * 24 * 60 * 60 * 1000);
        console.log('[PaymentController] Calculated expiry date:', expiryDate);

        // Update the pass with payment details
        console.log('[PaymentController] Updating pass with new details:', {
            paymentStatus: 'succeeded',
            paymentIntentId: paymentId,
            qrCodeValue,
            deviceId,
            expiryDate,
            isActive: true
        });

        const updatedPass = await prisma.purchasedPass.update({
            where: { id: passId },
            data: {
                paymentStatus: 'succeeded',
                paymentIntentId: paymentId,
                qrCodeValue,
                deviceId,
                expiryDate,
                isActive: true
            }
        });

        console.log('[PaymentController] Pass updated successfully:', {
            id: updatedPass.id,
            status: updatedPass.paymentStatus,
            qrCode: updatedPass.qrCodeValue,
            expiry: updatedPass.expiryDate
        });

        res.status(200).json({
            success: true,
            pass: {
                id: updatedPass.id,
                qrCode: updatedPass.qrCodeValue,
                expiry: updatedPass.expiryDate
            }
        });
    } catch (error) {
        console.error('[PaymentController] Error confirming payment:', error);
        res.status(500).json({
            error: 'Failed to confirm payment'
        });
    }
}; 