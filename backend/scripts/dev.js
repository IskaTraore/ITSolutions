/**
 * Démarrage complet du backend en développement :
 *  1. lance la base de données (db:start, relance Docker si nécessaire) ;
 *  2. démarre le serveur avec rechargement automatique.
 *
 * Exécution : npm run dev:full
 */

const { spawn } = require("child_process");
const path = require("path");

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const dbCode = await runScript(path.join(__dirname, "db-start.js"));
  if (dbCode !== 0) {
    console.error("\nBase de données indisponible, arrêt du serveur.");
    process.exit(1);
  }

  console.log("\n=== Démarrage du serveur (rechargement automatique) ===");
  const server = spawn(
    process.execPath,
    ["--watch", "src/index.js"],
    { stdio: "inherit", cwd: path.resolve(__dirname, "..") }
  );
  server.on("exit", (code) => process.exit(code ?? 0));
}

main();
