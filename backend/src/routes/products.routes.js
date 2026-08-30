const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { uploadImage, removeUploadedImage } = require("../lib/uploads");

const router = Router();

// ==================== MAPPING ENUM PRISMA <-> VALEURS FRONT ====================
// Le frontend utilise des valeurs en minuscules (ex : "routeurs", "hap-ac2").
// L'API les traduit vers les enums PostgreSQL et inversement.

const CATEGORY_TO_ENUM = {
  routeurs: "ROUTEURS",
  "antennes-cpe": "ANTENNES_CPE",
  switches: "SWITCHES",
  accessoires: "ACCESSOIRES",
};
const CATEGORY_FROM_ENUM = Object.fromEntries(
  Object.entries(CATEGORY_TO_ENUM).map(([k, v]) => [v, k])
);

const VISUAL_TO_ENUM = {
  "hap-ac2": "HAP_AC2",
  hex: "HEX",
  haplite: "HAPLITE",
  sxt: "SXT",
  mantbox: "MANTBOX",
  omnitik: "OMNITIK",
  switch: "SWITCH",
  "poe-kit": "POE_KIT",
};
const VISUAL_FROM_ENUM = Object.fromEntries(
  Object.entries(VISUAL_TO_ENUM).map(([k, v]) => [v, k])
);

const HUE_TO_ENUM = {
  indigo: "INDIGO",
  violet: "VIOLET",
  teal: "TEAL",
  sky: "SKY",
  emerald: "EMERALD",
  amber: "AMBER",
  rose: "ROSE",
  cyan: "CYAN",
};
const HUE_FROM_ENUM = Object.fromEntries(
  Object.entries(HUE_TO_ENUM).map(([k, v]) => [v, k])
);

const BADGE_TO_ENUM = {
  promo: "PROMO",
  nouveau: "NOUVEAU",
  "best-seller": "BEST_SELLER",
};
const BADGE_FROM_ENUM = Object.fromEntries(
  Object.entries(BADGE_TO_ENUM).map(([k, v]) => [v, k])
);

const STOCK_TO_ENUM = {
  in: "IN",
  limited: "LIMITED",
  order: "ORDER",
};
const STOCK_FROM_ENUM = Object.fromEntries(
  Object.entries(STOCK_TO_ENUM).map(([k, v]) => [v, k])
);

/** Convertit le payload front (minuscules) vers les valeurs Prisma. */
function toDb(payload) {
  const data = { ...payload };
  if (data.category) data.category = CATEGORY_TO_ENUM[data.category];
  if (data.visual) data.visual = VISUAL_TO_ENUM[data.visual];
  if (data.hue) data.hue = HUE_TO_ENUM[data.hue];
  if (data.badge) data.badge = BADGE_TO_ENUM[data.badge];
  if (data.stock) data.stock = STOCK_TO_ENUM[data.stock];
  return data;
}

/** Convertit un produit Prisma vers le DTO front (minuscules). */
function toDto(p) {
  return {
    id: p.id,
    name: p.name,
    model: p.model,
    category: CATEGORY_FROM_ENUM[p.category],
    categoryLabel: p.categoryLabel,
    price: p.price,
    oldPrice: p.oldPrice,
    rating: p.rating,
    reviews: p.reviews,
    visual: VISUAL_FROM_ENUM[p.visual],
    hue: HUE_FROM_ENUM[p.hue],
    badge: p.badge ? BADGE_FROM_ENUM[p.badge] : null,
    stock: STOCK_FROM_ENUM[p.stock],
    specs: p.specs ?? [],
    description: p.description,
    imageUrl: p.imageUrl,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ==================== VALIDATION ====================

const productBaseSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(120),
  model: z.string().trim().min(1, "Référence requise").max(80),
  category: z.enum(["routeurs", "antennes-cpe", "switches", "accessoires"]),
  categoryLabel: z.string().trim().min(1).max(40),
  price: z.number().int().min(0).max(100_000_000),
  oldPrice: z.number().int().min(0).max(100_000_000).nullable().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).max(100_000).optional(),
  visual: z.enum(["hap-ac2", "hex", "haplite", "sxt", "mantbox", "omnitik", "switch", "poe-kit"]),
  hue: z.enum(["indigo", "violet", "teal", "sky", "emerald", "amber", "rose", "cyan"]),
  badge: z.enum(["promo", "nouveau", "best-seller"]).nullable().optional(),
  stock: z.enum(["in", "limited", "order"]).optional(),
  specs: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

// L'ancien prix doit rester supérieur au prix actuel (sinon la « promo » n'a pas de sens).
// NB : .partial() de zod v4 est incompatible avec les schémas dotés de .refine() ;
// pour la mise à jour, la comparaison se fait dans le handler (prix effectif en base).
function oldPriceValid(data) {
  return !data.oldPrice || data.oldPrice > data.price;
}

const productCreateSchema = productBaseSchema.refine(oldPriceValid, {
  message: "L'ancien prix doit être supérieur au prix actuel",
  path: ["oldPrice"],
});

const productUpdateSchema = productBaseSchema.partial();

// ==================== ROUTES PUBLIQUES (boutique) ====================

// GET /api/products - liste complète pour la boutique
router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "asc" },
    });
    res.json({ products: products.map(toDto) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw Errors.notFound("Produit introuvable");
    res.json({ product: toDto(product) });
  } catch (err) {
    next(err);
  }
});

// ==================== ROUTES ADMIN (CRUD) ====================

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(productCreateSchema),
  async (req, res, next) => {
    try {
      const product = await prisma.product.create({
        data: {
          ...toDb(req.body),
          specs: req.body.specs ?? [],
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "PRODUCT_CREATED",
          targetType: "Product",
          targetId: product.id,
          metadata: { name: product.name, price: product.price },
        },
      });

      res.status(201).json({ product: toDto(product) });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(productUpdateSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw Errors.notFound("Produit introuvable");

      // Garde-fou prix : l'ancien prix doit rester supérieur au prix effectif (nouveau ou en base).
      const effectivePrice = req.body.price ?? existing.price;
      if (req.body.oldPrice && req.body.oldPrice <= effectivePrice) {
        throw Errors.validation([
          { field: "oldPrice", message: "L'ancien prix doit être supérieur au prix actuel" },
        ]);
      }

      const product = await prisma.product.update({
        where: { id: existing.id },
        data: toDb(req.body),
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "PRODUCT_UPDATED",
          targetType: "Product",
          targetId: product.id,
          metadata: { name: product.name },
        },
      });

      res.json({ product: toDto(product) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw Errors.notFound("Produit introuvable");

    await prisma.product.delete({ where: { id: existing.id } });
    // Nettoie l'image téléversée éventuelle.
    if (existing.imageUrl) removeUploadedImage(existing.imageUrl);

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "PRODUCT_DELETED",
        targetType: "Product",
        targetId: existing.id,
        metadata: { name: existing.name },
      },
    });

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ==================== PHOTO PRODUIT (upload admin) ====================

// POST /api/products/:id/image - remplace l'illustration SVG par une photo.
router.post(
  "/:id/image",
  requireAuth,
  requireAdmin,
  uploadImage.single("image"),
  async (req, res, next) => {
    try {
      const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!existing) throw Errors.notFound("Produit introuvable");
      if (!req.file) {
        throw Errors.validation([{ field: "image", message: "Aucun fichier fourni" }]);
      }

      // Remplace l'ancienne image si présente.
      if (existing.imageUrl) removeUploadedImage(existing.imageUrl);

      const imageUrl = `/uploads/products/${req.file.filename}`;
      const product = await prisma.product.update({
        where: { id: existing.id },
        data: { imageUrl },
      });

      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "PRODUCT_IMAGE_UPDATED",
          targetType: "Product",
          targetId: product.id,
          metadata: { name: product.name, imageUrl },
        },
      });

      res.json({ product: toDto(product) });
    } catch (err) {
      // Si l'enregistrement a échoué, on supprime le fichier fraîchement écrit.
      if (req.file) removeUploadedImage(`/uploads/products/${req.file.filename}`);
      next(err);
    }
  }
);

// DELETE /api/products/:id/image - retire la photo et revient à l'illustration SVG.
router.delete("/:id/image", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw Errors.notFound("Produit introuvable");

    if (existing.imageUrl) removeUploadedImage(existing.imageUrl);
    const product = await prisma.product.update({
      where: { id: existing.id },
      data: { imageUrl: null },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "PRODUCT_IMAGE_REMOVED",
        targetType: "Product",
        targetId: product.id,
        metadata: { name: product.name },
      },
    });

    res.json({ product: toDto(product) });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
