import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    // Clean existing data (optional, good for development)
    await prisma.purchasedPass.deleteMany();
    await prisma.passType.deleteMany();
    await prisma.gym.deleteMany();

    // Create Veer's Gym
    const veersGym = await prisma.gym.create({
        data: {
            name: "Veer's Gym",
            location: "Downtown Fitness Hub",
            qrIdentifier: "veers-gym-main", // The unique identifier for the QR code
        },
    });
    console.log(`Created gym with id: ${veersGym.id}`);

    // Create Pass Types for Veer's Gym
    const baseDurations = [
        { duration: 1, regular: 10, pro: 25 },
        { duration: 7, regular: 50, pro: 120 },
        { duration: 15, regular: 150, pro: 320 },
        { duration: 30, regular: 250, pro: 550 },
        { duration: 90, regular: 600, pro: 1350 },
        { duration: 180, regular: 1100, pro: 2450 },
        { duration: 365, regular: 2000, pro: 4300 },
    ];

    const passTypesData = [
        ...baseDurations.map((item) => ({
            name: `${item.duration} Day Regular Pass`,
            duration: item.duration,
            tier: "REGULAR" as const,
            price: new Decimal(item.regular),
            currency: "INR",
            gymId: veersGym.id,
        })),
        ...baseDurations.map((item) => ({
            name: `${item.duration} Day Pro Membership`,
            duration: item.duration,
            tier: "PRO" as const,
            price: new Decimal(item.pro),
            currency: "INR",
            gymId: veersGym.id,
        })),
    ];

    for (const pt of passTypesData) {
        const passType = await prisma.passType.create({
            data: pt,
        });
        console.log(`Created pass type with id: ${passType.id}`);
    }

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
