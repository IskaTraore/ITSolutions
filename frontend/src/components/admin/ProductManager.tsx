"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { ProductImage } from "@/components/products/ProductImage";
import { IconPlus, IconX, IconPencil, IconTrash, IconImage } from "@/components/Icons";
import {
  formatFC,
  STOCK_LABELS,
  type Product,
  type ProductBadge,
  type ProductCategory,
  type ProductHue,
  type ProductStock,
  type ProductVisual as ProductVisualKind,
} from "@/lib/products";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  routeurs: "Routeurs",
  "antennes-cpe": "Antennes & CPE",
  switches: "Switches",
  accessoires: "Accessoires",
};

const VISUAL_LABELS: Record<ProductVisualKind, string> = {
  "hap-ac2": "Routeur tour (hAP ac²)",
  hex: "Boîtier câblé (hEX)",
  haplite: "Petit routeur (hAP lite)",
  sxt: "CPE parabole (SXT)",
  mantbox: "Antenne secteur (mANTBox)",
  omnitik: "Point d'accès rond (OmniTIK)",
  switch: "Switch rack",
  "poe-kit": "Kit PoE + câble",
};

const HUE_LABELS: Record<ProductHue, string> = {
  indigo: "Indigo",
  violet: "Violet",
  teal: "Teal",
  sky: "Bleu ciel",
  emerald: "Émeraude",
  amber: "Ambre",
  rose: "Rose",
  cyan: "Cyan",
};

const BADGE_LABELS: Record<ProductBadge, string> = {
  promo: "Promo",
  nouveau: "Nouveau",
  "best-seller": "Best-seller",
};

interface ProductForm {
  name: string;
  model: string;
  category: ProductCategory;
  categoryLabel: string;
  price: string;
  oldPrice: string;
  rating: string;
  reviews: string;
  visual: ProductVisualKind;
  hue: ProductHue;
  badge: ProductBadge | "";
  stock: ProductStock;
  specs: string;
  description: string;
}

const EMPTY_FORM: ProductForm = {
  name: "",
  model: "",
  category: "routeurs",
  categoryLabel: "Routeur WiFi",
  price: "",
  oldPrice: "",
  rating: "4.5",
  reviews: "0",
  visual: "hex",
  hue: "indigo",
  badge: "",
  stock: "in",
  specs: "",
  description: "",
};

function toForm(p: Product): ProductForm {
  return {
    name: p.name,
    model: p.model,
    category: p.category,
    categoryLabel: p.categoryLabel,
    price: String(p.price),
    oldPrice: p.oldPrice ? String(p.oldPrice) : "",
    rating: String(p.rating),
    reviews: String(p.reviews),
    visual: p.visual,
    hue: p.hue,
    badge: p.badge ?? "",
    stock: p.stock,
    specs: p.specs.join(", "),
    description: p.description ?? "",
  };
}

/** Convertit le formulaire en payload API (nombres et specs normalisés). */
function toPayload(form: ProductForm) {
  const price = Number(form.price);
  const oldPrice = form.oldPrice.trim() ? Number(form.oldPrice) : null;
  return {
    name: form.name.trim(),
    model: form.model.trim(),
    category: form.category,
    categoryLabel: form.categoryLabel.trim() || CATEGORY_LABELS[form.category],
    price,
    oldPrice: oldPrice !== null && oldPrice > price ? oldPrice : null,
    rating: Number(form.rating) || 0,
    reviews: Number(form.reviews) || 0,
    visual: form.visual,
    hue: form.hue,
    badge: (form.badge || null) as ProductBadge | null,
    stock: form.stock,
    specs: form.specs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    description: form.description.trim() || null,
  };
}

export function ProductManager() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Révocation de l'URL objet au démontage (évite toute fuite mémoire).
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function closeModal() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(false);
  }

  async function load() {
    try {
      const res = await api<{ products: Product[] }>("/products");
      setProducts(res.products);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ products: Product[] }>("/products");
        if (!cancelled) setProducts(res.products);
      } catch (err) {
        if (!cancelled) {
          toast("error", err instanceof ApiError ? err.message : "Impossible de charger les produits");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verrouillage du scroll + touche Échap quand le modal est ouvert.
  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm(toForm(product));
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("error", "Format non supporté : JPEG, PNG ou WEBP uniquement");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("error", "Image trop volumineuse (5 Mo maximum)");
      e.target.value = "";
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(previewUrlRef.current);
  }

  async function uploadImage(productId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api"}/products/${productId}/image`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error?.message || "Échec du téléversement de la photo");
    }
  }

  async function handleRemovePhoto(product: Product) {
    try {
      await api(`/products/${product.id}/image`, { method: "DELETE" });
      toast("success", "Photo retirée, illustration rétablie");
      setImageFile(null);
      setImagePreview(null);
      // Synchronise l'état d'édition pour que l'aperçu reflète la suppression.
      setEditing((editing) => (editing ? { ...editing, imageUrl: null } : null));
      await load();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Impossible de retirer la photo");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = toPayload(form);
      let productId: string;
      if (editing) {
        await api(`/products/${editing.id}`, { method: "PATCH", body: payload });
        productId = editing.id;
        toast("success", "Produit mis à jour");
      } else {
        const res = await api<{ product: Product }>("/products", { method: "POST", body: payload });
        productId = res.product.id;
        toast("success", "Produit ajouté à la boutique");
      }
      if (imageFile) await uploadImage(productId, imageFile);
      closeModal();
      await load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (confirmDeleteId !== product.id) {
      setConfirmDeleteId(product.id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await api(`/products/${product.id}`, { method: "DELETE" });
      toast("success", "Produit supprimé");
      await load();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Suppression impossible");
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      q === "" || p.name.toLowerCase().includes(q) || p.model.toLowerCase().includes(q)
  );

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par nom ou référence…"
          className="field-input sm:max-w-xs"
          aria-label="Filtrer les produits"
        />
        <button onClick={openCreate} className="btn btn-primary">
          <IconPlus className="w-4 h-4" />
          Ajouter un produit
        </button>
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass card-futuristic rounded-2xl p-12 text-center space-y-3">
          <p className="text-4xl">📦</p>
          <h3 className="text-lg font-semibold">Aucun produit</h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
            La boutique est vide. Cliquez sur « Ajouter un produit » pour publier votre premier
            équipement réseau.
          </p>
        </div>
      ) : (
        <div className="glass card-futuristic rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border-glass)] bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Produit</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Catégorie</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Prix</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Stock</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Badge</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border-glass)] last:border-0 hover:bg-[var(--surface-glass-hover)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0">
                          <ProductImage product={p} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mono truncate">{p.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {p.categoryLabel}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {formatFC(p.price)}
                      {p.oldPrice && (
                        <span className="text-xs text-[var(--text-muted)] line-through ml-1.5">
                          {formatFC(p.oldPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="badge badge-info">{STOCK_LABELS[p.stock]}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.badge ? (
                        <span className="badge badge-pending">{BADGE_LABELS[p.badge]}</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="btn btn-sm btn-ghost"
                          aria-label={`Modifier ${p.name}`}
                        >
                          <IconPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className={`btn btn-sm ${confirmDeleteId === p.id ? "btn-danger" : "btn-ghost"}`}
                          aria-label={`Supprimer ${p.name}`}
                        >
                          <IconTrash className="w-4 h-4" />
                          {confirmDeleteId === p.id ? "Confirmer" : ""}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal création / édition */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? `Modifier ${editing.name}` : "Ajouter un produit"}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative glass-strong rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto fade-in-up animate-in">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border-glass)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl rounded-t-3xl">
              <h3 className="text-lg font-semibold">
                {editing ? `Modifier : ${editing.name}` : "Ajouter un produit"}
              </h3>
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-xl glass flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-glass-hover)] transition-colors"
                aria-label="Fermer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="field sm:col-span-2">
                  <label className="field-label" htmlFor="p-name">Nom du produit</label>
                  <input
                    id="p-name"
                    className="field-input"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="MikroTik hAP ac²"
                    required
                    minLength={2}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-model">Référence / modèle</label>
                  <input
                    id="p-model"
                    className="field-input"
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                    placeholder="RB962UiGS-5HacT2HnT"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-catlabel">Étiquette (ex : Routeur WiFi)</label>
                  <input
                    id="p-catlabel"
                    className="field-input"
                    value={form.categoryLabel}
                    onChange={(e) => set("categoryLabel", e.target.value)}
                    placeholder="Routeur WiFi"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-cat">Catégorie</label>
                  <select
                    id="p-cat"
                    className="field-input appearance-none cursor-pointer"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value as ProductCategory)}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-stock">Stock</label>
                  <select
                    id="p-stock"
                    className="field-input appearance-none cursor-pointer"
                    value={form.stock}
                    onChange={(e) => set("stock", e.target.value as ProductStock)}
                  >
                    <option value="in">En stock</option>
                    <option value="limited">Stock limité</option>
                    <option value="order">Sur commande</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-price">Prix (FC)</label>
                  <input
                    id="p-price"
                    type="number"
                    min={0}
                    step={100}
                    className="field-input"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    placeholder="155000"
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-oldprice">Ancien prix (FC, optionnel)</label>
                  <input
                    id="p-oldprice"
                    type="number"
                    min={0}
                    step={100}
                    className="field-input"
                    value={form.oldPrice}
                    onChange={(e) => set("oldPrice", e.target.value)}
                    placeholder="185000"
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-rating">Note (0 à 5)</label>
                  <input
                    id="p-rating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="field-input"
                    value={form.rating}
                    onChange={(e) => set("rating", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-reviews">Nb d&apos;avis</label>
                  <input
                    id="p-reviews"
                    type="number"
                    min={0}
                    step={1}
                    className="field-input"
                    value={form.reviews}
                    onChange={(e) => set("reviews", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-badge">Badge</label>
                  <select
                    id="p-badge"
                    className="field-input appearance-none cursor-pointer"
                    value={form.badge}
                    onChange={(e) => set("badge", e.target.value as ProductBadge | "")}
                  >
                    <option value="">Aucun</option>
                    <option value="promo">Promo</option>
                    <option value="nouveau">Nouveau</option>
                    <option value="best-seller">Best-seller</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-hue">Teinte du visuel</label>
                  <select
                    id="p-hue"
                    className="field-input appearance-none cursor-pointer"
                    value={form.hue}
                    onChange={(e) => set("hue", e.target.value as ProductHue)}
                  >
                    {Object.entries(HUE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="p-visual">Visuel (illustration)</label>
                  <select
                    id="p-visual"
                    className="field-input appearance-none cursor-pointer"
                    value={form.visual}
                    onChange={(e) => set("visual", e.target.value as ProductVisualKind)}
                  >
                    {Object.entries(VISUAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="field sm:col-span-2">
                  <label className="field-label" htmlFor="p-specs">Caractéristiques (séparées par des virgules)</label>
                  <input
                    id="p-specs"
                    className="field-input"
                    value={form.specs}
                    onChange={(e) => set("specs", e.target.value)}
                    placeholder="WiFi AC 2.4/5 GHz, 5× Gigabit, PoE out"
                  />
                </div>
                <div className="field sm:col-span-2">
                  <label className="field-label" htmlFor="p-desc">Description</label>
                  <textarea
                    id="p-desc"
                    rows={3}
                    className="field-input !h-auto py-3 resize-none"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Description courte affichée dans l'aperçu rapide…"
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Photo produit (upload admin) */}
              <div className="glass rounded-2xl p-4 space-y-3">
                <p className="field-label">Photo du produit (optionnel)</p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-28 h-[74px] rounded-xl overflow-hidden shrink-0 bg-[var(--surface-glass)]">
                    <ProductImage
                      product={{
                        name: form.name || "Produit",
                        imageUrl: imagePreview ?? (editing ? editing.imageUrl : null),
                        visual: form.visual,
                        hue: form.hue,
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-secondary)] leading-5">
                      {imagePreview
                        ? "Photo sélectionnée — elle remplacera l'illustration sur la carte."
                        : editing?.imageUrl
                          ? "Une photo est déjà associée à ce produit."
                          : "Téléversez une vraie photo (JPEG, PNG, WEBP — 5 Mo max). Sans photo, l'illustration SVG est affichée."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="btn btn-sm btn-secondary"
                      >
                        <IconImage className="w-4 h-4" />
                        {imagePreview || editing?.imageUrl ? "Changer la photo" : "Choisir une photo"}
                      </button>
                      {(imagePreview || editing?.imageUrl) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (editing?.imageUrl && !imagePreview) {
                              handleRemovePhoto(editing);
                            } else {
                              setImageFile(null);
                              setImagePreview(null);
                              if (imageInputRef.current) imageInputRef.current.value = "";
                            }
                          }}
                          className="btn btn-sm btn-ghost"
                        >
                          Retirer la photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn btn-ghost flex-1">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                  {saving && <span className="spinner" />}
                  {saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter le produit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
