"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { IconSearch, IconX } from "@/components/Icons";
import { CATEGORIES, type Product, type ProductCategory } from "@/lib/products";
import { WHATSAPP_LINK } from "@/lib/whatsapp";

type SortId = "reco" | "price-asc" | "price-desc" | "rating" | "promo";

const SORTS: { id: SortId; label: string }[] = [
  { id: "reco", label: "Nos recommandations" },
  { id: "price-asc", label: "Prix croissant" },
  { id: "price-desc", label: "Prix décroissant" },
  { id: "rating", label: "Meilleures notes" },
  { id: "promo", label: "Promotions" },
];

interface ProductCatalogProps {
  /** Produits chargés côté serveur (GET /api/products) pour un premier rendu instantané. */
  initialProducts?: Product[];
}

export function ProductCatalog({ initialProducts = [] }: ProductCatalogProps) {
  // Les produits viennent directement de la page (SSR) : pas d'état local,
  // pour toujours refléter les derniers ajouts de l'admin à chaque navigation.
  const products = initialProducts;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [sort, setSort] = useState<SortId>("reco");

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesQuery =
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        p.categoryLabel.toLowerCase().includes(q);
      const matchesCategory = category === "all" || p.category === category;
      return matchesQuery && matchesCategory;
    });

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.rating - a.rating);
        break;
      case "promo":
        list = [...list].sort((a, b) => {
          const dA = a.oldPrice ? a.oldPrice / a.price : 1;
          const dB = b.oldPrice ? b.oldPrice / b.price : 1;
          return dB - dA;
        });
        break;
      default:
        break;
    }
    return list;
  }, [products, query, category, sort]);

  const isEmpty = products.length === 0;

  return (
    <div className="space-y-8">
      {/* Barre d'outils : recherche + tri */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un équipement (ex : hAP, SXT, switch…)"
            className="field-input !pl-11 !rounded-2xl"
            aria-label="Rechercher un produit"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] transition-colors"
              aria-label="Effacer la recherche"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative md:w-64">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="field-input !rounded-2xl appearance-none cursor-pointer pr-10"
            aria-label="Trier les produits"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none text-xs">
            ▼
          </span>
        </div>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Catégories">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c.id as ProductCategory | "all")}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? "bg-[linear-gradient(135deg,#5b7cfa_0%,#b084f5_100%)] text-white shadow-[0_0_25px_rgba(91,124,250,0.4)] scale-105"
                  : "glass text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass-hover)]"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {!isEmpty && (
        <p className="text-xs text-[var(--text-muted)]">
          {visibleProducts.length} équipement{visibleProducts.length > 1 ? "s" : ""} disponible
          {visibleProducts.length > 1 ? "s" : ""}
        </p>
      )}

      {/* Grille produits */}
      {isEmpty ? (
        <div className="glass rounded-3xl p-12 text-center space-y-4">
          <p className="text-4xl">📦</p>
          <h3 className="text-lg font-semibold">La boutique ouvre bientôt</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-6">
            Aucun équipement en ligne pour le moment. Contactez-nous sur WhatsApp : nous vous
            conseillons le matériel adapté à votre projet.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn !bg-[#25D366] hover:!bg-[#1fb858] !text-white mt-2 shadow-[0_0_20px_rgba(37,211,102,0.25)]"
          >
            <WhatsAppIcon className="w-4.5 h-4.5" />
            Nous écrire sur WhatsApp
          </a>
        </div>
      ) : visibleProducts.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-3xl p-12 text-center space-y-3">
          <p className="text-4xl">🔍</p>
          <h3 className="text-lg font-semibold">Aucun équipement trouvé</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            Aucun résultat pour votre recherche. Essayez un autre mot-clé ou contactez-nous sur
            WhatsApp : nous trouvons l&apos;équipement qu&apos;il vous faut.
          </p>
        </div>
      )}
    </div>
  );
}
