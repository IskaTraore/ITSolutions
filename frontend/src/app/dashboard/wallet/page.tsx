"use client";

import { useEffect, useState } from "react";
import { api, ApiError, formatFc, formatDate } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { IconWallet } from "@/components/Icons";

interface WalletResponse {
  wallet: { balance: number; currency: string };
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    status: string;
    description: string;
    createdAt: string;
  }>;
}

const PRESET_AMOUNTS = [10000, 25000, 50000];

export default function WalletPage() {
  const { toast } = useToast();
  const [data, setData] = useState<WalletResponse | null>(null);
  const [amount, setAmount] = useState<number>(25000);
  const [provider, setProvider] = useState<string>("orange_money");
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<WalletResponse>("/wallet")
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [toast]);

  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
    setRecharging(true);
    try {
      const result = await api<{ payment: { id: string }; checkoutUrl: string }>(
        "/wallet/recharge",
        {
          method: "POST",
          body: {
            amount,
            method: provider === "card" ? "CARD" : "MOBILE_MONEY",
            provider,
          },
        }
      );
      // En développement : confirmation simulée du paiement
      await api(`/wallet/simulate/${result.payment.id}`, { method: "POST" });
      toast("success", `Recharge de ${formatFc(amount)} FC confirmée`);
      const refreshed = await api<WalletResponse>("/wallet");
      setData(refreshed);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Échec de la recharge");
    } finally {
      setRecharging(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-40" />
        <div className="skeleton h-48" />
      </div>
    );
  }

  const transactions = data?.transactions ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      {/* En-tête compact */}
      <header className="animate-in flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl glass-strong border border-[var(--border-glass-strong)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
          <IconWallet className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">
            Wallet<span className="text-gradient">.</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Rechargez par Mobile Money ou carte bancaire et suivez vos transactions.
          </p>
        </div>
      </header>

      {/* Solde + recharge dans une seule carte compacte */}
      <div className="glass rounded-2xl overflow-hidden animate-in--1">
        <div className="p-4 flex items-center justify-between gap-4 animate-glow-in">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[var(--gradient-brand)] flex items-center justify-center text-white shrink-0">
              <IconWallet className="w-4 h-4" />
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)]">
                Solde disponible
              </p>
              <p className="text-xl font-bold text-gradient">
                {formatFc(data?.wallet.balance ?? 0)} FC
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleRecharge} className="border-t border-[var(--border-glass)] p-4 space-y-4">
          <h2 className="text-sm font-semibold">Recharger le wallet</h2>

          <div>
            <p className="field-label mb-2">Montant</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`btn btn-sm ${
                    amount === preset ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {formatFc(preset)} FC
                </button>
              ))}
              <input
                type="number"
                className="field-input !w-32 !h-8 !text-sm"
                placeholder="Montant libre"
                value={amount}
                min={1000}
                onChange={(e) => setAmount(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>

          <div>
            <p className="field-label mb-2">Moyen de paiement</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "orange_money", label: "Orange Money" },
                { value: "moov_money", label: "Moov Money" },
                { value: "card", label: "Carte bancaire" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProvider(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                    provider === option.value
                      ? "border-[var(--accent-primary)] bg-[var(--surface-glass-hover)] text-[var(--text-primary)]"
                      : "border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-glass-strong)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={recharging || amount < 1000}
          >
            {recharging && <span className="spinner" />}
            {recharging ? "Traitement..." : `Recharger ${formatFc(amount)} FC`}
          </button>
        </form>
      </div>

      {/* Historique compact */}
      <div className="glass rounded-2xl p-4 animate-in--2">
        <h2 className="text-sm font-semibold mb-3">Historique des transactions</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Aucune transaction pour le moment.</p>
        ) : (
          <div className="divide-y divide-[var(--border-glass)]">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-2 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formatDate(tx.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-semibold ${
                      tx.amount >= 0 ? "text-[var(--status-active)]" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {formatFc(tx.amount)} FC
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Solde : {formatFc(tx.balanceAfter)} FC
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
