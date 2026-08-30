const { prisma } = require("../lib/prisma");
const { verifyJwt, sha256 } = require("../lib/security");
const { Errors } = require("../lib/errors");

const TOKEN_COOKIE = "its_token";

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = req.cookies?.[TOKEN_COOKIE] || bearerToken;
    if (!token) throw Errors.authRequired();

    let payload;
    try {
      payload = verifyJwt(token);
    } catch {
      throw Errors.authInvalid("Session invalide ou expirée");
    }

    if (!payload || payload.purpose !== "session") {
      throw Errors.authInvalid("Jeton non utilisable comme session");
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(payload.jti) },
      include: { user: true },
    });

    if (!session) throw Errors.authInvalid("Session introuvable");
    if (session.userId !== payload.sub) throw Errors.authInvalid("Session invalide");
    if (session.revokedAt || session.expiresAt < new Date()) {
      throw Errors.authInvalid("Session expirée ou révoquée");
    }
    if (session.user.status !== "ACTIVE" || !session.user.emailVerified) {
      throw Errors.authInvalid("Compte inactif");
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (err) {
    next(err);
  }
}

async function requireAuth(req, res, next) {
  try {
    if (!req.user) {
      await authenticate(req, res, next);
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    authenticate(req, res, (err) => {
      if (err) return next(err);
      if (req.user.role !== "ADMIN") return next(Errors.forbidden());
      next();
    });
    return;
  }
  if (req.user.role !== "ADMIN") return next(Errors.forbidden());
  next();
}

module.exports = { requireAuth, requireAdmin, authenticate, TOKEN_COOKIE };
