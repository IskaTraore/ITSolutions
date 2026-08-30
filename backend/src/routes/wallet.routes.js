const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { getWalletWithHistory, credit } = require("../services/wallet.service");
const { notify } = require("../services/notification.service");
const { env } = require("../config/env");

const router = Router();

// GET /api/wallet - solde + historique
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { wallet, transactions } = await getWalletWithHistory(req.user.id, {
      limit: 50,
    });
    res.json({ wallet, transactions });
  } catch (err) {
    next(err);
  }
});

const rechargeSchema = z.object({
  amount: z.number().int().min(1000, "Montant minimum : 1 000 FC").max(10000000),
  method: z.enum(["MOBILE_MONEY", "CARD"]),
  provider: z.enum(["orange_money", "moov_money", "card"]),
});

// POST /api/wallet/recharge - initier une recharge
router.post("/recharge", requireAuth, validate(rechargeSchema), async (req, res, next) => {
  try {
    const { amount, method, provider } = req.body;

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        amount,
        method,
        provider,
        status: "PENDING",
      },
    });

    // Intégration PSP : en dev, simulation d'un lien de paiement
    const devCheckoutUrl = `${req.protocol}://${req.get("host")}/api/wallet/simulate/${payment.id}`;
    res.status(201).json({
      payment,
      checkoutUrl: devCheckoutUrl, // TODO: URL PSP réelle (KomiPay, Wave, carte)
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/simulate/:paymentId - SIMULATION du webhook PSP (développement uniquement)
router.post("/simulate/:paymentId", requireAuth, async (req, res, next) => {
  try {
    if (env.nodeEnv === "production") {
      throw Errors.forbidden("La simulation de paiement n'est pas autorisée en production");
    }

    const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId } });
    if (!payment) throw Errors.notFound("Paiement introuvable");
    if (payment.userId !== req.user.id) throw Errors.forbidden();

    const result = await confirmPayment(payment);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const crypto = require("crypto");

/**
 * Vérifie la signature de sécurité du webhook envoyé par le PSP.
 * Accepte HMAC-SHA256 ou jeton secret pré-partagé.
 */
function verifyWebhookSignature(req) {
  const signature =
    req.headers["x-webhook-signature"] ||
    req.headers["x-signature"] ||
    req.query.secret;

  if (!signature) return false;
  if (signature === env.webhookSecret) return true;

  try {
    const expectedHmac = crypto
      .createHmac("sha256", env.webhookSecret)
      .update(JSON.stringify(req.body || {}))
      .digest("hex");

    if (signature.length !== expectedHmac.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

// POST /api/wallet/webhook/:provider - webhook de confirmation PSP avec contrôle de signature
router.post("/webhook/:provider", async (req, res, next) => {
  try {
    // Contrôle strict de la signature
    if (!verifyWebhookSignature(req)) {
      throw Errors.forbidden("Signature de webhook invalide");
    }

    const paymentId = req.body?.paymentId;
    const providerRef = req.body?.providerRef;

    if (!paymentId && !providerRef) {
      throw Errors.validation([
        { field: "paymentId", message: "Identifiant de paiement (paymentId ou providerRef) obligatoire" },
      ]);
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : await prisma.payment.findUnique({ where: { providerRef } });

    if (!payment) {
      return res.status(404).json({ error: { code: "NOT_FOUND", message: "Paiement introuvable" } });
    }
    const result = await confirmPayment(payment);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Confirme un paiement PENDING : crédite le wallet une seule fois (idempotent)
 * via la clé d'idempotence du paiement.
 */
async function confirmPayment(payment) {
  const idempotencyKey = `payment-${payment.id}`;

  const { updatedPayment, transaction, alreadyProcessed } = await prisma.$transaction(async (tx) => {
    // Vérification et mise à jour atomique du statut PENDING
    const updateResult = await tx.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    if (updateResult.count === 0) {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      return { updatedPayment: current || payment, transaction: null, alreadyProcessed: true };
    }

    const { transaction } = await credit({
      userId: payment.userId,
      amount: payment.amount,
      type: "RECHARGE",
      description: `Recharge wallet (${payment.provider})`,
      idempotencyKey,
      paymentId: payment.id,
    }, tx);

    const freshPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    return { updatedPayment: freshPayment, transaction, alreadyProcessed: false };
  });

  if (alreadyProcessed) {
    return { payment: updatedPayment, alreadyProcessed: true };
  }

  const user = await prisma.user.findUnique({ where: { id: payment.userId } });
  if (user && transaction) {
    await notify(user, "PAYMENT_CONFIRMED", {
      channel: "EMAIL",
      subject: "Recharge confirmée",
      text: `Votre wallet a été crédité de ${payment.amount} FC. Nouveau solde : ${transaction.balanceAfter} FC.`,
    });
  }

  return { payment: updatedPayment, transaction };
}

module.exports = { router, confirmPayment };
