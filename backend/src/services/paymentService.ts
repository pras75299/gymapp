import { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError, InternalServerError, ForbiddenError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

/**
 * Generate a unique QR code value for a purchased pass
 */
export function generateQRCodeValue(passId: string): string {
  const baseUrl = process.env.BACKEND_URL || 'https://gymapp-coral.vercel.app';
  return `${baseUrl}/api/validate?pass_id=${passId}`;
}

/**
 * Create a Razorpay order for a pass purchase
 */
export async function createRazorpayOrder(
  passTypeId: string,
  purchasedPassId: string
): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
  try {
    const passType = await prisma.passType.findUnique({
      where: { id: passTypeId },
      include: { gym: true },
    });

    if (!passType) {
      throw new NotFoundError('Pass type', passTypeId);
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(passType.price) * 100),
      currency: passType.currency,
      receipt: purchasedPassId,
      notes: {
        purchasedPassId,
        gymName: passType.gym.name,
        passName: passType.name,
      },
    });

    return {
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || '',
    };
  } catch (error) {
    logger.error('Error creating Razorpay order:', error);
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to create payment order');
  }
}

/**
 * Confirm payment and activate a purchased pass
 * @param passId - The ID of the purchased pass
 * @param paymentId - The payment ID from Razorpay
 * @param userId - The authenticated user ID (required for ownership verification)
 * @param deviceId - Optional device ID
 */
export async function confirmPayment(
  passId: string,
  paymentId: string,
  userId: string,
  deviceId?: string
): Promise<{
  id: string;
  qrCodeValue: string;
  expiryDate: Date;
}> {
  try {
    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: passId },
      include: { passType: true },
    });

    if (!purchasedPass) {
      throw new NotFoundError('Purchased pass', passId);
    }

    // Verify that the pass belongs to the authenticated user
    if (purchasedPass.userId !== userId) {
      logger.warn('Unauthorized payment confirmation attempt', {
        passId,
        requestedUserId: userId,
        actualUserId: purchasedPass.userId,
      });
      throw new ForbiddenError('You do not have permission to confirm payment for this pass');
    }

    if (!purchasedPass.paymentIntentId) {
      throw new ValidationError('No payment order found for this pass');
    }

    const razorpayPayment = await razorpay.payments.fetch(paymentId);
    if (!razorpayPayment || razorpayPayment.order_id !== purchasedPass.paymentIntentId) {
      throw new ValidationError('Payment does not belong to this pass');
    }

    if (razorpayPayment.status !== 'captured') {
      throw new ValidationError('Payment is not captured');
    }

    // Generate QR code value
    const qrCodeValue = generateQRCodeValue(purchasedPass.id);

    // Calculate expiry date if not already set or if payment was just confirmed
    const expiryDate =
      purchasedPass.expiryDate ||
      new Date(Date.now() + purchasedPass.passType.duration * 24 * 60 * 60 * 1000);

    // Update the pass with payment details
    const updatedPass = await prisma.purchasedPass.update({
      where: { id: passId },
      data: {
        paymentStatus: 'succeeded',
        qrCodeValue,
        expiryDate,
        isActive: true,
        ...(deviceId && { deviceId }),
      },
    });

    logger.info('Payment confirmed successfully:', {
      passId: updatedPass.id,
      paymentId,
      userId,
    });

    return {
      id: updatedPass.id,
      qrCodeValue: updatedPass.qrCodeValue,
      expiryDate: updatedPass.expiryDate,
    };
  } catch (error) {
    logger.error('Error confirming payment:', error);
    // Re-throw known errors (NotFoundError, ForbiddenError) as-is
    if (error instanceof NotFoundError || error instanceof ForbiddenError || error instanceof ValidationError) {
      throw error;
    }
    throw new InternalServerError('Failed to confirm payment');
  }
}

/**
 * Create a pending purchased pass
 */
export async function createPurchasedPass(
  passTypeId: string,
  userId: string,
  deviceId?: string
): Promise<{
  id: string;
  qrCodeValue: string;
  expiryDate: Date;
}> {
  try {
    const passType = await prisma.passType.findUnique({
      where: { id: passTypeId },
    });

    if (!passType) {
      throw new NotFoundError('Pass type', passTypeId);
    }

    // Calculate expiry date
    const expiryDate = new Date(Date.now() + passType.duration * 24 * 60 * 60 * 1000);

    // Create a temporary ID to generate QR code
    // We'll use a placeholder that will be updated with the actual ID
    const tempId = 'temp-' + Date.now();

    // Generate QR code value
    const qrCodeValue = generateQRCodeValue(tempId);

    // Create a pending purchased pass
    const purchasedPass = await prisma.purchasedPass.create({
      data: {
        passTypeId,
        userId,
        deviceId: deviceId || null,
        purchaseDate: new Date(),
        expiryDate,
        paymentStatus: 'pending',
        isActive: false,
        amount: passType.price ? new Prisma.Decimal(passType.price.toString()) : null,
        currency: passType.currency,
        qrCodeValue: generateQRCodeValue('placeholder'), // Will be updated after creation
      },
    });

    // Update with correct QR code value using the actual ID
    const finalQrCodeValue = generateQRCodeValue(purchasedPass.id);
    const updatedPass = await prisma.purchasedPass.update({
      where: { id: purchasedPass.id },
      data: { qrCodeValue: finalQrCodeValue },
    });

    return {
      id: updatedPass.id,
      qrCodeValue: updatedPass.qrCodeValue,
      expiryDate: updatedPass.expiryDate,
    };
  } catch (error) {
    logger.error('Error creating purchased pass:', error);
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new InternalServerError('Failed to create purchased pass');
  }
}

