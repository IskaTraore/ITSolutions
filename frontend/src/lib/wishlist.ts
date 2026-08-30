/**
 * Wishlist (favoris) — mini store externe persisté dans localStorage.
 * Utilisé avec useSyncExternalStore (même pattern que ThemeToggle),
 * ce qui synchronise tous les cœurs de carte sans re-render intempestifs.
 */

const WISHLIST_KEY = "its_wishlist";

const listeners = new Set<() => void>();
let cache: string[] | null = null;

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Snapshot stable à utiliser avec useSyncExternalStore. */
export function getWishlistSnapshot(): string[] {
  if (cache === null) cache = readStored();
  return cache;
}

/** Snapshot côté serveur (toujours vide : pas de localStorage). */
export function getWishlistServerSnapshot(): string[] {
  return [];
}

export function subscribeWishlist(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function isInWishlist(id: string): boolean {
  return getWishlistSnapshot().includes(id);
}

/** Ajoute/retire un produit et notifie les abonnés. Retourne le nouvel état. */
export function toggleWishlist(id: string): boolean {
  const current = getWishlistSnapshot();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  cache = next;
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible : état en mémoire uniquement */
  }
  listeners.forEach((listener) => listener());
  return next.includes(id);
}
