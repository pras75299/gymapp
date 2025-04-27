import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { PurchasedPass } from '../types';

// Use the configured API URL or fallback to localhost
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:8080';

console.log(`[gymApi] Using API_URL: ${API_URL}`);

const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('[gymApi] Request failed:', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
            response: error.response?.data
        });
        return Promise.reject(error);
    }
);

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

export interface User {
    id: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
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

    purchasePass: async (passId: string, userId: string): Promise<RazorpayOrder> => {
        if (!API_URL) throw new Error('API URL not configured');
        if (!userId) throw new Error('User ID is required');
        
        console.log(`[gymApi] Purchasing pass: ${passId} at ${API_URL}/passes/purchase`);
        try {
            const response = await apiClient.post('/passes/purchase', 
                { passId },
                { headers: { 'x-user-id': userId } }
            );
            console.log(`[gymApi] Pass purchase initiated, status: ${response.status}`);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error purchasing pass:', error);
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

    getActivePasses: async (deviceId: string, userId: string): Promise<PurchasedPass[]> => {
        if (!API_URL) throw new Error('API URL not configured');
        try {
            const response = await apiClient.get(`/passes/active`, {
                params: { deviceId },
                headers: {
                    'x-user-id': userId
                }
            });
            console.log('[gymApi] Active passes response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error fetching active passes:', error);
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
                console.error('[gymApi] Axios error response:', error.response?.data);
            }
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
    },

    upsertUser: async (userData: User): Promise<User> => {
        if (!API_URL) throw new Error('API URL not configured');
        try {
            const response = await apiClient.post('/users/me', userData);
            console.log('[gymApi] User upserted:', response.data);
            return response.data;
        } catch (error) {
            console.error('[gymApi] Error upserting user:', error);
            if (axios.isAxiosError(error)) {
                console.error('[gymApi] Axios error status:', error.response?.status);
                console.error('[gymApi] Axios error message:', error.message);
                console.error('[gymApi] Axios error response:', error.response?.data);
            }
            throw new ApiError("Failed to upsert user");
        }
    }
};

export default gymApi;