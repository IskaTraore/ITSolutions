/**
 * @module config/swagger
 * @description Configuration Swagger/OpenAPI pour la documentation de l'API ITSOLUTIONS.
 *
 * Accessible en développement sur : http://localhost:4200/api/docs
 */

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "ITSOLUTIONS API",
      version: "1.0.0",
      description: `
API REST pour la plateforme ITSOLUTIONS — gestion centralisée de routeurs MikroTik avec Mikhmon en ligne, VPN L2TP, FreeRADIUS et Wallet.

## Fonctionnalités principales
- **Authentification** : Inscription, connexion, 2FA (TOTP)
- **Routeurs** : Ajout, suppression, scripts de configuration
- **Wallet** : Recharge par Mobile Money / carte bancaire
- **Hotspot** : Groupes, sites, profils, vouchers, sessions RADIUS
- **Boutique** : Catalogue d'équipements réseau
- **Abonnements** : Renouvellement automatique

## Authentification
La plupart des routes nécessitent un JWT token envoyé via un cookie httpOnly \`its_token\`.

## Rate Limiting
- Authentification : 5 requêtes / 15 min / IP
- 2FA : 5 tentatives / 5 min
- API générale : 200 requêtes / 15 min / IP
      `,
      contact: {
        name: "ITSOLUTIONS Support",
        email: "support@itsolutions.tld",
      },
      license: {
        name: "Propriétaire",
        url: "https://itsolutions.tld",
      },
    },
    servers: [
      {
        url: "http://localhost:4200/api",
        description: "Serveur de développement",
      },
      {
        url: "https://api.itsolutions.tld",
        description: "Serveur de production",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "its_token",
          description: "JWT token dans le cookie httpOnly its_token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "clx1234567890" },
            email: { type: "string", format: "email", example: "user@example.com" },
            username: { type: "string", example: "mikhmon1" },
            role: { type: "string", enum: ["USER", "ADMIN", "SUPPORT"] },
            status: { type: "string", enum: ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"] },
            emailVerified: { type: "boolean" },
            twoFactorEnabled: { type: "boolean" },
            autoRenew: { type: "boolean" },
            phone: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Wallet: {
          type: "object",
          properties: {
            balance: { type: "integer", example: 50000 },
            currency: { type: "string", example: "FC" },
          },
        },
        Router: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "Routeur Kinshasa" },
            routerOsFamily: { type: "string", enum: ["V6_TO_7_9", "V7_10_PLUS"] },
            status: { type: "string", enum: ["PENDING_PROVISIONING", "ACTIVE", "EXPIRED", "SUSPENDED"] },
            apiPort: { type: "integer", nullable: true },
            winboxPort: { type: "integer", nullable: true },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "MikroTik hAP ac²" },
            model: { type: "string", example: "hAP ac2" },
            category: { type: "string", enum: ["routeurs", "antennes-cpe", "switches", "accessoires"] },
            price: { type: "integer", example: 150000 },
            stock: { type: "string", enum: ["in", "limited", "order"] },
          },
        },
        HotspotGroup: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "BUKAVU-CENTRAL" },
            description: { type: "string", nullable: true },
          },
        },
        HotspotProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "1 Heure" },
            durationMinutes: { type: "integer", example: 60 },
            price: { type: "integer", example: 1000 },
            downloadRate: { type: "integer", nullable: true, description: "kbps" },
            uploadRate: { type: "integer", nullable: true, description: "kbps" },
            quotaMb: { type: "integer", nullable: true },
            maxDevices: { type: "integer", example: 1 },
          },
        },
        HotspotVoucher: {
          type: "object",
          properties: {
            id: { type: "string" },
            code: { type: "string", example: "ABCD1234" },
            status: { type: "string", enum: ["UNUSED", "ACTIVE", "EXPIRED", "REVOKED"] },
            profile: { $ref: "#/components/schemas/HotspotProfile" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "AUTH_INVALID" },
                message: { type: "string", example: "Identifiants invalides" },
                details: { type: "object" },
              },
            },
          },
        },
        TwoFactorSetup: {
          type: "object",
          properties: {
            secret: { type: "string", description: "Clé secrète TOTP en base32" },
            authUrl: { type: "string", description: "URL otpauth:// pour QR code" },
            backupCodes: { type: "array", items: { type: "string" }, description: "Codes de récupération" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentification et gestion des sessions" },
      { name: "2FA", description: "Authentification à deux facteurs (TOTP)" },
      { name: "Wallet", description: "Portefeuille et paiements" },
      { name: "Routers", description: "Gestion des routeurs MikroTik" },
      { name: "Hotspot", description: "Groupes, sites, profils, vouchers Hotspot" },
      { name: "Radius", description: "Sessions et comptage RADIUS" },
      { name: "Products", description: "Boutique d'équipements réseau" },
      { name: "Admin", description: "Routes d'administration" },
    ],
  },
  apis: ["./src/routes/*.js"], // Scan des fichiers de routes pour les annotations JSDoc
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
