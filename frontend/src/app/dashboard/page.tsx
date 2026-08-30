"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, formatFc } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { RouterCard } from "@/components/dashboard/RouterCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IconPlus, IconRouter, IconWallet } from "@/components/Icons";

interface DashboardData {
  routers: Array<{
    id: string;
    name: string;
    status: string;
    routerOsFamily: string;
    apiPort: number | null;
    winboxPort: number | null;
    createdAt: string;
    vpnCredential: { vpnServer: string; vpnIp: string | null } | null;
    mikhmonWorkspace: { url: string; webfigUrl: string } | null;
    subscription: {
      expiresAt: string;
      monthlyPrice: number;
      status: string;
    } | null;
  }>;
}

type RouterItem = DashboardData["routers"][number];

/** Section de routeurs regroupés par version Mikhmon (V1 : RouterOS 6.x-7.9, V2 : 7.10+). */
function RouterSection({
  title,
  subtitle,
  routers,
  onRouterDeleted,
}: {
  title: string;
  subtitle: string;
  routers: RouterItem[];
  onRouterDeleted: (routerId: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 animate-in">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-xs text-[var(--text-secondary)]">{subtitle}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface-glass)] border border-[var(--border-glass)] text-[var(--text-secondary)]">
          {routers.length}
        </span>
      </div>

      {routers.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-8 text-center animate-in--1">
          <p className="text-sm text-[var(--text-secondary)]">
            Aucun routeur dans cette catégorie.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {routers.map((router, i) => (
            <RouterCard
              key={router.id}
              router={router}
              index={i}
              onDeleted={onRouterDeleted}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [routersRes, meRes] = await Promise.all([
          api<DashboardData>("/routers"),
          api<{ wallet: { balance: number } }>("/auth/me"),
        ]);
        if (!cancelled) {
          setData(routersRes);
          setBalance(meRes.wallet.balance);
        }
      } catch (err) {
        if (!cancelled) {
          toast("error", err instanceof ApiError ? err.message : "Erreur de chargement");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-11 w-40" />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );
  }

  const routers = data?.routers ?? [];
  const v1Routers = routers.filter((r) => r.routerOsFamily !== "V7_10_PLUS");
  const v2Routers = routers.filter((r) => r.routerOsFamily === "V7_10_PLUS");

  function handleRouterDeleted(routerId: string) {
    setData((prev) =>
      prev ? { ...prev, routers: prev.routers.filter((r) => r.id !== routerId) } : prev
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mes routeurs"
        subtitle="Pilotez vos hotspots depuis un seul tableau de bord."
        icon={<IconRouter className="w-6 h-6" />}
        actions={
          <Link href="/dashboard/routers/new" className="btn btn-primary">
            <IconPlus className="w-5 h-5" />
            Ajouter un routeur
          </Link>
        }
      />

      {/* Solde du wallet : petite carte compacte (même style que la puce du menu) */}
      <Link
        href="/dashboard/wallet"
        className="group relative inline-flex items-center gap-2.5 h-11 px-4 rounded-full glass-strong no-underline animate-in--1"
        aria-label={`Solde du wallet : ${formatFc(balance)} FC`}
      >
        <span className="w-7 h-7 rounded-full bg-[var(--gradient-brand)] flex items-center justify-center text-white shrink-0">
          <IconWallet className="w-4 h-4" />
        </span>
        <span className="text-sm font-semibold whitespace-nowrap">{formatFc(balance)} FC</span>
        <span className="w-5 h-5 rounded-full bg-[var(--surface-glass)] border border-[var(--border-glass)] flex items-center justify-center text-[var(--accent-primary)] transition-transform group-hover:scale-110 shrink-0">
          <IconPlus className="w-3 h-3" />
        </span>
        {/* Survol : « recharger solde » */}
        <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-glass)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          Recharger solde
        </span>
      </Link>

      {/* Routeurs regroupés par version Mikhmon */}
      {routers.length === 0 ? (
        <div className="glass card-futuristic rounded-3xl p-16 text-center animate-in--1">
          <p className="text-lg font-medium mb-2">Aucun routeur pour le moment</p>
          <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-md mx-auto leading-6">
            Ajoutez votre premier routeur pour créer votre Mikhmon en ligne, recevoir votre
            script de configuration et gérer votre hotspot depuis le cloud.
          </p>
          <Link href="/dashboard/routers/new" className="btn btn-primary">
            <IconPlus className="w-5 h-5" />
            Ajouter mon premier routeur
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <RouterSection
            title="Mikhmon V1"
            subtitle="RouterOS 6.x à 7.9"
            routers={v1Routers}
            onRouterDeleted={handleRouterDeleted}
          />
          <RouterSection
            title="Mikhmon V2"
            subtitle="RouterOS 7.10 et supérieur"
            routers={v2Routers}
            onRouterDeleted={handleRouterDeleted}
          />
        </div>
      )}
    </div>
  );
}
