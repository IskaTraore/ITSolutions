"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TypewriterText } from "@/components/TypewriterText";
import { IconMenu, IconX } from "@/components/Icons";

const NAV_LINKS = [
  { href: "/#piliers", label: "Services" },
  { href: "/#temoignages", label: "Témoignages" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/produits", label: "Produits" },
  { href: "/documentation", label: "Documentation" },
];

interface SiteNavProps {
  /** Chemin de la page active (ex : "/produits") pour surligner le lien. */
  activePath?: string;
}

/**
 * Navigation flottante vitrée du site public.
 * - Desktop (≥ lg) : liens + Connexion + CTA.
 * - Mobile (< lg) : logo + toggle thème + CTA compact + bouton menu
 *   (panneau déroulant comme le menu du dashboard, rendu via portail).
 */
export function SiteNav({ activePath }: SiteNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Fermeture avec la touche Échap.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const desktopLinkClass = (href: string) =>
    href === activePath
      ? "text-[var(--accent-primary)] font-semibold whitespace-nowrap"
      : "hover:text-[var(--text-primary)] transition-colors whitespace-nowrap";

  const mobileMenu = (
    <div
      className="lg:hidden fixed inset-x-4 top-20 z-[60] glass-strong rounded-2xl p-3 space-y-1 animate-in max-h-[calc(100vh-96px)] overflow-y-auto"
      role="navigation"
      aria-label="Menu de navigation mobile"
    >
      {NAV_LINKS.map((link) => {
        const active = link.href === activePath;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
              active
                ? "bg-[var(--surface-glass)] text-[var(--text-primary)] font-semibold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)]"
            }`}
          >
            {link.label}
            {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
          </Link>
        );
      })}

      <div className="border-t border-[var(--border-glass)] mt-2 pt-3 flex flex-col gap-2">
        <Link
          href="/login"
          onClick={() => setMenuOpen(false)}
          className="btn btn-secondary btn-block"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          onClick={() => setMenuOpen(false)}
          className="btn btn-primary btn-block"
        >
          Créer un compte
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <nav className="floating-nav glass-strong">
        <Link
          href="/"
          className="flex items-center gap-3 no-underline transition-transform duration-300 hover:scale-[1.02] shrink-0"
        >
          <Logo size={36} withWordmark={false} />
          {/* Nom de la plateforme animé (machine à écrire), masqué sur très petit écran */}
          <TypewriterText className="hidden min-[360px]:inline font-bold tracking-[0.05em] text-[var(--text-primary)] whitespace-nowrap text-base" />
        </Link>

        {/* Liens desktop */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-8 text-[13px] xl:text-sm font-medium text-[var(--text-secondary)]">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={desktopLinkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Cluster d'actions : les boutons sont enveloppés dans des spans pour que les
            classes de visibilité (hidden) fonctionnent — .btn a un display inline-flex
            non-layered qui écrase l'utilitaire hidden de Tailwind. */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          <span className="hidden lg:inline-flex">
            <Link href="/login" className="btn btn-ghost">
              Connexion
            </Link>
          </span>
          {/* CTA uniquement à partir de lg (où il n'y a pas de menu) : sur mobile,
              Connexion et Inscription sont déjà dans le menu hamburger. */}
          <span className="hidden lg:inline-flex">
            <Link href="/register" className="btn btn-primary">
              Créer un compte
            </Link>
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center text-[var(--text-primary)] transition-all active:scale-95"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile via portail : la nav a un transform (translateX) qui casserait un fixed enfant. */}
      {menuOpen && createPortal(mobileMenu, document.body)}
    </>
  );
}
