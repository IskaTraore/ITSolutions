const { prisma } = require("../lib/prisma");
const { env } = require("../config/env");

const net = require("net");
const tls = require("tls");

/**
 * Envoie un email via SMTP en production ou affiche en console en développement.
 */
async function sendEmail({ to, subject, text }) {
  const { host, port, user, pass, from } = env.smtp;

  if (!host || !user || !pass) {
    if (env.nodeEnv === "production") {
      throw new Error("Configuration SMTP manquante en production : SMTP_HOST, SMTP_USER, SMTP_PASS sont requis");
    }
    console.log(`[EMAIL dev] to=${to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  body: ${text.split("\n").slice(0, 8).join("\n")}`);
    return true;
  }

  return new Promise((resolve, reject) => {
    let socket;
    const isDirectTls = port === 465;

    try {
      if (isDirectTls) {
        socket = tls.connect({ host, port, rejectUnauthorized: env.nodeEnv === "production" });
      } else {
        socket = net.connect({ host, port });
      }
    } catch (err) {
      return reject(err);
    }

    socket.setTimeout(15000);
    let step = 0;
    let buffer = "";

    const fromAddress = from.includes("<") ? from.match(/<([^>]+)>/)?.[1] || from : from;

    function send(line) {
      socket.write(line + "\r\n");
    }

    function onData(data) {
      buffer += data.toString();
      const lines = buffer.split("\r\n");
      const last = lines[lines.length - 2];
      if (!last || !/^\d{3}\s/.test(last)) return;
      const code = parseInt(last.slice(0, 3), 10);
      buffer = "";

      if (code >= 400) {
        socket.destroy();
        return reject(new Error(`Erreur SMTP (${code}): ${last}`));
      }

      if (step === 0 && code === 220) {
        step = 1;
        send(`EHLO ${host}`);
      } else if (step === 1 && code === 250) {
        step = 3;
        send("AUTH LOGIN");
      } else if (step === 3 && code === 334) {
        step = 4;
        send(Buffer.from(user).toString("base64"));
      } else if (step === 4 && code === 334) {
        step = 5;
        send(Buffer.from(pass).toString("base64"));
      } else if (step === 5 && code === 235) {
        step = 6;
        send(`MAIL FROM:<${fromAddress}>`);
      } else if (step === 6 && code === 250) {
        step = 7;
        send(`RCPT TO:<${to}>`);
      } else if (step === 7 && code === 250) {
        step = 8;
        send("DATA");
      } else if (step === 8 && code === 354) {
        step = 9;
        const emailContent = [
          `From: ${from}`,
          `To: ${to}`,
          `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
          `MIME-Version: 1.0`,
          `Content-Type: text/plain; charset=UTF-8`,
          `Content-Transfer-Encoding: 8bit`,
          `Date: ${new Date().toUTCString()}`,
          "",
          text,
          ".",
        ].join("\r\n");
        send(emailContent);
      } else if (step === 9 && code === 250) {
        step = 10;
        send("QUIT");
        resolve(true);
      }
    }

    socket.on("data", onData);

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout SMTP dépassé (15s)"));
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
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
