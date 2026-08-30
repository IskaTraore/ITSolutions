const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { env } = require("../config/env");
const { Errors } = require("../lib/errors");
const {
  hashPassword,
  verifyPassword,
  generateVerificationToken,
  signJwt,
  sha256,
} = require("../lib/security");
const { validate } = require("../middleware/validate");
const { requireAuth, TOKEN_COOKIE } = require("../middleware/auth");
const { registerRateLimit } = require("../middleware/rateLimit");
const { notify } = require("../services/notification.service");
const crypto = require("crypto");

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Créer un nouveau compte
 *     description: Inscription d'un nouvel utilisateur. Un email de vérification est envoyé.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 32
 *                 example: mikhmon1
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: Compte créé avec succès
 *       409:
 *         description: Email ou nom d'utilisateur déjà pris
 *       429:
 *         description: Trop d'inscriptions (rate limit)
 */
const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  username: z
    .string()
    .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
    .max(32, "Le nom d'utilisateur est trop long")
    .regex(/^[a-zA-Z0-9_]+$/, "Lettres, chiffres et underscores uniquement"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

router.post("/register", registerRateLimit, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw Errors.conflict(
        "EMAIL_OR_USERNAME_TAKEN",
        "Cette adresse email ou ce nom d'utilisateur est déjà utilisé"
      );
    }

    const verificationToken = generateVerificationToken();
    const tokenHash = sha256(verificationToken);
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: await hashPassword(password),
        emailVerified: false,
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: tokenExpiresAt,
        status: "PENDING_VERIFICATION",
        wallet: { create: {} },
      },
    });

    const verifyUrl = `${env.clientUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    await notify(user, "EMAIL_VERIFICATION", {
      channel: "EMAIL",
      subject: "Vérifiez votre adresse email",
      text: `Bienvenue sur ITSOLUTIONS.\n\nCliquez sur ce lien pour vérifier votre adresse email :\n${verifyUrl}\n\nSi vous n'avez pas créé de compte, ignorez ce message.`,
    });

    const response = { user: publicUser(user), message: "Compte créé avec succès. Veuillez vérifier votre adresse email." };
    if (env.nodeEnv === "test") {
      response.verificationToken = verificationToken;
    }
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.object({
  token: z.string().min(10, "Jeton de vérification invalide"),
  email: z.string().email("Email invalide").optional(),
});

router.post("/verify-email", validate(verifySchema), async (req, res, next) => {
  try {
    const { token, email } = req.body;
    const tokenHash = sha256(token);

    const user = await prisma.user.findFirst({
      where: email ? { email } : { verificationTokenHash: tokenHash },
    });
    if (!user) throw Errors.notFound("Utilisateur introuvable");

    if (user.emailVerified) {
      return res.json({ message: "Email déjà vérifié", user: publicUser(user) });
    }

    if (!user.verificationTokenHash || user.verificationTokenHash !== tokenHash) {
      throw Errors.authInvalid("Jeton de vérification invalide ou expiré");
    }

    if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
      throw Errors.authInvalid("Le jeton de vérification a expiré. Veuillez demander un nouveau jeton.");
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: "ACTIVE",
        verificationTokenHash: null,
        verificationTokenExpiresAt: null,
      },
    });
    res.json({ message: "Email vérifié avec succès", user: publicUser(updated) });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw Errors.authInvalid();

    if (user.status === "SUSPENDED") throw Errors.userSuspended();
    if (!user.emailVerified || user.status === "PENDING_VERIFICATION") {
      throw Errors.emailNotVerified();
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw Errors.authInvalid();

    // ─── 2FA : si activé, renvoyer un token temporaire ───────────────────
    if (user.twoFactorEnabled) {
      // Token éphémère (10 min) pour la vérification 2FA
      const jti2fa = crypto.randomBytes(24).toString("hex");
      const tempToken = signJwt(
        { sub: user.id, jti: jti2fa, purpose: "2fa" },
        { expiresIn: "10m" }
      );
      // Sauvegarder la session temporaire (pas de cookie, retournée dans le body)
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: sha256(jti2fa),
          userAgent: req.headers["user-agent"] || null,
          ipAddress: req.ip || null,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        },
      });

      return res.json({
        requires2FA: true,
        tempToken,
        message: "Veuillez saisir votre code d'authentification à deux facteurs",
      });
    }

    // ─── Session normale (pas de 2FA) ────────────────────────────────────
    const jti = crypto.randomBytes(24).toString("hex");
    const token = signJwt({ sub: user.id, jti, purpose: "session" });
    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(jti),
        userAgent: req.headers["user-agent"] || null,
        ipAddress: req.ip || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: env.cookieSecure,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    if (req.sessionId) {
      await prisma.session.deleteMany({ where: { id: req.sessionId } });
    }
    res.clearCookie(TOKEN_COOKIE, { path: "/" });
    res.json({ message: "Déconnexion réussie" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
  res.json({
    user: publicUser(req.user),
    wallet: { balance: wallet?.balance ?? 0, currency: wallet?.currency ?? "FC" },
  });
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    autoRenew: user.autoRenew,
    phone: user.phone,
    twoFactorEnabled: user.twoFactorEnabled || false,
    createdAt: user.createdAt,
  };
}

module.exports = { router: router, publicUser };
