const cron = require("node-cron");
const { prisma } = require("../lib/prisma");
const { autoRenewSubscription } = require("../services/router.service");
const { notify } = require("../services/notification.service");

/**
 * Traitement nocturne (2h du matin, fuseau configurable) :
 * 1. Marquage EXPIRING_SOON à J-3 + notification
 * 2. Notification au jour J
 * 3. À expiration : renouvellement auto si solde suffisant, sinon suspension
 */
async function runNightlyRenewal() {
  const now = new Date();
  console.log(`[JOB] Traitement nocturne des abonnements - ${now.toISOString()}`);

  const subscriptions = await prisma.subscription.findMany({
    include: { router: { include: { user: true } } },
  });

  for (const sub of subscriptions) {
    if (sub.status === "EXPIRED") continue;

    const daysLeft = Math.ceil((sub.expiresAt - now) / (24 * 60 * 60 * 1000));
    const user = sub.router.user;

    // J-3 à J-1 : alerte d'expiration imminente et passage en EXPIRING_SOON
    if (daysLeft <= 3 && daysLeft > 0) {
      if (sub.status !== "EXPIRING_SOON") {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRING_SOON" },
        });
      }
      await notify(user, "EXPIRATION_ALERT", {
        channel: "EMAIL",
        subject: "Votre service expire bientôt",
        text: `Le routeur ${sub.router.name} expire dans ${daysLeft} jour(s). Rechargez votre wallet ou activez le renouvellement automatique.`,
      });
      continue;
    }

    // Jour J : alerte finale
    if (daysLeft <= 0) {
      if (sub.autoRenew) {
        await autoRenewSubscription(sub);
      } else {
        await prisma.$transaction([
          prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } }),
          prisma.router.update({
            where: { id: sub.routerId },
            data: { status: "SUSPENDED" },
          }),
        ]);
        await notify(user, "SUBSCRIPTION_EXPIRED", {
          channel: "EMAIL",
          subject: "Service expiré",
          text: `Le service du routeur ${sub.router.name} est expiré. Le VPN est suspendu. Renouvelez pour réactiver immédiatement.`,
        });
      }
    }
  }
  console.log("[JOB] Terminé");
}

function startJobs() {
  // 2h du matin tous les jours (configurable via CRON_RENEWAL en prod)
  cron.schedule("0 2 * * *", () => {
    runNightlyRenewal().catch((err) =>
      console.error("[JOB] Erreur du traitement nocturne:", err)
    );
  });
  console.log("[JOB] Planification du renouvellement nocturne (02:00) active");
}

module.exports = { startJobs, runNightlyRenewal };
