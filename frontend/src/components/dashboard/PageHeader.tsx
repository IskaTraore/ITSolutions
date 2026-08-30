import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}

/** En-tête de page dashboard : icône vitrée, titre avec point dégradé, badge, sous-titre et actions. */
export function PageHeader({ title, subtitle, icon, badge, actions }: PageHeaderProps) {
  return (
    <header className="animate-in flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        {icon && (
          <span className="w-12 h-12 rounded-2xl glass-strong border border-[var(--border-glass-strong)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 shadow-[var(--shadow-glow-primary)]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {title}
              <span className="text-gradient">.</span>
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0 animate-in--1">{actions}</div>}
    </header>
  );
}
