"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/Toaster";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ requires2FA?: boolean; tempToken?: string; message?: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (res?.requires2FA && res.tempToken) {
        setRequires2FA(true);
        setTempToken(res.tempToken);
        toast("info", res.message || "Veuillez saisir votre code d'authentification 2FA");
        return;
      }

      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erreur lors de la connexion";
      toast("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function handle2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api("/2fa/login", {
        method: "POST",
        body: {
          tempToken,
          code: twoFaCode.trim(),
          isBackupCode,
        },
      });

      toast("success", "Authentification réussie");
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Code de vérification invalide";
      toast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <AmbientBackground />
      <div className="glass-strong rounded-3xl p-10 w-full max-w-[420px] fade-in-up">
        <div className="flex items-center gap-2 mb-8">
          <Logo size={32} />
        </div>

        {!requires2FA ? (
          <>
            <h1 className="text-2xl font-semibold mb-2">Connexion</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Accédez à votre tableau de bord.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="field">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="field-input"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="password">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  className="field-input"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <p className="mt-8 text-sm text-[var(--text-secondary)] text-center">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-[var(--accent-primary)] hover:underline">
                Créer un compte
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">Vérification 2FA</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              {isBackupCode
                ? "Saisissez l'un de vos codes de secours (format XXXX-XXXX)."
                : "Saisissez le code à 6 chiffres de votre application d'authentification."}
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="field">
                <label className="field-label" htmlFor="twoFaCode">
                  {isBackupCode ? "Code de secours" : "Code TOTP (6 chiffres)"}
                </label>
                <input
                  id="twoFaCode"
                  type="text"
                  className="field-input text-center text-lg tracking-widest font-mono"
                  placeholder={isBackupCode ? "ABCD-EFGH" : "123456"}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  required
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading || !twoFaCode.trim()}>
                {loading && <span className="spinner" />}
                {loading ? "Vérification..." : "Valider"}
              </button>

              <div className="flex flex-col gap-2 pt-2 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupCode(!isBackupCode);
                    setTwoFaCode("");
                  }}
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  {isBackupCode
                    ? "Utiliser le code de l'application TOTP"
                    : "Utiliser un code de récupération"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTempToken("");
                    setTwoFaCode("");
                  }}
                  className="text-[var(--text-secondary)] hover:underline"
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
