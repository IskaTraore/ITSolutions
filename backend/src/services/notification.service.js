const { prisma } = require("../lib/prisma");
const { env } = require("../config/env");

const nodemailer = require("nodemailer");

/**
 * Envoie un email via SMTP en production ou affiche en console en développement.
 */
async function sendEmail({ to, subject, text, html }) {
  const { host, port, user, pass, from } = env.smtp;

  if (!host || !user || !pass) {
    if (env.nodeEnv === "production") {
      throw new Error("Configuration SMTP manquante en production : SMTP_HOST, SMTP_USER, SMTP_PASS sont requis");
    }
    console.log(`[EMAIL dev] to=${to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  body: ${text ? text.split("\n").slice(0, 8).join("\n") : ""}`);
    return true;
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(port) || 587,
    secure: Number(port) === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: from || user,
    to,
    subject,
    text,
    html,
  });

  console.log(`[EMAIL envoyé] id=${info.messageId} to=${to}`);
  return true;
}

async function sendWhatsApp({ to, text }) {
  if (env.whatsappDisabled) {
    console.log(`[WHATSAPP désactivé] to=${to}`);
    return true;
  }
  console.log(`[WHATSAPP dev] to=${to} :: ${text}`);
  return true;
}

/**
 * Crée et envoie une notification persistée pour un utilisateur.
 * Channels: EMAIL | WHATSAPP
 */
async function notify(user, type, payload) {
  const channels = [payload.channel || "EMAIL"];

  for (const channel of channels) {
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        channel,
        type,
        payload,
        status: "PENDING",
      },
    });

    try {
      if (channel === "EMAIL") {
        await sendEmail({
          to: user.email,
          subject: payload.subject || "ITSOLUTIONS",
          text: payload.text || "",
        });
      } else if (channel === "WHATSAPP") {
        await sendWhatsApp({ to: user.phone || user.email, text: payload.text || "" });
      }
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } catch (err) {
      console.error(`Notification ${channel} échec pour ${user.id}:`, err.message);
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: "FAILED" },
      });
    }
  }
}

module.exports = { notify };
