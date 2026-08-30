/**
 * Service RADIUS / Hotspot centralisé — conformité cahier des charges §6,§12-18,§30.
 *
 * Gère l'intégralité du cycle de vie :
 *   NAS → Groups → Sites → Profiles → Vouchers → Users → Sessions → Accounting
 *
 * Chaque opération est un tenant isolé (ownerId) pour le multi-tenancy.
 */

const { prisma } = require("../lib/prisma");
const { Errors } = require("../lib/errors");
const { hashPassword, generatePassword, sha256 } = require("../lib/security");
const crypto = require("crypto");

// ═══════════════════════════════════════════════════════════════════════════════
// NAS (Network Access Server) — §6, §12
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un NAS RADIUS pour un routeur donné.
 * Le nasIdentifier est global-unique ( requis par FreeRADIUS ).
 */
async function createNas(ownerId, { routerId, name, address }) {
  const nasIdentifier = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const secret = generateSecret();

  const existing = await prisma.radiusNas.findUnique({ where: { nasIdentifier } });
  if (existing) throw Errors.conflict("NAS_IDENTIFIER_TAKEN", "Ce nasIdentifier existe déjà");

  // Vérifier la propriété du routeur si fourni
  if (routerId) {
    const router = await prisma.router.findFirst({
      where: { id: routerId, userId: ownerId },
    });
    if (!router) throw Errors.notFound("Routeur introuvable ou non autorisé");
  }

  const nas = await prisma.radiusNas.create({
    data: {
      ownerId,
      nasIdentifier,
      name,
      address: address || null,
      secretHash: await hashPassword(secret),
      status: "ACTIVE",
    },
  });

  // Lier au routeur si fourni
  if (routerId) {
    await prisma.router.update({
      where: { id: routerId },
      data: { radiusNasId: nas.id, radiusStatus: "ACTIVE" },
    });
  }

  return { nas, secret };
}

async function listNas(ownerId) {
  return prisma.radiusNas.findMany({
    where: { ownerId },
    include: { site: true, _count: { select: { sessions: true, accounting: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getNasById(ownerId, nasId) {
  const nas = await prisma.radiusNas.findFirst({ where: { id: nasId, ownerId } });
  if (!nas) throw Errors.notFound("NAS introuvable");
  return nas;
}

async function updateNas(ownerId, nasId, data) {
  await getNasById(ownerId, nasId);
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address;
  return prisma.radiusNas.update({ where: { id: nasId }, data: updateData });
}

async function rotateNasSecret(ownerId, nasId) {
  await getNasById(ownerId, nasId);
  const secret = generateSecret();
  await prisma.radiusNas.update({
    where: { id: nasId },
    data: { secretHash: await hashPassword(secret), secretRotatedAt: new Date() },
  });
  return { secret };
}

async function deleteNas(ownerId, nasId) {
  const nas = await getNasById(ownerId, nasId);
  // Délier le routeur associé
  const associatedRouter = await prisma.router.findFirst({ where: { radiusNasId: nasId } });
  if (associatedRouter) {
    await prisma.router.update({
      where: { id: associatedRouter.id },
      data: { radiusNasId: null, radiusStatus: "NOT_CONFIGURED" },
    });
  }
  return prisma.radiusNas.delete({ where: { id: nasId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTSPOT GROUPS — §14
// ═══════════════════════════════════════════════════════════════════════════════

async function createGroup(ownerId, { name, description }) {
  const existing = await prisma.hotspotGroup.findUnique({
    where: { ownerId_name: { ownerId, name } },
  });
  if (existing) throw Errors.conflict("GROUP_NAME_TAKEN", "Ce nom de groupe existe déjà");

  return prisma.hotspotGroup.create({
    data: { ownerId, name, description: description || null },
  });
}

async function listGroups(ownerId) {
  return prisma.hotspotGroup.findMany({
    where: { ownerId },
    include: {
      _count: { select: { sites: true, profiles: true, vouchers: true, users: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getGroupById(ownerId, groupId) {
  const group = await prisma.hotspotGroup.findFirst({
    where: { id: groupId, ownerId },
    include: {
      sites: true,
      profiles: true,
      _count: { select: { vouchers: true, users: true, sessions: true, accounting: true } },
    },
  });
  if (!group) throw Errors.notFound("Groupe introuvable");
  return group;
}

async function updateGroup(ownerId, groupId, data) {
  await getGroupById(ownerId, groupId);
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  return prisma.hotspotGroup.update({ where: { id: groupId }, data: updateData });
}

async function deleteGroup(ownerId, groupId) {
  const group = await getGroupById(ownerId, groupId);
  const counts = group._count;
  if (counts.sites > 0 || counts.vouchers > 0 || counts.users > 0 || counts.sessions > 0 || counts.accounting > 0) {
    const blocked = [];
    if (counts.sites > 0) blocked.push(`${counts.sites} site(s)`);
    if (counts.vouchers > 0) blocked.push(`${counts.vouchers} voucher(s)`);
    if (counts.users > 0) blocked.push(`${counts.users} utilisateur(s) RADIUS`);
    if (counts.sessions > 0) blocked.push(`${counts.sessions} session(s) active(s)`);
    if (counts.accounting > 0) blocked.push(`${counts.accounting} enregistrement(s) accounting`);
    throw Errors.validation([{ field: "groupId", message: `Impossible de supprimer un groupe contenant : ${blocked.join(", ")}` }]);
  }
  return prisma.hotspotGroup.delete({ where: { id: groupId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTSPOT SITES — §3
// ═══════════════════════════════════════════════════════════════════════════════

async function createSite(ownerId, { groupId, name, location, nasId }) {
  const group = await prisma.hotspotGroup.findFirst({ where: { id: groupId, ownerId } });
  if (!group) throw Errors.notFound("Groupe introuvable");

  if (nasId) {
    const nas = await prisma.radiusNas.findFirst({ where: { id: nasId, ownerId } });
    if (!nas) throw Errors.notFound("NAS introuvable");
  }

  const existing = await prisma.hotspotSite.findFirst({
    where: { groupId, name },
  });
  if (existing) throw Errors.conflict("SITE_NAME_TAKEN", "Ce nom de site existe déjà dans ce groupe");

  return prisma.hotspotSite.create({
    data: { ownerId, groupId, name, location: location || null, nasId: nasId || null },
  });
}

async function listSites(ownerId, groupId) {
  const where = { ownerId };
  if (groupId) where.groupId = groupId;

  return prisma.hotspotSite.findMany({
    where,
    include: { group: { select: { name: true } }, nas: { select: { nasIdentifier: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getSiteById(ownerId, siteId) {
  const site = await prisma.hotspotSite.findFirst({
    where: { id: siteId, ownerId },
    include: { group: true, nas: true, _count: { select: { sessions: true } } },
  });
  if (!site) throw Errors.notFound("Site introuvable");
  return site;
}

async function updateSite(ownerId, siteId, data) {
  await getSiteById(ownerId, siteId);
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.nasId !== undefined) {
    if (data.nasId) {
      const nas = await prisma.radiusNas.findFirst({ where: { id: data.nasId, ownerId } });
      if (!nas) throw Errors.notFound("NAS introuvable ou non autorisé");
    }
    updateData.nasId = data.nasId || null;
  }
  return prisma.hotspotSite.update({ where: { id: siteId }, data: updateData });
}

async function deleteSite(ownerId, siteId) {
  await getSiteById(ownerId, siteId);
  return prisma.hotspotSite.delete({ where: { id: siteId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTSPOT PROFILES — §17
// ═══════════════════════════════════════════════════════════════════════════════

async function createProfile(ownerId, { groupId, name, durationMinutes, price, downloadRate, uploadRate, quotaMb, maxDevices, macPolicy, validDays }) {
  try {
    return await prisma.hotspotProfile.create({
      data: {
        ownerId,
        groupId: groupId || null,
        name,
        durationMinutes,
        price: price || 0,
        downloadRate: downloadRate || null,
        uploadRate: uploadRate || null,
        quotaMb: quotaMb || null,
        maxDevices: maxDevices || 1,
        macPolicy: macPolicy || "ALLOW",
        validDays: validDays || null,
      },
    });
  } catch (err) {
    if (err?.code === "P2002") {
      throw Errors.conflict("PROFILE_NAME_TAKEN", "Ce nom de profil existe déjà dans ce groupe");
    }
    throw err;
  }
}

async function listProfiles(ownerId, groupId) {
  const where = { ownerId };
  if (groupId) where.groupId = groupId;

  return prisma.hotspotProfile.findMany({
    where,
    include: { group: { select: { name: true } }, _count: { select: { vouchers: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function getProfileById(ownerId, profileId) {
  const profile = await prisma.hotspotProfile.findFirst({
    where: { id: profileId, ownerId },
    include: { group: true, _count: { select: { vouchers: true } } },
  });
  if (!profile) throw Errors.notFound("Profil introuvable");
  return profile;
}

async function updateProfile(ownerId, profileId, data) {
  await getProfileById(ownerId, profileId);
  const allowed = ["name", "durationMinutes", "price", "downloadRate", "uploadRate", "quotaMb", "maxDevices", "macPolicy", "validDays"];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  return prisma.hotspotProfile.update({ where: { id: profileId }, data: updateData });
}

async function deleteProfile(ownerId, profileId) {
  const profile = await getProfileById(ownerId, profileId);
  if (profile._count.vouchers > 0) {
    throw Errors.validation([{ field: "profileId", message: "Impossible de supprimer un profil associé à des vouchers" }]);
  }
  return prisma.hotspotProfile.delete({ where: { id: profileId } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTSPOT VOUCHERS — §16
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère un batch de vouchers.
 * Chaque voucher a un code unique (username) et un mot de passe (password),
 * et crée automatiquement le RadiusUser correspondant pour l'authentification FreeRADIUS.
 */
async function generateVouchers(ownerId, { groupId, profileId, count, prefix, macAddress }) {
  const group = await prisma.hotspotGroup.findFirst({ where: { id: groupId, ownerId } });
  if (!group) throw Errors.notFound("Groupe introuvable");

  const profile = await prisma.hotspotProfile.findFirst({ where: { id: profileId, ownerId } });
  if (!profile) throw Errors.notFound("Profil introuvable");

  const batchSize = Math.min(Math.max(count || 1, 1), 500);
  const itemsToCreate = [];

  for (let i = 0; i < batchSize; i++) {
    const code = prefix
      ? `${prefix}${generateVoucherCode().slice(0, 6)}`
      : generateVoucherCode();
    const plainPassword = generatePassword(8);
    itemsToCreate.push({ code, plainPassword });
  }

  const hashedItems = await Promise.all(
    itemsToCreate.map(async (item) => ({
      ...item,
      passwordHash: await hashPassword(item.plainPassword),
    }))
  );

  // Transaction atomique : création du HotspotVoucher ET du RadiusUser pour FreeRADIUS
  const vouchers = await prisma.$transaction(async (tx) => {
    const createdVouchers = [];
    for (const item of hashedItems) {
      const voucher = await tx.hotspotVoucher.create({
        data: {
          ownerId,
          groupId,
          profileId,
          code: item.code,
          passwordHash: item.passwordHash,
          status: "UNUSED",
          macAddress: macAddress || null,
        },
      });

      await tx.radiusUser.create({
        data: {
          ownerId,
          groupId,
          voucherId: voucher.id,
          profileId,
          username: item.code,
          passwordHash: item.passwordHash,
          status: "ACTIVE",
          macAddress: macAddress || null,
        },
      });

      createdVouchers.push(voucher);
    }
    return createdVouchers;
  });

  // Ajouter les mots de passe en clair à la réponse (jamais stockés)
  return vouchers.map((v, i) => ({
    ...v,
    plainPassword: hashedItems[i].plainPassword,
  }));
}

async function listVouchers(ownerId, { groupId, profileId, status, page = 1, limit = 50 }) {
  const where = { ownerId };
  if (groupId) where.groupId = groupId;
  if (profileId) where.profileId = profileId;
  if (status) where.status = status;

  const [vouchers, total] = await Promise.all([
    prisma.hotspotVoucher.findMany({
      where,
      include: { group: { select: { name: true } }, profile: { select: { name: true, durationMinutes: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.hotspotVoucher.count({ where }),
  ]);

  return { vouchers, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getVoucherById(ownerId, voucherId) {
  const voucher = await prisma.hotspotVoucher.findFirst({
    where: { id: voucherId, ownerId },
    include: { group: true, profile: true, user: true },
  });
  if (!voucher) throw Errors.notFound("Voucher introuvable");
  return voucher;
}

async function revokeVoucher(ownerId, voucherId) {
  const voucher = await getVoucherById(ownerId, voucherId);
  if (voucher.status === "REVOKED") throw Errors.validation([{ field: "status", message: "Voucher déjà révoqué" }]);

  return prisma.$transaction(async (tx) => {
    // Suspendre l'utilisateur RADIUS associé
    await tx.radiusUser.updateMany({
      where: { voucherId, ownerId },
      data: { status: "SUSPENDED" },
    });
    return tx.hotspotVoucher.update({ where: { id: voucherId }, data: { status: "REVOKED" } });
  });
}

async function bulkRevokeVouchers(ownerId, voucherIds) {
  return prisma.$transaction(async (tx) => {
    await tx.radiusUser.updateMany({
      where: { voucherId: { in: voucherIds }, ownerId },
      data: { status: "SUSPENDED" },
    });
    return tx.hotspotVoucher.updateMany({
      where: { id: { in: voucherIds }, ownerId, status: { not: "REVOKED" } },
      data: { status: "REVOKED" },
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADIUS USERS — §13
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crée un utilisateur RADIUS (Hotspot client).
 * Si un voucherId est fourni, le user est lié au voucher et hérite de son profil.
 */
async function createRadiusUser(ownerId, { groupId, username, password, voucherId, profileId, macAddress }) {
  const group = await prisma.hotspotGroup.findFirst({ where: { id: groupId, ownerId } });
  if (!group) throw Errors.notFound("Groupe introuvable");

  const existing = await prisma.radiusUser.findFirst({ where: { ownerId, username } });
  if (existing) throw Errors.conflict("USERNAME_TAKEN", "Ce nom d'utilisateur RADIUS existe déjà");

  let resolvedProfileId = profileId || null;
  let resolvedVoucherId = voucherId || null;

  if (voucherId) {
    const voucher = await prisma.hotspotVoucher.findFirst({ where: { id: voucherId, ownerId } });
    if (!voucher) throw Errors.notFound("Voucher introuvable");
    if (voucher.status !== "UNUSED") throw Errors.validation([{ field: "voucherId", message: "Voucher déjà utilisé ou révoqué" }]);
    resolvedProfileId = voucher.profileId;
  }

  const plainPassword = password || generatePassword(10);

  const user = await prisma.radiusUser.create({
    data: {
      ownerId,
      groupId,
      username,
      passwordHash: await hashPassword(plainPassword),
      status: "ACTIVE",
      voucherId: resolvedVoucherId,
      profileId: resolvedProfileId,
      macAddress: macAddress || null,
    },
  });

  // Marquer le voucher comme utilisé
  if (resolvedVoucherId) {
    const now = new Date();
    const voucher = await prisma.hotspotVoucher.update({
      where: { id: resolvedVoucherId },
      data: {
        status: "ACTIVE",
        firstUsedAt: now,
        lastUsedAt: now,
        timesUsed: { increment: 1 },
      },
    });

    // Calculer l'expiration à partir du profil
    const profile = await prisma.hotspotProfile.findUnique({ where: { id: resolvedProfileId } });
    if (profile?.validDays) {
      const expiresAt = new Date(now.getTime() + profile.validDays * 24 * 60 * 60 * 1000);
      await prisma.radiusUser.update({ where: { id: user.id }, data: { expiresAt } });
    }
  }

  return { user, plainPassword };
}

async function listRadiusUsers(ownerId, { groupId, status, page = 1, limit = 50 }) {
  const where = { ownerId };
  if (groupId) where.groupId = groupId;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.radiusUser.findMany({
      where,
      include: { group: { select: { name: true } }, profile: { select: { name: true } }, voucher: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.radiusUser.count({ where }),
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getRadiusUserById(ownerId, userId) {
  const user = await prisma.radiusUser.findFirst({
    where: { id: userId, ownerId },
    include: { group: true, profile: true, voucher: true, sessions: true },
  });
  if (!user) throw Errors.notFound("Utilisateur RADIUS introuvable");
  return user;
}

async function updateRadiusUser(ownerId, userId, data) {
  await getRadiusUserById(ownerId, userId);
  const updateData = {};
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }
  if (data.profileId !== undefined) {
    if (data.profileId) {
      const profile = await prisma.hotspotProfile.findFirst({ where: { id: data.profileId, ownerId } });
      if (!profile) throw Errors.notFound("Profil introuvable ou non autorisé");
    }
    updateData.profileId = data.profileId || null;
  }
  if (data.macAddress !== undefined) {
    updateData.macAddress = data.macAddress || null;
  }
  return prisma.radiusUser.update({ where: { id: userId }, data: updateData });
}

async function suspendRadiusUser(ownerId, userId) {
  await getRadiusUserById(ownerId, userId);
  return prisma.radiusUser.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
}

async function activateRadiusUser(ownerId, userId) {
  await getRadiusUserById(ownerId, userId);
  return prisma.radiusUser.update({ where: { id: userId }, data: { status: "ACTIVE" } });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADIUS SESSIONS (actives) — §19
// ═══════════════════════════════════════════════════════════════════════════════

async function listActiveSessions(ownerId, { nasId, groupId, siteId }) {
  const where = { ownerId, status: "ACTIVE" };
  if (nasId) where.nasId = nasId;
  if (groupId) where.groupId = groupId;
  if (siteId) where.siteId = siteId;

  return prisma.radiusSession.findMany({
    where,
    include: {
      nas: { select: { nasIdentifier: true, name: true } },
      group: { select: { name: true } },
      site: { select: { name: true } },
      user: { select: { username: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

async function getSessionStats(ownerId) {
  const [totalActive, byNas, byGroup] = await Promise.all([
    prisma.radiusSession.count({ where: { ownerId, status: "ACTIVE" } }),
    prisma.radiusSession.groupBy({
      by: ["nasId"],
      where: { ownerId, status: "ACTIVE" },
      _count: true,
    }),
    prisma.radiusSession.groupBy({
      by: ["groupId"],
      where: { ownerId, status: "ACTIVE" },
      _count: true,
    }),
  ]);

  return { totalActive, byNas, byGroup };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADIUS ACCOUNTING — §18
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Traite un packet RADIUS Accounting (Acct-Status-Type).
 * Appelé par le webhook POST /api/radius/accounting.
 *
 * Acct-Status-Type:
 *   - "Start"     → crée une session + accounting record
 *   - "Stop"      → ferme la session + accounting record
 *   - "Interim-Update" → met à jour les octets
 */
async function processAccounting(data) {
  const {
    nasIdentifier,
    username,
    sessionId,
    statusType,
    ipAddress,
    macAddress,
    inputOctets,
    outputOctets,
    sessionTime,
    disconnectCause,
  } = data;

  // Trouver le NAS
  const nas = await prisma.radiusNas.findUnique({ where: { nasIdentifier } });
  if (!nas) throw Errors.notFound(`NAS "${nasIdentifier}" introuvable`);

  // Mettre à jour lastSeenAt
  await prisma.radiusNas.update({ where: { id: nas.id }, data: { lastSeenAt: new Date() } });

  // Trouver l'utilisateur RADIUS
  const radiusUser = await prisma.radiusUser.findFirst({
    where: { ownerId: nas.ownerId, username },
  });

  if (statusType === "Start") {
    // Créer ou réactiver la session active
    const session = await prisma.radiusSession.upsert({
      where: { sessionId },
      update: {
        lastActivityAt: new Date(),
        ipAddress: ipAddress || undefined,
        macAddress: macAddress || undefined,
        status: "ACTIVE",
      },
      create: {
        ownerId: nas.ownerId,
        nasId: nas.id,
        groupId: radiusUser?.groupId || null,
        siteId: null,
        userId: radiusUser?.id || null,
        username,
        sessionId,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null,
        startedAt: new Date(),
        status: "ACTIVE",
      },
    });

    // Créer l'entrée accounting
    await prisma.radiusAccounting.create({
      data: {
        ownerId: nas.ownerId,
        nasId: nas.id,
        groupId: radiusUser?.groupId || null,
        siteId: null,
        userId: radiusUser?.id || null,
        username,
        sessionId,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null,
        startedAt: new Date(),
      },
    });

    // Mettre à jour le dernier auth du NAS
    await prisma.radiusNas.update({ where: { id: nas.id }, data: { lastAuthAt: new Date() } });

    return { action: "Start", sessionId: session.id };
  }

  if (statusType === "Stop") {
    // Fermer la session active
    await prisma.radiusSession.updateMany({
      where: { sessionId, nasId: nas.id, status: "ACTIVE" },
      data: {
        status: "BLOCKED",
        downloadOctets: BigInt(inputOctets || 0),
        uploadOctets: BigInt(outputOctets || 0),
        lastActivityAt: new Date(),
      },
    });

    // Mettre à jour l'accounting
    await prisma.radiusAccounting.updateMany({
      where: { sessionId, nasId: nas.id },
      data: {
        endedAt: new Date(),
        durationSeconds: sessionTime || null,
        downloadOctets: BigInt(inputOctets || 0),
        uploadOctets: BigInt(outputOctets || 0),
        disconnectCause: disconnectCause || null,
        lastActivityAt: new Date(),
      },
    });

    // Incrémenter les compteurs du voucher si applicable
    if (radiusUser?.voucherId) {
      await prisma.hotspotVoucher.update({
        where: { id: radiusUser.voucherId },
        data: {
          lastUsedAt: new Date(),
          timesUsed: { increment: 1 },
        },
      });
    }

    return { action: "Stop" };
  }

  if (statusType === "Interim-Update") {
    // Mettre à jour les octets de la session active
    await prisma.radiusSession.updateMany({
      where: { sessionId, nasId: nas.id, status: "ACTIVE" },
      data: {
        downloadOctets: BigInt(inputOctets || 0),
        uploadOctets: BigInt(outputOctets || 0),
        lastActivityAt: new Date(),
      },
    });

    await prisma.radiusAccounting.updateMany({
      where: { sessionId, nasId: nas.id },
      data: {
        downloadOctets: BigInt(inputOctets || 0),
        uploadOctets: BigInt(outputOctets || 0),
        lastActivityAt: new Date(),
      },
    });

    return { action: "Interim-Update" };
  }

  throw Errors.validation([{ field: "statusType", message: `Acct-Status-Type inconnu : ${statusType}` }]);
}

/**
 * Liste l'historique d'accounting (sessions terminées).
 */
async function listAccounting(ownerId, { nasId, groupId, page = 1, limit = 50, startDate, endDate }) {
  const where = { ownerId };
  if (nasId) where.nasId = nasId;
  if (groupId) where.groupId = groupId;
  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate) where.startedAt.lte = new Date(endDate);
  }

  const [records, total] = await Promise.all([
    prisma.radiusAccounting.findMany({
      where,
      include: {
        nas: { select: { nasIdentifier: true, name: true } },
        group: { select: { name: true } },
        user: { select: { username: true } },
      },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.radiusAccounting.count({ where }),
  ]);

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Statistiques agrégées d'accounting pour le dashboard.
 */
async function getAccountingStats(ownerId, { period = "30d" } = {}) {
  const since = new Date();
  if (period === "7d") since.setDate(since.getDate() - 7);
  else if (period === "30d") since.setDate(since.getDate() - 30);
  else if (period === "90d") since.setDate(since.getDate() - 90);

  const [totalSessions, totalDuration, totalDownload, totalUpload, uniqueUsers] = await Promise.all([
    prisma.radiusAccounting.count({ where: { ownerId, startedAt: { gte: since } } }),
    prisma.radiusAccounting.aggregate({
      where: { ownerId, startedAt: { gte: since } },
      _sum: { durationSeconds: true },
    }),
    prisma.radiusAccounting.aggregate({
      where: { ownerId, startedAt: { gte: since } },
      _sum: { downloadOctets: true },
    }),
    prisma.radiusAccounting.aggregate({
      where: { ownerId, startedAt: { gte: since } },
      _sum: { uploadOctets: true },
    }),
    prisma.radiusAccounting.findMany({
      where: { ownerId, startedAt: { gte: since } },
      select: { username: true },
      distinct: ["username"],
    }),
  ]);

  return {
    totalSessions,
    totalDurationSeconds: totalDuration._sum.durationSeconds || 0,
    totalDownloadBytes: Number(totalDownload._sum.downloadOctets || 0),
    totalUploadBytes: Number(totalUpload._sum.uploadOctets || 0),
    uniqueUsers: uniqueUsers.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSecret() {
  return crypto.randomBytes(16).toString("hex");
}

function generateVoucherCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

module.exports = {
  // NAS
  createNas,
  listNas,
  getNasById,
  updateNas,
  rotateNasSecret,
  deleteNas,
  // Groups
  createGroup,
  listGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  // Sites
  createSite,
  listSites,
  getSiteById,
  updateSite,
  deleteSite,
  // Profiles
  createProfile,
  listProfiles,
  getProfileById,
  updateProfile,
  deleteProfile,
  // Vouchers
  generateVouchers,
  listVouchers,
  getVoucherById,
  revokeVoucher,
  bulkRevokeVouchers,
  // Radius Users
  createRadiusUser,
  listRadiusUsers,
  getRadiusUserById,
  updateRadiusUser,
  suspendRadiusUser,
  activateRadiusUser,
  // Sessions
  listActiveSessions,
  getSessionStats,
  // Accounting
  processAccounting,
  listAccounting,
  getAccountingStats,
};
