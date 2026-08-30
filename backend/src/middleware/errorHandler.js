const { ApiError } = require("../lib/errors");

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route introuvable" },
  });
}

function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Erreur de contrainte unique Prisma (P2002)
  if (err?.code === "P2002") {
    const target = err.meta?.target || [];
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: `Une valeur unique est déjà prise (${target.join(", ")})`,
      },
    });
  }

  // Erreur Prisma de ressource absente (P2025)
  if (err?.code === "P2025") {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Ressource introuvable" },
    });
  }

  if (err?.name === "ZodError") {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Données invalides",
        details: err.issues,
      },
    });
  }

  // Erreur multer (upload)
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Fichier trop volumineux (5 Mo maximum)"
        : "Erreur lors du téléversement du fichier";
    return res.status(400).json({
      error: { code: "UPLOAD_ERROR", message },
    });
  }

  console.error("[ERROR]", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erreur interne du serveur" },
  });
}

module.exports = { notFoundHandler, errorHandler };
