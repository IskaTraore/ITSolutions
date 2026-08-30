/**
 * Démarrage automatique de la base de données ITSOLUTIONS.
 *
 * Docker Desktop a tendance à s'arrêter sur certaines machines Windows.
 * Ce script :
 *  1. vérifie si Docker est actif, sinon tente de démarrer Docker Desktop ;
 *  2. démarre le conteneur PostgreSQL (docker compose) ;
 *  3. attend que la base accepte les connexions.
 *
 * Exécution : npm run db:start
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const COMPOSE_FILE = path.join(PROJECT_ROOT, "docker-compose.yml");

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function run(cmd, { silent = false } = {}) {
  try {
    return execSync(cmd, {
      stdio: silent ? "pipe" : "inherit",
      encoding: "utf8",
      timeout: 60000,
      shell: process.env.SHELL || undefined,
    });
  } catch (err) {
    if (!silent) console.error(err.stderr || err.message);
    return null;
  }
}

function dockerReady() {
  const out = run("docker info > /dev/null 2>&1", { silent: true });
  return out !== null;
}

async function waitForDocker(attempts = 24) {
  for (let i = 1; i <= attempts; i++) {
    if (dockerReady()) return true;
    console.log(`En attente du moteur Docker (${i}/${attempts})...`);
    await sleep(5000);
  }
  return dockerReady();
}

function startDockerDesktop() {
  const candidates = [
    "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe",
  ];
  for (const exe of candidates) {
    if (fs.existsSync(exe)) {
      console.log("Démarrage de Docker Desktop...");
      spawn("cmd", ["/c", "start", "", exe], { detached: true, stdio: "ignore" }).unref();
      return true;
    }
  }
  return false;
}

async function main() {
  console.log("=== Démarrage de la base de données ITSOLUTIONS ===\n");

  if (!fs.existsSync(COMPOSE_FILE)) {
    console.error(`docker-compose.yml introuvable : ${COMPOSE_FILE}`);
    process.exit(1);
  }

  // 1. Docker
  if (!dockerReady()) {
    console.log("Docker Desktop n'est pas actif.");
    if (!startDockerDesktop()) {
      console.error("Impossible de localiser Docker Desktop. Démarrez-le manuellement.");
      process.exit(1);
    }
    if (!waitForDocker()) {
      console.error("Docker ne répond toujours pas après plusieurs tentatives.");
      console.error("Démarrez Docker Desktop manuellement, puis relancez : npm run db:start");
      process.exit(1);
    }
    console.log("Moteur Docker prêt.");
  } else {
    console.log("Moteur Docker déjà actif.");
  }

  // 2. Conteneur PostgreSQL (ignorer le code de retour : compose peut sortir
  //    non-zéro même quand le conteneur démarre, selon l'état Docker Desktop)
  run(`docker compose -f "${COMPOSE_FILE}" up -d db`);

  // 3. Attente de la disponibilité de la base
  for (let i = 1; i <= 12; i++) {
    const ready = run("docker exec itsolutions-db pg_isready -U itsolutions", {
      silent: true,
    });
    if (ready !== null) {
      console.log("\nBase de données prête sur localhost:5433");
      return;
    }
    console.log(`Attente de la base (${i}/12)...`);
    await sleep(5000);
  }

  console.error("\nLa base ne répond pas après 60 secondes.");
  console.error(`Vérifiez : docker compose -f "${COMPOSE_FILE}" ps`);
  process.exit(1);
}

main();
