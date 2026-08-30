"use client";

import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { AmbientBackground } from "@/components/AmbientBackground";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/Toaster";

export default function RegisterPage() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast("error", "Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const result = await api<{ verificationToken?: string }>("/auth/register", {
        method: "POST",
        body: { username, email, password },
      });
      setRegistered(true);
      // En développement, le token de vérification est retourné pour les tests
      if (result.verificationToken) setVerificationToken(result.verificationToken);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Erreur lors de l'inscription";
      toast("error", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!verificationToken) return;
    try {
      await api("/auth/verify-email", {
        method: "POST",
        body: { token: verificationToken, email },
      });
      toast("success", "Email vérifié. Vous pouvez vous connecter.");
      setRegistered(false);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Vérification impossible");
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <AmbientBackground />
      <div className="glass-strong rounded-3xl p-10 w-full max-w-[420px] fade-in-up">
        <div className="flex items-center gap-2 mb-8">
          <Logo size={32} />
        </div>

        {registered ? (
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-3">Vérifiez votre email</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-6 mb-8">
              Un lien de confirmation a été envoyé à <strong>{email}</strong>.
              Cliquez sur ce lien pour activer votre compte, puis connectez-vous.
            </p>
            {verificationToken && (
              <button onClick={handleVerify} className="btn btn-secondary btn-block">
                Simuler la vérification (développement)
              </button>
            )}
            <Link href="/login" className="btn btn-ghost btn-block mt-3">
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold mb-2">Créer un compte</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Commencez à gérer vos routeurs MikroTik.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="field">
                <label className="field-label" htmlFor="username">
                  Nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  className="field-input"
                  placeholder="mikhmon1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  autoComplete="username"
                />
              </div>
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
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="confirm">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  className="field-input"
                  placeholder="Répétez votre mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading && <span className="spinner" />}
                {loading ? "Création..." : "Créer mon compte"}
              </button>
            </form>
            <p className="mt-8 text-sm text-[var(--text-secondary)] text-center">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-[var(--accent-primary)] hover:underline">
                Se connecter
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
