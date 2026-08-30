const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { ApiError } = require("./errors");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/products");
const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

/** Extensions autorisées par type MIME. */
const ALLOWED_MIME = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

// S'assure que le dossier de destination existe.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype];
    const productId = req.params.id ? `${req.params.id}-` : "";
    cb(null, `${productId}${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) return cb(null, true);
    cb(
      new ApiError(
        400,
        "UPLOAD_INVALID_TYPE",
        "Type de fichier non autorisé : JPEG, PNG ou WEBP uniquement"
      )
    );
  },
});

/** Supprime une image téléversée (ignore les erreurs). */
function removeUploadedImage(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  // Résout le chemin et vérifie qu'il reste bien DANS le dossier uploads
  // (protection contre toute traversée de répertoire).
  const resolved = path.resolve(UPLOAD_ROOT, `.${imageUrl.slice("/uploads".length)}`);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) return;
  fs.unlink(resolved, () => {
    /* fichier absent ou erreur : on ignore */
  });
}

module.exports = { uploadImage, removeUploadedImage };
