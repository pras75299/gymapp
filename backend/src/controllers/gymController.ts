// src/controllers/gymController.ts
import { Request, Response } from 'express';
import { findGymByQrIdentifier } from '../services/gymService';
import { toGymResponse, createErrorResponse } from '../types/api';
import { logger } from '../utils/logger';

/**
 * Handles the request to get gym details by QR identifier.
 */
export const getGymDetails = async (req: Request, res: Response) => {
    const { qrIdentifier } = req.params;

    if (!qrIdentifier) {
        return res.status(400).json({ message: 'QR Identifier is required' });
    }

    try {
        const gym = await findGymByQrIdentifier(qrIdentifier);
        
        if (!gym) {
            return res.status(404).json({ message: 'Gym not found for the provided QR identifier' });
        }

        // Ensure price is serialized correctly (Prisma Decimal -> string)
        const gymWithSerializedPasses = {
            ...gym,
            passes: gym.passes.map(pass => ({
                ...pass,
                price: pass.price.toString(),
            })),
        };

        res.json(gymWithSerializedPasses);
    } catch (error) {
        console.error(`Error fetching gym details for ${qrIdentifier}:`, error);
        res.status(500).json({ message: 'Internal server error while fetching gym details' });
    }
};