"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ProductImage } from "./ProductImage";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { IconHeart, IconStar, IconX } from "@/components/Icons";
import { formatFC, STOCK_LABELS, type Product, type ProductStock } from "@/lib/products";
import {
  getWishlistServerSnapshot,
  getWishlistSnapshot,
  subscribeWishlist,
  toggleWishlist,
} from "@/lib/wishlist";
import { productOrderMessage } from "@/lib/whatsapp";

const STOCK_DOT: Record<ProductStock, string> = {
  in: "bg-[var(--status-active)]",
  limited: "bg-[var(--status-pending)]",
  order: "bg-[var(--status-expired)]",
};

const STOCK_TEXT: Record<ProductStock, string> = {
  in: "text-[var(--status-active)]",
  limited: "text-[var(--status-pending)]",
  order: "text-[var(--status-expired)]",
};

const BADGE_STYLE: Record<string, string> = {
  promo: "bg-[var(--status-expired)] text-white",
  nouveau: "bg-[var(--status-info)] text-white",
  "best-seller": "bg-[var(--status-pending)] text-black",
};

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [quickView, setQuickView] = useState(false);

  // Wishlist : store externe partagé (pas de panier, juste des favoris).
  const wishlist = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getWishlistServerSnapshot,
  );
  const inWishlist = wishlist.includes(product.id);

  // Verrouillage du scroll quand l'aperçu rapide est ouvert.
  useEffect(() => {
    if (!quickView) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickView(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [quickView]);

  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  const whatsappHref = productOrderMessage(product);

  const QuickView = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu rapide : ${product.name}`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setQuickView(false)}
      />
      <div className="relative glass-strong rounded-3xl w-full max-w-lg overflow-hidden fade-in-up animate-in">
        <div className="relative aspect-[4/3]">
          <ProductImage product={product} className="absolute inset-0 w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setQuickView(false)}
            className="absolute top-3 right-3 w-9 h-9 rounded-xl glass flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-glass-hover)] transition-colors"
            aria-label="Fermer l'aperçu"
          >
            <IconX className="w-4 h-4" />
          </button>
          {product.badge === "promo" && discount > 0 && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--status-expired)] text-white">
              -{discount}%
            </span>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--accent-primary)] font-semibold uppercase tracking-wider">
                {product.categoryLabel}
              </p>
              <h3 className="text-lg font-bold mt-1">{product.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mono mt-0.5">{product.model}</p>
            </div>
            <div className="flex items-center gap-1 text-amber-400 shrink-0 mt-1">
              <IconStar className="w-4 h-4" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{product.rating}</span>
              <span className="text-xs text-[var(--text-muted)]">({product.reviews})</span>
            </div>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-6">{product.description}</p>

          <ul className="space-y-2">
            {product.specs.map((spec) => (
              <li key={spec} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                {spec}
              </li>
            ))}
          </ul>

          <div className="flex items-end justify-between gap-4 pt-1">
            <div>
              <p className="text-2xl font-extrabold">{formatFC(product.price)}</p>
              {product.oldPrice && (
                <p className="text-sm text-[var(--text-muted)] line-through">{formatFC(product.oldPrice)}</p>
              )}
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${STOCK_TEXT[product.stock]}`}>
              <span className={`w-2 h-2 rounded-full ${STOCK_DOT[product.stock]} ${product.stock === "in" ? "animate-pulse" : ""}`} />
              {STOCK_LABELS[product.stock]}
            </span>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn !bg-[#25D366] hover:!bg-[#1fb858] !text-white btn-block !h-12 text-base shadow-[0_0_25px_rgba(37,211,102,0.35)]"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Commander sur WhatsApp
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="group glass card-futuristic rounded-3xl overflow-hidden flex flex-col animate-in"
      style={{ animationDelay: `${Math.min(index, 6) * 90}ms` }}
    >
      {/* Visuel produit (cliquable → aperçu rapide) */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <button
          type="button"
          onClick={() => setQuickView(true)}
          className="absolute inset-0 z-10 w-full h-full cursor-pointer"
          aria-label={`Aperçu rapide de ${product.name}`}
        />
        <ProductImage
          product={product}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">
          {product.badge === "promo" && discount > 0 && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_STYLE.promo}`}>
              -{discount}%
            </span>
          )}
          {product.badge === "nouveau" && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_STYLE.nouveau}`}>Nouveau</span>
          )}
          {product.badge === "best-seller" && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${BADGE_STYLE["best-seller"]}`}>
              ⭐ Best-seller
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-xl glass flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
            inWishlist ? "text-[var(--status-expired)]" : "text-[var(--text-secondary)] hover:text-[var(--status-expired)]"
          }`}
          aria-label={inWishlist ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={inWishlist}
        >
          <IconHeart className="w-4.5 h-4.5" filled={inWishlist} />
        </button>

        {/* Étiquette « aperçu rapide » au survol */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 pb-3">
          <span className="px-4 py-2 rounded-full glass-strong text-xs font-semibold text-[var(--text-primary)]">
            👁 Aperçu rapide
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
            {product.categoryLabel}
          </p>
          <div className="flex items-center gap-1 text-amber-400">
            <IconStar className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">{product.rating}</span>
            <span className="text-[11px] text-[var(--text-muted)]">({product.reviews})</span>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-[15px] leading-snug transition-colors group-hover:text-[var(--accent-primary)]">
            {product.name}
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mono mt-0.5 truncate">{product.model}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {product.specs.map((spec) => (
            <span
              key={spec}
              className="px-2 py-1 rounded-lg bg-[var(--surface-glass)] border border-[var(--border-glass)] text-[11px] text-[var(--text-secondary)] mono"
            >
              {spec}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-1 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-extrabold text-gradient">{formatFC(product.price)}</p>
            {product.oldPrice && (
              <p className="text-xs text-[var(--text-muted)] line-through">{formatFC(product.oldPrice)}</p>
            )}
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${STOCK_TEXT[product.stock]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STOCK_DOT[product.stock]} ${product.stock === "in" ? "animate-pulse" : ""}`} />
            {STOCK_LABELS[product.stock]}
          </span>
        </div>

        {/* CTA WhatsApp (pas de panier : commande directe par message) */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn !bg-[#25D366] hover:!bg-[#1fb858] !text-white btn-block mt-2 shadow-[0_0_20px_rgba(37,211,102,0.25)]"
        >
          <WhatsAppIcon className="w-4.5 h-4.5" />
          Commander
        </a>
      </div>

      {/* Aperçu rapide : rendu via portail pour éviter le clippage par la carte (overflow/transform). */}
      {quickView && createPortal(QuickView, document.body)}
    </div>
  );
}
