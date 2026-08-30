"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { api, formatFc } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconRouter,
  IconWallet,
  IconRefresh,
  IconDoc,
  IconLogout,
  IconPlus,
  IconMenu,
  IconX,
  IconShield,
  IconGlobe,
} from "@/components/Icons";

interface DashboardLayoutProps {
  children: ReactNode;
  user: { username: string; email: string; role: string } | null;
  balance: number;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Mes routeurs", icon: IconRouter },
  { href: "/dashboard/wallet", label: "Wallet", icon: IconWallet },
  { href: "/dashboard/renew", label: "Renouvellement", icon: IconRefresh },
  { href: "/documentation", label: "Documentation", icon: IconDoc },
];

function isItemActive(href: string, pathname: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/routers");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardLayout({ children, user, balance }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermeture des menus : clic extérieur + touche Échap.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setUserOpen(false);
      }
    }
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      toast("error", "Impossible de se déconnecter");
    }
  }

  const isAdmin = user?.role === "ADMIN";
  const initials = (user?.username?.slice(0, 2) ?? "U").toUpperCase();

  const tabClass = (href: string) =>
    isItemActive(href, pathname)
      ? "text-[var(--accent-primary)] font-semibold whitespace-nowrap"
      : "hover:text-[var(--text-primary)] transition-colors whitespace-nowrap";

  const mobileLinkClass = (href: string) =>
    isItemActive(href, pathname)
      ? "bg-[var(--surface-glass)] text-[var(--text-primary)] font-semibold"
      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)]";

  const mobileMenu = (
    <div
      className="lg:hidden fixed inset-x-4 top-20 z-[60] glass-strong rounded-2xl p-3 space-y-1 animate-in max-h-[calc(100vh-96px)] overflow-y-auto"
      role="navigation"
      aria-label="Menu du tableau de bord"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${mobileLinkClass(
            item.href
          )}`}
        >
          <span className="flex items-center gap-3">
            <item.icon className="w-5 h-5" />
            {item.label}
          </span>
          {isItemActive(item.href, pathname) && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          )}
        </Link>
      ))}            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${mobileLinkClass(
                    "/admin"
                  )}`}
                >
                  <span className="flex items-center gap-3">
                    <IconShield className="w-5 h-5" />
                    Administration
                  </span>
                  {isItemActive("/admin", pathname) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  )}
                </Link>
                <Link
                  href="/admin/hotspot"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${mobileLinkClass(
                    "/admin/hotspot"
                  )}`}
                >
                  <span className="flex items-center gap-3">
                    <IconGlobe className="w-5 h-5" />
                    Hotspot & RADIUS
                  </span>
                  {isItemActive("/admin/hotspot", pathname) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                  )}
                </Link>
              </>
            )}

      <div className="border-t border-[var(--border-glass)] mt-2 pt-3 flex flex-col gap-2">
        {user && (
          <div className="px-4 py-2">
            <p className="text-sm font-medium truncate">{user.username}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => {
            setMobileOpen(false);
            handleLogout();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-[var(--status-expired)] hover:bg-[var(--surface-glass)] transition-colors text-left"
        >
          <IconLogout className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <nav className="floating-nav glass-strong">
        {/* Groupe gauche : solde + menu (logo + onglets existants, sans le logotype ITSOLUTIONS) */}
        <div className="flex items-center gap-3 lg:gap-6 min-w-0">
          {/* Solde : petit span compact, l'icône + survolée affiche « recharger solde » */}
          <Link
            href="/dashboard/wallet"
            className="group relative flex items-center gap-2 h-10 px-3 rounded-full glass glass-hover shrink-0 no-underline"
            aria-label={`Solde du wallet : ${formatFc(balance)} FC`}
          >
            <IconWallet className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">
              {formatFc(balance)} FC
            </span>
            <span className="w-5 h-5 rounded-full bg-[var(--gradient-brand)] flex items-center justify-center text-white transition-transform group-hover:scale-110 shrink-0">
              <IconPlus className="w-3 h-3" />
            </span>
            {/* Survol : « recharger solde » */}
            <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-glass)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
              Recharger solde
            </span>
          </Link>

          {/* Logo (sans le mot ITSOLUTIONS) */}
          <Link href="/dashboard" className="flex items-center shrink-0 no-underline">
            <Logo size={36} withWordmark={false} />
          </Link>

          {/* Onglets desktop */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-8 text-[13px] xl:text-sm font-medium text-[var(--text-secondary)]">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={tabClass(item.href)}>
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <>
                <Link href="/admin" className={tabClass("/admin")}>
                  Administration
                </Link>
                <Link href="/admin/hotspot" className={tabClass("/admin/hotspot")}>
                  Hotspot
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Groupe droit : dark/light mode + utilisateur + bouton menu mobile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />

          {/* Menu utilisateur (avatar) */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserOpen((open) => !open)}
              className="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center text-sm font-semibold uppercase text-[var(--text-primary)] transition-all active:scale-95"
              aria-label="Menu utilisateur"
              aria-expanded={userOpen}
            >
              {initials}
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 glass-strong rounded-2xl p-2 z-50 animate-in shadow-lg">
                <div className="px-3 py-2.5 border-b border-[var(--border-glass)] mb-1.5">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
                </div>
                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] transition-colors"
                    >
                      <IconShield className="w-5 h-5" />
                      Administration
                    </Link>
                    <Link
                      href="/admin/hotspot"
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] transition-colors"
                    >
                      <IconGlobe className="w-5 h-5" />
                      Hotspot & RADIUS
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    setUserOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--status-expired)] hover:bg-[var(--surface-glass)] transition-colors w-full text-left"
                >
                  <IconLogout className="w-5 h-5" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>

          {/* Bouton menu mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="lg:hidden w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center text-[var(--text-primary)] transition-all active:scale-95"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Menu mobile via portail : la nav a un transform (translateX) qui casserait un fixed enfant. */}
      {mobileOpen && createPortal(mobileMenu, document.body)}

      {/* Contenu */}
      <main className="pt-28 pb-16">
        <div className="px-4 sm:px-6 py-4 max-w-[1200px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
