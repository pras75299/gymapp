-- CreateEnum
CREATE TYPE "EntryTokenAction" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "PassOccupancyStatus" AS ENUM ('INSIDE', 'OUTSIDE');

-- CreateTable
CREATE TABLE "ConsumedEntryToken" (
    "jti" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "EntryTokenAction" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsumedEntryToken_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "PassOccupancy" (
    "passId" TEXT NOT NULL,
    "status" "PassOccupancyStatus" NOT NULL DEFAULT 'OUTSIDE',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PassOccupancy_pkey" PRIMARY KEY ("passId")
);

-- CreateIndex
CREATE INDEX "ConsumedEntryToken_passId_idx" ON "ConsumedEntryToken"("passId");

-- CreateIndex
CREATE INDEX "ConsumedEntryToken_expiresAt_idx" ON "ConsumedEntryToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "ConsumedEntryToken" ADD CONSTRAINT "ConsumedEntryToken_passId_fkey" FOREIGN KEY ("passId") REFERENCES "PurchasedPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassOccupancy" ADD CONSTRAINT "PassOccupancy_passId_fkey" FOREIGN KEY ("passId") REFERENCES "PurchasedPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
