import Link from "next/link";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";

const SECTIONS = [
  {
    id: "demarrage",
    title: "Démarrage rapide",
    steps: [
      {
        title: "Créez votre compte",
        description:
          "Inscrivez-vous, renseignez votre nom d'utilisateur, votre email et votre mot de passe, puis vérifiez votre email.",
      },
      {
        title: "Créez votre premier routeur",
        description:
          "Depuis le tableau de bord, cliquez sur « Ajouter routeur », choisissez la version RouterOS de votre MikroTik et donnez un nom à votre routeur. S'il s'agit du premier, votre Mikhmon portera le même nom.",
      },
      {
        title: "Configurez votre MikroTik",
        description:
          "Copiez le script fourni et collez-le dans le Terminal de votre MikroTik. Le script configure automatiquement la connexion VPN.",
      },
    ],
  },
  {
    id: "mikhmon",
    title: "Créer un Mikhmon",
    content: [
      "Mikhmon (MikroTik Hotspot Monitor) est une interface web qui facilite la gestion de votre hotspot MikroTik. Avec ITSOLUTIONS, votre Mikhmon est hébergé en ligne et accessible depuis n'importe où.",
      "Deux versions sont compatibles : Mikhmon V1 pour les routeurs sous RouterOS 6.x à 7.9, et Mikhmon V2 pour RouterOS 7.10 et supérieur. Vérifiez votre version dans Winbox : System puis Resources.",
      "À la création, vous recevez votre URL personnalisée, les ports API et Winbox, ainsi que le script à copier-coller.",
    ],
  },
  {
    id: "mikrotik",
    title: "Configuration MikroTik",
    content: [
      "Connectez-vous à Winbox, ouvrez le New Terminal (raccourci Alt + T), collez le script fourni puis appuyez sur Entrée.",
      "Vérifiez la connexion dans PPP puis Interface : votre interface L2TP doit afficher le statut Connected avec une adresse de type 10.8.0.xxx.",
      "Si la connexion échoue, vérifiez que votre routeur a accès à Internet, que le port UDP 1701 n'est pas bloqué par le firewall, et que le script a été copié intégralement.",
    ],
  },
  {
    id: "renouvellement",
    title: "Renouvellement",
    content: [
      "Tous les services ITSOLUTIONS sont valables 30 jours à partir de la date de création ou du dernier renouvellement.",
      "Le renouvellement automatique prélève 23 000 FC sur votre wallet à l'expiration, chaque nuit à 2h du matin, si le solde est suffisant.",
      "Des alertes par email sont envoyées 3 jours avant l'expiration et le jour même. Après expiration, le routeur est suspendu (VPN coupé) mais l'URL Mikhmon reste accessible.",
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    faq: [
      {
        q: "Combien de Mikhmon puis-je créer ?",
        a: "Autant que nécessaire. Un Mikhmon V1 sert aux routeurs RouterOS 6.x à 7.9, un Mikhmon V2 aux routeurs 7.10 et supérieur.",
      },
      {
        q: "Combien de routeurs puis-je ajouter ?",
        a: "Il n'y a pas de limite. Chaque routeur coûte 23 000 FC par mois.",
      },
      {
        q: "Comment vérifier la version de mon RouterOS ?",
        a: "Dans Winbox : System puis Resources, ligne Version. Exemple : 7.15.2 (stable) indique Mikhmon V2, 6.49.10 (long-term) indique Mikhmon V1.",
      },
      {
        q: "Puis-je changer le nom de mon Mikhmon ?",
        a: "Non, le nom d'un Mikhmon ou d'un routeur ne peut pas être modifié après création.",
      },
      {
        q: "Comment recharger mon compte ?",
        a: "Depuis le bouton « Recharger » du tableau de bord, via les moyens de paiement Mobile Money disponibles et/ou carte bancaire. Le crédit est ajouté après confirmation du paiement.",
      },
      {
        q: "Que se passe-t-il si mon service expire ?",
        a: "Le routeur est suspendu (VPN coupé) mais l'URL Mikhmon reste accessible. Le service est réactivé immédiatement après renouvellement.",
      },
    ],
  },
];

export default function DocumentationPage() {
  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <nav className="floating-nav glass-strong">
        <Link href="/" className="flex items-center no-underline">
          <Logo size={32} />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="btn btn-ghost btn-sm">
            Accueil
          </Link>
          <Link href="/login" className="btn btn-primary btn-sm">
            Connexion
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-bold mb-4 fade-in-up">Documentation</h1>
        <p className="text-[var(--text-secondary)] leading-7 mb-14">
          Bienvenue dans la documentation officielle d&apos;ITSOLUTIONS, votre solution complète
          pour gérer vos hotspots MikroTik avec Mikhmon en ligne.
        </p>

        <div className="space-y-10">
          {SECTIONS.map((section, index) => (
            <section key={section.id} id={section.id} className="glass rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <span className="w-8 h-8 rounded-lg bg-[var(--gradient-brand)] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {index + 1}
                </span>
                <h2 className="text-xl font-semibold">{section.title}</h2>
              </div>

              {section.steps && (
                <ol className="space-y-5">
                  {section.steps.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="w-6 h-6 rounded-full bg-[var(--surface-glass)] border border-[var(--border-glass)] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm mb-1">{step.title}</p>
                        <p className="text-sm text-[var(--text-secondary)] leading-6">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {section.content && (
                <div className="space-y-4">
                  {section.content.map((paragraph, i) => (
                    <p key={i} className="text-sm text-[var(--text-secondary)] leading-7">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {section.faq && (
                <div className="space-y-6">
                  {section.faq.map((item) => (
                    <div key={item.q}>
                      <p className="font-medium text-sm mb-1.5">{item.q}</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-6">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
