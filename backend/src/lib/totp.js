/**
 * @module lib/totp
 * @description Service TOTP (Time-based One-Time Password) pour l'authentification
 * à deux facteurs (2FA). Implémentation pure Node.js sans dépendance externe.
 *
 * Standard : RFC 6238 (TOTP) basé sur RFC 4226 (HOTP).
 * Compatible avec Google Authenticator, Authy, 1Password, etc.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const DIGITS = 6;           // Nombre de chiffres du code TOTP
const PERIOD = 30;          // Durée de validité d'un code en secondes
const SKEW = 1;             // Nombre de périodes acceptées avant/après (tolérance)
const ALGORITHM = "sha1";   // Algorithme HMAC (Google Authenticator utilise SHA-1)

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DE CLÉ SECRÈTE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère une clé secrète base32 pour TOTP.
 * @param {number} [length=20] - Nombre d'octets aléatoires (16-32 recommandé)
 * @returns {string} Clé secrète en base32 (ex: "JBSWY3DPEHPK3PXP")
 */
function generateSecret(length = 20) {
  const buffer = crypto.randomBytes(length);
  return base32Encode(buffer);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION & VÉRIFICATION DE CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère un code TOTP pour un instant donné.
 * @param {string} secret - Clé secrète base32
 * @param {number} [timestamp] - Timestamp en secondes (défaut : maintenant)
 * @returns {string} Code TOTP à 6 chiffres
 */
function generateCode(secret, timestamp) {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / PERIOD);
  return generateHOTP(secret, counter);
}

/**
 * Vérifie un code TOTP avec tolérance de temps (skew).
 * @param {string} secret - Clé secrète base32
 * @param {string} code - Code à vérifier (6 chiffres)
 * @param {number} [timestamp] - Timestamp en secondes (défaut : maintenant)
 * @returns {boolean} true si le code est valide
 */
function verifyCode(secret, code, timestamp) {
  if (!code || code.length !== DIGITS || !/^\d+$/.test(code)) {
    return false;
  }

  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / PERIOD);

  // Vérifier le code actuel et les périodes adjacentes (skew)
  for (let i = -SKEW; i <= SKEW; i++) {
    const expected = generateHOTP(secret, counter + i);
    // Comparaison à temps constant pour éviter le timing attack
    if (constantTimeCompare(code, expected)) {
      return true;
    }
  }

  return false;
}

/**
 * Génère un code HOTP (RFC 4226) — base de TOTP.
 * @private
 * @param {string} secret - Clé secrète base32
 * @param {number} counter - Compteur incrémental
 * @returns {string} Code à DIGITS chiffres
 */
function generateHOTP(secret, counter) {
  const key = base32Decode(secret);

  // Encoder le compteur sur 8 octets (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // HMAC-SHA1
  const hmac = crypto.createHmac(ALGORITHM, key).update(counterBuffer).digest();

  // Dynamic Truncation (RFC 4226 §5.4)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  // Réduction mod 10^DIGITS
  const otp = binary % Math.pow(10, DIGITS);
  return otp.toString().padStart(DIGITS, "0");
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL DE CONFIGURATION (QR CODE)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère une URI otpauth:// pour QR code (compatible Google Authenticator).
 * @param {string} email - Adresse email de l'utilisateur
 * @param {string} secret - Clé secrète base32
 * @param {string} [issuer="ITSOLUTIONS"] - Nom du service
 * @returns {string} URI otpauth://
 */
function generateAuthUrl(email, secret, issuer = "ITSOLUTIONS") {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=${ALGORITHM}&digits=${DIGITS}&period=${PERIOD}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODES DE RÉCUPÉRATION (BACKUP CODES)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalise un code de récupération en supprimant les espaces et tirets.
 * @param {string} code - Code à normaliser
 * @returns {string} Code normalisé en majuscules (8 caractères)
 */
function normalizeBackupCode(code) {
  if (typeof code !== "string") return "";
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Calcule le hash SHA-256 d'un code normalisé.
 * @param {string} code - Code en clair ou déjà normalisé
 * @returns {string} Hash SHA-256 hexadécimal
 */
function hashBackupCode(code) {
  const normalized = normalizeBackupCode(code);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Génère des codes de récupération (backup codes) en cas de perte d'accès 2FA.
 * @param {number} [count=8] - Nombre de codes à générer
 * @returns {{ codes: string[], hashes: string[] }} Codes en clair et leurs hash SHA-256
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  const hashes = [];

  for (let i = 0; i < count; i++) {
    // Code de 8 caractères alphanumériques (ex: "A3F8-K2M1")
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    codes.push(formatted);
    hashes.push(hashBackupCode(formatted));
  }

  return { codes, hashes };
}

/**
 * Vérifie un code de récupération.
 * @param {string} code - Code saisi par l'utilisateur
 * @param {string[]} usedHashes - Hashes SHA-256 des codes déjà utilisés
 * @param {string[]} allHashes - Tous les hashes SHA-256 des codes valides
 * @returns {{ valid: boolean, hash?: string, newIndex?: number }} Résultat de la vérification
 */
function verifyBackupCode(code, usedHashes = [], allHashes = []) {
  const normalized = normalizeBackupCode(code);
  if (normalized.length !== 8) return { valid: false };

  const hash = hashBackupCode(normalized);
  const index = allHashes.indexOf(hash);

  if (index === -1) return { valid: false };
  if (usedHashes.includes(hash)) return { valid: false }; // Déjà utilisé

  return { valid: true, hash, newIndex: index };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES BASE32
// ═══════════════════════════════════════════════════════════════════════════════

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer) {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(str) {
  let bits = "";
  for (const char of str.toUpperCase()) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) throw new Error(`Caractère base32 invalide: ${char}`);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SÉCURITÉ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Comparaison à temps constant pour éviter les timing attacks.
 * @private
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  generateSecret,
  generateCode,
  verifyCode,
  generateAuthUrl,
  generateBackupCodes,
  verifyBackupCode,
  DIGITS,
  PERIOD,
  SKEW,
};
