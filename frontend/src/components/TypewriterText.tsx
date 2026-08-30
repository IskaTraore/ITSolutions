"use client";

import { useEffect, useState } from "react";

const TEXT = "ITSOLUTIONS";
const TYPE_MS = 180;
const HOLD_MS = 2000;

interface TypewriterTextProps {
  className?: string;
}

/**
 * Nom de la plateforme en effet « machine à écrire » : les lettres apparaissent
 * une à une, puis le cycle recommence une fois le nom complet affiché.
 */
export function TypewriterText({ className = "" }: TypewriterTextProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Le nom est complet : on le laisse affiché un instant, puis on repart de zéro.
    if (count >= TEXT.length) {
      const timeout = setTimeout(() => setCount(0), HOLD_MS);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => setCount((c) => c + 1), TYPE_MS);
    return () => clearTimeout(timeout);
  }, [count]);

  return (
    <span className={className} aria-label={TEXT} role="text">
      {TEXT.slice(0, count)}
      <span className="typewriter-caret" aria-hidden="true" />
    </span>
  );
}
