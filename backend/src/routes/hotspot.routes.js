/**
 * Routes Hotspot — gestion des Groupes, Sites, Profils, Vouchers, Utilisateurs RADIUS.
 * Toutes les routes sont préfixées par /api/hotspot et requièrent une authentification.
 */

const { Router } = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const radius = require("../services/radius.service");
const { generateVoucherPDF, generateVoucherSummaryPDF } = require("../services/voucher-pdf.service");
const { prisma } = require("../lib/prisma");

const router = Router();
router.use(requireAuth);

// ─── GROUPS ──────────────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(2).max(64),
  description: z.string().max(255).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  description: z.string().max(255).optional().nullable(),
});

router.get("/groups", async (req, res, next) => {
  try {
    const groups = await radius.listGroups(req.user.id);
    res.json({ groups });
  } catch (err) { next(err); }
});

router.get("/groups/:id", async (req, res, next) => {
  try {
    const group = await radius.getGroupById(req.user.id, req.params.id);
    res.json({ group });
  } catch (err) { next(err); }
});

router.post("/groups", validate(groupSchema), async (req, res, next) => {
  try {
    const group = await radius.createGroup(req.user.id, req.body);
    res.status(201).json({ group });
  } catch (err) { next(err); }
});

router.patch("/groups/:id", validate(updateGroupSchema), async (req, res, next) => {
  try {
    const group = await radius.updateGroup(req.user.id, req.params.id, req.body);
    res.json({ group });
  } catch (err) { next(err); }
});

router.delete("/groups/:id", async (req, res, next) => {
  try {
    await radius.deleteGroup(req.user.id, req.params.id);
    res.json({ message: "Groupe supprimé" });
  } catch (err) { next(err); }
});

// ─── SITES ───────────────────────────────────────────────────────────────────

const siteSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(2).max(64),
  location: z.string().max(255).optional(),
  nasId: z.string().optional(),
});

const updateSiteSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  location: z.string().max(255).optional().nullable(),
  nasId: z.string().optional().nullable(),
});

router.get("/sites", async (req, res, next) => {
  try {
    const sites = await radius.listSites(req.user.id, req.query.groupId);
    res.json({ sites });
  } catch (err) { next(err); }
});

router.get("/sites/:id", async (req, res, next) => {
  try {
    const site = await radius.getSiteById(req.user.id, req.params.id);
    res.json({ site });
  } catch (err) { next(err); }
});

router.post("/sites", validate(siteSchema), async (req, res, next) => {
  try {
    const site = await radius.createSite(req.user.id, req.body);
    res.status(201).json({ site });
  } catch (err) { next(err); }
});

router.patch("/sites/:id", validate(updateSiteSchema), async (req, res, next) => {
  try {
    const site = await radius.updateSite(req.user.id, req.params.id, req.body);
    res.json({ site });
  } catch (err) { next(err); }
});

router.delete("/sites/:id", async (req, res, next) => {
  try {
    await radius.deleteSite(req.user.id, req.params.id);
    res.json({ message: "Site supprimé" });
  } catch (err) { next(err); }
});

// ─── PROFILES ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  groupId: z.string().optional(),
  name: z.string().min(2).max(64),
  durationMinutes: z.number().int().min(1),
  price: z.number().int().min(0).optional(),
  downloadRate: z.number().int().min(0).optional(),
  uploadRate: z.number().int().min(0).optional(),
  quotaMb: z.number().int().min(0).optional(),
  maxDevices: z.number().int().min(1).max(100).optional(),
  macPolicy: z.enum(["ALLOW", "BLOCK", "BYPASS"]).optional(),
  validDays: z.number().int().min(1).optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  price: z.number().int().min(0).optional(),
  downloadRate: z.number().int().min(0).optional().nullable(),
  uploadRate: z.number().int().min(0).optional().nullable(),
  quotaMb: z.number().int().min(0).optional().nullable(),
  maxDevices: z.number().int().min(1).max(100).optional(),
  macPolicy: z.enum(["ALLOW", "BLOCK", "BYPASS"]).optional(),
  validDays: z.number().int().min(1).optional().nullable(),
});

router.get("/profiles", async (req, res, next) => {
  try {
    const profiles = await radius.listProfiles(req.user.id, req.query.groupId);
    res.json({ profiles });
  } catch (err) { next(err); }
});

router.get("/profiles/:id", async (req, res, next) => {
  try {
    const profile = await radius.getProfileById(req.user.id, req.params.id);
    res.json({ profile });
  } catch (err) { next(err); }
});

router.post("/profiles", validate(profileSchema), async (req, res, next) => {
  try {
    const profile = await radius.createProfile(req.user.id, req.body);
    res.status(201).json({ profile });
  } catch (err) { next(err); }
});

router.patch("/profiles/:id", validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await radius.updateProfile(req.user.id, req.params.id, req.body);
    res.json({ profile });
  } catch (err) { next(err); }
});

router.delete("/profiles/:id", async (req, res, next) => {
  try {
    await radius.deleteProfile(req.user.id, req.params.id);
    res.json({ message: "Profil supprimé" });
  } catch (err) { next(err); }
});

// ─── VOUCHERS ────────────────────────────────────────────────────────────────

const voucherGenerateSchema = z.object({
  groupId: z.string().min(1),
  profileId: z.string().min(1),
  count: z.number().int().min(1).max(500),
  prefix: z.string().max(10).optional(),
  macAddress: z.string().optional(),
});

router.post("/vouchers/generate", validate(voucherGenerateSchema), async (req, res, next) => {
  try {
    const vouchers = await radius.generateVouchers(req.user.id, req.body);
    res.status(201).json({ vouchers, count: vouchers.length });
  } catch (err) { next(err); }
});

router.get("/vouchers", async (req, res, next) => {
  try {
    const { groupId, profileId, status, page, limit } = req.query;
    const result = await radius.listVouchers(req.user.id, {
      groupId, profileId, status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/vouchers/:id", async (req, res, next) => {
  try {
    const voucher = await radius.getVoucherById(req.user.id, req.params.id);
    res.json({ voucher });
  } catch (err) { next(err); }
});

router.post("/vouchers/:id/revoke", async (req, res, next) => {
  try {
    const voucher = await radius.revokeVoucher(req.user.id, req.params.id);
    res.json({ voucher, message: "Voucher révoqué" });
  } catch (err) { next(err); }
});

router.post("/vouchers/bulk-revoke", async (req, res, next) => {
  try {
    const { voucherIds } = req.body;
    if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "voucherIds requis (tableau)" } });
    }
    const result = await radius.bulkRevokeVouchers(req.user.id, voucherIds);
    res.json({ revoked: result.count, message: `${result.count} voucher(s) révoqué(s)` });
  } catch (err) { next(err); }
});

// ─── VOUCHERS PDF ───────────────────────────────────────────────────────────

/**
 * POST /api/hotspot/vouchers/pdf-batch
 * Génère un PDF contenant les vouchers d'un batch spécifique.
 * Body: { voucherIds: string[] } — IDs des vouchers à imprimer
 */
router.post("/vouchers/pdf-batch", async (req, res, next) => {
  try {
    const { voucherIds } = req.body;
    if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "voucherIds requis (tableau)" } });
    }
    if (voucherIds.length > 200) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "Maximum 200 vouchers par PDF" } });
    }

    // Récupérer les vouchers avec plainPassword depuis la génération
    // Les mots de passe en clair ne sont pas stockés, on les régénère si nécessaire
    const vouchers = await prisma.hotspotVoucher.findMany({
      where: { id: { in: voucherIds }, ownerId: req.user.id },
      include: { group: { select: { name: true } }, profile: true },
    });

    if (vouchers.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Aucun voucher trouvé" } });
    }

    const group = vouchers[0].group;
    const profile = vouchers[0].profile;

    // Les mots de passe en clair ne sont plus disponibles après création.
    // On génère le PDF avec les codes visibles, les mots de passe en placeholder.
    const pdfVouchers = vouchers.map((v) => ({
      ...v,
      plainPassword: "[Réémettez via generate pour récupérer le mot de passe]",
    }));

    const pdfBuffer = await generateVoucherPDF({
      vouchers: pdfVouchers,
      group,
      profile,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vouchers-${group.name}-${Date.now()}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

/**
 * POST /api/hotspot/vouchers/generate-pdf
 * Génère des vouchers ET retourne directement le PDF.
 * Le client reçoit le PDF en même temps que les vouchers sont créés.
 * Body: { groupId, profileId, count, prefix?, macAddress? }
 */
router.post("/vouchers/generate-pdf", validate(voucherGenerateSchema), async (req, res, next) => {
  try {
    const vouchers = await radius.generateVouchers(req.user.id, req.body);

    const group = await prisma.hotspotGroup.findFirst({
      where: { id: req.body.groupId, ownerId: req.user.id },
    });
    const profile = await prisma.hotspotProfile.findFirst({
      where: { id: req.body.profileId, ownerId: req.user.id },
    });

    if (!group || !profile) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Groupe ou profil introuvable" } });
    }

    const pdfBuffer = await generateVoucherPDF({
      vouchers,
      group,
      profile,
    });

    // Retourner les vouchers JSON ET le PDF en streaming
    // Le client peut choisir : JSON pour affichage web, PDF pour impression
    const format = req.query.format || "pdf";

    if (format === "json") {
      res.status(201).json({ vouchers, count: vouchers.length });
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="vouchers-${group.name}-${Date.now()}.pdf"`
      );
      res.send(pdfBuffer);
    }
  } catch (err) { next(err); }
});

/**
 * POST /api/hotspot/vouchers/:id/pdf
 * Génère un PDF pour un seul voucher.
 */
router.post("/vouchers/:id/pdf", async (req, res, next) => {
  try {
    const voucher = await radius.getVoucherById(req.user.id, req.params.id);

    const pdfBuffer = await generateVoucherPDF({
      vouchers: [{ ...voucher, plainPassword: "[Réémettez via generate]" }],
      group: voucher.group,
      profile: voucher.profile,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="voucher-${voucher.code}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

/**
 * POST /api/hotspot/vouchers/summary-pdf
 * Génère un PDF de résumé (tableau) pour un groupe de vouchers.
 * Body: { voucherIds: string[] }
 */
router.post("/vouchers/summary-pdf", async (req, res, next) => {
  try {
    const { voucherIds } = req.body;
    if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "voucherIds requis" } });
    }

    const vouchers = await prisma.hotspotVoucher.findMany({
      where: { id: { in: voucherIds }, ownerId: req.user.id },
      include: { group: { select: { name: true } }, profile: true },
    });

    if (vouchers.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Aucun voucher trouvé" } });
    }

    const pdfBuffer = await generateVoucherSummaryPDF({
      vouchers: vouchers.map((v) => ({ ...v, plainPassword: "[Mot de passe hashé]" })),
      group: vouchers[0].group,
      profile: vouchers[0].profile,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="resume-vouchers-${Date.now()}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// ─── RADIUS USERS ────────────────────────────────────────────────────────────

const radiusUserSchema = z.object({
  groupId: z.string().min(1),
  username: z.string().min(3).max(64),
  password: z.string().min(6).optional(),
  voucherId: z.string().optional(),
  profileId: z.string().optional(),
  macAddress: z.string().optional(),
});

const updateRadiusUserSchema = z.object({
  password: z.string().min(6).optional(),
  profileId: z.string().optional().nullable(),
  macAddress: z.string().optional().nullable(),
});

router.get("/users", async (req, res, next) => {
  try {
    const { groupId, status, page, limit } = req.query;
    const result = await radius.listRadiusUsers(req.user.id, {
      groupId, status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await radius.getRadiusUserById(req.user.id, req.params.id);
    res.json({ user });
  } catch (err) { next(err); }
});

router.post("/users", validate(radiusUserSchema), async (req, res, next) => {
  try {
    const { user, plainPassword } = await radius.createRadiusUser(req.user.id, req.body);
    res.status(201).json({ user, plainPassword, message: "Utilisateur RADIUS créé" });
  } catch (err) { next(err); }
});

router.patch("/users/:id", validate(updateRadiusUserSchema), async (req, res, next) => {
  try {
    const user = await radius.updateRadiusUser(req.user.id, req.params.id, req.body);
    res.json({ user });
  } catch (err) { next(err); }
});

router.post("/users/:id/suspend", async (req, res, next) => {
  try {
    const user = await radius.suspendRadiusUser(req.user.id, req.params.id);
    res.json({ user, message: "Utilisateur RADIUS suspendu" });
  } catch (err) { next(err); }
});

router.post("/users/:id/activate", async (req, res, next) => {
  try {
    const user = await radius.activateRadiusUser(req.user.id, req.params.id);
    res.json({ user, message: "Utilisateur RADIUS réactivé" });
  } catch (err) { next(err); }
});

module.exports = { router };
