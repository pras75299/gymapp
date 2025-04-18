/*
  Warnings:

  - Added the required column `amount` to the `PurchasedPass` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchasedPass" ADD COLUMN     "amount" DECIMAL(10,2),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
