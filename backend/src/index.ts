import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { clerkMiddleware } from '@clerk/express';
import { MembershipTier, EntryTokenAction, PassOccupancyStatus, Prisma } from '@prisma/client';
import { prisma } from './utils/prisma';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth, requireStaff } from './middleware/auth';
import { createRouteRateLimiter } from './middleware/rateLimit';
import { validate, gymValidators, passValidators, userValidators } from './middleware/validators';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  InternalServerError,
} from './utils/errors';
import { logger } from './utils/logger';
import {
  createPurchasedPass,
  createRazorpayOrder,
  confirmPayment as confirmPaymentService,
  generateQRCodeValue,
} from './services/paymentService';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);
const isDevelopment = process.env.NODE_ENV === 'development';
const entryTokenSecret = process.env.ENTRY_TOKEN_SECRET;
if (!entryTokenSecret && !isDevelopment) {
  throw new Error('ENTRY_TOKEN_SECRET must be configured outside development');
}
const resolvedEntryTokenSecret = entryTokenSecret || 'dev-entry-token-secret';
const entryTokenTtlSeconds = parseInt(process.env.ENTRY_TOKEN_TTL_SECONDS || '45', 10);
const allowPublicValidation = process.env.ALLOW_PUBLIC_VALIDATION === 'true';
const validationRateLimiter = createRouteRateLimiter({
  windowMs: parseInt(process.env.VALIDATION_RATE_LIMIT_WINDOW_MS || '60000', 10),
  maxRequests: parseInt(process.env.VALIDATION_RATE_LIMIT_MAX_REQUESTS || '30', 10),
  keyPrefix: 'validation-routes',
});
if (!entryTokenSecret && isDevelopment) {
  logger.warn('ENTRY_TOKEN_SECRET is not configured. Using development fallback secret.');
}
if (allowPublicValidation) {
  logger.warn('ALLOW_PUBLIC_VALIDATION is enabled. Validation endpoints are public and less secure.');
}

type EntryTokenPayload = {
  passId: string;
  userId: string;
  gymId: string;
  tier: MembershipTier;
  iat: number;
  exp: number;
  jti: string;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signEntryToken(payload: EntryTokenPayload): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', resolvedEntryTokenSecret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifyEntryToken(token: string): EntryTokenPayload {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw new ValidationError('Invalid entry token format');
  }

  const expectedSignature = crypto
    .createHmac('sha256', resolvedEntryTokenSecret)
    .update(encodedPayload)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signaturesMatch =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!signaturesMatch) {
    throw new ValidationError('Invalid entry token signature');
  }

  let payload: EntryTokenPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload)) as EntryTokenPayload;
  } catch {
    throw new ValidationError('Invalid entry token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new ValidationError('Entry token expired');
  }

  return payload;
}

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost and local network IPs for development
        const allowedOrigins = [
          'http://localhost:8081',
          'http://localhost:8080',
          'http://192.168.1.17:8081',
          'http://192.168.1.17:8080',
        ];
        
        // Also allow any 192.168.x.x IP only in development
        if (process.env.NODE_ENV !== 'production' && /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) {
          return callback(null, true);
        }
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
// Note: express.json() is NOT applied globally to preserve raw body for webhook verification
// Only apply JSON parsing to routes that need it (via route-specific middleware)
app.use(clerkMiddleware());
app.use(requestLogger);

// Define all handlers
const getGymHandler: RequestHandler<{ qrIdentifier: string }> = async (req, res, next) => {
  try {
    const { qrIdentifier } = req.params;

    const gym = await prisma.gym.findUnique({
      where: { qrIdentifier },
      include: {
        passes: {
          orderBy: [
            { duration: 'asc' },
            { tier: 'asc' },
          ],
        },
      },
    });

    if (!gym) {
      throw new NotFoundError('Gym', qrIdentifier);
    }

    // Serialize Decimal prices to strings
    const gymWithSerializedPasses = {
      ...gym,
      passes: gym.passes.map((pass) => ({
        ...pass,
        price: pass.price.toString(),
      })),
    };

    res.json(gymWithSerializedPasses);
  } catch (error) {
    next(error);
  }
};

const purchasePassHandler: RequestHandler = async (req, res, next) => {
  try {
    const { passId, deviceId } = req.body;
    const userId = req.userId;
    
    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    // Create purchased pass
    const purchasedPass = await createPurchasedPass(passId, userId, deviceId);

    // Create Razorpay order
    const order = await createRazorpayOrder(passId, purchasedPass.id);

    // Update the purchased pass with the order ID
    await prisma.purchasedPass.update({
      where: { id: purchasedPass.id },
      data: { paymentIntentId: order.orderId },
    });

    res.json({
      passId: purchasedPass.id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
    });
  } catch (error) {
    next(error);
  }
};

const razorpayWebhookHandler: RequestHandler = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new InternalServerError('Webhook secret not configured');
    }

    // Verify webhook signature
    // req.body is a Buffer when using express.raw()
    const rawBody = req.body as Buffer;
    const shasum = crypto.createHmac('sha256', webhookSecret);
    shasum.update(rawBody);
    const digest = shasum.digest('hex');
    
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      logger.error('Missing webhook signature header');
      throw new ValidationError('Missing webhook signature');
    }

    const digestBuffer = Buffer.from(digest, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const signaturesMatch =
      digestBuffer.length === signatureBuffer.length &&
      crypto.timingSafeEqual(digestBuffer, signatureBuffer);

    if (!signaturesMatch) {
      logger.error('Invalid webhook signature');
      throw new ValidationError('Invalid webhook signature');
    }

    // Parse the body for processing (after signature verification)
    const body = JSON.parse(rawBody.toString('utf-8'));

    const { event, payload } = body;
    logger.info('Webhook received:', { event, payloadId: payload?.payment?.entity?.id });

    if (event === 'payment.captured') {
      const { payment } = payload;
      const orderId = payment.entity.order_id;

      // Find and update the purchased pass
      const purchasedPass = await prisma.purchasedPass.findUnique({
        where: { paymentIntentId: orderId },
        include: { passType: true },
      });

      if (purchasedPass) {
        // Generate QR code value
        const qrCodeValue = generateQRCodeValue(purchasedPass.id);

        await prisma.purchasedPass.update({
          where: { paymentIntentId: orderId },
          data: {
            paymentStatus: 'succeeded',
            isActive: true,
            qrCodeValue,
          },
        });

        logger.info('Payment webhook processed successfully:', { orderId, passId: purchasedPass.id });
      } else {
        logger.warn('Purchased pass not found for order:', orderId);
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
};

const getPassStatusHandler: RequestHandler<{ passId: string }> = async (req, res, next) => {
  try {
    const { passId } = req.params;
    const userId = req.userId;
    
    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: passId },
      include: { passType: true },
    });

    if (!purchasedPass) {
      throw new NotFoundError('Purchased pass', passId);
    }

    // Verify the pass belongs to the requesting user
    if (purchasedPass.userId !== userId) {
      throw new ForbiddenError('Unauthorized access to pass');
    }

    res.json({
      status: purchasedPass.paymentStatus,
      qrCodeValue: purchasedPass.paymentStatus === 'succeeded' ? purchasedPass.qrCodeValue : undefined,
      passType: purchasedPass.passType,
      expiryDate: purchasedPass.expiryDate,
      isActive: purchasedPass.isActive,
    });
  } catch (error) {
    next(error);
  }
};

const confirmPaymentHandler: RequestHandler = async (req, res, next) => {
  try {
    const { passId, paymentId, deviceId } = req.body;
    const userId = req.userId;

    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    // Pass userId to service for ownership verification
    const result = await confirmPaymentService(passId, paymentId, userId, deviceId);

    res.json({
      success: true,
      pass: {
        id: result.id,
        qrCode: result.qrCodeValue,
        expiry: result.expiryDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getActivePassesHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const activePasses = await prisma.purchasedPass.findMany({
      where: {
        userId,
        isActive: true,
        paymentStatus: 'succeeded',
        expiryDate: {
          gt: new Date(), // Only return passes that haven't expired
        },
      },
      include: {
        passType: {
          select: {
            name: true,
            duration: true,
            tier: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    res.json(activePasses);
  } catch (error) {
    next(error);
  }
};

const getMembershipEntitlementHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const activeProPass = await prisma.purchasedPass.findFirst({
      where: {
        userId,
        isActive: true,
        paymentStatus: 'succeeded',
        expiryDate: { gt: new Date() },
        passType: { tier: MembershipTier.PRO },
      },
      include: {
        passType: {
          select: {
            id: true,
            name: true,
            duration: true,
            tier: true,
            currency: true,
            price: true,
          },
        },
      },
      orderBy: { expiryDate: 'desc' },
    });

    res.json({
      isPro: Boolean(activeProPass),
      activeProPass: activeProPass
        ? {
            id: activeProPass.id,
            expiryDate: activeProPass.expiryDate,
            passType: {
              ...activeProPass.passType,
              price: activeProPass.passType.price.toString(),
            },
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};

const createEntryTokenHandler: RequestHandler<{ passId: string }> = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { passId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: passId },
      include: { passType: true },
    });

    if (!purchasedPass) {
      throw new NotFoundError('Purchased pass', passId);
    }

    if (purchasedPass.userId !== userId) {
      throw new ForbiddenError('Unauthorized access to pass');
    }

    if (
      !purchasedPass.isActive ||
      purchasedPass.paymentStatus !== 'succeeded' ||
      purchasedPass.expiryDate <= new Date()
    ) {
      throw new ValidationError('Pass is not active for entry');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload: EntryTokenPayload = {
      passId: purchasedPass.id,
      userId: purchasedPass.userId,
      gymId: purchasedPass.passType.gymId,
      tier: purchasedPass.passType.tier,
      iat: now,
      exp: now + entryTokenTtlSeconds,
      jti: crypto.randomUUID(),
    };
    const token = signEntryToken(payload);

    res.json({
      token,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      ttlSeconds: entryTokenTtlSeconds,
      passId: purchasedPass.id,
    });
  } catch (error) {
    next(error);
  }
};

const validateEntryTokenHandler: RequestHandler = async (req, res, next) => {
  try {
    const { token, consume, action } = req.body as {
      token?: string;
      consume?: boolean;
      action?: 'entry' | 'exit';
    };
    if (!token || typeof token !== 'string') {
      throw new ValidationError('Entry token is required');
    }

    const payload = verifyEntryToken(token);

    const shouldConsume = consume === true;
    const scanAction: 'entry' | 'exit' = action === 'exit' ? 'exit' : 'entry';

    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: payload.passId },
      include: {
        passType: true,
        user: true,
      },
    });

    if (!purchasedPass) {
      throw new NotFoundError('Purchased pass', payload.passId);
    }

    const isValid =
      purchasedPass.userId === payload.userId &&
      purchasedPass.passType.gymId === payload.gymId &&
      purchasedPass.passType.tier === payload.tier &&
      purchasedPass.isActive &&
      purchasedPass.paymentStatus === 'succeeded' &&
      purchasedPass.expiryDate > new Date();

    if (!isValid) {
      throw new ValidationError('Entry token validation failed');
    }

    const now = new Date();
    const tokenExpiresAt = new Date(payload.exp * 1000);
    const consumedTokenAction = scanAction === 'entry' ? EntryTokenAction.ENTRY : EntryTokenAction.EXIT;

    const resolveOccupancy = async (currentStatus: PassOccupancyStatus): Promise<PassOccupancyStatus> => {
      if (scanAction === 'entry' && currentStatus === PassOccupancyStatus.INSIDE) {
        throw new ValidationError('Member is already marked as inside');
      }
      if (scanAction === 'exit' && currentStatus === PassOccupancyStatus.OUTSIDE) {
        throw new ValidationError('Member is already marked as outside');
      }
      return scanAction === 'entry' ? PassOccupancyStatus.INSIDE : PassOccupancyStatus.OUTSIDE;
    };

    let finalOccupancyStatus: PassOccupancyStatus;
    let currentOccupancyStatus: PassOccupancyStatus = PassOccupancyStatus.OUTSIDE;

    if (shouldConsume) {
      if (tokenExpiresAt <= now) {
        throw new ValidationError('Entry token expired');
      }

      let result: { currentStatus: PassOccupancyStatus; nextStatus: PassOccupancyStatus };
      try {
        result = await prisma.$transaction(async (tx) => {
          // Emulate TTL semantics by pruning expired replay keys before check.
          await tx.consumedEntryToken.deleteMany({
            where: {
              expiresAt: { lte: now },
            },
          });

          const alreadyUsed = await tx.consumedEntryToken.findUnique({
            where: { jti: payload.jti },
          });
          if (alreadyUsed) {
            throw new ValidationError('Entry token already used');
          }

          const occupancy = await tx.passOccupancy.findUnique({
            where: { passId: payload.passId },
          });
          const currentStatus = occupancy?.status ?? PassOccupancyStatus.OUTSIDE;
          const nextStatus = await resolveOccupancy(currentStatus);

          await tx.consumedEntryToken.create({
            data: {
              jti: payload.jti,
              passId: payload.passId,
              userId: payload.userId,
              action: consumedTokenAction,
              expiresAt: tokenExpiresAt,
            },
          });

          await tx.passOccupancy.upsert({
            where: { passId: payload.passId },
            create: {
              passId: payload.passId,
              status: nextStatus,
              lastActionAt: now,
            },
            update: {
              status: nextStatus,
              lastActionAt: now,
            },
          });

          return { currentStatus, nextStatus };
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ValidationError('Entry token already used');
        }
        throw error;
      }

      currentOccupancyStatus = result.currentStatus;
      finalOccupancyStatus = result.nextStatus;
    } else {
      const occupancy = await prisma.passOccupancy.findUnique({
        where: { passId: payload.passId },
      });
      currentOccupancyStatus = occupancy?.status ?? PassOccupancyStatus.OUTSIDE;
      finalOccupancyStatus = await resolveOccupancy(currentOccupancyStatus);
    }

    res.json({
      valid: true,
      consumed: shouldConsume,
      action: scanAction,
      occupancy: shouldConsume
        ? finalOccupancyStatus.toLowerCase()
        : currentOccupancyStatus.toLowerCase(),
      pass: {
        id: purchasedPass.id,
        type: purchasedPass.passType.name,
        tier: purchasedPass.passType.tier,
        expiryDate: purchasedPass.expiryDate,
      },
      member: allowPublicValidation
        ? undefined
        : {
            id: purchasedPass.user.id,
            name: purchasedPass.user.name,
            email: purchasedPass.user.email,
            phoneNumber: purchasedPass.user.phoneNumber,
          },
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

const validateQrCodeHandler: RequestHandler = async (req, res, next) => {
  try {
    const { pass_id } = req.query;

    if (!pass_id || typeof pass_id !== 'string') {
      throw new ValidationError('Invalid pass ID format');
    }

    // Find the purchased pass
    const purchasedPass = await prisma.purchasedPass.findUnique({
      where: { id: pass_id },
      include: {
        passType: true,
      },
    });

    if (!purchasedPass) {
      throw new NotFoundError('Purchased pass', pass_id);
    }

    // Check if pass is active and not expired
    const now = new Date();
    const expiryDate = new Date(purchasedPass.expiryDate);
    const isValid =
      purchasedPass.isActive &&
      purchasedPass.paymentStatus === 'succeeded' &&
      expiryDate > now;

    logger.info('Pass validation result:', {
      passId: pass_id,
      isValid,
      status: purchasedPass.paymentStatus,
    });

    res.json({
      valid: isValid,
      error: isValid ? null : 'Pass is invalid or expired',
      passId: purchasedPass.id,
      expiryDate: purchasedPass.expiryDate,
      details: allowPublicValidation
        ? {
            passType: purchasedPass.passType.name,
            purchaseDate: purchasedPass.purchaseDate,
            amount: purchasedPass.amount?.toString() || null,
            currency: purchasedPass.currency,
            status: purchasedPass.paymentStatus,
          }
        : undefined,
    });
  } catch (error) {
    next(error);
  }
};

const upsertUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const { email, name, phoneNumber } = req.body;
    const authenticatedUserId = req.userId;

    if (!authenticatedUserId) {
      throw new UnauthorizedError('User ID is required');
    }

    const user = await prisma.user.upsert({
      where: { id: authenticatedUserId },
      update: {
        email: email || undefined,
        name: name || undefined,
        phoneNumber: phoneNumber || undefined,
        updatedAt: new Date(),
      },
      create: {
        id: authenticatedUserId,
        email: email || null,
        name: name || null,
        phoneNumber: phoneNumber || null,
      },
    });

    logger.info('User upserted successfully:', { userId: user.id });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// Webhook route (raw body for signature verification)
// IMPORTANT: This route must be defined BEFORE express.json() middleware
// to preserve the raw body for HMAC signature verification
app.post('/api/webhook', express.raw({ type: 'application/json' }), razorpayWebhookHandler);

// Apply JSON parsing middleware to all other routes (after webhook route)
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'GymLogic API', status: 'healthy', timestamp: new Date().toISOString() });
});

// Public route
app.get('/api/gym/:qrIdentifier', validate(gymValidators.getGymDetails), getGymHandler);
const validationAccessMiddlewares: RequestHandler[] = allowPublicValidation
  ? []
  : [requireAuth, requireStaff];
app.get(
  '/api/validate',
  ...validationAccessMiddlewares,
  validationRateLimiter,
  validate(passValidators.validateQR),
  validateQrCodeHandler
);
app.post(
  '/api/validate-entry',
  ...validationAccessMiddlewares,
  validationRateLimiter,
  validate(passValidators.validateEntryToken),
  validateEntryTokenHandler
);

// Protected routes (require authentication)
// IMPORTANT: Specific routes must be defined before parameterized routes to prevent incorrect matching
app.post('/api/passes/purchase', requireAuth, validate(passValidators.purchase), purchasePassHandler);
app.post('/api/payments/confirm', requireAuth, validate(passValidators.confirmPayment), confirmPaymentHandler);
app.get('/api/passes/active', requireAuth, getActivePassesHandler); // Must be before /api/passes/:passId/status
app.post('/api/passes/:passId/entry-token', requireAuth, validate(passValidators.createEntryToken), createEntryTokenHandler);
app.get('/api/membership/entitlement', requireAuth, getMembershipEntitlementHandler);
app.get('/api/passes/:passId/status', requireAuth, validate(passValidators.getStatus), getPassStatusHandler);
app.post('/api/users/me', requireAuth, validate(userValidators.upsert), upsertUserHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});