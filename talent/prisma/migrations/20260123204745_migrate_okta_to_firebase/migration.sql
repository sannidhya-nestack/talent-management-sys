-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `secondaryEmail` VARCHAR(191) NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NULL,
    `portfolioLink` VARCHAR(191) NULL,
    `educationLevel` VARCHAR(191) NULL,
    `generalCompetenciesCompleted` BOOLEAN NOT NULL DEFAULT false,
    `generalCompetenciesScore` DECIMAL(5, 2) NULL,
    `generalCompetenciesPassedAt` DATETIME(3) NULL,
    `tallyRespondentId` VARCHAR(191) NULL,
    `firebaseUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_email_key`(`email`),
    INDEX `Person_email_idx`(`email`),
    INDEX `Person_tallyRespondentId_idx`(`tallyRespondentId`),
    INDEX `Person_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Application` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `currentStage` ENUM('APPLICATION', 'GENERAL_COMPETENCIES', 'SPECIALIZED_COMPETENCIES', 'INTERVIEW', 'AGREEMENT', 'SIGNED') NOT NULL DEFAULT 'APPLICATION',
    `status` ENUM('ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE',
    `resumeUrl` VARCHAR(191) NULL,
    `academicBackground` TEXT NULL,
    `previousExperience` TEXT NULL,
    `videoLink` VARCHAR(191) NULL,
    `otherFileUrl` VARCHAR(191) NULL,
    `hasResume` BOOLEAN NOT NULL DEFAULT false,
    `hasAcademicBg` BOOLEAN NOT NULL DEFAULT false,
    `hasVideoIntro` BOOLEAN NOT NULL DEFAULT false,
    `hasPreviousExp` BOOLEAN NOT NULL DEFAULT false,
    `hasOtherFile` BOOLEAN NOT NULL DEFAULT false,
    `tallySubmissionId` VARCHAR(191) NOT NULL,
    `tallyResponseId` VARCHAR(191) NULL,
    `tallyFormId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Application_tallySubmissionId_key`(`tallySubmissionId`),
    INDEX `Application_personId_idx`(`personId`),
    INDEX `Application_status_idx`(`status`),
    INDEX `Application_currentStage_idx`(`currentStage`),
    INDEX `Application_position_idx`(`position`),
    INDEX `Application_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assessment` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentType` ENUM('GENERAL_COMPETENCIES', 'SPECIALIZED_COMPETENCIES') NOT NULL,
    `score` DECIMAL(5, 2) NOT NULL,
    `passed` BOOLEAN NOT NULL,
    `threshold` DECIMAL(5, 2) NOT NULL,
    `completedAt` DATETIME(3) NOT NULL,
    `rawData` JSON NULL,
    `personId` VARCHAR(191) NULL,
    `applicationId` VARCHAR(191) NULL,
    `tallySubmissionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Assessment_tallySubmissionId_key`(`tallySubmissionId`),
    INDEX `Assessment_personId_idx`(`personId`),
    INDEX `Assessment_applicationId_idx`(`applicationId`),
    INDEX `Assessment_assessmentType_idx`(`assessmentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Interview` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `interviewerId` VARCHAR(191) NOT NULL,
    `schedulingLink` VARCHAR(191) NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `outcome` ENUM('PENDING', 'ACCEPT', 'REJECT') NOT NULL DEFAULT 'PENDING',
    `emailSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Interview_applicationId_idx`(`applicationId`),
    INDEX `Interview_interviewerId_idx`(`interviewerId`),
    INDEX `Interview_scheduledAt_idx`(`scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `firebaseUserId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `secondaryEmail` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `middleName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NULL,
    `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/New_York',
    `organisation` VARCHAR(191) NOT NULL DEFAULT 'Nestack',
    `operationalClearance` ENUM('A', 'B', 'C') NOT NULL DEFAULT 'A',
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `hasAppAccess` BOOLEAN NOT NULL DEFAULT false,
    `schedulingLink` VARCHAR(191) NULL,
    `userStatus` ENUM('ACTIVE', 'DISABLED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastSyncedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_firebaseUserId_key`(`firebaseUserId`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_firebaseUserId_idx`(`firebaseUserId`),
    INDEX `User_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Decision` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `decision` ENUM('ACCEPT', 'REJECT') NOT NULL,
    `reason` TEXT NOT NULL,
    `decidedBy` VARCHAR(191) NOT NULL,
    `decidedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Decision_applicationId_idx`(`applicationId`),
    INDEX `Decision_decidedBy_idx`(`decidedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `applicationId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `actionType` ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EMAIL_SENT', 'STATUS_CHANGE', 'STAGE_CHANGE') NOT NULL,
    `details` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_personId_idx`(`personId`),
    INDEX `AuditLog_applicationId_idx`(`applicationId`),
    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actionType_idx`(`actionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailLog` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `applicationId` VARCHAR(191) NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `templateName` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED') NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `sentBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailLog_personId_idx`(`personId`),
    INDEX `EmailLog_applicationId_idx`(`applicationId`),
    INDEX `EmailLog_status_idx`(`status`),
    INDEX `EmailLog_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Application` ADD CONSTRAINT `Application_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Interview` ADD CONSTRAINT `Interview_interviewerId_fkey` FOREIGN KEY (`interviewerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Decision` ADD CONSTRAINT `Decision_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Decision` ADD CONSTRAINT `Decision_decidedBy_fkey` FOREIGN KEY (`decidedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_sentBy_fkey` FOREIGN KEY (`sentBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
