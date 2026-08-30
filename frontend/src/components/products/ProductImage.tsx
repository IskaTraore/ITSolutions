import type { Product } from "@/lib/products";
import { ProductVisual } from "./ProductVisual";

/** Origine du backend (sert à préfixer les chemins /uploads/...). */
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api").replace(
  /\/api\/?$/,
  ""
);

interface ProductImageProps {
  product: Pick<Product, "name" | "imageUrl" | "visual" | "hue">;
  className?: string;
}

/**
 * Visuel d'un produit : la photo téléversée par l'admin si elle existe,
 * sinon l'illustration SVG stylisée (fallback).
 */
export function ProductImage({ product, className = "" }: ProductImageProps) {
  if (product.imageUrl) {
    const src = product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `${API_ORIGIN}${product.imageUrl}`;
    // Images admin hébergées sur le backend : next/image nécessiterait un
    // remotePatterns par origine, inadapté ici. <img> simple et suffisant.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={product.name} loading="lazy" className={className} />;
  }
  return <ProductVisual visual={product.visual} hue={product.hue} className={className} />;
}
