/**
 * @module routes/2fa.routes
 * @description Routes pour l'authentification à deux facteurs (2FA / TOTP).
 *
 * Endpoints :
 *   POST /api/2fa/setup        — Génère une clé et une URL pour activer le 2FA
 *   POST /api/2fa/enable       — Active le 2FA après vérification du code
 *   POST /api/2fa/verify       — Vérifie un code TOTP (utilisé lors du login si 2FA actif)
 *   POST /api/2fa/disable      — Désactive le 2FA (nécessite mot de passe + code)
 *   POST /api/2fa/backup-codes — Régénère les codes de récupération
 */

const { Router } = require("express");
const { z } = require("zod");
const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const { env } = require("../config/env");
const { Errors } = require("../lib/errors");
const { requireAuth, TOKEN_COOKIE } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { verifyPassword, signJwt, sha256 } = require("../lib/security");
const totp = require("../lib/totp");
const { twoFaRateLimit } = require("../middleware/rateLimit");

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/setup — Initier la configuration 2FA
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/setup", requireAuth, async (req, res, next) => {
  try {
    // Si le 2FA est déjà actif, refuser
    if (req.user.twoFactorEnabled) {
      throw Errors.conflict(
        "2FA_ALREADY_ENABLED",
        "L'authentification à deux facteurs est déjà activée"
      );
    }

    const secret = totp.generateSecret();
    const authUrl = totp.generateAuthUrl(req.user.email, secret);

    // Sauvegarder le secret en attente de validation (pas encore actif)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorSecret: secret },
    });

    // Générer les codes de récupération pour affichage
    const backupCodes = totp.generateBackupCodes(8);

    res.json({
      secret,
      authUrl,
      backupCodes: backupCodes.codes, // Affichés une seule fois !
      message:
        "Scannez le QR code avec votre application d'authentification, puis activez le 2FA avec un code valide.",
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/enable — Activer le 2FA
// ═══════════════════════════════════════════════════════════════════════════════

const enableSchema = z.object({
  code: z.string().length(6).regex(/^\d+$/, "Le code doit contenir 6 chiffres"),
});

router.post("/enable", requireAuth, validate(enableSchema), async (req, res, next) => {
  try {
    const { code } = req.body;

    if (req.user.twoFactorEnabled) {
      throw Errors.conflict("2FA_ALREADY_ENABLED", "2FA déjà activé");
    }

    if (!req.user.twoFactorSecret) {
      throw Errors.validation([
        { field: "code", message: "Veuillez d'abord initialiser le 2FA (POST /2fa/setup)" },
      ]);
    }

    // Vérifier le code TOTP
    const valid = totp.verifyCode(req.user.twoFactorSecret, code);
    if (!valid) {
      throw Errors.validation([
        { field: "code", message: "Code TOTP invalide. Vérifiez l'heure de votre appareil." },
      ]);
    }

    // Générer et sauvegarder les codes de récupération
    const { codes, hashes } = totp.generateBackupCodes(8);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashes,
      },
    });

    // Enregistrer dans l'audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "TWO_FACTOR_ENABLED",
        targetType: "User",
        targetId: req.user.id,
      },
    });

    res.json({
      message: "2FA activé avec succès",
      backupCodes: codes, // Affichés une seule fois — l'utilisateur doit les sauvegarder
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/verify — Vérifier un code (utilisé pendant le login 2FA)
// ═══════════════════════════════════════════════════════════════════════════════

const verifySchema = z.object({
  code: z.string().min(6).max(10, "Code invalide"),
  isBackupCode: z.boolean().optional(),
});

router.post("/verify", requireAuth, twoFaRateLimit, validate(verifySchema), async (req, res, next) => {
  try {
    const { code, isBackupCode } = req.body;

    if (!req.user.twoFactorEnabled) {
      throw Errors.validation([
        { field: "2FA", message: "L'authentification à deux facteurs n'est pas activée" },
      ]);
    }

    let verified = false;

    if (isBackupCode) {
      // Vérification par code de récupération
      const result = totp.verifyBackupCode(
        code,
        req.user.usedBackupCodes || [],
        req.user.twoFactorBackupCodes || []
      );

      if (result.valid) {
        // Marquer le hash du code comme utilisé
        const usedCodes = [...(req.user.usedBackupCodes || []), result.hash];
        await prisma.user.update({
          where: { id: req.user.id },
          data: { usedBackupCodes: usedCodes },
        });
        verified = true;
      }
    } else {
      // Vérification par code TOTP standard
      verified = totp.verifyCode(req.user.twoFactorSecret, code);
    }

    if (!verified) {
      throw Errors.authInvalid("Code de vérification invalide");
    }

    res.json({ message: "Code vérifié avec succès" });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/disable — Désactiver le 2FA
// ═══════════════════════════════════════════════════════════════════════════════

const disableSchema = z.object({
  password: z.string().min(1, "Mot de passe requis"),
  code: z.string().length(6).regex(/^\d+$/, "Le code doit contenir 6 chiffres"),
});

router.post("/disable", requireAuth, validate(disableSchema), async (req, res, next) => {
  try {
    const { password, code } = req.body;

    if (!req.user.twoFactorEnabled) {
      throw Errors.validation([
        { field: "2FA", message: "L'authentification à deux facteurs n'est pas activée" },
      ]);
    }

    // Vérifier le mot de passe
    const passwordValid = await verifyPassword(password, req.user.passwordHash);
    if (!passwordValid) {
      throw Errors.authInvalid("Mot de passe incorrect");
    }

    // Vérifier le code TOTP
    const codeValid = totp.verifyCode(req.user.twoFactorSecret, code);
    if (!codeValid) {
      throw Errors.authInvalid("Code TOTP invalide");
    }

    // Désactiver le 2FA
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        usedBackupCodes: [],
      },
    });

    // Enregistrer dans l'audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: "TWO_FACTOR_DISABLED",
        targetType: "User",
        targetId: req.user.id,
      },
    });

    res.json({ message: "2FA désactivé avec succès" });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/backup-codes — Régénérer les codes de récupération
// ═══════════════════════════════════════════════════════════════════════════════

router.post("/backup-codes", requireAuth, async (req, res, next) => {
  try {
    if (!req.user.twoFactorEnabled) {
      throw Errors.validation([
        { field: "2FA", message: "Activez le 2FA d'abord" },
      ]);
    }

    const { codes, hashes } = totp.generateBackupCodes(8);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorBackupCodes: hashes,
        usedBackupCodes: [],
      },
    });

    res.json({
      message: "Nouveaux codes de récupération générés. Les anciens codes sont révoqués.",
      backupCodes: codes,
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/2fa/login — Finaliser le login 2FA
// ═══════════════════════════════════════════════════════════════════════════════

const loginSchema = z.object({
  tempToken: z.string().min(10, "Token temporaire requis"),
  code: z.string().min(6).max(10, "Code invalide"),
  isBackupCode: z.boolean().optional(),
});

router.post("/login", twoFaRateLimit, validate(loginSchema), async (req, res, next) => {
  try {
    const { tempToken, code, isBackupCode } = req.body;

    // Vérifier le token temporaire 2FA
    let payload;
    try {
      payload = verifyJwt(tempToken);
    } catch {
      throw Errors.authInvalid("Token temporaire invalide ou expiré");
    }

    if (!payload || payload.purpose !== "2fa") {
      throw Errors.authInvalid("Token invalide pour la vérification 2FA");
    }

    // Vérifier que la session temporaire existe et est valide
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(payload.jti) },
      include: { user: true },
    });

    if (!session) throw Errors.authInvalid("Session 2FA introuvable");
    if (session.userId !== payload.sub) throw Errors.authInvalid("Session 2FA invalide");
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw Errors.authInvalid("Session 2FA expirée ou révoquée");
    }

    const user = session.user;

    if (!user.twoFactorEnabled) {
      throw Errors.validation([
        { field: "2FA", message: "Le 2FA n'est pas activé pour ce compte" },
      ]);
    }

    // Vérifier le code
    let verified = false;
    if (isBackupCode) {
      const result = totp.verifyBackupCode(
        code,
        user.usedBackupCodes || [],
        user.twoFactorBackupCodes || []
      );
      if (result.valid) {
        const usedCodes = [...(user.usedBackupCodes || []), result.hash];
        await prisma.user.update({
          where: { id: user.id },
          data: { usedBackupCodes: usedCodes },
        });
        verified = true;
      }
    } else {
      verified = totp.verifyCode(user.twoFactorSecret, code);
    }

    if (!verified) {
      throw Errors.authInvalid("Code 2FA invalide");
    }

    // Supprimer la session temporaire 2FA
    await prisma.session.deleteMany({ where: { id: session.id } });

    // Créer la session normale (7 jours) avec purpose session
    const jti = crypto.randomBytes(24).toString("hex");
    const fullToken = signJwt({ sub: user.id, jti, purpose: "session" });
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(jti),
        userAgent: req.headers["user-agent"] || null,
        ipAddress: req.ip || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie(TOKEN_COOKIE, fullToken, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // Retourner les infos publiques (sans secrets)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        twoFactorEnabled: true,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { router };
