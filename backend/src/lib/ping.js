const { execFile } = require("child_process");

/**
 * Ping ICMP réel vers une cible (hôte ou IP) via la commande système `ping`.
 * - Linux/macOS : `ping -c 1 -W 3 <host>`
 * - Windows : `ping -n 1 -w 3000 <host>`
 *
 * Retourne toujours un objet, sans jamais rejeter : un échec réseau (code de
 * sortie non nul, hôte injoignable) est converti en `{ reachable: false }`.
 */
function pingHost(host) {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const args = isWindows
      ? ["-n", "1", "-w", "3000", host]
      : ["-c", "1", "-W", "3", host];

    execFile("ping", args, { timeout: 4000 }, (error, stdout) => {
      if (error) {
        resolve({ reachable: false, latencyMs: null });
        return;
      }
      // « time=12.3 ms » (Linux/macOS), « time<1ms », « temps=12 ms » (Windows FR)
      const match = String(stdout).match(/time[=<](\d+(?:\.\d+)?)\s*ms/i);
      resolve({
        reachable: true,
        latencyMs: match ? parseFloat(match[1]) : null,
      });
    });
  });
}

module.exports = { pingHost };
