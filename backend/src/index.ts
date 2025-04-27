import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { encodeQRData, decodeQRData, generateQRData } from './utils/qrUtils';

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
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  credentials: true
}));

// Add request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });
  next();
});

app.use(express.json());

// Define all handlers first
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

const purchasePassHandler: RequestHandler = async (req, res) => {
  try {
    const { passId } = req.body;
    const userId = req.headers['x-user-id'] as string;

    if (!passId) {
      res.status(400).json({ error: 'Pass ID is required' });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: 'User ID is required' });
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

    // Calculate expiry date
    const expiryDate = new Date(Date.now() + passType.duration * 24 * 60 * 60 * 1000);

    // Generate QR code value with backend URL
    const qrCodeValue = `https://gymapp-coral.vercel.app/api/validate?pass_id=${passId}`;
    console.log('Generated QR code URL for new pass:', qrCodeValue);

    // Create a pending purchased pass
    const purchasedPass = await prisma.purchasedPass.create({
      data: {
        passTypeId: passId,
        userId,
        purchaseDate: new Date(),
        expiryDate,
        paymentStatus: 'pending',
        isActive: false,
        amount: passType.price ? new Prisma.Decimal(passType.price.toString()) : null,
        currency: passType.currency,
        qrCodeValue
      } as unknown as Prisma.PurchasedPassCreateInput
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(Number(passType.price) * 100),
      currency: 'INR',
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

const getPassStatusHandler: RequestHandler<{ passId: string }> = async (req, res) => {
  try {
    const { passId } = req.params;
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'User ID is required' });
      return;
    }

    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: passId },
      include: { passType: true }
    });

    if (!purchasedPass) {
      res.status(404).json({ error: 'Pass not found' });
      return;
    }

    // Verify the pass belongs to the requesting user
    if (purchasedPass.userId !== userId) {
      res.status(403).json({ error: 'Unauthorized access to pass' });
      return;
    }

    res.json({
      status: purchasedPass.paymentStatus,
      qrCodeValue: purchasedPass.paymentStatus === 'succeeded' ? purchasedPass.qrCodeValue : undefined,
      passType: purchasedPass.passType,
      expiryDate: purchasedPass.expiryDate,
      isActive: purchasedPass.isActive
    });
  } catch (error) {
    console.error('Error getting pass status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

    // Generate new QR code value with backend URL
    const qrCodeValue = `https://gymapp-coral.vercel.app/api/validate?pass_id=${purchasedPass.id}`;
    console.log('Generated QR code URL for confirmed pass:', qrCodeValue);

    // Update the pass with payment details
    await prisma.purchasedPass.update({
      where: { id: passId },
      data: {
        paymentStatus: 'succeeded',
        paymentIntentId: paymentId,
        isActive: true,
        qrCodeValue
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

const getActivePassesHandler: RequestHandler = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      res.status(401).json({ error: 'User ID is required' });
      return;
    }

    const activePasses = await prisma.purchasedPass.findMany({
      where: {
        userId,
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

const validateQrCodeHandler: RequestHandler = async (req, res) => {
  try {
    const { pass_id } = req.query;
    console.log('Validating pass:', pass_id);

    if (!pass_id || typeof pass_id !== 'string') {
      console.log('Invalid pass ID format:', pass_id);
      res.status(400).json({
        valid: false,
        error: 'Invalid pass ID format',
        details: null
      });
      return;
    }

    // Find the purchased pass
    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: pass_id },
      include: {
        passType: true
      }
    });

    if (!purchasedPass) {
      console.log('Pass not found:', pass_id);
      res.status(404).json({
        valid: false,
        error: 'Pass not found',
        details: null
      });
      return;
    }

    // Check if pass is active and not expired
    const now = new Date();
    const expiryDate = new Date(purchasedPass.expiryDate);
    const isValid = purchasedPass.isActive &&
      purchasedPass.paymentStatus === 'succeeded' &&
      expiryDate > now;

    // Calculate remaining time
    const remainingHours = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
    const remainingMinutes = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60)));

    console.log('Pass validation result:', {
      passId: pass_id,
      isValid,
      remainingHours,
      status: purchasedPass.paymentStatus
    });

    res.json({
      valid: isValid,
      error: isValid ? null : 'Pass is invalid or expired',
      details: isValid ? {
        passType: purchasedPass.passType.name,
        purchaseDate: purchasedPass.purchaseDate,
        expiryDate: purchasedPass.expiryDate,
        remainingHours,
        remainingMinutes,
        amount: (purchasedPass as any).amount,
        currency: (purchasedPass as any).currency,
        status: purchasedPass.paymentStatus,
        userId: purchasedPass.userId
      } : null
    });
  } catch (error) {
    console.error('Error validating QR code:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error',
      details: null
    });
  }
};

// Add rate limiting middleware
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const limit = 10; // 10 requests
  const windowMs = 60000; // 1 minute

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
  } else {
    const data = rateLimit.get(ip)!;
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + windowMs;
    } else if (data.count >= limit) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    } else {
      data.count++;
    }
  }

  next();
};

// Upsert user endpoint
const upsertUserHandler: RequestHandler = async (req, res) => {
  console.log('Received upsert user request:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body
  });

  try {
    const { id, email, name, phoneNumber } = req.body;
    console.log('Upserting user with data:', { id, email, name, phoneNumber });

    if (!id) {
      console.log('Missing user ID in request');
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { id },
      update: {
        email: email || undefined,
        name: name || undefined,
        phoneNumber: phoneNumber || undefined,
        updatedAt: new Date()
      },
      create: {
        id,
        email: email || null,
        name: name || null,
        phoneNumber: phoneNumber || null
      }
    });

    console.log('Successfully upserted user:', user);
    res.json(user);
  } catch (error) {
    console.error('Error upserting user:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mount all routes after handlers are defined
app.get('/', (req, res) => {
  res.json({ message: 'Hello, world!' });
});

app.get('/api/gym/:qrIdentifier', getGymHandler);
app.post('/api/passes/purchase', purchasePassHandler);
app.post('/api/payments/confirm', confirmPaymentHandler);
app.post('/api/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);
app.get('/api/passes/:passId/status', getPassStatusHandler);
app.get('/api/passes/active', getActivePassesHandler);
app.get('/api/validate', rateLimitMiddleware, validateQrCodeHandler);
app.post('/api/users/me', upsertUserHandler);

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});