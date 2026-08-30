require("dotenv").config();

const env = {
  databaseUrl: process.env.DATABASE_URL,
  port: parseInt(process.env.PORT || "4200", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieSecure: process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  platformDomain: process.env.PLATFORM_DOMAIN || "itsolutions.tld",
  vpnServer: process.env.VPN_SERVER || "vpn.itsolutions.tld",
  // Secret partagé IPsec pour le tunnel L2TP/IPsec (vide = L2TP seul)
  vpnIpsecSecret: process.env.VPN_IPSEC_SECRET || "",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "ITSOLUTIONS <no-reply@itsolutions.tld>",
  },
  whatsappDisabled: process.env.WHATSAPP_DISABLED === "true",

  // FreeRADIUS
  radiusServer: process.env.RADIUS_SERVER || "127.0.0.1",
  radiusAuthPort: parseInt(process.env.RADIUS_AUTH_PORT || "1812", 10),
  radiusAcctPort: parseInt(process.env.RADIUS_ACCT_PORT || "1813", 10),
  // Secret du webhook interne FreeRADIUS -> API
  radiusSecret: process.env.RADIUS_WEBHOOK_SECRET || process.env.RADIUS_SECRET || "dev-radius-webhook-secret",
  radiusWebhookSecret: process.env.RADIUS_WEBHOOK_SECRET || process.env.RADIUS_SECRET || "dev-radius-webhook-secret",

  // Webhook paiements
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "dev-payment-webhook",
  webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "dev-payment-webhook",
};

if (!env.databaseUrl) {
  console.error("DATABASE_URL manquant. Copiez .env.example vers .env.");
  process.exit(1);
}

if (env.nodeEnv === "production") {
  if (env.jwtSecret === "dev-secret-change-me") {
    console.error("CRITICAL SECURITY ERROR: JWT_SECRET doit être modifié en production !");
    process.exit(1);
  }
  if (!env.cookieSecure) {
    console.error("CRITICAL SECURITY ERROR: COOKIE_SECURE=true est obligatoire en production !");
    process.exit(1);
  }
  if (env.paymentWebhookSecret === "dev-payment-webhook") {
    console.error("CRITICAL SECURITY ERROR: PAYMENT_WEBHOOK_SECRET doit être modifié en production !");
    process.exit(1);
  }
  if (env.radiusWebhookSecret === "dev-radius-webhook-secret" || env.radiusSecret === "dev-radius-webhook-secret") {
    console.error("CRITICAL SECURITY ERROR: RADIUS_WEBHOOK_SECRET doit être modifié en production !");
    process.exit(1);
  }
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.error("CRITICAL SECURITY ERROR: SMTP_HOST, SMTP_USER et SMTP_PASS sont obligatoires en production !");
    process.exit(1);
  }
}

module.exports = { env };
