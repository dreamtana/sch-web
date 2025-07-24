/*
  Warnings:

  - Added the required column `fiscalYearId` to the `Subsidy` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `subsidy` ADD COLUMN `fiscalYearId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Subsidy` ADD CONSTRAINT `Subsidy_fiscalYearId_fkey` FOREIGN KEY (`fiscalYearId`) REFERENCES `FiscalYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
