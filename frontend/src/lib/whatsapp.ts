import { formatFC, type Product } from "./products";

/**
 * Numéro WhatsApp (format international, sans « + »).
 * ⚠️ À remplacer par le vrai numéro ITSOLUTIONS avant mise en production.
 */
export const WHATSAPP_NUMBER = "243812345678";

/** Lien WhatsApp générique. */
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

/** Construit un lien wa.me avec message pré-rempli et encodé. */
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Message de commande pré-rempli pour un produit donné. */
export function productOrderMessage(product: Product): string {
  return [
    "Bonjour ITSOLUTIONS 👋,",
    "",
    "Je souhaite commander :",
    "",
    `🛒 *${product.name}* (${product.model})`,
    `💵 Prix : ${formatFC(product.price)}`,
    `🔗 ${typeof window !== "undefined" ? window.location.href : "https://itsolutions.tld/produits"}`,
    "",
    "Merci de me confirmer la disponibilité.",
  ].join("\n");
}
