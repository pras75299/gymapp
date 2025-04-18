import express from 'express';
import { confirmPayment } from '../controllers/paymentController';

const router = express.Router();

router.post('/confirm', confirmPayment);

export default router; 