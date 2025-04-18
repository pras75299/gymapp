export interface PassType {
  id: string;
  name: string;
  duration: number;
  price: number;
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