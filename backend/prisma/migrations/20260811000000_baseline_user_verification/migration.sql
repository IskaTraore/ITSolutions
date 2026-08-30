-- Baseline : les colonnes suivantes existent déjà en base (ajoutées hors migrations Prisma).
-- Cette migration aligne l'historique de migrations avec l'état réel de la base.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "verificationTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "verificationTokenHash" TEXT;
