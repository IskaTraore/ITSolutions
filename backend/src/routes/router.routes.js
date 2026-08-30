const { Router } = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createRouter,
  listRouters,
  getRouterById,
  renewRouter,
  setAutoRenew,
  pingRouter,
  deleteRouter,
  rotateVpnPassword,
} = require("../services/router.service");
const { buildMikrotikScript } = require("../services/script.service");
const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { env } = require("../config/env");

const router = Router();

const createSchema = z.object({
  name: z.string().min(3).max(32),
  routerOsFamily: z.enum(["V6_TO_7_9", "V7_10_PLUS"]),
  idempotencyKey: z.string().min(4).optional(),
});

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const routers = await listRouters(req.user.id);
    // Adresse du serveur VPN toujours à jour (env actuel), pas le snapshot en base :
    // si VPN_SERVER change, les liens API/Winbox affichés reflètent la nouvelle adresse.
    res.json({
      routers: routers.map((r) => ({
        ...r,
        vpnCredential: r.vpnCredential
          ? { ...r.vpnCredential, vpnServer: env.vpnServer }
          : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, validate(createSchema), async (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;
    const { router, script, mikhmonAdminPassword } = await createRouter(req.user, {
      ...req.body,
      idempotencyKey,
    });
    res.status(201).json({
      router: serializeRouter(router),
      script,
      mikhmonAdminPassword,
      message: "Routeur créé avec succès",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const router = await getRouterById(req.user.id, req.params.id);
    res.json({ router: serializeRouter(router) });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/script", requireAuth, async (req, res, next) => {
  try {
    const router = await getRouterById(req.user.id, req.params.id);
    // Le mot de passe VPN d'origine est sécurisé par hashage unidirectionnel (bcrypt).
    // On renvoie un modèle d'information, et un endpoint dédié /rotate-script est disponible
    // pour obtenir un script complet avec un nouveau mot de passe régénéré à la demande.
    const script = buildMikrotikScript({
      vpnServer: env.vpnServer, // adresse toujours à jour, pas le snapshot en base
      username: router.vpnCredential.username,
      password: "<REGENEREZ_VOTRE_SCRIPT_VIA_BOUTON_REGENERER>",
      routerName: router.name,
      routerOsFamily: router.routerOsFamily,
      ipsecSecret: env.vpnIpsecSecret,
      radiusSecret: router.radiusNas ? "<REGENEREZ_VIA_ROTATE_SCRIPT>" : null,
      radiusServer: env.radiusServer,
      radiusPort: env.radiusAuthPort,
    });
    res.json({ script, notice: "Pour régénérer un script actif avec de nouveaux secrets, utilisez /api/routers/:id/rotate-script" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/rotate-script", requireAuth, async (req, res, next) => {
  try {
    const { script, newPassword } = await rotateVpnPassword(req.user.id, req.params.id);
    res.json({
      script,
      message: "Nouveau mot de passe VPN généré et script réactualisé avec succès",
    });
  } catch (err) {
    next(err);
  }
});

const renewSchema = z.object({
  idempotencyKey: z.string().min(4).optional(),
});

router.post("/:id/renew", requireAuth, validate(renewSchema), async (req, res, next) => {
  try {
    const router = await getRouterById(req.user.id, req.params.id);
    const idempotencyKey = req.headers["idempotency-key"] || req.body.idempotencyKey;
    const { subscription, transaction } = await renewRouter(req.user, router, { idempotencyKey });
    res.json({
      message: "Routeur renouvelé pour 30 jours",
      subscription,
      balanceAfter: transaction.balanceAfter,
    });
  } catch (err) {
    next(err);
  }
});

const autoRenewSchema = z.object({
  autoRenew: z.boolean(),
});

router.patch("/:id/auto-renew", requireAuth, validate(autoRenewSchema), async (req, res, next) => {
  try {
    const subscription = await setAutoRenew(req.user.id, req.params.id, req.body.autoRenew);
    res.json({ subscription });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/ping", requireAuth, async (req, res, next) => {
  try {
    const ping = await pingRouter(req.user.id, req.params.id);
    res.json({ ping });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await deleteRouter(req.user.id, req.params.id);
    res.json({ message: "Routeur supprimé" });
  } catch (err) {
    next(err);
  }
});

function serializeRouter(router) {
  return {
    id: router.id,
    name: router.name,
    routerOsFamily: router.routerOsFamily,
    status: router.status,
    apiPort: router.apiPort,
    winboxPort: router.winboxPort,
    createdAt: router.createdAt,
    updatedAt: router.updatedAt,
    vpnCredential: router.vpnCredential
      ? {
          vpnServer: env.vpnServer, // adresse toujours à jour, pas le snapshot en base
          vpnIp: router.vpnCredential.vpnIp,
          username: router.vpnCredential.username,
          protocol: router.vpnCredential.protocol,
        }
      : null,
    mikhmonWorkspace: router.mikhmonWorkspace
      ? {
          url: router.mikhmonWorkspace.url,
          webfigUrl: router.mikhmonWorkspace.webfigUrl,
          name: router.mikhmonWorkspace.name,
          version: router.mikhmonWorkspace.version,
        }
      : null,
    radiusNas: router.radiusNas
      ? {
          id: router.radiusNas.id,
          nasIdentifier: router.radiusNas.nasIdentifier,
          status: router.radiusNas.status,
        }
      : null,
    subscription: router.subscription
      ? {
          id: router.subscription.id,
          monthlyPrice: router.subscription.monthlyPrice,
          startedAt: router.subscription.startedAt,
          expiresAt: router.subscription.expiresAt,
          autoRenew: router.subscription.autoRenew,
          status: router.subscription.status,
          lastRenewedAt: router.subscription.lastRenewedAt,
          renewals: router.subscription.renewals,
        }
      : null,
  };
}

module.exports = { router };
