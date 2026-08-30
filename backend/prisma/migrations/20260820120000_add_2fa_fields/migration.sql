-- AlterTable
-- Ajout des champs 2FA (Two-Factor Authentication) à la table User
-- Champs : twoFactorEnabled, twoFactorSecret, twoFactorBackupCodes, usedBackupCodes

ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "usedBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
