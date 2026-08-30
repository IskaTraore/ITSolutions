"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError, formatFc, formatDate } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { StatusBadge } from "@/components/StatusBadge";
import { IconRouter, IconCopy, IconCheck } from "@/components/Icons";

interface RouterDetail {
  id: string;
  name: string;
  status: string;
  routerOsFamily: string;
  apiPort: number | null;
  winboxPort: number | null;
  createdAt: string;
  vpnCredential: { vpnServer: string; vpnIp: string | null; username: string } | null;
  mikhmonWorkspace: { url: string; webfigUrl: string } | null;
  subscription: {
    id: string;
    monthlyPrice: number;
    startedAt: string;
    expiresAt: string;
    autoRenew: boolean;
    status: string;
    lastRenewedAt: string | null;
  } | null;
}

/** Nombre de lignes visibles avant d'afficher « Voir plus ». */
const SCRIPT_PREVIEW_LINES = 10;

export default function RouterDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<RouterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Date « maintenant » rafraîchie à chaque chargement (pureté du rendu).
  const [now, setNow] = useState(0);

  // Script de configuration généré par le backend
  const [script, setScript] = useState<string | null>(null);
  const [scriptNotice, setScriptNotice] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(true);
  const [scriptExpanded, setScriptExpanded] = useState(false);

  async function load() {
    try {
      const res = await api<{ router: RouterDetail }>(`/routers/${params.id}`);
      setData(res.router);
      setNow(Date.now());
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<{ router: RouterDetail }>(`/routers/${params.id}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.router);
          setNow(Date.now());
        }
      })
      .catch((err) => {
        if (!cancelled) toast("error", err instanceof ApiError ? err.message : "Erreur de chargement");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, toast]);

  useEffect(() => {
    let cancelled = false;
    api<{ script: string; notice?: string }>(`/routers/${params.id}/script`)
      .then((res) => {
        if (!cancelled) {
          setScript(res.script);
          setScriptNotice(res.notice ?? null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setScript(null);
          toast("error", err instanceof ApiError ? err.message : "Erreur de chargement du script");
        }
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, toast]);

  async function handleRenew() {
    setRenewing(true);
    try {
      await api(`/routers/${params.id}/renew`, { method: "POST", body: {} });
      toast("success", "Routeur renouvelé pour 30 jours");
      await load();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Échec du renouvellement");
    } finally {
      setRenewing(false);
    }
  }

  async function handleToggleAutoRenew() {
    if (!data?.subscription) return;
    const next = !data.subscription.autoRenew;
    try {
      await api(`/routers/${params.id}/auto-renew`, {
        method: "PATCH",
        body: { autoRenew: next },
      });
      toast("success", next ? "Renouvellement automatique activé" : "Renouvellement automatique désactivé");
      await load();
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce routeur ? Cette action est irréversible.")) return;
    setDeleting(true);
    try {
      await api(`/routers/${params.id}`, { method: "DELETE" });
      toast("success", "Routeur supprimé");
      router.push("/dashboard");
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Échec de la suppression");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-40" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  if (!data) return null;

  const sub = data.subscription;
  const vpnHost = data.vpnCredential?.vpnServer ?? "";
  const apiTarget = `${vpnHost}${data.apiPort ? `:${data.apiPort}` : ""}`;
  const winboxTarget = `${vpnHost}${data.winboxPort ? `:${data.winboxPort}` : ""}`;

  // Compteur de jours restants avant expiration (alerte rouge à ≤ 3 jours)
  const daysLeft = sub && now
    ? Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - now) / 86_400_000))
    : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 3;

  const scriptLines = script?.split("\n") ?? [];
  const scriptPreview = scriptLines.slice(0, SCRIPT_PREVIEW_LINES).join("\n");
  const scriptHasMore = scriptLines.length > SCRIPT_PREVIEW_LINES;

  return (
    <div className="space-y-6">
      {/* En-tête compact */}
      <header className="animate-in flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl glass-strong border border-[var(--border-glass-strong)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
            <IconRouter className="w-4 h-4" />
          </span>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">
              {data.name}
              <span className="text-gradient">.</span>
            </h1>
            <StatusBadge status={data.status} />
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="btn btn-danger btn-sm shrink-0"
          disabled={deleting}
        >
          {deleting ? "Suppression..." : "Supprimer"}
        </button>
      </header>

      {/* Connexion */}
      <section className="glass rounded-2xl p-4 space-y-2.5 animate-in--1">
        <h2 className="text-sm font-semibold mb-3">Connexion</h2>
        {data.mikhmonWorkspace && (
          <ConnectionRow label="URL Mikhmon" value={data.mikhmonWorkspace.url} href={data.mikhmonWorkspace.url} />
        )}
        {data.mikhmonWorkspace && (
          <ConnectionRow label="URL Webfig" value={data.mikhmonWorkspace.webfigUrl} href={data.mikhmonWorkspace.webfigUrl} />
        )}
        <ConnectionRow label="Port API" value={apiTarget} />
        <ConnectionRow label="Port Winbox" value={winboxTarget} />
        {data.vpnCredential?.vpnIp && (
          <ConnectionRow label="IP VPN" value={data.vpnCredential.vpnIp} live={data.status === "ACTIVE"} />
        )}
      </section>

      {/* Abonnement */}
      {sub && (
        <section className="glass rounded-2xl p-4 space-y-4 animate-in--2">
          <h2 className="text-sm font-semibold">Abonnement</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoCell label="Tarif mensuel" value={`${formatFc(sub.monthlyPrice)} FC`} />
            <InfoCell label="Créé le" value={formatDate(data.createdAt)} />
            <InfoCell label="Expiration" value={formatDate(sub.expiresAt)} />
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Statut</p>
              <StatusBadge status={sub.status} />
            </div>
          </div>

          {/* Compteur avant expiration : vert normal, rouge à ≤ 3 jours */}
          {daysLeft !== null && (
            <div
              className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                expiringSoon ? "bg-[var(--status-expired-bg)]" : "bg-[var(--surface-glass)]"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  expiringSoon ? "text-[var(--status-expired)]" : "text-[var(--text-secondary)]"
                }`}
              >
                {daysLeft === 0
                  ? "Abonnement expiré"
                  : `Il vous reste ${daysLeft} jour${daysLeft > 1 ? "s" : ""} avant l'expiration`}
              </span>
              {expiringSoon && daysLeft > 0 && (
                <span className="text-xs font-medium text-[var(--status-expired)]">
                  Renouvelez rapidement
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-elevated)] p-3">
            <div>
              <p className="text-sm font-medium">Renouvellement automatique</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Prélève {formatFc(sub.monthlyPrice)} FC à l&apos;expiration si le solde est suffisant
              </p>
            </div>
            <button
              onClick={handleToggleAutoRenew}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                sub.autoRenew ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-glass-hover)]"
              }`}
              aria-pressed={sub.autoRenew}
              aria-label="Activer le renouvellement automatique"
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  sub.autoRenew ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          <button onClick={handleRenew} className="btn btn-primary btn-sm" disabled={renewing}>
            {renewing && <span className="spinner" />}
            {renewing ? "Renouvellement..." : `Renouveler (${formatFc(sub.monthlyPrice)} FC)`}
          </button>
        </section>
      )}

      {/* Script de configuration */}
      <section className="glass rounded-2xl p-4 animate-in--3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold">Script de configuration</h2>
          {script !== null && <CopyIconButton value={script} />}
        </div>

        {scriptLoading ? (
          <div className="skeleton h-40" />
        ) : script === null ? (
          <p className="text-sm text-[var(--status-expired)]">
            Impossible de charger le script.
          </p>
        ) : (
          <>
            <pre className="mono text-[11px] leading-5 text-[var(--text-secondary)] whitespace-pre overflow-x-auto rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-glass)] p-3">
              {scriptExpanded ? script : scriptPreview}
            </pre>
            {scriptNotice && (
              <p className="text-[11px] text-[var(--text-muted)] mt-2">{scriptNotice}</p>
            )}
            {scriptHasMore && (
              <button
                onClick={() => setScriptExpanded((expanded) => !expanded)}
                className="btn btn-ghost btn-sm mt-3"
              >
                {scriptExpanded
                  ? "Voir moins"
                  : `Voir plus (${scriptLines.length - SCRIPT_PREVIEW_LINES} lignes)`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ConnectionRow({
  label,
  value,
  href,
  live = false,
}: {
  label: string;
  value: string;
  href?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-[var(--text-secondary)] shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        {live && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-active)] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-active)]" />
          </span>
        )}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mono text-xs text-[var(--accent-primary)] hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="mono text-xs text-[var(--text-primary)] truncate">{value}</span>
        )}
        <CopyIconButton value={value} />
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copier"
      aria-label="Copier"
      className="w-7 h-7 rounded-lg glass glass-hover flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all active:scale-95 shrink-0"
    >
      {copied ? (
        <IconCheck className="w-3.5 h-3.5 text-[var(--status-active)]" />
      ) : (
        <IconCopy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
