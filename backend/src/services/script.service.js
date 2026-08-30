const { env } = require("../config/env");

/**
 * Génère un script RouterOS auto-suffisant qui configure :
 * 1. La connexion L2TP/IPsec vers le serveur ITSOLUTIONS
 * 2. Le client RADIUS du MikroTik pointant vers FreeRADIUS
 * 3. Le serveur Hotspot avec authentification via RADIUS
 * 4. Les profils d'accès Hotspot (bandwidth, durée)
 *
 * @param {Object} opts
 * @param {string} opts.vpnServer - Adresse IP/hostname du serveur VPN
 * @param {string} opts.username - Identifiant VPN du routeur
 * @param {string} opts.password - Mot de passe VPN
 * @param {string} opts.routerName - Nom du routeur
 * @param {string} opts.routerOsFamily - V6_TO_7_9 | V7_10_PLUS
 * @param {string} [opts.ipsecSecret] - Secret IPsec (vide = L2TP seul)
 * @param {string} [opts.radiusSecret] - Secret RADIUS pour le NAS (vide = pas de config RADIUS)
 * @param {string} [opts.radiusServer] - IP du serveur FreeRADIUS (défaut: 127.0.0.1)
 * @param {number} [opts.radiusPort] - Port auth RADIUS (défaut: 1812)
 */
function buildMikrotikScript({
  vpnServer,
  username,
  password,
  routerName,
  routerOsFamily = "V6_TO_7_9",
  ipsecSecret = "",
  radiusSecret = "",
  radiusServer = "127.0.0.1",
  radiusPort = 1812,
}) {
  const isV7Plus = routerOsFamily === "V7_10_PLUS";
  const hasIpsec = Boolean(ipsecSecret);
  const hasRadius = Boolean(radiusSecret);

  const lines = [
    "# ╔══════════════════════════════════════════════════════════════════════╗",
    "# ║  ITSOLUTIONS — Configuration automatique du routeur MikroTik       ║",
    `# ║  Routeur : ${routerName.padEnd(53)}║`,
    `# ║  Version : ${(isV7Plus ? "7.10+" : "6.x-7.9").padEnd(53)}║`,
    "# ║  Exécutez ce script dans le Terminal (Winbox ou WebFig).           ║",
    "# ╚══════════════════════════════════════════════════════════════════════╝",
    "",
  ];

  // ─── 1. PROFIL PPP DÉDIÉ ─────────────────────────────────────────────
  lines.push(
    "# [1/6] Profil PPP dédié ITSOLUTIONS",
    ':do { /ppp profile remove [find name="itsolutions"] } on-error={}',
    '/ppp profile add name="itsolutions" change-tcp-mss=yes',
    ""
  );

  // ─── 2. FIREWALL : paquets VPN + RADIUS ───────────────────────────────
  lines.push(
    "# [2/6] Règles firewall (VPN + RADIUS)",
    ':do { /ip firewall filter remove [find comment="ITSOLUTIONS VPN"] } on-error={}',
    '/ip firewall filter add chain=input protocol=udp dst-port=1701 action=accept comment="ITSOLUTIONS VPN" place-before=0'
  );
  if (hasIpsec) {
    lines.push(
      '/ip firewall filter add chain=input protocol=udp dst-port=500,4500 action=accept comment="ITSOLUTIONS VPN" place-before=0'
    );
  }
  if (hasRadius) {
    lines.push(
      `/ip firewall filter add chain=input protocol=udp dst-port=${radiusPort} src-address=${radiusServer} action=accept comment="ITSOLUTIONS VPN" place-before=0`
    );
  }
  lines.push("");

  // ─── 3. CLIENT L2TP ───────────────────────────────────────────────────
  lines.push(
    "# [3/6] Client L2TP vers le serveur ITSOLUTIONS",
    ':do { /interface l2tp-client remove [find name="itsolutions"] } on-error={}',
    "/interface l2tp-client add",
    '  name="itsolutions"',
    `  connect-to="${vpnServer}"`,
    `  user="${username}"`,
    `  password="${password}"`,
    hasIpsec && isV7Plus ? `  ipsec-secret="${ipsecSecret}"` : null,
    "  profile=itsolutions",
    "  disabled=no",
    "  add-default-route=no",
    "",
    "/interface l2tp-client enable itsolutions"
  );

  // ─── 4. IPsec manuel (RouterOS 6.x-7.9) ──────────────────────────────
  if (hasIpsec && !isV7Plus) {
    lines.push(
      "# [4/6] IPsec manuel (RouterOS 6.x-7.9)",
      ':do { /ip ipsec peer remove [find name="itsolutions"] } on-error={}',
      `/ip ipsec peer add name="itsolutions" address="${vpnServer}" secret="${ipsecSecret}" generate-policy=port-strict`
    );
  } else {
    lines.push("# [4/6] IPsec : géré nativement ou non configuré");
  }
  lines.push("");

  // ─── 5. CLIENT RADIUS ─────────────────────────────────────────────────
  if (hasRadius) {
    lines.push(
      "# [5/6] Client RADIUS → FreeRADIUS (authentification Hotspot)",
      ':do { /radius remove [find name="itsolutions-radius"] } on-error={}',
      `/radius add name="itsolutions-radius" address=${radiusServer} port=${radiusPort} secret="${radiusSecret}" timeout=3000ms require-message-authenticator=yes`,
      ""
    );

    // Activer l'authentification RADIUS pour Hotspot + PPP
    lines.push(
      ":do { /ip hotspot set [find] use-radius=yes } on-error={}",
      ":do { /ppp aaa set use-radius=yes } on-error={}",
      ""
    );
  } else {
    lines.push("# [5/6] Client RADIUS : non configuré (pas de secret fourni)");
  }
  lines.push("");

  // ─── 6. SERVEUR HOTSPOT ───────────────────────────────────────────────
  if (hasRadius) {
    // Interface du hotspot : on utilise l'interface bridge LAN par défaut
    // L'administrateur peut adapter selon sa topologie
    lines.push(
      "# [6/6] Serveur Hotspot (authentification via RADIUS)",
      "# ⚠️  Adaptez l'interface ci-dessous selon votre topologie réseau",
      '# Exemples : "bridge-local", "ether2", "wlan1"',
      ':do { /ip hotspot add name="itsolutions-hotspot" interface=bridge-local address-pool=hotspot-profile login-by=http-chap,mac Cookie-timeout=1d } on-error={}',
      ""
    );

    // Profils de bande passante Hotspot
    lines.push(
      "# Profils de bande passante (adaptés aux profils ITSOLUTIONS)",
      ':do { /ip hotspot user profile remove [find name="hotspot-basic"] } on-error={}',
      '/ip hotspot user profile add name="hotspot-basic" rate-limit=512k/1024k idle-timeout=10m shared-users=1',
      ':do { /ip hotspot user profile remove [find name="hotspot-standard"] } on-error={}',
      '/ip hotspot user profile add name="hotspot-standard" rate-limit=1m/2m idle-timeout=30m shared-users=2',
      ':do { /ip hotspot user profile remove [find name="hotspot-premium"] } on-error={}',
      '/ip hotspot user profile add name="hotspot-premium" rate-limit=5m/10m idle-timeout=60m shared-users=3',
      ""
    );

    // Captive portal : redirection HTTP
    lines.push(
      "# Redirection captive portal",
      ':do { /ip firewall nat remove [find comment="ITSOLUTIONS HOTSPOT"] } on-error={}',
      '/ip firewall nat add chain=hotspot src-address=10.10.0.0/16 dst-address=!10.10.0.0/16 action=redirect to-ports=80 protocol=tcp comment="ITSOLUTIONS HOTSPOT" place-before=0',
      ""
    );
  } else {
    lines.push("# [6/6] Serveur Hotspot : non configuré (pas de RADIUS)");
  }

  // ─── FINAL ─────────────────────────────────────────────────────────────
  lines.push(
    "# ═══════════════════════════════════════════════════════════════════════",
    ':put "Configuration ITSOLUTIONS appliquée avec succès."',
    ':put "VPN   : /interface l2tp-client print"',
    hasRadius ? ':put "RADIUS: /radius print"' : null,
    hasRadius ? ':put "Hotspot: /ip hotspot active print"' : null,
    ':put "Vérifiez la connexion VPN et la connectivité RADIUS."',
    "# ═══════════════════════════════════════════════════════════════════════"
  );

  return lines.filter((line) => line !== null).join("\n");
}

function buildWebfigUrl(subdomain) {
  return `http://webfig.${subdomain}.${env.platformDomain}`;
}

function buildMikhmonUrl(subdomain) {
  return `https://${subdomain}.${env.platformDomain}`;
}

module.exports = { buildMikrotikScript, buildWebfigUrl, buildMikhmonUrl };
