/*
  Warnings:

  - You are about to drop the column `fiscalYearId` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `transaction` table. All the data in the column will be lost.
  - You are about to drop the column `subsidyId` on the `transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_fiscalYearId_fkey`;

-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `transaction` DROP FOREIGN KEY `Transaction_subsidyId_fkey`;

-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `fiscalYearId`,
    DROP COLUMN `projectId`,
    DROP COLUMN `subsidyId`;
