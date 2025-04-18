import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

const prisma = new PrismaClient();
const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Gym endpoint
const getGymHandler: RequestHandler<{ qrIdentifier: string }> = async (req, res, next) => {
  try {
    const { qrIdentifier } = req.params;
    
    const gym = await prisma.gym.findUnique({
      where: { qrIdentifier },
      include: { passes: true }
    });

    if (!gym) {
      res.status(404).json({ error: 'Gym not found' });
      return;
    }

    res.json(gym);
  } catch (error) {
    console.error('Error fetching gym:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Purchase pass endpoint
const purchasePassHandler: RequestHandler = async (req, res) => {
  try {
    const { passId } = req.body;

    if (!passId) {
      res.status(400).json({ error: 'Pass ID is required' });
      return;
    }

    // Find the pass type
    const passType = await prisma.passType.findUnique({
      where: { id: passId },
      include: { gym: true }
    });

    if (!passType) {
      res.status(404).json({ error: 'Pass type not found' });
      return;
    }

    // Create a pending purchased pass
    const purchasedPass = await prisma.purchasedPass.create({
      data: {
        passTypeId: passId,
        expiryDate: new Date(Date.now() + passType.duration * 24 * 60 * 60 * 1000),
        paymentStatus: 'pending',
        qrCodeValue: randomUUID(),
        isActive: false
      }
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(Number(passType.price) * 100), // Convert to paise
      currency: 'INR', // Razorpay primarily uses INR
      receipt: purchasedPass.id,
      notes: {
        purchasedPassId: purchasedPass.id,
        gymName: passType.gym.name,
        passName: passType.name
      }
    });

    // Update the purchased pass with the order ID
    await prisma.purchasedPass.update({
      where: { id: purchasedPass.id },
      data: { paymentIntentId: order.id }
    });

    res.json({
      passId: purchasedPass.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error purchasing pass:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Razorpay webhook handler
const razorpayWebhookHandler: RequestHandler = async (req, res) => {
  try {
    // Verify webhook signature
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '');
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest !== req.headers['x-razorpay-signature']) {
      console.error('Invalid webhook signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const { event, payload } = req.body;
    console.log('Webhook received:', event, payload);

    if (event === 'payment.captured') {
      const { payment } = payload;
      const orderId = payment.entity.order_id;
      
      // Update the purchased pass
      await prisma.purchasedPass.update({
        where: { paymentIntentId: orderId },
        data: {
          paymentStatus: 'succeeded',
          isActive: true
        }
      });
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

// Pass status endpoint
const getPassStatusHandler: RequestHandler<{ passId: string }> = async (req, res) => {
  try {
    const { passId } = req.params;

    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: passId }
    });

    if (!purchasedPass) {
      res.status(404).json({ error: 'Pass not found' });
      return;
    }

    res.json({
      status: purchasedPass.paymentStatus,
      qrCodeValue: purchasedPass.paymentStatus === 'succeeded' ? purchasedPass.qrCodeValue : undefined
    });
  } catch (error) {
    console.error('Error getting pass status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Payment confirmation handler
const confirmPaymentHandler: RequestHandler = async (req, res): Promise<void> => {
    const { passId, paymentId } = req.body;

    if (!passId || !paymentId) {
        res.status(400).json({
            error: 'Missing required fields: passId and paymentId'
        });
        return;
    }

    try {
        // Find the purchased pass
        const purchasedPass = await prisma.purchasedPass.findUnique({
            where: { id: passId },
            include: { passType: true }
        });

        if (!purchasedPass) {
            res.status(404).json({
                error: 'Pass not found'
            });
            return;
        }

        // Generate a unique QR code value if not already set
        const qrCodeValue = purchasedPass.qrCodeValue || randomUUID();
        
        // Calculate expiry date based on pass duration
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + purchasedPass.passType.duration);

        // Update the pass with payment details
        await prisma.purchasedPass.update({
            where: { id: passId },
            data: {
                paymentStatus: 'succeeded',
                paymentIntentId: paymentId,
                qrCodeValue,
                expiryDate,
                isActive: true
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            error: 'Failed to confirm payment'
        });
    }
};

// Get active passes endpoint
const getActivePassesHandler: RequestHandler = async (req, res) => {
  try {
    const activePasses = await prisma.purchasedPass.findMany({
      where: {
        isActive: true,
        paymentStatus: 'succeeded',
        expiryDate: {
          gt: new Date() // Only return passes that haven't expired
        }
      },
      include: {
        passType: {
          select: {
            name: true,
            duration: true
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    res.json(activePasses);
  } catch (error) {
    console.error('Error fetching active passes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

app.get('/api/gym/:qrIdentifier', getGymHandler);
app.post('/api/passes/purchase', purchasePassHandler);
app.post('/api/payments/confirm', confirmPaymentHandler);
app.post('/api/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);
app.get('/api/passes/:passId/status', getPassStatusHandler);
app.get('/api/passes/active', getActivePassesHandler); 

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
}); 