-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ROUTEURS', 'ANTENNES_CPE', 'SWITCHES', 'ACCESSOIRES');

-- CreateEnum
CREATE TYPE "ProductVisual" AS ENUM ('HAP_AC2', 'HEX', 'HAPLITE', 'SXT', 'MANTBOX', 'OMNITIK', 'SWITCH', 'POE_KIT');

-- CreateEnum
CREATE TYPE "ProductHue" AS ENUM ('INDIGO', 'VIOLET', 'TEAL', 'SKY', 'EMERALD', 'AMBER', 'ROSE', 'CYAN');

-- CreateEnum
CREATE TYPE "ProductBadge" AS ENUM ('PROMO', 'NOUVEAU', 'BEST_SELLER');

-- CreateEnum
CREATE TYPE "ProductStock" AS ENUM ('IN', 'LIMITED', 'ORDER');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "oldPrice" INTEGER,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "visual" "ProductVisual" NOT NULL,
    "hue" "ProductHue" NOT NULL,
    "badge" "ProductBadge",
    "stock" "ProductStock" NOT NULL DEFAULT 'IN',
    "specs" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
