/**
 * Service de génération PDF pour les vouchers Hotspot ITSOLUTIONS.
 *
 * Chaque voucher contient :
 * - Code (username) et mot de passe
 * - Nom du groupe et profil (durée, débit)
 * - QR code simplified (texte encodé en barcode-like)
 * - Instructions de connexion
 * - Branding ITSOLUTIONS
 */

const PDFDocument = require("pdfkit");
const crypto = require("crypto");

// ─── Constantes de mise en page ──────────────────────────────────────────────
const PAGE_MARGIN = 40;
const VOUCHER_WIDTH = 252; // ~89mm (taille carte de visite)
const VOUCHER_HEIGHT = 150; // ~53mm
const VOUCHER_GAP = 12;
const COLS = 2;
const ROWS = 3;
const VOUCHERS_PER_PAGE = COLS * ROWS;

// ─── Palette ITSOLUTIONS ─────────────────────────────────────────────────────
const COLORS = {
  primary: "#1a73e8",
  primaryDark: "#0d47a1",
  secondary: "#34a853",
  bg: "#f8f9fa",
  border: "#dadce0",
  text: "#202124",
  textLight: "#5f6368",
  codeBg: "#e8f0fe",
  success: "#0d652d",
};

/**
 * Génère un PDF contenant un batch de vouchers.
 *
 * @param {Object} options
 * @param {Array} options.vouchers - Liste des vouchers (avec plainPassword)
 * @param {Object} options.group - Groupe Hotspot
 * @param {Object} options.profile - Profil Hotspot
 * @param {string} [options.brandName] - Nom de la marque (défaut: ITSOLUTIONS)
 * @returns {Promise<Buffer>} Buffer du PDF
 */
async function generateVoucherPDF({
  vouchers,
  group,
  profile,
  brandName = "ITSOLUTIONS",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: `Vouchers Hotspot - ${group.name}`,
        Author: brandName,
        Subject: `Batch de ${vouchers.length} vouchers - Profil ${profile.name}`,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ─── En-tête global ────────────────────────────────────────────────────
    drawPageHeader(doc, brandName, group, profile, vouchers.length);

    // ─── Vouchers ──────────────────────────────────────────────────────────
    let voucherIndex = 0;

    for (let i = 0; i < vouchers.length; i++) {
      const col = voucherIndex % COLS;
      const row = Math.floor(voucherIndex / COLS) % ROWS;

      // Nouvelle page si nécessaire
      if (voucherIndex > 0 && voucherIndex % VOUCHERS_PER_PAGE === 0) {
        doc.addPage();
        drawPageHeader(doc, brandName, group, profile, vouchers.length);
      }

      const x = PAGE_MARGIN + col * (VOUCHER_WIDTH + VOUCHER_GAP);
      const y =
        PAGE_MARGIN + 70 + row * (VOUCHER_HEIGHT + VOUCHER_GAP);

      drawVoucher(doc, vouchers[i], x, y, VOUCHER_WIDTH, VOUCHER_HEIGHT, brandName);
      voucherIndex++;
    }

    // ─── Pied de page ──────────────────────────────────────────────────────
    drawPageFooter(doc, brandName);

    doc.end();
  });
}

/**
 * En-tête de page avec branding.
 */
function drawPageHeader(doc, brandName, group, profile, totalCount) {
  const startY = PAGE_MARGIN;

  // Bandeau coloré
  doc
    .rect(0, 0, doc.page.width, 50)
    .fill(COLORS.primary);

  // Logo texte
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#ffffff")
    .text(brandName, PAGE_MARGIN, 15, { align: "left" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("rgba(255,255,255,0.8)")
    .text("Vouchers Hotspot", PAGE_MARGIN + 180, 22, { align: "left" });

  // Infos du batch
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.text)
    .text(`Groupe : ${group.name}`, PAGE_MARGIN, startY + 58);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.textLight)
    .text(
      `Profil : ${profile.name} | Durée : ${formatDuration(profile.durationMinutes)} | ` +
        `Débit : ${profile.downloadRate ? profile.downloadRate + " kbps" : "Illimité"} | ` +
        `${totalCount} voucher(s)`,
      PAGE_MARGIN,
      startY + 74
    );

  // Ligne séparatrice
  doc
    .moveTo(PAGE_MARGIN, startY + 92)
    .lineTo(doc.page.width - PAGE_MARGIN, startY + 92)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();
}

/**
 * Dessine un voucher individuel.
 */
function drawVoucher(doc, voucher, x, y, width, height, brandName) {
  // Ombre légère
  doc
    .roundedRect(x + 2, y + 2, width, height, 6)
    .fill("rgba(0,0,0,0.05)");

  // Carte blanche avec bordure
  doc
    .roundedRect(x, y, width, height, 6)
    .fillAndStroke("#ffffff", COLORS.border)
    .lineWidth(0.5);

  // Bandeau coloré en haut
  doc
    .roundedRect(x, y, width, 28, 6)
    .fill(COLORS.primary);

  // Couvrir le bas du bandeau pour un coins arrondis uniquement en haut
  doc.rect(x, y + 14, width, 14).fill(COLORS.primary);

  // Titre du voucher
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(brandName + " HOTSPOT", x + 8, y + 8, { width: width - 16 });

  // Code (username) — grand et visible
  doc
    .font("Courier-Bold")
    .fontSize(16)
    .fillColor(COLORS.text)
    .text(voucher.code, x + 10, y + 34, { width: width - 20 });

  // Mot de passe
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.textLight)
    .text("Mot de passe :", x + 10, y + 56);

  doc
    .font("Courier-Bold")
    .fontSize(12)
    .fillColor(COLORS.primaryDark)
    .text(voucher.plainPassword, x + 10, y + 68, { width: width - 20 });

  // Ligne séparatrice
  doc
    .moveTo(x + 10, y + 86)
    .lineTo(x + width - 10, y + 86)
    .strokeColor(COLORS.border)
    .lineWidth(0.3)
    .stroke();

  // Instructions
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.textLight)
    .text("1. Connectez-vous au WiFi Hotspot", x + 10, y + 92, { width: width - 20 })
    .text("2. Ouvrez votre navigateur", x + 10, y + 102, { width: width - 20 })
    .text("3. Entrez vos identifiants ci-dessus", x + 10, y + 112, { width: width - 20 });

  // Filigrane code-barres stylisé (simulé avec texte)
  const barcode = generateBarcodeText(voucher.code);
  doc
    .font("Courier")
    .fontSize(6)
    .fillColor(COLORS.textLight)
    .text(barcode, x + 10, y + 130, { width: width - 20, align: "center" });
}

/**
 * Pied de page.
 */
function drawPageFooter(doc, brandName) {
  const y = doc.page.height - 30;

  doc
    .moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.textLight)
    .text(
      `${brandName} — Voucher généré le ${new Date().toLocaleDateString("fr-FR")} — Conservez ce ticket`,
      PAGE_MARGIN,
      y + 5,
      { align: "center", width: doc.page.width - 2 * PAGE_MARGIN }
    );

  doc
    .font("Helvetica")
    .fontSize(6)
    .fillColor(COLORS.textLight)
    .text(
      "En cas de problème contactez l'administrateur",
      PAGE_MARGIN,
      y + 16,
      { align: "center", width: doc.page.width - 2 * PAGE_MARGIN }
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

/**
 * Génère une représentation "barcode" simplifiée à partir du code voucher.
 * Utilise le hash SHA-256 pour créer un motif binaire unique.
 */
function generateBarcodeText(code) {
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  let barcode = "";
  for (let i = 0; i < 40; i++) {
    const byte = parseInt(hash[i % hash.length], 16);
    barcode += byte % 2 === 0 ? "█" : " ";
  }
  return barcode;
}

/**
 * Génère un PDF de résumé pour un batch de vouchers (1 page, tableau).
 */
async function generateVoucherSummaryPDF({
  vouchers,
  group,
  profile,
  brandName = "ITSOLUTIONS",
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: {
        Title: `Résumé Batch Vouchers - ${group.name}`,
        Author: brandName,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // En-tête
    doc
      .rect(0, 0, doc.page.width, 50)
      .fill(COLORS.primary);

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor("#ffffff")
      .text(brandName, PAGE_MARGIN, 15);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("rgba(255,255,255,0.8)")
      .text("Résumé du batch de vouchers", PAGE_MARGIN + 150, 20);

    // Infos
    let y = 65;
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.text);
    doc.text(`Groupe : ${group.name}`, PAGE_MARGIN, y);
    y += 16;
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.textLight);
    doc.text(
      `Profil : ${profile.name} | Durée : ${formatDuration(profile.durationMinutes)} | ` +
        `Prix : ${profile.price} FC | Vouchers : ${vouchers.length}`,
      PAGE_MARGIN,
      y
    );
    y += 24;

    // Tableau
    const colWidths = [30, 120, 120, 80, 80];
    const headers = ["#", "Code", "Mot de passe", "Profil", "Statut"];

    // En-tête du tableau
    doc.rect(PAGE_MARGIN, y, doc.page.width - 2 * PAGE_MARGIN, 20).fill(COLORS.codeBg);
    let colX = PAGE_MARGIN + 5;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.text);
    headers.forEach((header, i) => {
      doc.text(header, colX, y + 5, { width: colWidths[i] });
      colX += colWidths[i];
    });
    y += 20;

    // Lignes
    vouchers.forEach((v, i) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = PAGE_MARGIN;
      }

      if (i % 2 === 0) {
        doc.rect(PAGE_MARGIN, y, doc.page.width - 2 * PAGE_MARGIN, 16).fill("#f8f9fa");
      }

      colX = PAGE_MARGIN + 5;
      doc.font("Courier").fontSize(7).fillColor(COLORS.text);
      const rowData = [String(i + 1), v.code, v.plainPassword, profile.name, "UNUSED"];
      rowData.forEach((cell, j) => {
        doc.text(cell, colX, y + 3, { width: colWidths[j] });
        colX += colWidths[j];
      });
      y += 16;
    });

    // Pied de page
    y = doc.page.height - 40;
    doc
      .moveTo(PAGE_MARGIN, y)
      .lineTo(doc.page.width - PAGE_MARGIN, y)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.textLight)
      .text(
        `${brandName} — Résumé généré le ${new Date().toLocaleDateString("fr-FR")} — ${vouchers.length} voucher(s)`,
        PAGE_MARGIN,
        y + 8,
        { align: "center", width: doc.page.width - 2 * PAGE_MARGIN }
      );

    doc.end();
  });
}

module.exports = {
  generateVoucherPDF,
  generateVoucherSummaryPDF,
  formatDuration,
};
