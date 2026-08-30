import Link from "next/link";
import { IconCheck, IconArrowRight } from "@/components/Icons";

/**
 * Photos réelles d'équipements réseau — Wikimedia Commons (licences libres CC).
 * Sources : commons.wikimedia.org — "MikroTik hAP ac2.jpg", "Mikrotik LTE modem
 * over the roof.jpg", "Network switches.jpg", "Power over Ethernet injector.jpg".
 * En production, remplacez-les par les photos officielles de vos produits.
 */
const SHOWCASE: { label: string; sub: string; src: string; alt: string }[] = [
  {
    label: "Routeurs MikroTik",
    sub: "hAP, hEX, OmniTIK…",
    src: "/shop/router-hap-ac2.jpg",
    alt: "Routeur MikroTik hAP ac²",
  },
  {
    label: "Antennes & CPE",
    sub: "SXT, mANTBox…",
    src: "/shop/cpe-rooftop.jpg",
    alt: "Équipement CPE MikroTik installé sur un toit",
  },
  {
    label: "Switches",
    sub: "Gigabit & PoE",
    src: "/shop/switch-rack.jpg",
    alt: "Baie de switches réseau Gigabit",
  },
  {
    label: "Accessoires",
    sub: "PoE, câbles, kits",
    src: "/shop/poe-injector.jpg",
    alt: "Injecteur Power over Ethernet",
  },
];

const PERKS = [
  "Livraison Kinshasa & provinces",
  "Paiement Mobile Money",
  "Commande directe WhatsApp",
  "Garantie & SAV",
];

/** Section « Boutique » de la landing page : annonce la vente d'équipements réseau. */
export function ShopShowcase() {
  return (
    <section id="boutique" className="px-6 pb-28 pt-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* En-tête */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold glass border border-[var(--border-glass)] text-[var(--text-secondary)] animate-pulse-glow">
            🛒 Boutique d&apos;équipements réseau
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Équipez vos hotspots avec du{" "}
            <span className="text-gradient">matériel professionnel</span>
          </h2>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-7">
            ITSOLUTIONS met aussi le matériel à votre disposition : routeurs MikroTik, CPE,
            antennes, switches et accessoires en stock à Kinshasa. Commandez en un clic sur
            WhatsApp, sans panier, sans complication.
          </p>
        </div>

        {/* Aperçu des catégories */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {SHOWCASE.map((item, i) => (
            <Link
              key={item.label}
              href="/produits"
              aria-label={`Voir les ${item.label} dans la boutique`}
              className="group glass card-futuristic rounded-3xl overflow-hidden block animate-in"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <div className="aspect-[4/3] overflow-hidden bg-[var(--bg-elevated)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- photo locale du catalogue */}
                <img
                  src={item.src}
                  alt={item.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="p-4 text-center">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Atouts + CTA */}
        <div className="flex flex-col items-center gap-8">
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--status-active-bg)] flex items-center justify-center text-[var(--status-active)] shrink-0">
                  <IconCheck className="w-3 h-3" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <Link
            href="/produits"
            className="btn btn-primary !h-14 !px-9 text-base shadow-glow-primary hover:scale-105 gap-2"
          >
            Découvrir la boutique
            <IconArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
