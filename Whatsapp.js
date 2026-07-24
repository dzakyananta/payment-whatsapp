/** @format */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const pino = require("pino");

let sock = null;

async function initWhatsApp(onMessage, onImage) {
  const { state, saveCreds } = await useMultiFileAuthState("./wa-session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("📱 Scan QR berikut dengan WhatsApp:");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("⚠️ Koneksi terputus, reconnect:", shouldReconnect);
      if (shouldReconnect) initWhatsApp(onMessage, onImage);
    } else if (connection === "open") {
      console.log("✅ WhatsApp terhubung!");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const from = msg.key.remoteJid;

      // Cek apakah pesan berisi gambar
      const imageMsg =
        msg.message?.imageMessage ||
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.imageMessage;

      if (imageMsg && onImage) {
        console.log(`🖼️ Gambar diterima dari ${from}`);
        try {
          const buffer = await downloadMediaMessage(msg, "buffer", {});
          await onImage(from, buffer);
        } catch (err) {
          console.error("❌ Gagal download gambar:", err.message);
        }
        continue;
      }

      // Pesan teks biasa
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";
      if (!text) continue;

      console.log(`📩 Dari ${from}: ${text}`);
      await onMessage(from, text);
    }
  });
}

async function sendText(phone, message) {
  try {
    const chatId = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    await sock.sendMessage(chatId, { text: message });
    console.log("✅ Pesan teks terkirim ke:", chatId);
  } catch (err) {
    console.error("❌ Gagal kirim teks:", err.message);
  }
}

async function sendQRImage(phone, qrString, caption) {
  try {
    const chatId = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    const staticQRPath = path.join(__dirname, "qris-statis.jpeg");
    let imageBuffer;
    if (fs.existsSync(staticQRPath)) {
      imageBuffer = fs.readFileSync(staticQRPath);
      console.log("📤 Kirim gambar QRIS statis dari file lokal...");
    } else {
      imageBuffer = await QRCode.toBuffer(qrString, { width: 400, margin: 2 });
      console.log("📤 Generate QR dari qr_string...");
    }
    await sock.sendMessage(chatId, { image: imageBuffer, caption });
    console.log("✅ Gambar QRIS terkirim ke:", chatId);
  } catch (err) {
    console.error("❌ Gagal kirim gambar:", err.message);
    await sendText(phone, caption);
  }
}

module.exports = { initWhatsApp, sendText, sendQRImage };
