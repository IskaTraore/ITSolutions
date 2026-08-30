import type { NextConfig } from "next";

const getApiOrigin = (urlStr?: string) => {
  if (!urlStr) return "";
  try {
    return new URL(urlStr).origin;
  } catch {
    return urlStr;
  }
};

const apiOrigin = getApiOrigin(process.env.NEXT_PUBLIC_API_URL);

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' http://localhost:4200 http://localhost:5000 ${apiOrigin} https://*.onrender.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
`
  .replace(/\n/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Optimisations de build
  experimental: {
    // Activer le code splitting automatique
    optimizePackageImports: ["react", "react-dom"],
  },

  // Compression gzip/brotli
  compress: true,

  // Optimisation des images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 jours
  },

  // En-têtes de cache pour les assets statiques
  async rewrites() {
    return [];
  },

  // Exclure les fichiers de type spécifique du build
  productionBrowserSourceMaps: false,

  // Optimisation des polyfills
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn", "info"] }
        : false,
  },
};

export default nextConfig;
