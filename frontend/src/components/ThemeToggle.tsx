"use client";

import { useEffect, useSyncExternalStore } from "react";
import { IconSun, IconMoon } from "./Icons";

const THEME_KEY = "its_theme";
const THEME_CHANGE_EVENT = "its-theme-change";

type Theme = "dark" | "light";

/** S'abonne au thème : synchronisation entre onglets (storage) et au sein de l'onglet. */
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function getSnapshot(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
}

/** Côté serveur, localStorage n'existe pas : le thème par défaut est le sombre. */
function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Application du thème au document (mutation DOM — pas de setState ici).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    // L'événement storage natif ne se déclenche que dans les autres onglets :
    // on le redéclenche localement pour mettre à jour cet onglet immédiatement.
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center text-[var(--text-primary)] transition-all transform hover:scale-105 active:scale-95"
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Changer le thème"
    >
      {theme === "dark" ? (
        <IconSun className="w-5 h-5 text-amber-400 animate-spin-slow" />
      ) : (
        <IconMoon className="w-5 h-5 text-indigo-500" />
      )}
    </button>
  );
}
