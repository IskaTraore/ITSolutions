const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  PENDING_PROVISIONING: "En attente",
  PROVISIONING: "Provisionnement",
  EXPIRED: "Expiré",
  SUSPENDED: "Suspendu",
  FAILED: "Échec",
  EXPIRING_SOON: "Expire bientôt",
  CONFIRMED: "Confirmé",
  PENDING: "En attente",
  CANCELLED: "Annulé",
};

const STATUS_VARIANT: Record<string, "active" | "pending" | "expired" | "info"> = {
  ACTIVE: "active",
  CONFIRMED: "active",
  PENDING_PROVISIONING: "pending",
  PROVISIONING: "pending",
  PENDING: "pending",
  EXPIRING_SOON: "pending",
  EXPIRED: "expired",
  SUSPENDED: "expired",
  FAILED: "expired",
  CANCELLED: "expired",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "info";
  return (
    <span className={`badge badge-${variant}`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
