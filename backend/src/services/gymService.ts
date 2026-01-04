import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Finds a gym by its unique QR identifier and includes its available pass types.
 * @param qrIdentifier The unique string identifier from the gym's QR code.
 * @returns The gym object with its associated pass types, or null if not found.
 */
export const findGymByQrIdentifier = async (qrIdentifier: string) => {
    try {
        const gym = await prisma.gym.findUnique({
            where: { qrIdentifier },
            include: {
                passes: true, // Include the related PassType records
            },
        });

        return gym;
    } catch (error) {
        logger.error('Database error while fetching gym:', error);
        throw new Error('Failed to fetch gym details from database');
    }
}; 