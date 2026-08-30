import { useId } from "react";

interface LogoProps {
  /** Taille du carré de la marque en pixels (le SVG est vectoriel). */
  size?: number;
  /** Affiche le logotype « ITSOLUTIONS » à côté de la marque. */
  withWordmark?: boolean;
  /** Classes supplémentaires sur le conteneur. */
  className?: string;
}

/**
 * Marque ITSOLUTIONS : tuile dégradée vitrée, lettre « I » stylisée et
 * ondes WiFi — l'univers hotspot/Mikhmon au cœur du produit.
 *
 * Les IDs de dégradés sont uniques par instance (useId) : plusieurs logos
 * sur une même page (ex. dashboard : header mobile caché + sidebar) ne
 * doivent pas partager les mêmes références url(#...), sinon le navigateur
 * peut résoudre le dégradé vers un SVG non rendu (display:none) et afficher
 * une tuile noire/déformée.
 */
export function Logo({ size = 32, withWordmark = true, className = "" }: LogoProps) {
  const uid = useId();
  const bgId = `its-logo-bg-${uid}`;
  const sheenId = `its-logo-sheen-${uid}`;
  const markId = `its-logo-mark-${uid}`;

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      role="img"
      aria-label="ITSOLUTIONS"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        style={{ filter: "drop-shadow(0 6px 16px rgba(91, 124, 250, 0.35))" }}
      >
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5B7CFA" />
            <stop offset="100%" stopColor="#B084F5" />
          </linearGradient>
          <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={markId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E4EAFF" />
          </linearGradient>
        </defs>

        {/* Tuile dégradée */}
        <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill={`url(#${bgId})`} />
        {/* Reflet vitré supérieur */}
        <rect x="1.5" y="1.5" width="45" height="22" rx="13" fill={`url(#${sheenId})`} />
        {/* Liseré intérieur */}
        <rect
          x="1.5"
          y="1.5"
          width="45"
          height="45"
          rx="13"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.2"
        />

        {/* Lettre « I » */}
        <rect x="10.5" y="26.2" width="17.5" height="4" rx="2" fill={`url(#${markId})`} />
        <rect x="16.9" y="30.2" width="4.7" height="11.8" rx="2.35" fill={`url(#${markId})`} />

        {/* Ondes WiFi pulsantes (effet signal actif) */}
        <path
          d="M 25.6 18.6 A 7.4 7.4 0 0 0 40.4 18.6"
          className="logo-wifi-arc logo-wifi-arc--outer"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 28.1 18.6 A 4.9 4.9 0 0 0 37.9 18.6"
          className="logo-wifi-arc logo-wifi-arc--mid"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M 30.4 18.6 A 2.6 2.6 0 0 0 35.6 18.6"
          className="logo-wifi-arc logo-wifi-arc--inner"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle className="logo-wifi-dot" cx="33" cy="18.6" r="1.4" fill="#FFFFFF" />
      </svg>

      {withWordmark && (
        <span
          className="logo-wordmark font-bold tracking-[0.05em] text-[var(--text-primary)] whitespace-nowrap"
          style={{ fontSize: Math.round(size * 0.44) }}
        >
          ITSOLUTIONS<span className="text-gradient">.</span>
        </span>
      )}
    </span>
  );
}
