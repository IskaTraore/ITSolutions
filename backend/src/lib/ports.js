const { prisma } = require("./prisma");
const { Errors } = require("./errors");

const API_POOL = { start: 40000, end: 49999 };
const WINBOX_POOL = { start: 50000, end: 59999 };

/**
 * Retourne le premier port libre du pool pour le champ donné.
 * L'unicité est de plus garantie en base (@unique).
 */
async function allocatePort(pool, field) {
  const used = await prisma.router.findMany({
    where: { [field]: { not: null } },
    select: { [field]: true },
  });
  const usedSet = new Set(used.map((r) => r[field]));

  for (let port = pool.start; port <= pool.end; port++) {
    if (!usedSet.has(port)) return port;
  }
  throw Errors.portAllocationFailed();
}

/** Alloue l'IP VPN suivante dans 10.8.0.0/16 (10.8.0.1 réservé au serveur, pas de .0 ou .255). */
async function allocateVpnIp() {
  const used = await prisma.vpnCredential.findMany({
    where: { vpnIp: { not: null } },
    select: { vpnIp: true },
  });
  const usedSet = new Set(used.map((v) => v.vpnIp));

  for (let host = 2; host < 65536; host++) {
    const lastOctet = host % 256;
    if (lastOctet === 0 || lastOctet === 255) continue; // ignorer adresse réseau et broadcast

    const octets = [
      10,
      8,
      Math.floor(host / 256),
      lastOctet,
    ];
    const ip = octets.join(".");
    if (!usedSet.has(ip)) return ip;
  }
  throw Errors.provisioningFailed({ reason: "no_vpn_ip_available" });
}

module.exports = { allocatePort, allocateVpnIp, API_POOL, WINBOX_POOL };
