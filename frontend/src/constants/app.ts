// App-wide constants

// API Configuration
export const API_TIMEOUT = 10000; // 10 seconds
export const API_POLLING_INTERVAL = 2000; // 2 seconds
export const API_POLLING_MAX_ATTEMPTS = 10;
export const PASSES_POLLING_INTERVAL = 30000; // 30 seconds

// Payment Configuration
export const PAYMENT_MANUAL_CLOSE_TIMEOUT = 30000; // 30 seconds
export const PAYMENT_TIMEOUT = 300000; // 5 minutes
export const PAYMENT_SUCCESS_REDIRECT_DELAY = 2000; // 2 seconds

// QR Code Validation
export const QR_CODE_VALIDATION_DOMAIN = process.env.EXPO_PUBLIC_QR_VALIDATION_DOMAIN || 'gymapp-coral.vercel.app';

// Error Messages
export const ERROR_MESSAGES = {
  API_NOT_CONFIGURED: 'API URL not configured',
  USER_ID_REQUIRED: 'User ID is required',
  DEVICE_ID_REQUIRED: 'Device ID not found',
  AUTH_LOST: 'Authentication lost during payment process',
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_VERIFICATION_FAILED: 'Payment verification failed',
  PAYMENT_TIMEOUT: 'Payment timeout',
  PAYMENT_PROCESSING_FAILED: 'Payment processing failed',
  FETCH_GYM_FAILED: 'Failed to fetch gym information',
  PURCHASE_PASS_FAILED: 'Failed to purchase pass',
  GET_PASS_STATUS_FAILED: 'Failed to get pass status',
  CONFIRM_PAYMENT_FAILED: 'Failed to confirm payment',
  FETCH_ACTIVE_PASSES_FAILED: 'Failed to load passes. Please try again.',
  VALIDATE_QR_FAILED: 'Failed to validate QR code',
  UPSERT_USER_FAILED: 'Failed to update user information',
  INVALID_QR_FORMAT: 'Invalid QR code format',
  INVALID_QR_SOURCE: 'Invalid QR code source',
} as const;

// User-friendly error messages
export const USER_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  UNAUTHORIZED: 'Please sign in to continue.',
  PAYMENT_ERROR: 'There was an error processing your payment. Please try again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

