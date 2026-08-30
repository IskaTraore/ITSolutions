"use client";

import { IconStar, IconMapPin, IconGlobe } from "./Icons";

interface Testimonial {
  name: string;
  role: string;
  city: string;
  avatarBg: string;
  comment: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Dieudonné Kabange",
    role: "Superviseur Cyber & Hotspot",
    city: "Kinshasa, Gombe",
    avatarBg: "bg-blue-600",
    comment:
      "ITSOLUTIONS a simplifié la gestion de nos 5 zones Wi-Fi à Kinshasa. Mikhmon en ligne et l'accès Winbox à distance sans adresse IP publique ont changé notre façon de travailler !",
    rating: 5,
  },
  {
    name: "Nathalie Mbuyi",
    role: "Ingénieure Réseau Telecom",
    city: "Lubumbashi, Haut-Katanga",
    avatarBg: "bg-purple-600",
    comment:
      "La stabilité du tunnel VPN L2TP est exceptionnelle. Je administre nos routeurs MikroTik dispersés entre Lubumbashi, Likasi et Kolwezi en toute sécurité depuis mon ordinateur portable.",
    rating: 5,
  },
  {
    name: "Patrick Tshibangu",
    role: "Entrepreneur Telecom & FAI",
    city: "Goma, Nord-Kivu",
    avatarBg: "bg-emerald-600",
    comment:
      "La recharge instantanée par Wallet et la génération de scripts automatisée font d'ITSOLUTIONS le meilleur outil SaaS pour les hotspots en République Démocratique du Congo.",
    rating: 5,
  },
  {
    name: "Grâce Mukendi",
    role: "Administratrice Système",
    city: "Kisangani, Tshopo",
    avatarBg: "bg-amber-600",
    comment:
      "Le renouvellement automatique et le support réactif m'évitent toute coupure de service. Mes hotspots à Kisangani fonctionnent 24/7 sans interruption.",
    rating: 5,
  },
];

export function TestimonialsRDC() {
  return (
    <section id="temoignages" className="px-6 pb-28 pt-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold badge-rdc animate-pulse-glow">
            <IconGlobe className="w-4 h-4 text-[var(--accent-primary)]" />
            Utilisé partout en République Démocratique du Congo
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ils font confiance à <span className="text-gradient">ITSOLUTIONS</span>
          </h2>
          <p className="text-base text-[var(--text-secondary)] max-w-2xl mx-auto leading-7">
            Découvrez comment des gestionnaires de réseaux et hotspots à Kinshasa, Lubumbashi, Goma et Kisangani optimisent leur infrastructure MikroTik.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, index) => (
            <div
              key={t.name}
              className="glass card-futuristic rounded-3xl p-8 space-y-5 fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${t.avatarBg} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                  >
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">{t.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{t.role}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full glass border border-[var(--border-glass)] text-[var(--text-secondary)] shrink-0">
                  <IconMapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  {t.city}
                </span>
              </div>

              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <IconStar key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>

              <p className="text-sm text-[var(--text-secondary)] leading-7 italic">
                &ldquo;{t.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
