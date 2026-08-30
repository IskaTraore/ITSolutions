/**
 * Rate limiting léger en mémoire (production : utiliser redis-rate-limiter).
 *
 * @module middleware/rateLimit
 * @description Système de rate limiting configurable avec fenêtres glissantes.
 * En production, migrer vers Redis pour le partage multi-instance.
 *
 * @example
 *   // Limite simple
 *   router.post("/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), handler);
 *
 *   // Limite personnalisée par clé (ex: par user ID)
 *   router.post("/api/2fa/verify",
 *     rateLimit({
 *       windowMs: 5 * 60 * 1000,
 *       max: 3,
 *       keyFn: (req) => req.user?.id || getClientIp(req),
 *       message: "Trop de tentatives 2FA. Attendez 5 minutes."
 *     }),
 *     handler
 *   );
 */

const stores = new Map();

/**
 * Extrait l'adresse IP du client depuis les headers proxy ou la connexion.
 * @param {import('express').Request} req - Requête Express
 * @returns {string} Adresse IP du client
 */
function getClientIp(req) {
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Crée un middleware de rate limiting.
 *
 * @param {object} opts - Options de configuration
 * @param {number} [opts.windowMs=900000] - Fenêtre en millisecondes (défaut: 15 min)
 * @param {number} [opts.max=100] - Nombre max de requêtes par fenêtre par identifiant
 * @param {string} [opts.keyPrefix="rl"] - Préfixe pour la clé de stockage
 * @param {string} [opts.message="Trop de requêtes. Réessayez plus tard."] - Message d'erreur
 * @param {function} [opts.keyFn] - Fonction personnalisée pour générer la clé (req) => string
 * @param {boolean} [opts.skipSuccessfulRequests=false] - Ne pas compter les requêtes 2xx
 * @param {function} [opts.onLimitReached] - Callback appelé quand la limite est atteinte
 * @returns {function} Middleware Express
 */
function rateLimit(opts = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = "rl",
    message = "Trop de requêtes. Réessayez plus tard.",
    keyFn,
    skipSuccessfulRequests = false,
    onLimitReached,
  } = opts;

  const storeKey = `${keyPrefix}:${windowMs}:${max}`;
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
    // Nettoyage périodique toutes les 5 minutes
    setInterval(() => {
      const store = stores.get(storeKey);
      if (!store) return;
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now - entry.resetTime > windowMs) store.delete(key);
      }
    }, 5 * 60 * 1000).unref?.();
  }
  const store = stores.get(storeKey);

  return (req, res, next) => {
    const ip = getClientIp(req);
    const identifier = keyFn ? keyFn(req) : ip;
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || now - entry.resetTime > windowMs) {
      entry = { count: 0, resetTime: now };
      store.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    const resetAt = new Date(entry.resetTime + windowMs);

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(remaining));
    res.set("X-RateLimit-Reset", resetAt.toISOString());

    if (entry.count > max) {
      const retryAfter = Math.ceil((windowMs - (now - entry.resetTime)) / 1000);
      res.set("Retry-After", String(retryAfter));

      if (onLimitReached) {
        onLimitReached({ key, count: entry.count, ip, req });
      }

      return res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message,
          retryAfter,
        },
      });
    }

    // Optionnel : ne pas compter les requêtes réussies
    if (skipSuccessfulRequests) {
      const originalEnd = res.end;
      res.end = function (...args) {
        if (res.statusCode < 400) {
          entry.count = Math.max(0, entry.count - 1);
        }
        return originalEnd.apply(this, args);
      };
    }

    next();
  };
}

const isDev =
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "test";

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITS PRÉ-CONFIGURÉS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limit pour les routes d'authentification (login/register).
 * Prod: 5 req / 15 min / IP | Dev: 1000 req / 15 min / IP
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.AUTH_RATE_LIMIT_MAX
    ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10)
    : isDev
      ? 1000
      : 5,
  keyPrefix: "rl:auth",
  message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
  // Log when limit reached (utile pour la détection d'intrusion)
  onLimitReached: isDev
    ? undefined
    : ({ ip, count }) => {
        console.warn(`[SECURITY] Rate limit auth atteint par ${ip} (${count} requêtes)`);
      },
});

/**
 * Rate limit strict pour l'inscription (anti-spam).
 * Prod: 3 inscriptions / heure / IP | Dev: 100 / heure / IP
 */
const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: isDev ? 100 : 3,
  keyPrefix: "rl:register",
  message: "Trop de comptes créés. Réessayez dans 1 heure.",
});

/**
 * Rate limit ultra-strict pour le 2FA (anti brute-force).
 * Prod: 5 tentatives / 5 min | Dev: 100 / 5 min
 */
const twoFaRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isDev ? 100 : 5,
  keyPrefix: "rl:2fa",
  message: "Trop de tentatives 2FA. Attendez 5 minutes avant de réessayer.",
  keyFn: (req) => {
    // Limiter par email si disponible, sinon par IP
    const email = req.body?.email || req.user?.email;
    return email || getClientIp(req);
  },
  onLimitReached: isDev
    ? undefined
    : ({ ip }) => {
        console.warn(`[SECURITY] Rate limit 2FA atteint — possible brute-force depuis ${ip}`);
      },
});

/**
 * Rate limit général API.
 * Prod: 200 req / 15 min / IP | Dev: 5000 req / 15 min / IP
 */
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 200,
  keyPrefix: "rl:api",
  message: "Limite de requêtes atteinte. Réessayez plus tard.",
});

/**
 * Rate limit pour les opérations sensibles (reset password, etc.).
 * Prod: 3 req / heure / IP | Dev: 50 / heure / IP
 */
const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: isDev ? 50 : 3,
  keyPrefix: "rl:sensitive",
  message: "Trop de tentatives. Réessayez dans 1 heure.",
});

/**
 * Rate limit pour les webhooks (PSP, RADIUS).
 * 50 req / 5 min / IP
 */
const webhookRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  keyPrefix: "rl:webhook",
  message: "Trop de webhooks reçus.",
});

/**
 * Rate limit pour les opérations d'écriture lourdes (CRUD admin).
 * Prod: 30 req / 5 min / IP | Dev: 500 / 5 min / IP
 */
const writeRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 500 : 30,
  keyPrefix: "rl:write",
  message: "Trop d'opérations d'écriture. Réessayez dans quelques minutes.",
});

module.exports = {
  rateLimit,
  authRateLimit,
  registerRateLimit,
  twoFaRateLimit,
  apiRateLimit,
  sensitiveRateLimit,
  webhookRateLimit,
  writeRateLimit,
  getClientIp,
};
