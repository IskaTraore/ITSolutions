import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { SiteNav } from "@/components/SiteNav";
import { TestimonialsRDC } from "@/components/TestimonialsRDC";
import { ShopShowcase } from "@/components/ShopShowcase";
import { Logo } from "@/components/Logo";
import { IconZap, IconShield, IconGlobe, IconArrowRight, IconCheck } from "@/components/Icons";

const PILLARS = [
  {
    title: "Mikhmon en ligne",
    IconComponent: IconZap,
    description:
      "Interface web hébergée haute vitesse pour gérer vos coupons Hotspot MikroTik depuis n'importe où sans serveur physique.",
  },
  {
    title: "VPN sécurisé L2TP",
    IconComponent: IconShield,
    description:
      "Tunnel chiffré ultra-stable reliant directement vos routeurs à notre infrastructure. Accès Winbox et WebFig garanti 24/7.",
  },
  {
    title: "Gestion Cloud & Wallet",
    IconComponent: IconGlobe,
    description:
      "Tableau de bord futuriste centralisé : rechargez par Mobile Money ou carte et activez vos services en 2 clics.",
  },
];

const FEATURES = [
  "Instance Mikhmon V1 & V2 hébergée",
  "Tunnel VPN L2TP dédié sécurisé",
  "Forwarding des ports Winbox et API",
  "Sous-domaine SSL dédié (.itsolutions.tld)",
  "Renouvellement automatique par Wallet",
  "Support prioritaire WhatsApp & Email",
];

export default function Home() {
  return (
    <div className="relative min-h-screen transition-colors duration-300">
      <AmbientBackground />

      {/* Navigation flottante futuriste (responsive avec menu mobile) */}
      <SiteNav />

      {/* Hero Futuriste */}
      <section className="flex flex-col items-center justify-center min-h-screen px-6 pt-32 pb-20 text-center relative overflow-hidden">
        <div className="max-w-4xl fade-in-up space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold glass border border-[var(--border-glass-strong)] text-[var(--text-secondary)] animate-pulse-glow">
            <span className="w-2 h-2 rounded-full bg-[var(--status-active)] animate-ping" />
            Plateforme Hotspot MikroTik n°1 en République Démocratique du Congo
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Pilotez vos Hotspots MikroTik <br />
            <span className="text-gradient">depuis le futur.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-8 font-normal">
            Mikhmon en ligne, VPN sécurisé L2TP et gestion simplifiée. Connectez vos routeurs en 2 minutes à Kinshasa, Lubumbashi, Goma et partout en RDC.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link href="/register" className="btn btn-primary !h-14 !px-9 text-base shadow-glow-primary hover:scale-105 gap-2">
              <span>Démarrer maintenant</span>
              <IconArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/documentation" className="btn btn-secondary !h-14 !px-9 text-base glass-hover">
              Explorer la documentation
            </Link>
          </div>

          {/* Badges statistiques futuristes */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="glass card-futuristic rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gradient">99.9%</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Disponibilité VPN</p>
            </div>
            <div className="glass card-futuristic rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gradient">&lt; 2 min</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Configuration Script</p>
            </div>
            <div className="glass card-futuristic rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gradient">23.000 FC</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Tarif Mensuel Fixe</p>
            </div>
            <div className="glass card-futuristic rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gradient">RDC</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Support Local 24/7</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trois piliers */}
      <section id="piliers" className="px-6 pb-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Une technologie pensée pour les pro</h2>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
              Tout ce dont vous avez besoin pour administrer vos zones Wi-Fi à distance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="glass card-futuristic rounded-3xl p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-glass-hover)] border border-[var(--border-glass-strong)] flex items-center justify-center text-[var(--accent-primary)]">
                  <pillar.IconComponent className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">{pillar.title}</h3>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Boutique d'équipements réseau */}
      <ShopShowcase />

      {/* Témoignages RDC */}
      <TestimonialsRDC />

      {/* Tarifs */}
      <section id="tarifs" className="px-6 pb-28">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tarifs simples & prévisibles</h2>
            <p className="text-[var(--text-secondary)]">
              Un tarif unique en Francs Congolais (FC), sans aucun frais caché.
            </p>
          </div>

          <div className="glass-strong card-futuristic rounded-3xl p-10 text-center animate-pulse-glow">
            <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">
              Abonnement mensuel par routeur
            </p>
            <p className="mt-4 text-6xl font-extrabold text-gradient">23 000 FC</p>
            <p className="text-xs text-[var(--text-muted)] mt-2">Paiement par Wallet Mobile Money / Carte</p>

            <ul className="mt-8 space-y-4 text-sm text-[var(--text-secondary)] text-left">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--status-active-bg)] flex items-center justify-center shrink-0 text-[var(--status-active)]">
                    <IconCheck className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/register" className="btn btn-primary btn-block mt-10 !h-14 text-base shadow-glow-primary gap-2">
              <span>Commencer maintenant</span>
              <IconArrowRight className="w-5 h-5" />
            </Link>
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
