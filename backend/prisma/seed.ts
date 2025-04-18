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
    const passTypesData = [
        {
            name: "1 Day Pass",
            duration: 1,
            price: new Decimal(10.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "7 Day Pass",
            duration: 7,
            price: new Decimal(50.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "15 Day Pass",
            duration: 15,
            price: new Decimal(150.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "30 Day Pass",
            duration: 30,
            price: new Decimal(150.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "90 Day Pass",
            duration: 90,
            price: new Decimal(150.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "180 Day Pass",
            duration: 180,
            price: new Decimal(150.00),
            currency: "INR",
            gymId: veersGym.id,
        },
        {
            name: "365 Day Pass",
            duration: 365,
            price: new Decimal(150.00),
            currency: "INR",
            gymId: veersGym.id,
        },
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
