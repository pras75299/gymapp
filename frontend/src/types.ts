// Consolidated type definitions
// Note: price is string from API (Decimal type), convert to number when needed

export type MembershipTier = "REGULAR" | "PRO";

export type ExerciseGoal = "maintain_weight" | "lose_weight" | "gain_weight";
export type ExerciseEquipmentBucket =
  | "with_treadmill"
  | "with_cycle"
  | "without_cardio";
export type ExerciseBodyPart =
  | "mix"
  | "back"
  | "chest"
  | "shoulders"
  | "legs"
  | "biceps_triceps"
  | "core";

export type ExerciseMediaType = "youtube" | "image";

export interface ExerciseMediaResource {
  type: ExerciseMediaType;
  url: string;
  title?: string;
  thumbnailUrl?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  bodyPart?: ExerciseBodyPart;
  notes?: string;
  /** Between working sets, e.g. "60–90s" */
  rest?: string;
  /** Primary muscles / pattern */
  targetMuscles?: string;
  /** How to perform safely and effectively */
  detail?: string;
  /** Same stimulus if equipment is taken or you prefer a swap */
  alternatives?: string[];
  /** Optional media learning resources (video or image demos) */
  media?: ExerciseMediaResource[];
}

export type ExerciseBucketMap = Record<ExerciseEquipmentBucket, ExerciseItem[]>;
export type ExerciseSplitData = Record<ExerciseGoal, ExerciseBucketMap>;

export interface ProMembershipEntitlement {
  isPro: boolean;
  activeProPass: {
    id: string;
    expiryDate: string;
    passType: {
      id: string;
      name: string;
      duration: number;
      tier: MembershipTier;
      currency: string;
      price: string;
    };
  } | null;
}

export interface PassType {
  id: string;
  gymId?: string; // Optional for consistency with API
  name: string;
  duration: number;
  tier: MembershipTier;
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

export interface EntryTokenResponse {
  token: string;
  expiresAt: string;
  ttlSeconds: number;
  passId: string;
}