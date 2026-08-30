class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const Errors = {
  authRequired: (msg = "Authentification requise") =>
    new ApiError(401, "AUTH_REQUIRED", msg),
  authInvalid: (msg = "Identifiants invalides") =>
    new ApiError(401, "AUTH_INVALID", msg),
  forbidden: (msg = "Accès refusé") => new ApiError(403, "FORBIDDEN", msg),
  notFound: (msg = "Ressource introuvable") =>
    new ApiError(404, "NOT_FOUND", msg),
  walletInsufficient: (missing) =>
    new ApiError(409, "WALLET_INSUFFICIENT_BALANCE", "Solde insuffisant", {
      missingAmount: missing,
    }),
  routerNameTaken: () =>
    new ApiError(409, "ROUTER_NAME_TAKEN", "Ce nom de routeur est déjà utilisé"),
  idempotencyConflict: () =>
    new ApiError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "Clé d'idempotence déjà utilisée avec des données différentes"
    ),
  provisioningFailed: (details) =>
    new ApiError(500, "PROVISIONING_FAILED", "Échec du provisioning", details),
  portAllocationFailed: () =>
    new ApiError(
      503,
      "PORT_ALLOCATION_FAILED",
      "Aucun port disponible, veuillez réessayer plus tard"
    ),
  subscriptionActive: () =>
    new ApiError(
      409,
      "SUBSCRIPTION_ALREADY_ACTIVE",
      "Cet abonnement est déjà actif"
    ),
  validation: (details) =>
    new ApiError(422, "VALIDATION_ERROR", "Données invalides", details),
  userSuspended: () =>
    new ApiError(403, "USER_SUSPENDED", "Ce compte est suspendu"),
  emailNotVerified: () =>
    new ApiError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Veuillez vérifier votre adresse email avant de continuer"
    ),
  conflict: (code, msg) => new ApiError(409, code, msg),
};

module.exports = { ApiError, Errors };
