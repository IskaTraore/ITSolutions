"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { AmbientBackground } from "@/components/AmbientBackground";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre adresse email...");

  useEffect(() => {
    let cancelled = false;
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const invalid = () => {
      if (!cancelled) {
        setStatus("error");
        setMessage("Lien de vérification invalide ou incomplet.");
      }
    };

    const verify = () =>
      api("/auth/verify-email", {
        method: "POST",
        body: { token, email },
      })
        .then(() => {
          if (!cancelled) {
            setStatus("success");
            setMessage("Votre adresse email est vérifiée. Vous pouvez vous connecter.");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setStatus("error");
            setMessage(
              err instanceof ApiError ? err.message : "La vérification a échoué. Réessayez."
            );
          }
        });

    Promise.resolve().then(() => {
      if (token && email) verify();
      else invalid();
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="glass-strong rounded-3xl p-10 w-full max-w-[420px] text-center fade-in-up">
      <h1 className="text-2xl font-semibold mb-3">
        {status === "success"
          ? "Email vérifié"
          : status === "error"
            ? "Vérification impossible"
            : "Vérification..."}
      </h1>
      <p className="text-sm text-[var(--text-secondary)] leading-6 mb-8">{message}</p>
      {status !== "loading" && (
        <Link href="/login" className="btn btn-primary btn-block">
          Aller à la connexion
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6">
      <AmbientBackground />
      <Suspense fallback={null}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
