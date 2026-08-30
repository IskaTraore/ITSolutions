/**
 * @module lib/security
 * @description Fonctions cryptographiques et sécurisées pour ITSOLUTIONS.
 *
 * Ce module fournit :
 * - Hachage et vérification de mots de passe (bcrypt)
 * - Génération de hash SHA-256
 * - Création et vérification de JWT
 * - Génération de mots de passe aléatoires
 * - Génération de jetons de vérification
 *
 * @security
 * - Les mots de passe sont hachés avec bcrypt (12 rounds)
 * - Les JWT sont signés avec le secret configuré dans JWT_SECRET
 * - Les jetons de vérification sont mono-usage et à durée limitée
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/** Nombre de rounds de salage bcrypt (12 = bon compromis sécurité/performance) */
const SALT_ROUNDS = 12;

/**
 * Hache un mot de passe en clair avec bcrypt.
 *
 * @param {string} plain - Mot de passe en clair
 * @returns {Promise<string>} Hash bcrypt
 *
 * @example
 * ```javascript
 * const hash = await hashPassword("monMotDePasse123");
 * // → "$2a$12$..." (60 caractères)
 * ```
 */
async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Vérifie un mot de passe contre son hash bcrypt.
 *
 * @param {string} plain - Mot de passe en clair saisi par l'utilisateur
 * @param {string} hash - Hash bcrypt stocké en base
 * @returns {Promise<boolean>} true si le mot de passe correspond
 *
 * @example
 * ```javascript
 * const isValid = await verifyPassword("monMotDePasse123", storedHash);
 * if (!isValid) throw new Error("Mot de passe incorrect");
 * ```
 */
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Génère un hash SHA-256 d'une chaîne.
 * Utile pour hacher les jetons avant stockage en base.
 *
 * @param {string} value - Chaîne à hacher
 * @returns {string} Hash hexadécimal (64 caractères)
 *
 * @example
 * ```javascript
 * const tokenHash = sha256(verificationToken);
 * // → "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 * ```
 */
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Génère un mot de passe aléatoire haute entropie.
 * Utilisé pour les secrets, tokens de VPN, etc.
 *
 * @param {number} [length=32] - Longueur du mot de passe
 * @returns {string} Mot de passe aléatoire
 *
 * @example
 * ```javascript
 * const vpnPassword = generatePassword(32);
 * // → "aB3dE5fG7hJ9kL1mN2pQ4rS6tU8vW0x"
 * ```
 */
function generatePassword(length = 32) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Génère un jeton de vérification aléatoire (mono-usage).
 * Utilisé pour la vérification d'email et la réinitialisation de mot de passe.
 *
 * @returns {string} Jeton hexadécimal (64 caractères)
 *
 * @example
 * ```javascript
 * const token = generateVerificationToken();
 * const tokenHash = sha256(token);
 * // Sauvegarder tokenHash en base, envoyer token par email
 * ```
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Crée un JWT signé avec le secret de l'application.
 *
 * @param {object} payload - Données à inclure dans le token
 * @param {string} payload.sub - ID de l'utilisateur
 * @param {string} [payload.purpose] - Usage du token (ex: "2fa")
 * @returns {string} JWT signé
 *
 * @example
 * ```javascript
 * const token = signJwt({ sub: user.id, jti: "unique-id" });
 * // eyJhbGciOiJIUzI1NiIs...
 * ```
 */
function signJwt(payload, { expiresIn = env.jwtExpiresIn } = {}) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn });
}

/**
 * Vérifie et décode un JWT.
 *
 * @param {string} token - JWT à vérifier
 * @returns {object} Payload décodé
 * @throws {Error} Si le token est invalide ou expiré
 *
 * @example
 * ```javascript
 * try {
 *   const payload = verifyJwt(token);
 *   console.log(payload.sub); // ID utilisateur
 * } catch (err) {
 *   console.error("Token invalide:", err.message);
 * }
 * ```
 */
function verifyJwt(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  hashPassword,
  verifyPassword,
  sha256,
  generatePassword,
  generateVerificationToken,
  signJwt,
  verifyJwt,
};
