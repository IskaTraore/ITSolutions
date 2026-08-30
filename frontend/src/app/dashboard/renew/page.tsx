"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, formatFc, formatDate } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IconRefresh } from "@/components/Icons";

interface RenewRouter {
  id: string;
  name: string;
  status: string;
  subscription: {
    expiresAt: string;
    monthlyPrice: number;
    status: string;
  } | null;
}

export default function RenewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [routers, setRouters] = useState<RenewRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  useEffect(() => {
    api<{ routers: RenewRouter[] }>("/routers")
      .then((res) => {
        const sorted = [...res.routers].sort((a, b) => {
          const da = a.subscription ? new Date(a.subscription.expiresAt).getTime() : Infinity;
          const db = b.subscription ? new Date(b.subscription.expiresAt).getTime() : Infinity;
          return da - db;
        });
        setRouters(sorted);
      })
      .catch((err) => toast("error", err instanceof ApiError ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [toast]);

  async function renew(id: string) {
    setRenewingId(id);
    try {
      await api(`/routers/${id}/renew`, { method: "POST", body: {} });
      toast("success", "Routeur renouvelé pour 30 jours");
      const res = await api<{ routers: RenewRouter[] }>("/routers");
      setRouters(res.routers);
      router.refresh();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Échec du renouvellement");
    } finally {
      setRenewingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-56" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renouvellement"
        subtitle="Les services sont valables 30 jours. Les routeurs proches de l'expiration sont affichés en premier."
        icon={<IconRefresh className="w-6 h-6" />}
      />

      {routers.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center animate-in--1">
          <p className="text-base font-medium mb-2">Aucun routeur</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Créez un routeur pour commencer.
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden animate-in--1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border-glass)] bg-[rgba(255,255,255,0.03)]">
                  <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Routeur
                  </th>
                  <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Statut
                  </th>
                  <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Expiration
                  </th>
                  <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                    Coût
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {routers.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-glass)] last:border-0 hover:bg-[var(--surface-glass-hover)] transition-colors"
                  >
                    <td className="px-3 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">
                      {r.subscription ? formatDate(r.subscription.expiresAt) : "-"}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">
                      {r.subscription ? `${formatFc(r.subscription.monthlyPrice)} FC` : "-"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => renew(r.id)}
                        className="btn btn-primary btn-sm"
                        disabled={renewingId === r.id}
                      >
                        {renewingId === r.id && <span className="spinner" />}
                        Renouveler
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
