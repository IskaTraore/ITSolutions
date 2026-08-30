const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { swaggerSpec } = require("./config/swagger");
const swaggerUi = require("swagger-ui-express");

// Polyfill BigInt pour la sérialisation JSON
BigInt.prototype.toJSON = function () {
  return Number(this);
};

const authRoutes = require("./routes/auth.routes");
const walletRoutes = require("./routes/wallet.routes");
const routerRoutes = require("./routes/router.routes");
const adminRoutes = require("./routes/admin.routes");
const productsRoutes = require("./routes/products.routes");
const hotspotRoutes = require("./routes/hotspot.routes");
const radiusRoutes = require("./routes/radius.routes");
const twoFaRoutes = require("./routes/2fa.routes");
const { authRateLimit, apiRateLimit } = require("./middleware/rateLimit");

const app = express();

app.set("trust proxy", 1);

// ─── Headers de sécurité ───────────────────────────────────────────────
app.use((req, res, next) => {
  // Protection contre le sniffing MIME
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Empêcher le clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // XSS Protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Pas de cache pour les API
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  // CORS strict
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Fichiers statiques : photos produits téléversées
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes publiques
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "itsolutions-backend", time: new Date().toISOString() });
});

// ─── Documentation Swagger (dev uniquement) ──────────────────────────────
if (env.nodeEnv !== "production") {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "ITSOLUTIONS API Docs",
    })
  );
  // Endpoint JSON brut de la spec OpenAPI
  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  console.log(`[DOCS] Swagger UI disponible sur http://localhost:${env.port}/api/docs`);
}

// Rate limiting global sur les routes API
app.use("/api", apiRateLimit);

// Routes métier
app.use("/api/auth", authRateLimit, authRoutes.router);
app.use("/api/wallet", walletRoutes.router);
app.use("/api/routers", routerRoutes.router);
app.use("/api/admin", adminRoutes.router);
app.use("/api/products", productsRoutes.router);
app.use("/api/hotspot", hotspotRoutes.router);
app.use("/api/radius", radiusRoutes.router);
app.use("/api/2fa", twoFaRoutes.router);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
