"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, formatFc } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { IconPlus } from "@/components/Icons";

type OsFamily = "V6_TO_7_9" | "V7_10_PLUS";

const STEPS = ["Version", "Nom", "Confirmation", "Script"];

interface CreatedRouter {
  id: string;
  name: string;
}

interface CreateResponse {
  router: CreatedRouter;
  script: string;
  mikhmonAdminPassword: string;
  message: string;
}

export default function NewRouterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [osFamily, setOsFamily] = useState<OsFamily | null>(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(0);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<CreateResponse | null>(null);

  useEffect(() => {
    api<{ wallet: { balance: number } }>("/auth/me")
      .then((res) => setBalance(res.wallet.balance))
      .catch(() => {});
  }, []);

  const nameValid = /^[a-z0-9]{3,32}$/.test(name);
  const insufficient = balance < 23000;

  function next() {
    if (step === 0 && !osFamily) {
      toast("error", "Sélectionnez une version RouterOS");
      return;
    }
    if (step === 1 && !nameValid) {
      toast("error", "Nom invalide : 3 à 32 lettres ou chiffres, sans espace");
      return;
    }
    setStep(step + 1);
  }

  async function confirm() {
    setCreating(true);
    try {
      const res = await api<CreateResponse>("/routers", {
        method: "POST",
        body: { name, routerOsFamily: osFamily },
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      const e = err as ApiError;
      if (e.code === "WALLET_INSUFFICIENT_BALANCE") {
        toast("error", "Solde insuffisant. Rechargez votre wallet pour continuer.");
        setStep(2);
      } else {
        toast("error", e.message);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Ajouter un routeur"
        subtitle="Créez votre Mikhmon en ligne en quatre étapes simples."
        icon={<IconPlus className="w-6 h-6" />}
      />

      {/* Indicateur de progression */}
      <div className="flex items-center gap-2 animate-in--1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={`h-1 rounded-full transition-colors ${
                i <= step ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-glass)]"
              }`}
            />
            <p
              className={`text-xs mt-2 ${
                i === step ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Étape 1 : version */}
      {step === 0 && (
        <div className="glass card-futuristic rounded-2xl p-8 space-y-4 fade-in-up">
          <h2 className="text-lg font-semibold">Version RouterOS</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-6">
            Sélectionnez la version de votre routeur MikroTik. Vérifiez-la dans Winbox :
            System puis Resources, ligne Version. Exemple : 7.15.2 pour Mikhmon V2.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              onClick={() => setOsFamily("V6_TO_7_9")}
              className={`glass-hover rounded-2xl p-6 text-left border transition-all hover:-translate-y-0.5 ${
                osFamily === "V6_TO_7_9"
                  ? "border-[var(--accent-primary)] bg-[var(--surface-glass-hover)]"
                  : "border-[var(--border-glass)]"
              }`}
            >
              <p className="font-semibold mb-1">Mikhmon V1</p>
              <p className="text-sm text-[var(--text-secondary)]">RouterOS 6.x à 7.9</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                RB750, hEX, hAP lite
              </p>
            </button>
            <button
              onClick={() => setOsFamily("V7_10_PLUS")}
              className={`glass-hover rounded-2xl p-6 text-left border transition-all hover:-translate-y-0.5 ${
                osFamily === "V7_10_PLUS"
                  ? "border-[var(--accent-primary)] bg-[var(--surface-glass-hover)]"
                  : "border-[var(--border-glass)]"
              }`}
            >
              <p className="font-semibold mb-1">Mikhmon V2</p>
              <p className="text-sm text-[var(--text-secondary)]">RouterOS 7.10 et supérieur</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">Routeurs récents</p>
            </button>
          </div>
          <div className="flex justify-end">
            <button onClick={next} className="btn btn-primary" disabled={!osFamily}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Étape 2 : nom */}
      {step === 1 && (
        <div className="glass card-futuristic rounded-2xl p-8 space-y-5 fade-in-up">
          <h2 className="text-lg font-semibold">Nom du routeur</h2>
          <div className="field">
            <label className="field-label" htmlFor="router-name">
              Nom
            </label>
            <input
              id="router-name"
              className="field-input mono"
              placeholder="mikhmon1"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase())}
            />
            {name && !nameValid && (
              <p className="field-error">
                Lettres et chiffres uniquement (3 à 32 caractères), sans espace ni accent.
              </p>
            )}
            {nameValid && (
              <p className="text-xs text-[var(--status-active)]">
                URL : https://{name}.itsolutions.tld
              </p>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            S&apos;il s&apos;agit de votre premier routeur, votre Mikhmon portera le même nom.
            Le nom ne pourra pas être modifié après création.
          </p>
          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="btn btn-ghost">
              Retour
            </button>
            <button onClick={next} className="btn btn-primary" disabled={!nameValid}>
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 : confirmation */}
      {step === 2 && (
        <div className="glass card-futuristic rounded-2xl p-8 space-y-5 fade-in-up">
          <h2 className="text-lg font-semibold">Récapitulatif</h2>
          <div className="rounded-xl bg-[var(--bg-elevated)] p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Routeur</span>
              <span className="font-medium">{name || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Version</span>
              <span className="font-medium">
                {osFamily === "V7_10_PLUS" ? "Mikhmon V2 (7.10+)" : "Mikhmon V1 (6.x-7.9)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Durée</span>
              <span className="font-medium">30 jours</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border-glass)]">
              <span className="text-[var(--text-secondary)]">Coût</span>
              <span className="font-semibold text-gradient">{formatFc(23000)} FC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Solde wallet</span>
              <span className={`font-medium ${insufficient ? "text-[var(--status-expired)]" : ""}`}>
                {formatFc(balance)} FC
              </span>
            </div>
          </div>

          {insufficient && (
            <p className="text-sm text-[var(--status-expired)]">
              Solde insuffisant. Il vous manque {formatFc(23000 - balance)} FC. Rechargez votre
              wallet avant de créer un routeur.
            </p>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn btn-ghost">
              Retour
            </button>
            <button onClick={confirm} className="btn btn-primary" disabled={creating || insufficient}>
              {creating && <span className="spinner" />}
              {creating ? "Création..." : "Confirmer et payer"}
            </button>
          </div>
        </div>
      )}

      {/* Étape 4 : script */}
      {step === 3 && result && (
        <div className="glass card-futuristic rounded-2xl p-8 space-y-6 fade-in-up">
          <div>
            <h2 className="text-lg font-semibold mb-2">Routeur créé avec succès</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-6">
              Collez le script ci-dessous dans le Terminal de votre MikroTik (Winbox ou
              WebFig). Le VPN se connectera automatiquement.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--bg-elevated)] p-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">URL Mikhmon</span>
                <span className="mono text-xs">https://{result.router.name}.itsolutions.tld</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Mot de passe admin Mikhmon</span>
                <span className="mono text-xs">{result.mikhmonAdminPassword}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="field-label">Script MikroTik</p>
                <CopyButton value={result.script} />
              </div>
              <pre className="rounded-xl bg-[var(--bg-elevated)] p-5 text-xs leading-6 mono overflow-x-auto max-h-72 overflow-y-auto border border-[var(--border-glass)]">
                {result.script}
              </pre>
            </div>
          </div>

          <p className="text-xs text-[var(--status-pending)] bg-[var(--status-pending-bg)] rounded-lg p-3">
            Important : changez le mot de passe admin Mikhmon immédiatement après la première
            connexion.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/dashboard/routers/${result.router.id}`)}
              className="btn btn-primary flex-1"
            >
              Voir les détails du routeur
            </button>
            <button onClick={() => router.push("/dashboard")} className="btn btn-ghost">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
