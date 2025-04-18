import { PrismaClient, Gym, PassType } from '@prisma/client';

// It's generally better to instantiate PrismaClient once and reuse it
// or use dependency injection. For simplicity in MVP, we might instantiate it here
// or pass it from the controller. Let's instantiate it here for now.
const prisma = new PrismaClient();

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
        console.error('Database error while fetching gym:', error);
        throw new Error('Failed to fetch gym details from database');
    }
}; 