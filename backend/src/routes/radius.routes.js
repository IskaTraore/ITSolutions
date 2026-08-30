/**
 * Routes RADIUS — gestion des NAS, webhook Accounting, sessions actives, statistiques.
 * Préfixes :
 *   /api/radius/nas       → CRUD NAS (protégé auth)
 *   /api/radius/accounting → webhook RADIUS (protégé secret partagé)
 *   /api/radius/sessions  → sessions actives (protégé auth)
 *   /api/radius/stats     → statistiques (protégé auth)
 */

const { Router } = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { webhookRateLimit } = require("../middleware/rateLimit");
const radius = require("../services/radius.service");
const { syncNasToFreeRADIUS, regenerateClientsConf } = require("../services/radius-provision.service");
const { env } = require("../config/env");
const { Errors } = require("../lib/errors");
const { prisma } = require("../lib/prisma");

const router = Router();

// ─── NAS MANAGEMENT (authentifié) ────────────────────────────────────────────

const nasRouter = Router();
nasRouter.use(requireAuth);

const nasSchema = z.object({
  routerId: z.string().optional(),
  name: z.string().min(2).max(64),
  address: z.string().optional(),
});

const updateNasSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  address: z.string().optional().nullable(),
});

nasRouter.get("/", async (req, res, next) => {
  try {
    const nasList = await radius.listNas(req.user.id);
    res.json({ nas: nasList });
  } catch (err) { next(err); }
});

nasRouter.get("/:id", async (req, res, next) => {
  try {
    const nas = await radius.getNasById(req.user.id, req.params.id);
    res.json({ nas });
  } catch (err) { next(err); }
});

nasRouter.post("/", validate(nasSchema), async (req, res, next) => {
  try {
    const { nas, secret } = await radius.createNas(req.user.id, req.body);
    res.status(201).json({ nas, secret, message: "NAS créé. Configurez ce secret dans clients.conf de FreeRADIUS." });
  } catch (err) { next(err); }
});

nasRouter.patch("/:id", validate(updateNasSchema), async (req, res, next) => {
  try {
    const nas = await radius.updateNas(req.user.id, req.params.id, req.body);
    res.json({ nas });
  } catch (err) { next(err); }
});

nasRouter.post("/:id/rotate-secret", async (req, res, next) => {
  try {
    const { secret } = await radius.rotateNasSecret(req.user.id, req.params.id);
    res.json({ secret, message: "Nouveau secret NAS généré. Mettez à jour clients.conf de FreeRADIUS." });
  } catch (err) { next(err); }
});

nasRouter.delete("/:id", async (req, res, next) => {
  try {
    await radius.deleteNas(req.user.id, req.params.id);
    res.json({ message: "NAS supprimé" });
  } catch (err) { next(err); }
});

// Sync un NAS vers FreeRADIUS (écrit clients.conf + recharge)
nasRouter.post("/:id/sync", async (req, res, next) => {
  try {
    const result = await syncNasToFreeRADIUS(req.user.id, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

// Régénération complète de clients.conf à partir de la DB
nasRouter.post("/regenerate-conf", async (req, res, next) => {
  try {
    // Seuls les admins peuvent régénérer toute la config
    if (req.user.role !== "ADMIN") throw Errors.forbidden();
    const result = await regenerateClientsConf();
    res.json(result);
  } catch (err) { next(err); }
});

// ─── ACCOUNTING WEBHOOK (RADIUS server → backend) ────────────────────────────

/**
 * POST /api/radius/accounting
 *
 * Reçoit les packets RADIUS Accounting du serveur FreeRADIUS.
 * Protégé par un secret partagé dans le header X-RADIUS-Secret.
 *
 * Body attendu (format simplifié, normalement les attributs RADIUS sont parsés
 * côté proxy FreeRADIUS → API) :
 * {
 *   "nasIdentifier": "kavumu-001",
 *   "username": "guest_abc123",
 *   "sessionId": "unique-session-id",
 *   "statusType": "Start" | "Stop" | "Interim-Update",
 *   "ipAddress": "10.8.0.5",
 *   "macAddress": "AA:BB:CC:DD:EE:FF",
 *   "inputOctets": 12345,
 *   "outputOctets": 67890,
 *   "sessionTime": 3600,
 *   "disconnectCause": "User-Request"
 * }
 */
const accountingRouter = Router();
accountingRouter.use(webhookRateLimit);

accountingRouter.post("/", async (req, res, next) => {
  try {
    // Authentification du webhook : secret partagé
    const radiusSecret = req.headers["x-radius-secret"];
    if (!radiusSecret || radiusSecret !== env.radiusSecret) {
      throw Errors.forbidden("Secret RADIUS invalide");
    }

    const result = await radius.processAccounting(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

// ─── ACTIVE SESSIONS (authentifié) ───────────────────────────────────────────

const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.get("/", async (req, res, next) => {
  try {
    const { nasId, groupId, siteId } = req.query;
    const sessions = await radius.listActiveSessions(req.user.id, { nasId, groupId, siteId });
    res.json({ sessions, total: sessions.length });
  } catch (err) { next(err); }
});

sessionsRouter.get("/stats", async (req, res, next) => {
  try {
    const stats = await radius.getSessionStats(req.user.id);
    res.json({ stats });
  } catch (err) { next(err); }
});

// ─── ACCOUNTING HISTORY + STATS (authentifié) ────────────────────────────────

const accountingReadRouter = Router();
accountingReadRouter.use(requireAuth);

accountingReadRouter.get("/", async (req, res, next) => {
  try {
    const { nasId, groupId, page, limit, startDate, endDate } = req.query;
    const result = await radius.listAccounting(req.user.id, {
      nasId, groupId,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      startDate, endDate,
    });
    res.json(result);
  } catch (err) { next(err); }
});

accountingReadRouter.get("/stats", async (req, res, next) => {
  try {
    const { period } = req.query;
    const stats = await radius.getAccountingStats(req.user.id, { period: period || "30d" });
    res.json({ stats });
  } catch (err) { next(err); }
});

// ─── MOUNT ───────────────────────────────────────────────────────────────────

router.use("/nas", nasRouter);
router.use("/accounting", accountingRouter);
router.use("/sessions", sessionsRouter);
router.use("/accounting-history", accountingReadRouter);

module.exports = { router };
