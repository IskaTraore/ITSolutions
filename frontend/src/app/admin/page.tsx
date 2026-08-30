"use client";

import { useEffect, useState } from "react";
import { api, ApiError, formatFc, formatDate } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProductManager } from "@/components/admin/ProductManager";
import { IconShield } from "@/components/Icons";

interface Stats {
  activeUsers: number;
  activeRouters: number;
  monthRevenue: number;
  pendingTickets: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
  wallet: { balance: number } | null;
  _count: { routers: number };
}

interface AdminRouter {
  id: string;
  name: string;
  status: string;
  routerOsFamily: string;
  user: { username: string; email: string };
  subscription: { expiresAt: string } | null;
}

interface AdminPayment {
  id: string;
  amount: number;
  provider: string;
  status: string;
  createdAt: string;
  user: { username: string; email: string };
}

type Tab = "users" | "routers" | "payments" | "products";

export default function AdminPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("users");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [routers, setRouters] = useState<AdminRouter[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, usersRes, routersRes, paymentsRes] = await Promise.all([
          api<{ stats: Stats }>("/admin/stats"),
          api<{ users: AdminUser[] }>("/admin/users"),
          api<{ routers: AdminRouter[] }>("/admin/routers"),
          api<{ payments: AdminPayment[] }>("/admin/payments"),
        ]);
        if (!cancelled) {
          setStats(statsRes.stats);
          setUsers(usersRes.users);
          setRouters(routersRes.routers);
          setPayments(paymentsRes.payments);
        }
      } catch (err) {
        if (!cancelled) {
          const e = err as ApiError;
          if (e.status === 403) toast("error", "Accès réservé aux administrateurs");
          else toast("error", e.message);
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

  async function toggleSuspend(userId: string, currentlySuspended: boolean) {
    try {
      await api(`/admin/users/${userId}/suspend`, {
        method: "PATCH",
        body: { suspended: !currentlySuspended },
      });
      toast("success", currentlySuspended ? "Utilisateur réactivé" : "Utilisateur suspendu");
      const res = await api<{ users: AdminUser[] }>("/admin/users");
      setUsers(res.users);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Erreur");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Administration"
        subtitle="Pilotez l'ensemble de la plateforme : utilisateurs, routeurs et paiements."
        icon={<IconShield className="w-6 h-6" />}
      />

      {/* Métriques */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard label="Utilisateurs actifs" value={String(stats?.activeUsers ?? 0)} index={0} />
        <MetricCard label="Routeurs actifs" value={String(stats?.activeRouters ?? 0)} index={1} />
        <MetricCard label="Revenu du mois" value={`${formatFc(stats?.monthRevenue ?? 0)} FC`} index={2} gradient />
        <MetricCard label="Notifications en attente" value={String(stats?.pendingTickets ?? 0)} index={3} />
      </div>

      {/* Onglets */}
      <div className="flex gap-2 animate-in--1">
        {(
          [
            ["users", "Utilisateurs"],
            ["routers", "Routeurs"],
            ["payments", "Paiements"],
            ["products", "Produits"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`btn btn-sm ${tab === key ? "btn-primary" : "btn-ghost"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Utilisateurs */}
      {tab === "users" && (
        <AdminTable
          headers={["Utilisateur", "Email", "Statut", "Routeurs", "Solde", ""]}
          rows={users.map((u) => [
            <span key="u" className="font-medium">{u.username}</span>,
            <span key="e" className="text-[var(--text-secondary)]">{u.email}</span>,
            <StatusBadge key="s" status={u.status} />,
            <span key="c" className="text-[var(--text-secondary)]">{u._count.routers}</span>,
            <span key="w" className="text-[var(--text-secondary)]">
              {formatFc(u.wallet?.balance ?? 0)} FC
            </span>,
            <button
              key="a"
              onClick={() => toggleSuspend(u.id, u.status === "SUSPENDED")}
              className="btn btn-sm btn-ghost"
              disabled={u.role === "ADMIN"}
            >
              {u.status === "SUSPENDED" ? "Réactiver" : "Suspendre"}
            </button>,
          ])}
        />
      )}

      {/* Routeurs */}
      {tab === "routers" && (
        <AdminTable
          headers={["Nom", "Propriétaire", "Version", "Statut", "Expiration"]}
          rows={routers.map((r) => [
            <span key="n" className="font-medium">{r.name}</span>,
            <span key="o" className="text-[var(--text-secondary)]">{r.user.username}</span>,
            <span key="v" className="text-[var(--text-secondary)]">
              {r.routerOsFamily === "V7_10_PLUS" ? "V2 (7.10+)" : "V1 (6.x-7.9)"}
            </span>,
            <StatusBadge key="s" status={r.status} />,
            <span key="e" className="text-[var(--text-secondary)]">
              {r.subscription ? formatDate(r.subscription.expiresAt) : "-"}
            </span>,
          ])}
        />
      )}

      {/* Produits (boutique) */}
      {tab === "products" && <ProductManager />}

      {/* Paiements */}
      {tab === "payments" && (
        <AdminTable
          headers={["Utilisateur", "Montant", "Moyen", "Statut", "Date"]}
          rows={payments.map((p) => [
            <span key="u" className="font-medium">{p.user.username}</span>,
            <span key="a" className="text-[var(--text-secondary)]">{formatFc(p.amount)} FC</span>,
            <span key="p" className="text-[var(--text-secondary)]">{p.provider}</span>,
            <StatusBadge key="s" status={p.status} />,
            <span key="d" className="text-[var(--text-secondary)]">{formatDate(p.createdAt)}</span>,
          ])}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  index = 0,
  gradient = false,
}: {
  label: string;
  value: string;
  index?: number;
  gradient?: boolean;
}) {
  return (
    <div
      className={`glass card-futuristic rounded-2xl p-6 animate-in ${
        gradient ? "shadow-[0_0_30px_rgba(91,124,250,0.15)]" : ""
      }`}
      style={{ animationDelay: `${Math.min(index, 6) * 90}ms` }}
    >
      <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">{label}</p>
      <p className={`text-2xl font-bold ${gradient ? "text-gradient" : ""}`}>{value}</p>
    </div>
  );
}

function AdminTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) {
    return (
      <div className="glass card-futuristic rounded-2xl p-12 text-center animate-in">
        <p className="text-[var(--text-secondary)]">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in--2">
      {/* Adaptatif Mobile : Cartes empilées en verre dépoli */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="glass card-futuristic rounded-2xl p-5 space-y-3">
            {row.map((cell, colIndex) => {
              const header = headers[colIndex];
              return (
                <div
                  key={colIndex}
                  className="flex justify-between items-center text-sm gap-2 border-b border-[var(--border-glass)] last:border-0 pb-2.5 last:pb-0"
                >
                  {header ? (
                    <span className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium shrink-0">
                      {header}
                    </span>
                  ) : null}
                  <div className="text-right flex-1 flex justify-end items-center">{cell}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Vue Bureau : Tableau classique */}
      <div className="hidden md:block glass card-futuristic rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border-glass)] bg-[rgba(255,255,255,0.03)]">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[var(--border-glass)] last:border-0 hover:bg-[var(--surface-glass-hover)] transition-colors"
                >
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-4">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
