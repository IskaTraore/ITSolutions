const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./lib/prisma");
const { startJobs } = require("./jobs/renewal.job");

async function main() {
  try {
    await prisma.$connect();
    console.log("Connexion PostgreSQL établie");

    app.listen(env.port, () => {
      console.log(`ITSOLUTIONS API en écoute sur http://localhost:${env.port}`);
      startJobs();
    });
  } catch (err) {
    console.error("Impossible de démarrer le serveur:", err.message);
    if (err.message && err.message.includes("reach database")) {
      console.error("");
      console.error("La base de données PostgreSQL n'est pas accessible.");
      console.error("Démarrez-la avec :  npm run db:start");
      console.error("Puis relancez :        npm run dev");
    }
    process.exit(1);
  }
}

main();
