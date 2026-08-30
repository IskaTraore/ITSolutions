import type { Metadata } from "next";
import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { SiteNav } from "@/components/SiteNav";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { WhatsAppIcon } from "@/components/products/WhatsAppIcon";
import { IconTruck, IconWallet, IconShieldCheck, IconRouter, IconArrowRight } from "@/components/Icons";
import { WHATSAPP_LINK } from "@/lib/whatsapp";
import type { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api";

/** Charge les produits publiés par l'admin (endpoint public, sans authentification). */
async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/products`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.products as Product[]) ?? [];
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "Boutique Équipements Réseau - ITSOLUTIONS",
  description:
    "Routeurs MikroTik, CPE, antennes, switches et accessoires réseau en stock à Kinshasa. Commandez en un clic sur WhatsApp, livraison dans toute la RDC.",
};

const TRUST = [
  {
    IconComponent: IconTruck,
    title: "Livraison RDC",
    subtitle: "Kinshasa & provinces",
  },
  {
    IconComponent: IconWallet,
    title: "Paiement Mobile Money",
    subtitle: "M-Pesa, Orange, Airtel",
  },
  {
    IconComponent: IconShieldCheck,
    title: "Garantie & SAV",
    subtitle: "Équipements testés",
  },
  {
    IconComponent: IconRouter,
    title: "Installation possible",
    subtitle: "Par nos techniciens",
  },
];

export default async function ProduitsPage() {
  const products = await fetchProducts();

  return (
    <div className="relative min-h-screen transition-colors duration-300">
      <AmbientBackground />

      {/* Navigation flottante futuriste (responsive avec menu mobile) */}
      <SiteNav activePath="/produits" />

      {/* Héro boutique */}
      <section className="px-6 pt-36 pb-16 text-center relative">
        <div className="max-w-3xl mx-auto space-y-6 fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold glass border border-[var(--border-glass-strong)] text-[var(--text-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
            Boutique officielle ITSOLUTIONS
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Équipements Réseau <span className="text-gradient">en stock</span>
          </h1>

          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto leading-8">
            Routeurs MikroTik, CPE, antennes, switches et accessoires pour construire et étendre vos
            hotspots. Commandez directement sur WhatsApp, sans panier, sans complication.
          </p>

          {/* Badges de confiance */}
          <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {TRUST.map((t) => (
              <div key={t.title} className="glass card-futuristic rounded-2xl p-4 text-center">
                <t.IconComponent className="w-6 h-6 mx-auto text-[var(--accent-primary)]" />
                <p className="text-sm font-semibold mt-2">{t.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalogue */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <ProductCatalog initialProducts={products} />
        </div>
      </section>

      {/* Bannière WhatsApp */}
      <section className="px-6 pb-28">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong card-futuristic rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#25D366]/20 blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[var(--accent-primary)]/20 blur-[100px] pointer-events-none" />

            <div className="relative space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-[0_0_35px_rgba(37,211,102,0.45)]">
                <WhatsAppIcon className="w-8 h-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Une question sur un équipement ?
              </h2>
              <p className="text-[var(--text-secondary)] max-w-xl mx-auto leading-7">
                Disponibilité, prix, configuration, livraison : notre équipe vous répond en quelques
                minutes sur WhatsApp, 7j/7.
              </p>
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn !bg-[#25D366] hover:!bg-[#1fb858] !text-white !h-14 !px-9 text-base shadow-[0_0_30px_rgba(37,211,102,0.4)] hover:scale-105 gap-2"
              >
                <WhatsAppIcon className="w-5 h-5" />
                <span>Discuter sur WhatsApp</span>
                <IconArrowRight className="w-5 h-5" />
              </a>
              <p className="text-xs text-[var(--text-muted)]">Réponse rapide • Conseils techniques • Devis personnalisés</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-glass)] py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <Logo size={28} />
          </div>
          <div className="flex gap-8">
            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">
              Accueil
            </Link>
            <Link href="/documentation" className="hover:text-[var(--text-secondary)] transition-colors">
              Documentation
            </Link>
            <a href="mailto:support@itsolutions.tld" className="hover:text-[var(--text-secondary)] transition-colors">
              Support Email
            </a>
          </div>
          <p>© {new Date().getFullYear()} ITSOLUTIONS. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
