import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { EntryTokenResponse, PassType, ProMembershipEntitlement, PurchasedPass } from '../types';
import { API_TIMEOUT, ERROR_MESSAGES } from '../constants/app';
import { logger } from '../utils/logger';

// Lazy-load API URL to prevent app crash at startup if not configured
// This allows the app to initialize even if API URL is temporarily unavailable
let cachedApiUrl: string | null = null;
let authTokenGetter: (() => Promise<string | null>) | null = null;

const getApiUrl = (): string => {
    // Return cached value if already validated
    if (cachedApiUrl) {
        return cachedApiUrl;
    }

    const apiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
    
    if (!apiUrl) {
        logger.error('API URL not configured. Please set EXPO_PUBLIC_API_URL or configure apiUrl in app.config.js');
        throw new Error(ERROR_MESSAGES.API_NOT_CONFIGURED);
    }
    
    // Validate URL format
    try {
        new URL(apiUrl);
    } catch {
        logger.error(`Invalid API URL format: ${apiUrl}`);
        throw new Error(ERROR_MESSAGES.API_NOT_CONFIGURED);
    }
    
    // Cache the validated URL
    cachedApiUrl = apiUrl;
    logger.info('API URL configured');
    return apiUrl;
};

// Create axios instance with lazy baseURL
// The baseURL will be set dynamically in request interceptor
const apiClient = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: API_TIMEOUT,
});

// Request interceptor for authentication and dynamic baseURL
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        // Set baseURL lazily when making requests
        // This allows the app to start even if API URL is not configured initially
        try {
            if (!config.baseURL) {
                config.baseURL = getApiUrl();
            }
        } catch (error) {
            logger.error('Failed to get API URL in request interceptor', error);
            // Don't throw here - let the individual API methods handle the error
        }

        // Attach Clerk token when available.
        if (authTokenGetter) {
            try {
                const token = await authTokenGetter();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (tokenError) {
                logger.warn('Failed to attach auth token', tokenError);
            }
        }
        return config;
    },
    (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor for better error handling
apiClient.interceptors.response.use(
    response => response,
    (error: AxiosError) => {
        const errorInfo = {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            message: error.message,
            response: error.response?.data
        };
        
        // Handle timeout errors for non-critical endpoints at warning level
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const isNonCriticalEndpoint = error.config?.url?.includes('/users/me');
        const isGymEndpoint = error.config?.url?.includes('/gym/');
        
        if (isTimeout && (isNonCriticalEndpoint || isGymEndpoint)) {
            // Log timeout for non-critical endpoints as warning
            logger.warn('API request timeout (non-critical)', errorInfo);
        } else {
            // Log other errors at error level
            logger.error('API request failed', errorInfo);
        }
        
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

// Re-export types from types.ts for backward compatibility
export type { PassType, PurchasedPass } from '../types';

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
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ApiError);
        }
        // Set the prototype explicitly for proper instanceof checks
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

export const gymApi = {
    setAuthTokenGetter: (getter: (() => Promise<string | null>) | null) => {
        authTokenGetter = getter;
    },

    getGymByQrIdentifier: async (qrIdentifier: string): Promise<Gym> => {
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }

        logger.debug('Fetching gym for QR');
        try {
            const response = await apiClient.get(`/gym/${qrIdentifier}`, {
                timeout: 8000, // 8 seconds timeout
            });
            logger.debug('Gym data received', { gymId: response.data?.id });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                // Handle timeout errors
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    logger.warn('Timeout fetching gym - backend may be unavailable');
                    throw new ApiError('Connection timeout. Please check your internet connection and try again.');
                }
                // Handle network errors
                if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'NETWORK_ERROR') {
                    logger.warn('Network error fetching gym', error.code);
                    throw new ApiError('Unable to connect to server. Please check your internet connection.');
                }
                // Handle HTTP status errors
                const status = error.response?.status;
                if (status === 404) {
                    throw new ApiError('Gym not found');
                } else if (status === 401 || status === 403) {
                    throw new ApiError('Unauthorized access');
                }
            }
            logger.error('Error fetching gym', error);
            throw new ApiError(ERROR_MESSAGES.FETCH_GYM_FAILED);
        }
    },

    purchasePass: async (passId: string, userId: string, deviceId: string): Promise<RazorpayOrder> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
        if (!deviceId) throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
        
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }
        
        logger.debug(`Purchasing pass: ${passId}`, { userId });
        try {
            const response = await apiClient.post('/passes/purchase', { passId, deviceId });
            logger.info('Pass purchase initiated', { passId, status: response.status });
            return response.data;
        } catch (error) {
            logger.error('Error purchasing pass', error);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401 || status === 403) {
                    throw new ApiError('Please sign in to purchase a pass');
                } else if (status === 400) {
                    throw new ApiError(error.response?.data?.message || 'Invalid pass selection');
                }
            }
            throw new ApiError(ERROR_MESSAGES.PURCHASE_PASS_FAILED);
        }
    },

    getPassStatus: async (passId: string, userId: string): Promise<PassStatus> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
        
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }

        logger.debug('Fetching pass status');
        try {
            const response = await apiClient.get(`/passes/${passId}/status`);
            logger.debug('Pass status received', { status: response.data?.status });
            return response.data;
        } catch (error) {
            logger.error('Error fetching pass status', error);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 404) {
                    throw new ApiError('Pass not found');
                } else if (status === 401 || status === 403) {
                    throw new ApiError('Please sign in to view pass status');
                }
            }
            throw new ApiError(ERROR_MESSAGES.GET_PASS_STATUS_FAILED);
        }
    },

    confirmPayment: async (passId: string, paymentId: string, userId: string): Promise<void> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
        
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }
        
        logger.info(`Confirming payment for pass: ${passId}`, { userId });
        try {
            const response = await apiClient.post(
                '/payments/confirm', 
                { passId, paymentId }
            );

            if (response.status !== 200) {
                throw new ApiError(`Unexpected status code: ${response.status}`);
            }

            // Check if the response indicates success
            if (!response.data || !response.data.success) {
                throw new ApiError('Payment confirmation failed');
            }

            logger.info('Payment confirmed successfully', { passId });
        } catch (error) {
            logger.error('Error confirming payment', error);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401 || status === 403) {
                    throw new ApiError('Please sign in to confirm payment');
                } else if (status === 400) {
                    throw new ApiError(error.response?.data?.message || 'Invalid payment details');
                } else if (status === 404) {
                    throw new ApiError('Pass not found');
                }
                throw new ApiError(error.response?.data?.message || ERROR_MESSAGES.CONFIRM_PAYMENT_FAILED);
            }
            throw new ApiError(ERROR_MESSAGES.CONFIRM_PAYMENT_FAILED);
        }
    },

    getActivePasses: async (deviceId: string, userId: string): Promise<PurchasedPass[]> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);
        if (!deviceId) throw new Error(ERROR_MESSAGES.DEVICE_ID_REQUIRED);
        
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }
        
        logger.debug('Fetching active passes', { userId, deviceId });
        try {
            const response = await apiClient.get(`/passes/active`, {
                params: { deviceId },
                timeout: 8000, // 8 seconds timeout
            });
            logger.debug('Active passes received', { count: response.data?.length || 0 });
            return response.data || [];
        } catch (error) {
            if (axios.isAxiosError(error)) {
                // Handle timeout errors gracefully
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    logger.warn('Timeout fetching active passes - backend may be unavailable');
                    throw new ApiError('Connection timeout. Please check your internet connection and try again.');
                }
                // Handle authentication errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new ApiError('Please sign in to view your passes');
                }
                // Handle network errors
                if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'NETWORK_ERROR') {
                    logger.warn('Network error fetching active passes', error.code);
                    throw new ApiError('Unable to connect to server. Please check your internet connection.');
                }
            }
            logger.error('Error fetching active passes', error);
            throw new ApiError(ERROR_MESSAGES.FETCH_ACTIVE_PASSES_FAILED);
        }
    },

    createEntryToken: async (passId: string, userId: string): Promise<EntryTokenResponse> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);

        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }

        logger.debug('Creating entry token');
        try {
            const response = await apiClient.post(`/passes/${passId}/entry-token`);
            return response.data;
        } catch (error) {
            logger.error('Error creating entry token', error);
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 401 || status === 403) {
                    throw new ApiError('Please sign in to generate entry QR');
                } else if (status === 404) {
                    throw new ApiError('Pass not found');
                } else if (status === 400) {
                    throw new ApiError(error.response?.data?.message || 'Pass is not active for entry');
                }
            }
            throw new ApiError('Failed to generate entry QR');
        }
    },

    getMembershipEntitlement: async (userId: string): Promise<ProMembershipEntitlement> => {
        if (!userId) throw new Error(ERROR_MESSAGES.USER_ID_REQUIRED);

        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }

        try {
            const response = await apiClient.get('/membership/entitlement', {
                timeout: 8000,
            });
            return response.data;
        } catch (error) {
            logger.error('Error fetching membership entitlement', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401 || error.response?.status === 403) {
                    throw new ApiError('Please sign in to view membership details');
                }
            }
            throw new ApiError('Failed to fetch membership entitlement');
        }
    },

    validateQrCode: async (qrCodeValue: string) => {
        // Validate API URL before making request
        try {
            getApiUrl();
        } catch (error) {
            throw new ApiError(ERROR_MESSAGES.API_NOT_CONFIGURED);
        }

        logger.debug(`Validating QR code: ${qrCodeValue}`);
        try {
            const response = await apiClient.get(`/validate`, {
                params: { pass_id: qrCodeValue }
            });
            logger.debug('QR code validation response', { valid: response.data?.valid });
            return response.data;
        } catch (error) {
            logger.error('Error validating QR code', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    throw new ApiError('Pass not found');
                }
            }
            throw new ApiError(ERROR_MESSAGES.VALIDATE_QR_FAILED);
        }
    },

    upsertUser: async (userData: User): Promise<User> => {
        // Validate API URL before making request
        // Note: This method doesn't throw on API URL error to allow app to continue
        // but it will log the error
        try {
            getApiUrl();
        } catch (error) {
            // For user upsert, we don't want to crash the app if API is unavailable
            // Just log and return the original userData
            logger.warn('API URL not configured, skipping user upsert', error);
            return userData;
        }

        logger.debug('Upserting user', { userId: userData.id });
        try {
            // Use a shorter timeout for user upsert since it's not critical
            const response = await apiClient.post(
                '/users/me',
                userData,
                {
                    timeout: 5000, // 5 seconds instead of 10
                }
            );
            logger.debug('User upserted successfully', { userId: response.data?.id });
            return response.data;
        } catch (error) {
            // Handle timeout and network errors silently - they're not critical
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    logger.warn('User upsert timeout - backend may be unavailable, continuing without sync');
                } else if (error.response?.status === 401) {
                    logger.warn('User upsert unauthorized - user may not be authenticated yet');
                } else {
                    logger.error('Error upserting user', error);
                }
            } else {
                logger.error('Error upserting user', error);
            }
            // Return userData as fallback instead of throwing
            return userData;
        }
    }
};

export default gymApi;