/*
  Warnings:

  - Added the required column `fiscalYearId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subsidyId` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `project` ADD COLUMN `fiscalYearId` INTEGER NOT NULL,
    ADD COLUMN `subsidyId` INTEGER NOT NULL,
    ALTER COLUMN `remainingBudget` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_subsidyId_fkey` FOREIGN KEY (`subsidyId`) REFERENCES `Subsidy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `FiscalYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
