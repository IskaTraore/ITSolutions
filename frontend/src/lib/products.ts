/**
 * Types et helpers du catalogue d'équipements réseau.
 * Les produits sont gérés par l'administrateur (CRUD) et chargés depuis l'API :
 * GET /api/products — plus aucune donnée en dur ici.
 */

export type ProductCategory = "routeurs" | "antennes-cpe" | "switches" | "accessoires";

export type ProductVisual =
  | "hap-ac2"
  | "hex"
  | "haplite"
  | "sxt"
  | "mantbox"
  | "omnitik"
  | "switch"
  | "poe-kit";

export type ProductHue =
  | "indigo"
  | "violet"
  | "teal"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan";

export type ProductBadge = "promo" | "nouveau" | "best-seller";

export type ProductStock = "in" | "limited" | "order";

export interface Product {
  id: string;
  name: string;
  model: string;
  category: ProductCategory;
  categoryLabel: string;
  price: number;
  oldPrice: number | null;
  rating: number;
  reviews: number;
  visual: ProductVisual;
  hue: ProductHue;
  badge: ProductBadge | null;
  stock: ProductStock;
  specs: string[];
  description: string | null;
  /** Photo téléversée par l'admin (chemin relatif du backend) ; null = illustration SVG. */
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORIES: { id: ProductCategory | "all"; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "routeurs", label: "Routeurs" },
  { id: "antennes-cpe", label: "Antennes & CPE" },
  { id: "switches", label: "Switches" },
  { id: "accessoires", label: "Accessoires" },
];

export const STOCK_LABELS: Record<ProductStock, string> = {
  in: "En stock",
  limited: "Stock limité",
  order: "Sur commande",
};

/** Formatte un montant en Francs Congolais, ex : 155000 -> « 155 000 FC ». */
export function formatFC(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FC`;
}
