-- AlterTable
ALTER TABLE `project` ADD COLUMN `withdrawalAmount` DOUBLE NOT NULL DEFAULT 0,
    MODIFY `remainingBudget` DOUBLE NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `projectId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
