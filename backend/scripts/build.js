/**
 * Build du backend ITSOLUTIONS.
 *
 * Le backend est un projet Node.js pur (CommonJS, sans bundler ni transpilation).
 * Ce script vérifie :
 *  - la validité syntaxique de tous les fichiers sources ;
 *  - que le client Prisma est généré et à jour ;
 *  - que toutes les dépendances sont installées.
 *
 * Exécution : npm run build
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const GENERATED_DIR = path.join(ROOT, "node_modules", "@prisma", "client");

function collectJsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(full);
    }
  }
  return results;
}

function checkSyntax() {
  const files = collectJsFiles(SRC_DIR);
  if (files.length === 0) {
    console.error("Aucun fichier source trouvé dans src/");
    process.exit(1);
  }
  for (const file of files) {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    console.log(`OK ${path.relative(ROOT, file)}`);
  }
  console.log(`\nSyntaxe validée : ${files.length} fichier(s)`);
}

function checkPrismaClient() {
  const clientFile = path.join(GENERATED_DIR, "index.js");
  if (!fs.existsSync(clientFile)) {
    console.log("Client Prisma absent, génération...");
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "generate"],
      { stdio: "inherit", cwd: ROOT }
    );
  } else {
    console.log("Client Prisma présent.");
  }
}

function checkDependencies() {
  try {
    require.resolve("express", { paths: [ROOT] });
    require.resolve("@prisma/client", { paths: [ROOT] });
  } catch {
    console.error("Dépendances manquantes. Exécutez : npm install");
    process.exit(1);
  }
  console.log("Dépendances installées.");
}

console.log("=== Build ITSOLUTIONS backend ===\n");

checkDependencies();
checkPrismaClient();
checkSyntax();

console.log("\n=== Build terminé avec succès ===");
