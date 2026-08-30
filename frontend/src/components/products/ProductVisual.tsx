import type { ReactNode } from "react";
import type { ProductHue, ProductVisual as ProductVisualKind } from "@/lib/products";

interface ProductVisualProps {
  visual: ProductVisualKind;
  hue: ProductHue;
  className?: string;
}

/** Dégradés de fond par teinte (s'adapte aux deux thèmes). */
const HUES: Record<ProductHue, { from: string; to: string }> = {
  indigo: { from: "#5B7CFA", to: "#8B5CF6" },
  violet: { from: "#A78BFA", to: "#7C3AED" },
  teal: { from: "#2DD4BF", to: "#0D9488" },
  sky: { from: "#38BDF8", to: "#2563EB" },
  emerald: { from: "#34D399", to: "#059669" },
  amber: { from: "#FBBF24", to: "#D97706" },
  rose: { from: "#FB7185", to: "#E11D48" },
  cyan: { from: "#22D3EE", to: "#0E7490" },
};

/** Illustrations vectorielles stylisées des équipements (120 × 160). */
const DEVICE_ART: Record<ProductVisualKind, ReactNode> = {
  /* Boîtier routeur câblé (hEX) */
  hex: (
    <g>
      <rect x="55" y="58" width="130" height="48" rx="10" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <rect x="55" y="58" width="130" height="16" rx="10" fill="rgba(255,255,255,0.10)" />
      <circle cx="72" cy="70" r="2.5" fill="#3DD68C" />
      <circle cx="82" cy="70" r="2.5" fill="#F5B04D" />
      <circle cx="92" cy="70" r="2.5" fill="#5B7CFA" />
      <g fill="rgba(255,255,255,0.65)">
        <rect x="72" y="84" width="10" height="9" rx="2" />
        <rect x="88" y="84" width="10" height="9" rx="2" />
        <rect x="104" y="84" width="10" height="9" rx="2" />
        <rect x="120" y="84" width="10" height="9" rx="2" />
        <rect x="136" y="84" width="10" height="9" rx="2" />
        <rect x="152" y="84" width="10" height="9" rx="2" />
      </g>
    </g>
  ),
  /* Routeur tour double antennes (hAP ac²) */
  "hap-ac2": (
    <g>
      <rect x="88" y="116" width="64" height="10" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <rect x="102" y="52" width="36" height="66" rx="9" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x="102" y="52" width="36" height="16" rx="9" fill="rgba(255,255,255,0.12)" />
      <circle cx="120" cy="86" r="3" fill="#3DD68C" />
      <circle cx="120" cy="96" r="3" fill="rgba(255,255,255,0.5)" />
      <line x1="110" y1="52" x2="94" y2="26" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />
      <line x1="130" y1="52" x2="146" y2="26" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="94" cy="26" r="4.5" fill="rgba(255,255,255,0.85)" />
      <circle cx="146" cy="26" r="4.5" fill="rgba(255,255,255,0.85)" />
    </g>
  ),
  /* Petit routeur une antenne (hAP lite) */
  haplite: (
    <g>
      <rect x="66" y="66" width="104" height="40" rx="11" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x="66" y="66" width="104" height="14" rx="11" fill="rgba(255,255,255,0.10)" />
      <line x1="170" y1="66" x2="184" y2="40" stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="184" cy="40" r="4" fill="rgba(255,255,255,0.85)" />
      <circle cx="78" cy="86" r="2.5" fill="#3DD68C" />
      <circle cx="88" cy="86" r="2.5" fill="#5B7CFA" />
      <rect x="150" y="88" width="12" height="8" rx="2" fill="rgba(255,255,255,0.6)" />
    </g>
  ),
  /* CPE cylindrique à parabole (SXT) */
  sxt: (
    <g>
      <rect x="108" y="66" width="24" height="52" rx="6" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x="116" y="118" width="8" height="14" rx="2" fill="rgba(255,255,255,0.35)" />
      <line x1="108" y1="80" x2="132" y2="80" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <line x1="108" y1="104" x2="132" y2="104" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <circle cx="120" cy="52" r="27" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <circle cx="120" cy="52" r="17" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <path d="M136 42 a 21 21 0 0 1 0 20" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  /* Antenne secteur (mANTBox) */
  mantbox: (
    <g>
      <rect x="118" y="96" width="4" height="34" fill="rgba(255,255,255,0.4)" />
      <rect x="102" y="126" width="36" height="6" rx="3" fill="rgba(255,255,255,0.35)" />
      <rect x="92" y="40" width="56" height="78" rx="9" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      <line x1="102" y1="52" x2="102" y2="106" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="110" y1="48" x2="110" y2="110" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="118" y1="52" x2="118" y2="106" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="126" y1="48" x2="126" y2="110" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1="134" y1="52" x2="134" y2="106" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <rect x="116" y="118" width="8" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
    </g>
  ),
  /* Point d'accès outdoor rond (OmniTIK) */
  omnitik: (
    <g>
      <rect x="116" y="110" width="8" height="20" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="100" y="126" width="40" height="6" rx="3" fill="rgba(255,255,255,0.35)" />
      <circle cx="120" cy="72" r="40" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="120" cy="72" r="28" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <circle cx="120" cy="72" r="16" fill="rgba(255,255,255,0.2)" />
      <circle cx="120" cy="72" r="5" fill="rgba(255,255,255,0.85)" />
      <path d="M92 58 a 34 34 0 0 0 0 28" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M82 50 a 44 44 0 0 0 0 44" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  ),
  /* Switch rack 24 ports */
  switch: (
    <g>
      <rect x="36" y="56" width="168" height="48" rx="9" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x="36" y="56" width="168" height="14" rx="9" fill="rgba(255,255,255,0.10)" />
      <g fill="#3DD68C">
        <circle cx="50" cy="66" r="2.2" />
        <circle cx="60" cy="66" r="2.2" />
        <circle cx="70" cy="66" r="2.2" />
        <circle cx="80" cy="66" r="2.2" />
        <circle cx="90" cy="66" r="2.2" />
        <circle cx="100" cy="66" r="2.2" />
      </g>
      <g fill="rgba(255,255,255,0.6)">
        {Array.from({ length: 10 }).map((_, i) => (
          <rect key={i} x={50 + i * 12} y="84" width="8" height="9" rx="1.5" />
        ))}
      </g>
      <rect x="172" y="82" width="13" height="12" rx="2" fill="rgba(255,255,255,0.45)" />
      <rect x="188" y="82" width="13" height="12" rx="2" fill="rgba(255,255,255,0.45)" />
    </g>
  ),
  /* Kit injecteur PoE + câble */
  "poe-kit": (
    <g>
      <rect x="48" y="58" width="64" height="44" rx="10" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <rect x="48" y="58" width="64" height="14" rx="10" fill="rgba(255,255,255,0.10)" />
      <rect x="58" y="84" width="14" height="9" rx="2" fill="rgba(255,255,255,0.55)" />
      <rect x="88" y="84" width="14" height="9" rx="2" fill="rgba(255,255,255,0.55)" />
      <circle cx="62" cy="70" r="2.2" fill="#3DD68C" />
      <circle cx="72" cy="70" r="2.2" fill="#F5B04D" />
      <circle cx="160" cy="74" r="22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="5" />
      <path d="M142 68 q -10 -8 2 -14" stroke="rgba(255,255,255,0.5)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="140" y="46" width="18" height="12" rx="2" fill="rgba(255,255,255,0.6)" />
    </g>
  ),
};

export function ProductVisual({ visual, hue, className = "" }: ProductVisualProps) {
  const gradient = HUES[hue];
  return (
    <svg
      viewBox="0 0 240 160"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`pv-bg-${hue}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={gradient.from} />
          <stop offset="100%" stopColor={gradient.to} />
        </linearGradient>
        <radialGradient id={`pv-glow-${hue}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="240" height="160" fill={`url(#pv-bg-${hue})`} />
      <circle cx="120" cy="76" r="80" fill={`url(#pv-glow-${hue})`} />
      <circle cx="30" cy="22" r="46" fill="rgba(255,255,255,0.10)" />
      <circle cx="216" cy="138" r="52" fill="rgba(0,0,0,0.10)" />
      {DEVICE_ART[visual]}
    </svg>
  );
}
