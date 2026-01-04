// Consolidated type definitions
// Note: price is string from API (Decimal type), convert to number when needed

export interface PassType {
  id: string;
  gymId?: string; // Optional for consistency with API
  name: string;
  duration: number;
  price: string; // API returns as string (Decimal)
  currency: string;
}

export interface PurchasedPass {
  id: string;
  passType: PassType;
  passTypeId: string;
  purchaseDate: string;
  expiryDate: string;
  paymentIntentId?: string;
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  qrCodeValue?: string;
  isActive: boolean;
} 