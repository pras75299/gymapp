import { Gym, PassType } from '@prisma/client';

// Response types
export interface GymResponse {
    id: string;
    name: string;
    location: string | null;
    qrIdentifier: string;
    passes: PassTypeResponse[];
}

export interface PassTypeResponse {
    id: string;
    name: string;
    duration: number;
    price: number;
    currency: string;
}

export interface ErrorResponse {
    error: {
        message: string;
        details?: unknown;
    };
}

// Convert Prisma types to response types
export function toGymResponse(gym: Gym & { passes: PassType[] }): GymResponse {
    return {
        id: gym.id,
        name: gym.name,
        location: gym.location,
        qrIdentifier: gym.qrIdentifier,
        passes: gym.passes.map(pass => ({
            id: pass.id,
            name: pass.name,
            duration: pass.duration,
            price: Number(pass.price), // Convert Decimal to number
            currency: pass.currency
        }))
    };
}

export function createErrorResponse(message: string, details?: unknown): ErrorResponse {
    return {
        error: {
            message,
            details
        }
    };
} 