"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError, formatDate } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { StatusBadge } from "@/components/StatusBadge";
import { IconPing, IconTrash } from "@/components/Icons";

interface RouterCardProps {
  router: {
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
  };
  /** Indice dans la grille pour l'animation d'entrée en cascade. */
  index?: number;
  /** Appelé après la suppression réussie pour retirer le routeur de la liste. */
  onDeleted?: (routerId: string) => void;
}

type PingState = "idle" | "pinging" | "ok" | "fail";

export function RouterCard({ router, index = 0, onDeleted }: RouterCardProps) {
  const { toast } = useToast();
  const [pingState, setPingState] = useState<PingState>("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const workspaceUrl = router.mikhmonWorkspace?.url;
  const apiPort = router.apiPort ? `:${router.apiPort}` : "";
  const winboxPort = router.winboxPort ? `:${router.winboxPort}` : "";
  const isActive = router.status === "ACTIVE";

  async function handlePing() {
    setPingState("pinging");
    setLatency(null);
    try {
      const res = await api<{ ping: { reachable: boolean; latencyMs: number | null } }>(
        `/routers/${router.id}/ping`,
        { method: "POST" }
      );
      setLatency(res.ping.latencyMs);
      setPingState(res.ping.reachable ? "ok" : "fail");
    } catch (err) {
      setPingState("fail");
      toast("error", err instanceof ApiError ? err.message : "Ping impossible");
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer le routeur « ${router.name} » ?\nCette action est irréversible.`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api(`/routers/${router.id}`, { method: "DELETE" });
      toast("success", `Routeur « ${router.name} » supprimé`);
      onDeleted?.(router.id);
    } catch (err) {
      setDeleting(false);
      toast("error", err instanceof ApiError ? err.message : "Échec de la suppression");
    }
  }

  return (
    <div
      className={`glass card-futuristic rounded-2xl p-4 flex flex-col gap-3 animate-in ${
        isActive ? "shadow-[0_0_30px_rgba(61,214,140,0.12)]" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 6) * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold truncate">{router.name}</h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 mono">
            {router.routerOsFamily === "V7_10_PLUS" ? "Mikhmon V2" : "Mikhmon V1"}
          </p>
        </div>
        <StatusBadge status={router.status} />
      </div>

      <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
        {workspaceUrl && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex w-2 h-2 shrink-0">
              {isActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-active)] opacity-60" />
              )}
              <span className="relative inline-flex rounded-full w-2 h-2 bg-[var(--status-active)]" />
            </span>
            <span className="mono text-[11px] truncate">
              {workspaceUrl.replace("https://", "")}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">API</span>
          <span className="mono text-[11px] truncate">
            {router.vpnCredential?.vpnServer}
            {apiPort}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">Winbox</span>
          <span className="mono text-[11px] truncate">
            {router.vpnCredential?.vpnServer}
            {winboxPort}
          </span>
        </div>
        {router.subscription && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0">Expiration</span>
            <span className="text-[11px] truncate">{formatDate(router.subscription.expiresAt)}</span>
          </div>
        )}
      </div>

      {/* Actions : ping, suppression, détails */}
      <div className="mt-auto pt-1 flex items-center gap-2">
        <button
          type="button"
          onClick={handlePing}
          disabled={pingState === "pinging"}
          title="Tester la connexion (ping)"
          aria-label={`Ping du routeur ${router.name}`}
          className="w-7 h-7 rounded-lg glass glass-hover flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
        >
          {pingState === "pinging" ? (
            <span className="spinner !w-3.5 !h-3.5" />
          ) : (
            <IconPing className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Supprimer le routeur"
          aria-label={`Supprimer le routeur ${router.name}`}
          className="w-7 h-7 rounded-lg glass glass-hover flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--status-expired)] transition-all active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
        >
          {deleting ? <span className="spinner !w-3.5 !h-3.5" /> : <IconTrash className="w-3.5 h-3.5" />}
        </button>

        {/* Résultat du dernier ping */}
        {pingState === "ok" && (
          <span className="text-[11px] font-medium text-[var(--status-active)]">
            {latency !== null ? `${Math.round(latency)} ms` : "En ligne"}
          </span>
        )}
        {pingState === "fail" && (
          <span className="text-[11px] font-medium text-[var(--status-expired)]">Injoignable</span>
        )}

        <Link
          href={`/dashboard/routers/${router.id}`}
          className="btn btn-ghost btn-sm ml-auto"
        >
          Détails
        </Link>
      </div>
    </div>
  );
}
