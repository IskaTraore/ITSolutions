const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { requireAuth } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { credit } = require("../services/wallet.service");
const { generateVerificationToken } = require("../lib/security");
const crypto = require("crypto");

const router = Router();

// Toutes les routes admin exigent le rôle ADMIN
router.use(requireAuth, (req, res, next) => {
  if (req.user.role !== "ADMIN") return next(Errors.forbidden());
  next();
});

// GET /api/admin/users
router.get("/users", async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(search
          ? { OR: [{ email: { contains: search } }, { username: { contains: search } }] }
          : {}),
        ...(status ? { status } : {}),
      },
      include: {
        wallet: true,
        _count: { select: { routers: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/suspend
const suspendSchema = z.object({
  suspended: z.boolean(),
});

router.patch("/users/:id/suspend", validate(suspendSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw Errors.notFound("Utilisateur introuvable");
    if (user.role === "ADMIN") throw Errors.forbidden("Impossible de suspendre un administrateur");

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: req.body.suspended ? "SUSPENDED" : "ACTIVE" },
    });

    // Une suspension doit être immédiate, y compris pour les sessions déjà
    // établies. Les sessions restent journalisées mais ne sont plus valides.
    if (req.body.suspended) {
      await prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: req.body.suspended ? "USER_SUSPENDED" : "USER_REACTIVATED",
        targetType: "User",
        targetId: user.id,
        metadata: { username: user.username },
      },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/routers
router.get("/routers", async (req, res, next) => {
  try {
    const { status, routerOsFamily } = req.query;
    const routers = await prisma.router.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(routerOsFamily ? { routerOsFamily } : {}),
      },
      include: {
        user: { select: { username: true, email: true } },
        subscription: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ routers });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/payments
router.get("/payments", async (req, res, next) => {
  try {
    const { status } = req.query;
    const payments = await prisma.payment.findMany({
      where: status ? { status } : {},
      include: { user: { select: { username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/wallet/:userId/adjust
const adjustSchema = z.object({
  amount: z.number().int().min(-10000000).max(10000000),
  reason: z.string().min(3),
});

router.post("/wallet/:userId/adjust", validate(adjustSchema), async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw Errors.notFound("Utilisateur introuvable");

    const { transaction } =
      amount >= 0
        ? await credit({
            userId: user.id,
            amount,
            type: "ADMIN_ADJUSTMENT",
            description: `Ajustement admin : ${reason}`,
            idempotencyKey: `admin-adjust-${user.id}-${Date.now()}`,
          })
        : await (async () => {
            const { debit } = require("../services/wallet.service");
            return debit({
              userId: user.id,
              amount: -amount,
              type: "ADMIN_ADJUSTMENT",
              description: `Ajustement admin : ${reason}`,
              idempotencyKey: `admin-adjust-${user.id}-${Date.now()}`,
            });
          })();

    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "MANUAL_ADJUSTMENT",
        targetType: "Wallet",
        targetId: user.id,
        metadata: { amount, reason },
      },
    });

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs
router.get("/audit-logs", async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats - métriques du dashboard admin
router.get("/stats", async (req, res, next) => {
  try {
    const [activeUsers, activeRouters, monthRevenue, pendingTickets] = await Promise.all([
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.router.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "CONFIRMED", createdAt: { gte: startOfMonth() } },
      }),
      prisma.notification.count({ where: { status: "PENDING" } }),
    ]);
    res.json({
      stats: {
        activeUsers,
        activeRouters,
        monthRevenue: monthRevenue._sum.amount ?? 0,
        pendingTickets,
      },
    });
  } catch (err) {
    next(err);
  }
});

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

module.exports = { router };
