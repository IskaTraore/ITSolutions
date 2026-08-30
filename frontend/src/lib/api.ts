/**
 * @module lib/api
 * @description Client API optimisé pour ITSOLUTIONS.
 *
 * Fonctionnalités :
 * - Gestion centralisée des erreurs
 * - Authentification par cookie httpOnly
 * - Retry automatique sur erreurs réseau
 * - Cache pour les données statiques
 * - Formatage monétaire FC
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
}

interface NextFetchRequestConfig {
  revalidate?: number | false;
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE EN MÉMOIRE
// ═══════════════════════════════════════════════════════════════════════════════

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute par défaut

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
  // Limiter la taille du cache
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Effectue une requête API avec gestion d'erreurs et retry.
 *
 * @param path - Chemin de l'endpoint (ex: "/auth/login")
 * @param options - Options de la requête
 * @returns Promise avec la réponse typée
 *
 * @example
 * ```typescript
 * // Requête GET simple
 * const user = await api<User>("/auth/me");
 *
 * // Requête POST avec body
 * const result = await api<LoginResponse>("/auth/login", {
 *   method: "POST",
 *   body: { email, password }
 * });
 * ```
 */
export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers: customHeaders,
    cache = "no-store",
    next,
  } = options;

  const cacheKey = `${method}:${path}:${body ? JSON.stringify(body) : ""}`;

  // Utiliser le cache pour les requêtes GET si configuré
  if (method === "GET" && next?.revalidate) {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;
  }

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache,
  };

  // Retry automatique sur erreurs réseau (max 2 tentatives)
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, fetchOptions);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const err = data?.error;
        throw new ApiError(
          res.status,
          err?.code || "INTERNAL_ERROR",
          err?.message || "Erreur inattendue",
          err?.details
        );
      }

      // Mettre en cache si applicable
      if (method === "GET" && next?.revalidate) {
        setCache(cacheKey, data);
      }

      return data as T;
    } catch (err) {
      lastError = err as Error;

      // Ne pas retry sur les erreurs HTTP (sauf 5xx)
      if (err instanceof ApiError && err.status < 500) {
        throw err;
      }

      // Retry uniquement sur les erreurs réseau
      if (attempt === 0 && err instanceof TypeError && err.message.includes("fetch")) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formate un montant en Francs Congolais (FC).
 * @param amount - Montant en FC
 * @returns Montant formaté (ex: "23 000")
 */
export const formatFc = (amount: number) => new Intl.NumberFormat("fr-FR").format(amount);

/**
 * Formate une date en français.
 * @param date - Date à formater
 * @returns Date formatée (ex: "15 janv. 2024")
 */
export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Formate une durée en minutes/secondes.
 * @param seconds - Durée en secondes
 * @returns Durée formatée (ex: "2h30", "45min")
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m ? `${h}h${m}` : `${h}h`;
}

/**
 * Formate un nombre d'octets en unité lisible.
 * @param bytes - Nombre d'octets
 * @returns Taille formatée (ex: "1.5 Mo", "256 Ko")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF DOWNLOAD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Télécharge un PDF depuis l'API et déclenche le téléchargement côté client.
 * Utilisé pour les vouchers, résumés, etc.
 *
 * @param path - Chemin de l'endpoint (ex: "/hotspot/vouchers/generate-pdf")
 * @param body - Corps de la requête JSON
 * @param filename - Nom du fichier à télécharger
 */
export async function downloadPdf(
  path: string,
  body: unknown,
  filename: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const err = data?.error;
    throw new ApiError(
      res.status,
      err?.code || "INTERNAL_ERROR",
      err?.message || "Erreur lors du téléchargement du PDF"
    );
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
