/**
 * Service de provisioning RADIUS — synchronise les NAS entre le backend
 * et la configuration FreeRADIUS (clients.conf).
 *
 * Architecture :
 *   Backend PostgreSQL ←→ FreeRADIUS ←→ MikroTik (NAS)
 *
 * FreeRADIUS lit directement dans PostgreSQL pour l'authentification (rlm_sql).
 * Ce service gère :
 *   1. L'écriture des secrets NAS dans la DB (déjà fait par radius.service.js)
 *   2. La synchronisation vers clients.conf (si FreeRADIUS est sur la même machine)
 *   3. Le rechargement de FreeRADIUS après modification
 */

const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { hashPassword, generatePassword } = require("../lib/security");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FREERADIUS_CLIENTS_CONF = process.env.FREERADIUS_CLIENTS_CONF || "/etc/freeradius/3.0/clients.conf";
const FREERADIUS_MODS_SQL = process.env.FREERADIUS_MODS_SQL || "/etc/freeradius/3.0/mods-enabled/sql";

/**
 * Synchronise un NAS vers FreeRADIUS.
 * Écrit l'entrée dans clients.conf et recharge le service.
 *
 * @param {string} ownerId - ID du propriétaire
 * @param {string} nasId - ID du NAS dans la DB
 * @returns {{ synced: boolean, message: string }}
 */
async function syncNasToFreeRADIUS(ownerId, nasId) {
  const nas = await prisma.radiusNas.findFirst({
    where: { id: nasId, ownerId },
  });
  if (!nas) throw Errors.notFound("NAS introuvable");

  // Vérifier que clients.conf existe
  if (!fs.existsSync(FREERADIUS_CLIENTS_CONF)) {
    return {
      synced: false,
      message: `clients.conf introuvable à ${FREERADIUS_CLIENTS_CONF}. FreeRADIUS n'est peut-être pas installé sur cette machine.`,
    };
  }

  // Lire le secret en clair depuis la dernière création/rotation
  // Le secret est stocké hashé en DB, on ne peut pas le récupérer.
  // Il faut le passer en paramètre ou le stocker temporairement.
  // Pour cette raison, on génère un nouveau secret et on le retourne.
  const secret = generateSecret();

  // Mettre à jour le hash en DB
  await prisma.radiusNas.update({
    where: { id: nasId },
    data: {
      secretHash: await hashPassword(secret),
      secretRotatedAt: new Date(),
    },
  });

  // Ajouter/mettre à jour l'entrée dans clients.conf
  const clientBlock = buildClientBlock(nas.nasIdentifier, nas.address || "dynamic", secret);
  appendOrUpdateClient(FREERADIUS_CLIENTS_CONF, nas.nasIdentifier, clientBlock);

  // Recharger FreeRADIUS
  const reloaded = reloadFreeRADIUS();

  return {
    synced: reloaded,
    secret,
    message: reloaded
      ? `NAS "${nas.nasIdentifier}" synchronisé avec FreeRADIUS. Secret généré.`
      : `NAS "${nas.nasIdentifier}" ajouté à clients.conf mais FreeRADIUS n'a pas pu être rechargé automatiquement. Rechargez manuellement : systemctl reload freeradius`,
  };
}

/**
 * Supprime un NAS de clients.conf.
 */
async function removeNasFromFreeRADIUS(nasIdentifier) {
  if (!fs.existsSync(FREERADIUS_CLIENTS_CONF)) return;

  let content = fs.readFileSync(FREERADIUS_CLIENTS_CONF, "utf-8");
  const pattern = new RegExp(
    `\\nclient\\s+${escapeRegex(nasIdentifier)}\\s*\\{[^}]*\\}\\s*`,
    "g"
  );
  content = content.replace(pattern, "\n");
  fs.writeFileSync(FREERADIUS_CLIENTS_CONF, content, "utf-8");

  reloadFreeRADIUS();
}

/**
 * Force la régénération complète de clients.conf à partir de la DB.
 * Utile en cas de désynchronisation.
 */
async function regenerateClientsConf() {
  if (!fs.existsSync(FREERADIUS_CLIENTS_CONF)) {
    throw Errors.validation([{ field: "path", message: `clients.conf introuvable : ${FREERADIUS_CLIENTS_CONF}` }]);
  }

  const nasList = await prisma.radiusNas.findMany({
    where: { status: "ACTIVE" },
    orderBy: { nasIdentifier: "asc" },
  });

  // En-tête
  let content = `# ═══════════════════════════════════════════════════════════════════════════════\n`;
  content += `# clients.conf — Généré automatiquement par ITSOLUTIONS Backend\n`;
  content += `# Dernière génération : ${new Date().toISOString()}\n`;
  content += `# ⚠️  NE PAS ÉDITER MANUELLEMENT — ce fichier est régénéré par le backend.\n`;
  content += `# ═══════════════════════════════════════════════════════════════════════════════\n\n`;

  // Client par défaut pour les NAS non enregistrés
  content += `client dynamic_default {\n`;
  content += `    ipaddr = dynamic\n`;
  content += `    secret = ${generateSecret()}\n`;
  content += `    require_message_authenticator = yes\n`;
  content += `    limit {\n`;
  content += `        max_connections = 16\n`;
  content += `        lifetime = 0\n`;
  content += `        idle_timeout = 30\n`;
  content += `    }\n`;
  content += `}\n\n`;

  // Un client par NAS
  for (const nas of nasList) {
    const secret = generateSecret();

    // Mettre à jour le secret hashé en DB
    await prisma.radiusNas.update({
      where: { id: nas.id },
      data: {
        secretHash: await hashPassword(secret),
        secretRotatedAt: new Date(),
      },
    });

    content += buildClientBlock(nas.nasIdentifier, nas.address || "dynamic", secret);
    content += `\n`;
  }

  // Backup de l'ancien fichier
  const backupPath = FREERADIUS_CLIENTS_CONF + ".bak." + Date.now();
  fs.copyFileSync(FREERADIUS_CLIENTS_CONF, backupPath);

  fs.writeFileSync(FREERADIUS_CLIENTS_CONF, content, "utf-8");
  const reloaded = reloadFreeRADIUS();

  return {
    nasCount: nasList.length,
    reloaded,
    backupPath,
    message: `${nasList.length} NAS régénérés dans clients.conf. Backup : ${backupPath}`,
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function buildClientBlock(nasIdentifier, ipAddr, secret) {
  return `client ${nasIdentifier} {\n    ipaddr = ${ipAddr}\n    secret = ${secret}\n    require_message_authenticator = yes\n    shortname = ${nasIdentifier}\n    limit {\n        max_connections = 16\n        lifetime = 0\n        idle_timeout = 30\n    }\n}\n`;
}

function appendOrUpdateClient(filePath, nasIdentifier, newBlock) {
  let content = fs.readFileSync(filePath, "utf-8");
  const pattern = new RegExp(
    `\\nclient\\s+${escapeRegex(nasIdentifier)}\\s*\\{[^}]*\\}\\s*`,
    "g"
  );

  if (pattern.test(content)) {
    // Remplacer le bloc existant
    content = content.replace(pattern, "\n" + newBlock + "\n");
  } else {
    // Ajouter à la fin
    content += `\n${newBlock}\n`;
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

function reloadFreeRADIUS() {
  if (process.platform === "win32") {
    console.warn("[RADIUS-PROVISION] Ignoré reloadFreeRADIUS sur environnement Windows");
    return false;
  }
  try {
    // Essayer systemctl (Debian/Ubuntu)
    execSync("systemctl reload freeradius 2>/dev/null || service freeradius reload 2>/dev/null", {
      timeout: 10000,
      stdio: "pipe",
    });
    return true;
  } catch {
    try {
      // Essayer freeradius -X en mode debug (pas idéal en prod mais fonctionnel)
      execSync("kill -HUP $(pidof freeradius) 2>/dev/null", {
        timeout: 5000,
        stdio: "pipe",
      });
      return true;
    } catch {
      return false;
    }
  }
}

function generateSecret() {
  const crypto = require("crypto");
  return crypto.randomBytes(16).toString("hex");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  syncNasToFreeRADIUS,
  removeNasFromFreeRADIUS,
  regenerateClientsConf,
};
