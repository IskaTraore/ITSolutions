const { prisma } = require("../lib/prisma");
const { env } = require("../config/env");
const { Errors } = require("../lib/errors");
const { debit } = require("./wallet.service");
const { resolveWorkspaceForRouter } = require("./mikhmon.service");
const { buildMikrotikScript } = require("./script.service");
const { allocatePort, allocateVpnIp } = require("../lib/ports");
const {
  hashPassword,
  generatePassword,
  generateVerificationToken,
  sha256,
} = require("../lib/security");
const { vpnUsername, isValidName, idempotencyKeyForRouter } = require("../lib/ids");
const { notify } = require("./notification.service");
const { pingHost } = require("../lib/ping");
const radius = require("./radius.service");

const MONTHLY_PRICE = 23000;
const SUBSCRIPTION_DAYS = 30;

/**
 * Séquence complète de création d'un routeur (spec §III.3) :
 * idempotence -> solde -> transaction atomique (débit, routeur, abonnement,
 * ports, VPN, Mikhmon) -> script -> notification.
 */
async function createRouter(user, input) {
  // 1. Validation métier du nom
  if (!isValidName(input.name)) {
    throw Errors.validation([
      { field: "name", message: "Le nom doit contenir 3 à 32 lettres ou chiffres, sans espace ni caractère spécial" },
    ]);
  }
  const nameTaken = await prisma.router.findFirst({ where: { userId: user.id, name: input.name } });
  if (nameTaken) throw Errors.routerNameTaken();

  // 2. Contrôles utilisateur
  if (user.status === "SUSPENDED") throw Errors.userSuspended();
  if (!user.emailVerified) throw Errors.emailNotVerified();

  // 3. Idempotence : clé basée sur l'action ou fournie par le client
  const customIdempotencyKey = input.idempotencyKey;
  const idempotencyKey = customIdempotencyKey
    ? idempotencyKeyForRouter("create-router", customIdempotencyKey)
    : idempotencyKeyForRouter(`create-router-${user.id}-${input.name}`);

  // 4. Vérification du solde avant toute écriture
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const balance = wallet?.balance ?? 0;
  if (balance < MONTHLY_PRICE) {
    throw Errors.walletInsufficient(MONTHLY_PRICE - balance);
  }

  // 5. Boucle de réessai automatique pour l'allocation de ports / VPN IP en cas de concurrence
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    try {
      const apiPort = await allocatePort({ start: 40000, end: 49999 }, "apiPort");
      const winboxPort = await allocatePort({ start: 50000, end: 59999 }, "winboxPort");

      const txResult =
        await prisma.$transaction(async (tx) => {
          const debited = await debit({
            userId: user.id,
            amount: MONTHLY_PRICE,
            type: "ROUTER_CREATION_DEBIT",
            description: `Création du routeur ${input.name} (30 jours)`,
            idempotencyKey,
            relatedRouterId: undefined,
          }, tx);

          if (debited.duplicated) {
            if (debited.transaction.relatedRouterId) {
              const existingRouter = await tx.router.findUnique({
                where: { id: debited.transaction.relatedRouterId },
                include: { vpnCredential: true, subscription: true, mikhmonWorkspace: true },
              });
              if (existingRouter) {
                return {
                  router: existingRouter,
                  workspace: existingRouter.mikhmonWorkspace,
                  plainPassword: null,
                  plainPasswordVpn: null,
                  isDuplicate: true,
                };
              }
            }
            throw Errors.conflict("IDEMPOTENCY_KEY_DUPLICATED", "Cette clé d'idempotence a déjà été utilisée");
          }

          const debitId = debited.transaction.id;

          const vpnIp = await allocateVpnIp();
          const vpnUser = vpnUsername(input.name);
          const plainPasswordVpn = generatePassword(32);

          const { workspace, adminPassword } = await resolveWorkspaceForRouter(
            user.id,
            input.routerOsFamily,
            input.name,
            tx
          );

          // adminPassword est fourni uniquement lors de la création d'un nouveau workspace (null si réutilisé)
          const mikhmonAdminPassword = adminPassword || null;

          const router = await tx.router.create({
            data: {
              userId: user.id,
              name: input.name,
              routerOsFamily: input.routerOsFamily,
              status: "ACTIVE",
              apiPort,
              winboxPort,
              mikhmonWorkspaceId: workspace.id,
              vpnCredential: {
                create: {
                  vpnServer: env.vpnServer,
                  username: vpnUser,
                  passwordHash: await hashPassword(plainPasswordVpn),
                  vpnIp,
                  protocol: "L2TP",
                },
              },
              subscription: {
                create: {
                  monthlyPrice: MONTHLY_PRICE,
                  startedAt: new Date(),
                  expiresAt: addDays(new Date(), SUBSCRIPTION_DAYS),
                  autoRenew: user.autoRenew,
                  status: "ACTIVE",
                },
              },
            },
            include: { vpnCredential: true, subscription: true, mikhmonWorkspace: true },
          });

          await tx.walletTransaction.update({
            where: { id: debitId },
            data: { relatedRouterId: router.id },
          });

          return {
            router,
            workspace,
            plainPassword: mikhmonAdminPassword,
            plainPasswordVpn,
            isDuplicate: false,
          };
        });

      if (txResult.isDuplicate) {
        return { router: txResult.router, script: null, mikhmonAdminPassword: null, duplicated: true };
      }

      const { router, workspace, plainPassword, plainPasswordVpn } = txResult;

      // 6. Création automatique du NAS RADIUS lié au routeur
      let nasResult = null;
      try {
        nasResult = await radius.createNas(user.id, {
          routerId: router.id,
          name: `${input.name}-${router.id.slice(-6)}`,
          address: router.vpnCredential?.vpnIp || null,
        });
      } catch (nasErr) {
        // Non bloquant : le routeur est créable sans NAS RADIUS
        console.warn(`[ROUTER] NAS RADIUS non créé pour ${input.name}: ${nasErr.message}`);
      }

      const script = buildMikrotikScript({
        vpnServer: env.vpnServer,
        username: router.vpnCredential.username,
        password: plainPasswordVpn,
        routerName: router.name,
        routerOsFamily: router.routerOsFamily,
        ipsecSecret: env.vpnIpsecSecret,
        radiusSecret: nasResult?.secret || null,
        radiusServer: env.radiusServer,
        radiusPort: env.radiusAuthPort,
      });

      await notify(user, "ROUTER_ACTIVE", {
        channel: "EMAIL",
        subject: "Routeur créé avec succès",
        text: `Votre routeur ${router.name} est actif.\nURL Mikhmon : ${workspace.url}\nLe script de configuration vous est communiqué dans votre tableau de bord.`,
      });

      return { router, script, mikhmonAdminPassword: plainPassword };
    } catch (err) {
      if (err?.code === "P2002" && attempts < MAX_ATTEMPTS) {
        console.warn(`[ROUTER] Conflit de port/IP unique détecté (tentative ${attempts}/${MAX_ATTEMPTS}), réallocation...`);
        continue;
      }
      throw err;
    }
  }
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function listRouters(userId) {
  return prisma.router.findMany({
    where: { userId },
    include: {
      vpnCredential: { select: { vpnServer: true, vpnIp: true, username: true, protocol: true } },
      mikhmonWorkspace: { select: { url: true, webfigUrl: true, name: true, version: true } },
      subscription: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getRouterById(userId, routerId) {
  const router = await prisma.router.findFirst({
    where: { id: routerId, userId },
    include: {
      vpnCredential: { select: { vpnServer: true, vpnIp: true, username: true, protocol: true } },
      mikhmonWorkspace: { select: { url: true, webfigUrl: true, name: true, version: true } },
      radiusNas: { select: { id: true, nasIdentifier: true, status: true } },
      subscription: { include: { renewals: { orderBy: { createdAt: "desc" } } } },
    },
  });
  if (!router) throw Errors.notFound("Routeur introuvable");
  return router;
}

/**
 * Renouvellement manuel : débit + prolongation de 30 jours + réactivation.
 */
async function renewRouter(user, router, options = {}) {
  if (router.subscription.status === "ACTIVE" && router.subscription.expiresAt > new Date()) {
    // Renouvellement anticipé : on prolonge quand même (30j depuis l'expiration actuelle)
  }
  const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
  const balance = wallet?.balance ?? 0;
  if (balance < MONTHLY_PRICE) {
    throw Errors.walletInsufficient(MONTHLY_PRICE - balance);
  }

  const customIdempotencyKey = options.idempotencyKey || options.customIdempotencyKey;
  const idempotencyKey = customIdempotencyKey
    ? idempotencyKeyForRouter("renew-router", customIdempotencyKey)
    : idempotencyKeyForRouter(`renew-router-${router.id}-${Math.floor(Date.now() / 3600000)}`);

  return prisma.$transaction(async (tx) => {
    const debited = await debit({
      userId: user.id,
      amount: MONTHLY_PRICE,
      type: "ROUTER_RENEWAL_DEBIT",
      description: `Renouvellement du routeur ${router.name}`,
      idempotencyKey,
      relatedRouterId: router.id,
    }, tx);

    if (debited.duplicated) {
      return { subscription: router.subscription, transaction: debited.transaction, duplicated: true };
    }

    const base = router.subscription.expiresAt > new Date()
      ? router.subscription.expiresAt
      : new Date();
    const newExpiry = addDays(base, SUBSCRIPTION_DAYS);

    const subscription = await tx.subscription.update({
      where: { routerId: router.id },
      data: {
        expiresAt: newExpiry,
        status: "ACTIVE",
        lastRenewedAt: new Date(),
      },
    });
    await tx.subscriptionRenewal.create({
      data: {
        subscriptionId: subscription.id,
        amount: MONTHLY_PRICE,
        method: "MANUAL",
      },
    });
    await tx.router.update({
      where: { id: router.id },
      data: { status: "ACTIVE" },
    });
    return { subscription, transaction: debited.transaction };
  });
}

/** Renouvellement automatique (utilisé par le job nocturne). */
async function autoRenewSubscription(subscription) {
  const router = await prisma.router.findUnique({
    where: { id: subscription.routerId },
    include: { user: true },
  });
  if (!router) return null;

  const wallet = await prisma.wallet.findUnique({ where: { userId: router.userId } });
  if ((wallet?.balance ?? 0) < subscription.monthlyPrice) {
    // Solde insuffisant -> suspension
    const updated = await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "EXPIRED" },
      }),
      prisma.router.update({
        where: { id: router.id },
        data: { status: "SUSPENDED" },
      }),
    ]);
    await notify(router.user, "SUBSCRIPTION_EXPIRED", {
      channel: "EMAIL",
      subject: "Service suspendu",
      text: `Le routeur ${router.name} a expiré faute de solde suffisant. Rechargez votre wallet et renouvelez pour réactiver le service.`,
    });
    return { status: "SUSPENDED" };
  }

  const dateKey = subscription.expiresAt ? new Date(subscription.expiresAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const idempotencyKey = idempotencyKeyForRouter(`auto-renew-${subscription.id}-${dateKey}`);
  const result = await prisma.$transaction(async (tx) => {
    await debit({
      userId: router.userId,
      amount: subscription.monthlyPrice,
      type: "ROUTER_RENEWAL_DEBIT",
      description: `Renouvellement automatique du routeur ${router.name}`,
      idempotencyKey,
      relatedRouterId: router.id,
    }, tx);
    const base = subscription.expiresAt > new Date() ? subscription.expiresAt : new Date();
    const newExpiry = addDays(base, SUBSCRIPTION_DAYS);
    const sub = await tx.subscription.update({
      where: { id: subscription.id },
      data: { expiresAt: newExpiry, status: "ACTIVE", lastRenewedAt: new Date() },
    });
    await tx.subscriptionRenewal.create({
      data: { subscriptionId: sub.id, amount: sub.monthlyPrice, method: "AUTO" },
    });
    await tx.router.update({ where: { id: router.id }, data: { status: "ACTIVE" } });
    return sub;
  });

  await notify(router.user, "SUBSCRIPTION_RENEWED", {
    channel: "EMAIL",
    subject: "Service renouvelé automatiquement",
    text: `Le service du routeur ${router.name} a été renouvelé automatiquement pour 30 jours.`,
  });
  return { status: "RENEWED", subscription: result };
}

async function setAutoRenew(userId, routerId, autoRenew) {
  const router = await prisma.router.findFirst({ where: { id: routerId, userId } });
  if (!router) throw Errors.notFound("Routeur introuvable");

  const subscription = await prisma.subscription.update({
    where: { routerId },
    data: { autoRenew },
  });
  return subscription;
}

/**
 * Ping ICMP réel du routeur : la cible est l'IP VPN du routeur (10.8.0.x),
 * joignable depuis le serveur de VPN. Sans IP VPN connue, on retombe sur le
 * serveur VPN. L'hôte provient toujours de la base, jamais du client.
 */
async function pingRouter(userId, routerId) {
  const router = await prisma.router.findFirst({
    where: { id: routerId, userId },
    include: { vpnCredential: true },
  });
  if (!router) throw Errors.notFound("Routeur introuvable");

  const target = router.vpnCredential?.vpnIp || env.vpnServer;
  const { reachable, latencyMs } = await pingHost(target);
  return { target, reachable, latencyMs };
}

async function deleteRouter(userId, routerId) {
  const router = await prisma.router.findFirst({
    where: { id: routerId, userId },
    include: {
      radiusNas: true,
      subscription: { include: { renewals: true } },
      vpnCredential: true,
    },
  });
  if (!router) throw Errors.notFound("Routeur introuvable");

  return prisma.$transaction(async (tx) => {
    // 1. Délier le NAS RADIUS associé avant suppression du routeur
    if (router.radiusNasId) {
      await tx.router.update({
        where: { id: routerId },
        data: { radiusNasId: null },
      });
    }

    // 2. Supprimer les renouvellements et l'abonnement
    if (router.subscription) {
      await tx.subscriptionRenewal.deleteMany({
        where: { subscriptionId: router.subscription.id },
      });
      await tx.subscription.delete({
        where: { id: router.subscription.id },
      });
    }

    // 3. Supprimer les identifiants VPN
    if (router.vpnCredential) {
      await tx.vpnCredential.delete({
        where: { id: router.vpnCredential.id },
      });
    }

    // 4. Détacher les transactions liées
    await tx.walletTransaction.updateMany({
      where: { relatedRouterId: routerId },
      data: { relatedRouterId: null },
    });

    // 5. Supprimer le routeur
    const deleted = await tx.router.delete({ where: { id: routerId } });
    return deleted;
  });
}

/**
 * Régénère un nouveau mot de passe VPN haute entropie pour un routeur,
 * met à jour le hash en base de données et retourne un script de configuration à jour.
 */
async function rotateVpnPassword(userId, routerId) {
  const router = await prisma.router.findFirst({
    where: { id: routerId, userId },
    include: { vpnCredential: true, radiusNas: true },
  });
  if (!router || !router.vpnCredential) {
    throw Errors.notFound("Routeur ou identifiants VPN introuvables");
  }

  const newPlainPasswordVpn = generatePassword(32);
  const passwordHash = await hashPassword(newPlainPasswordVpn);

  await prisma.vpnCredential.update({
    where: { id: router.vpnCredential.id },
    data: { passwordHash },
  });

  // Rotation du secret RADIUS synchronisé et stocké en base
  let newRadiusSecret = null;
  if (router.radiusNas) {
    const rot = await radius.rotateNasSecret(userId, router.radiusNas.id);
    newRadiusSecret = rot.secret;
  }

  const script = buildMikrotikScript({
    vpnServer: env.vpnServer, // adresse toujours à jour, pas le snapshot en base
    username: router.vpnCredential.username,
    password: newPlainPasswordVpn,
    routerName: router.name,
    routerOsFamily: router.routerOsFamily,
    ipsecSecret: env.vpnIpsecSecret,
    radiusSecret: newRadiusSecret,
    radiusServer: env.radiusServer,
    radiusPort: env.radiusAuthPort,
  });

  return { script, newPassword: newPlainPasswordVpn };
}

module.exports = {
  createRouter,
  listRouters,
  getRouterById,
  renewRouter,
  autoRenewSubscription,
  setAutoRenew,
  pingRouter,
  deleteRouter,
  rotateVpnPassword,
  MONTHLY_PRICE,
  SUBSCRIPTION_DAYS,
};
