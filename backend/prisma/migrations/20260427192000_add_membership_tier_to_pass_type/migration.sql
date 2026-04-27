-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('REGULAR', 'PRO');

-- AlterTable
ALTER TABLE "PassType"
ADD COLUMN "tier" "MembershipTier" NOT NULL DEFAULT 'REGULAR';

-- CreateIndex
CREATE INDEX "PassType_gymId_tier_idx" ON "PassType"("gymId", "tier");
