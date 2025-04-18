-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "qrIdentifier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassType" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasedPass" (
    "id" TEXT NOT NULL,
    "passTypeId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "paymentIntentId" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "qrCodeValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasedPass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gym_qrIdentifier_key" ON "Gym"("qrIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasedPass_paymentIntentId_key" ON "PurchasedPass"("paymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasedPass_qrCodeValue_key" ON "PurchasedPass"("qrCodeValue");

-- AddForeignKey
ALTER TABLE "PassType" ADD CONSTRAINT "PassType_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasedPass" ADD CONSTRAINT "PurchasedPass_passTypeId_fkey" FOREIGN KEY ("passTypeId") REFERENCES "PassType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
