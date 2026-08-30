const crypto = require("crypto");

/**
 * Slug DNS-safe : lettres minuscules et chiffres uniquement, sans espaces.
 * Exemple : "Mikhmon 1!" -> "mikhmon1"
 */
function slugifyName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

const NAME_PATTERN = /^[a-z0-9]{3,32}$/;

function isValidName(name) {
  return NAME_PATTERN.test(name);
}

/** Identifiant VPN court, ex: router_ab12cd */
function vpnUsername(routerId) {
  return `router_${routerId.slice(-8)}`;
}

/** Clé d'idempotence pour les opérations de routeur. */
function idempotencyKeyForRouter(prefix, customKey) {
  if (customKey) return `${prefix}-${customKey}`;
  return prefix;
}

module.exports = { slugifyName, isValidName, vpnUsername, idempotencyKeyForRouter };
