import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PurchasedPass } from '../types';

// Read the API URL from Expo's configuration (app.config.js -> extra.apiUrl)
const API_URL = Constants.expoConfig?.extra?.apiUrl;

if (!API_URL) {
    console.error(
        '[gymApi] ERROR: API URL not configured. Please set extra.apiUrl in app.config.js'
    );
    // Optional: You could throw an error or provide a default, but warning is safer
}

console.log(`[gymApi] Using Configured API_URL: ${API_URL}`);

const apiClient = axios.create({
    baseURL: 'https://gymapp-coral.vercel.app/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Gym {
    id: string;
    name: string;
    location: string | null;
    qrIdentifier: string;
    passes: PassType[];
}

export interface PassType {
    id: string;
    gymId: string;
    name: string;
    duration: number;
    price: string;
    currency: string;
}

export interface RazorpayOrder {
    passId: string;
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
}

export interface PassStatus {
    status: 'pending' | 'succeeded' | 'failed';
    qrCodeValue?: string;
    passType?: {
        name: string;
    };
    expiryDate?: string;
}

export interface PurchaseResult {
    passId: string;
    clientSecret: string;
}

export class ApiError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiError";
    }
}

export const gymApi = {
    getGymByQrIdentifier: async (qrIdentifier: string): Promise<Gym> => {
        if (!API_URL) throw new Error('API URL not configured');
        console.log(`[gymApi] Fetching gym for QR: ${qrIdentifier} from ${API_URL}/gym/${qrIdentifier}`);
        try {
            const response = await apiClient.get(`/gym/${qrIdentifier}`);
            console.log(`[gymApi] Received response:`, response.data);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error fetching gym:', error);
            // Temporarily simplify error logging
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
            }
            throw new ApiError("Failed to fetch gym");
        }
    },

    purchasePass: async (passId: string): Promise<RazorpayOrder> => {
        if (!API_URL) throw new Error('API URL not configured');
        console.log(`[gymApi] Purchasing pass: ${passId} at ${API_URL}/passes/purchase`);
        try {
            const response = await apiClient.post('/passes/purchase', { passId });
            console.log(`[gymApi] Pass purchase initiated, status: ${response.status}`);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error purchasing pass:', error);
            // Temporarily simplify error logging
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
            }
            throw new ApiError("Failed to purchase pass");
        }
    },

    getPassStatus: async (passId: string): Promise<PassStatus> => {
        if (!API_URL) throw new Error('API URL not configured');
        console.log(`[gymApi] Fetching pass status for ID: ${passId} from ${API_URL}/passes/${passId}/status`);
        try {
            const response = await apiClient.get(`/passes/${passId}/status`);
            console.log(`[gymApi] Received pass status: ${response.status}`);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error fetching pass status:', error);
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
            }
            throw new ApiError("Failed to get pass status");
        }
    },

    confirmPayment: async (passId: string, paymentId: string): Promise<void> => {
        if (!API_URL) throw new Error('API URL not configured');
        console.log(`[gymApi] Confirming payment for pass: ${passId} with payment ID: ${paymentId}`);
        try {
            const response = await apiClient.post('/payments/confirm', { passId, paymentId });
            console.log('[gymApi] Payment confirmation response:', response.data);

            if (response.status !== 200) {
                throw new ApiError(`Unexpected status code: ${response.status}`);
            }

            // Check if the response indicates success
            if (!response.data || !response.data.success) {
                throw new ApiError('Payment confirmation failed');
            }

            console.log('[gymApi] Payment confirmed successfully');
        } catch (error) {
            console.error('[gymApi] Error confirming payment:', error);
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
                console.error('[gymApi] Axios error response:', error.response?.data);
                throw new ApiError(error.response?.data?.message || 'Failed to confirm payment');
            }
            throw new ApiError("Failed to confirm payment");
        }
    },

    getActivePasses: async (deviceId: string): Promise<PurchasedPass[]> => {
        if (!API_URL) throw new Error('API URL not configured');
        try {
            const response = await apiClient.get(`/passes/active`, {
                params: { deviceId }
            });
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error fetching active passes:', error);
            throw new ApiError("Failed to fetch active passes");
        }
    },

    validateQrCode: async (qrCodeValue: string) => {
        if (!API_URL) throw new Error('API URL not configured');
        try {
            console.log(`[gymApi] Validating QR code: ${qrCodeValue}`);
            const response = await apiClient.get(`/validate`, {
                params: { pass_id: qrCodeValue }
            });
            console.log('[gymApi] Validation response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error validating QR code:', error);
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
                console.error('[gymApi] Axios error response:', error.response?.data);
            }
            throw new ApiError("Failed to validate QR code");
        }
    }
};

export default gymApi;