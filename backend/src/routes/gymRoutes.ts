// src/routes/gymRoutes.ts
import express, { RequestHandler } from 'express';
import { getGymDetails } from '../controllers/gymController';

const router = express.Router();

// GET /api/gym/:qrIdentifier - Fetch gym details and passes by QR code identifier
router.get('/:qrIdentifier', getGymDetails as RequestHandler);

export default router; 