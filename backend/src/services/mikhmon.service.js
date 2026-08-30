const { prisma } = require("../lib/prisma");
const { buildMikhmonUrl, buildWebfigUrl } = require("./script.service");
const { hashPassword, generatePassword } = require("../lib/security");

/**
 * Retourne le workspace compatible existant de l'utilisateur pour la version,
 * ou en crée un nouveau nommé comme le routeur.
 * La réutilisation évite la duplication inutile (spec §III.6).
 * Retourne { workspace, adminPassword } (adminPassword = null si réutilisé,
 * le mot de passe n'étant pas stocké en clair pour un workspace existant).
 */
async function resolveWorkspaceForRouter(userId, routerOsFamily, routerName, tx) {
  const existing = await tx.mikhmonWorkspace.findFirst({
    where: {
      version: routerOsFamily,
      routers: { some: { userId } },
    },
  });

  if (existing) return { workspace: existing, adminPassword: null };

  // Pas de workspace compatible -> création avec identifiant unique par utilisateur
  const workspaceSlug = `${routerName}-${userId.slice(-6)}`;
  const adminPassword = generatePassword(16);
  const workspace = await tx.mikhmonWorkspace.create({
    data: {
      name: workspaceSlug,
      version: routerOsFamily,
      url: buildMikhmonUrl(workspaceSlug),
      webfigUrl: buildWebfigUrl(workspaceSlug),
      adminUsername: "admin",
      adminPasswordHash: await hashPassword(adminPassword),
    },
  });
  return { workspace, adminPassword };
}

module.exports = { resolveWorkspaceForRouter };
