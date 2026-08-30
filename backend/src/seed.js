require("dotenv").config();
const { prisma } = require("./lib/prisma");
const { hashPassword } = require("./lib/security");

async function main() {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.error("CRITICAL ERROR: En production, ADMIN_EMAIL et ADMIN_PASSWORD doivent obligatoirement être définis.");
      process.exit(1);
    }
    if (process.env.ADMIN_PASSWORD === "admin12345") {
      console.error("CRITICAL ERROR: Le mot de passe par défaut 'admin12345' est interdit en production.");
      process.exit(1);
    }
  }

  const email = process.env.ADMIN_EMAIL || "admin@itsolutions.tld";
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin12345";

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  if (existing) {
    console.log("L'administrateur existe déjà.");
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username,
      passwordHash: await hashPassword(password),
      emailVerified: true,
      status: "ACTIVE",
      role: "ADMIN",
      wallet: { create: {} },
    },
  });

  console.log(`Administrateur créé : ${email} / ${password}`);
  console.log("IMPORTANT : changez ce mot de passe après la première connexion.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
