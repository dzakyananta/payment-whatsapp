/** @format */

require("dotenv").config();
const express = require("express");
const path = require("path");
const { initWhatsApp, sendText, sendQRImage } = require("./whatsapp");
const { analyzeBuktiPembayaran } = require("./gemini");
const { initSheets, saveTransaction } = require("./sheets");

const app = express();
app.use(express.json());
app.use(express.static("."));

const customerState = {};

// QR String QRIS Statis DANA xcode
const QRIS_STATIC_STRING =
  "00020101021126570013ID.CO.DANA.WWW011893600914ID1026538743844020152303UKE51440014ID.CO.QRIS.WWW0215ID1026538743844030400UKE5204481153033605802ID5905xcode6015SORONG SELATAN61059845463049B5A";

// ============================================================
// Handler gambar masuk — verifikasi bukti bayar via Gemini
// ============================================================
async function handleImage(from, imageBuffer) {
  const state = customerState[from];

  if (!state || state.step !== "waiting_payment") {
    await sendText(
      from,
      `📸 Gambar diterima, tapi Anda belum memiliki pesanan aktif.\n\nKetik *bayar* untuk memulai pembayaran. 🙏`,
    );
    return;
  }

  await sendText(
    from,
    `🔍 Sedang memverifikasi bukti pembayaran Anda...\nMohon tunggu sebentar ya 🙏`,
  );

  try {
    const result = await analyzeBuktiPembayaran(imageBuffer, state.amount);

    if (result.valid && result.match) {
      customerState[from] = { step: "idle" };

      // Simpan ke Google Sheets
      await saveTransaction({
        phone: from,
        amount: state.amount,
        status: "Berhasil",
        reason: result.reason,
        detectedAmount: result.amount,
      });

      await sendText(
        from,
        `🎉 *Pembayaran Terverifikasi!*\n\n` +
          `✅ Bukti pembayaran valid\n` +
          `💰 Nominal: *Rp ${result.amount.toLocaleString("id-ID")}*\n\n` +
          `Terima kasih! Pesanan Anda sudah dikonfirmasi. 🙏`,
      );
      console.log(
        `✅ Pembayaran terverifikasi untuk ${from}: Rp ${result.amount}`,
      );
    } else if (result.valid && !result.match) {
      // Simpan ke Sheets sebagai nominal tidak sesuai
      await saveTransaction({
        phone: from,
        amount: state.amount,
        status: "Nominal Tidak Sesuai",
        reason: result.reason,
        detectedAmount: result.amount,
      });

      await sendText(
        from,
        `⚠️ *Nominal Tidak Sesuai*\n\n` +
          `Bukti pembayaran valid, tapi nominal tidak sesuai.\n` +
          `💰 Nominal terdeteksi: *Rp ${result.amount.toLocaleString("id-ID")}*\n` +
          `💰 Nominal seharusnya: *Rp ${state.amount.toLocaleString("id-ID")}*\n\n` +
          `Mohon kirim ulang bukti dengan nominal yang benar. 🙏`,
      );
    } else {
      // Simpan ke Sheets sebagai gagal
      await saveTransaction({
        phone: from,
        amount: state.amount,
        status: "Bukti Tidak Valid",
        reason: result.reason,
        detectedAmount: result.amount,
      });

      await sendText(
        from,
        `❌ *Bukti Pembayaran Tidak Valid*\n\n` +
          `${result.reason}\n\n` +
          `Mohon kirim screenshot bukti pembayaran yang jelas dari aplikasi e-wallet atau m-banking Anda. 🙏`,
      );
    }
  } catch (err) {
    console.error("❌ Error verifikasi:", err.message);
    await sendText(
      from,
      `⚠️ Maaf, gagal memverifikasi bukti pembayaran.\nSilakan coba lagi. 🙏`,
    );
  }
}

// ============================================================
// Inisialisasi WhatsApp & Google Sheets
// ============================================================
initSheets().catch(console.error);

initWhatsApp(async (from, text) => {
  text = (text || "").toLowerCase().trim();
  const state = customerState[from] || { step: "idle" };

  try {
    if (state.step === "waiting_amount") {
      const amount = parseInt(text.replace(/\D/g, ""));

      if (!amount || amount < 1000) {
        await sendText(
          from,
          `⚠️ *Nominal tidak valid*\n\n` +
            `Mohon masukkan nominal yang benar.\n` +
            `Contoh: *50000* atau *100000*\n\n` +
            `Minimal pembayaran adalah *Rp 1.000* 🙏`,
        );
        return;
      }

      customerState[from] = { step: "waiting_payment", amount };

      await sendText(
        from,
        `⏳ Sedang menyiapkan QRIS...\nMohon tunggu sebentar ya 🙏`,
      );

      await sendQRImage(
        from,
        QRIS_STATIC_STRING,
        `📱 *QRIS Pembayaran - xcode*\n` +
          `💰 Nominal: *Rp ${amount.toLocaleString("id-ID")}*\n` +
          `🏦 Merchant: xcode\n` +
          `🆔 NMID: ID1026538743844\n\n` +
          `Scan QR ini dengan e-wallet atau m-banking Anda.\n` +
          `⚠️ Masukkan nominal *Rp ${amount.toLocaleString("id-ID")}* secara manual.\n\n` +
          `Setelah bayar, *kirim screenshot bukti pembayaran* ke sini untuk verifikasi otomatis. 📸🙏`,
      );
    } else if (
      text.includes("bayar") ||
      text.includes("qris") ||
      text.includes("order") ||
      text.includes("pesan")
    ) {
      customerState[from] = { step: "waiting_amount" };
      await sendText(
        from,
        `💳 *Pembayaran QRIS*\n\n` +
          `Silakan masukkan nominal yang ingin dibayar.\n\n` +
          `Contoh:\n` +
          `• *50000* untuk Rp 50.000\n` +
          `• *100000* untuk Rp 100.000\n\n` +
          `Berapa nominal pembayarannya? 😊`,
      );
    } else if (
      text.includes("halo") ||
      text.includes("hallo") ||
      text.includes("hai") ||
      text.includes("hi") ||
      text.includes("hello") ||
      text.includes("selamat") ||
      text.includes("assalamu")
    ) {
      customerState[from] = { step: "idle" };
      await sendText(
        from,
        `Halo! Selamat datang di layanan kami 👋\n\n` +
          `Terima kasih telah menghubungi kami.\n` +
          `Kami siap membantu Anda! 😊\n\n` +
          `Silakan ketik menu berikut:\n` +
          `💳 *bayar* — melakukan pembayaran QRIS\n` +
          `❓ *bantuan* — informasi & panduan\n\n` +
          `Ada yang bisa kami bantu? 🙏`,
      );
    } else if (
      text.includes("bantuan") ||
      text.includes("help") ||
      text.includes("info")
    ) {
      await sendText(
        from,
        `ℹ️ *Pusat Bantuan*\n\n` +
          `Berikut panduan layanan kami:\n\n` +
          `💳 Ketik *bayar* → mendapatkan QRIS pembayaran\n` +
          `📸 Kirim *screenshot bukti bayar* → verifikasi otomatis\n` +
          `👋 Ketik *halo* → memulai percakapan\n\n` +
          `Terima kasih! 😊`,
      );
    } else {
      await sendText(
        from,
        `Terima kasih atas pesan Anda! 😊\n\n` +
          `Mohon maaf, kami kurang memahami pesan Anda.\n\n` +
          `Silakan ketik menu berikut:\n` +
          `💳 *bayar* — melakukan pembayaran QRIS\n` +
          `❓ *bantuan* — informasi & panduan\n\n` +
          `Kami siap membantu! 🙏`,
      );
    }
  } catch (error) {
    console.error("❌ Error global:", error.message);
  }
}, handleImage);

// ============================================================
// ENDPOINT: Admin panel
// ============================================================
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/states", (req, res) => {
  res.json(customerState);
});

app.post("/trigger-paid/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  const state = customerState[phone];
  if (!state)
    return res.status(404).json({ error: "Customer tidak ditemukan" });

  customerState[phone] = { step: "idle" };

  // Simpan ke Sheets
  await saveTransaction({
    phone,
    amount: state.amount,
    status: "Dikonfirmasi Admin",
    reason: "Konfirmasi manual oleh admin",
    detectedAmount: state.amount,
  });

  await sendText(
    phone,
    `🎉 *Pembayaran Berhasil Dikonfirmasi!*\n\n` +
      `💰 Jumlah: *Rp ${state.amount?.toLocaleString("id-ID")}*\n\n` +
      `Terima kasih atas pembayaran Anda! 🙏`,
  );
  console.log("✅ Konfirmasi dikirim ke:", phone);
  res.json({ success: true });
});

app.post("/reset-customer/:phone", async (req, res) => {
  const phone = decodeURIComponent(req.params.phone);
  if (!customerState[phone])
    return res.status(404).json({ error: "Customer tidak ditemukan" });

  // Simpan ke Sheets sebagai dibatalkan
  await saveTransaction({
    phone,
    amount: customerState[phone].amount,
    status: "Dibatalkan Admin",
    reason: "Dibatalkan oleh admin",
    detectedAmount: "-",
  });

  customerState[phone] = { step: "idle" };
  await sendText(
    phone,
    `❌ *Pesanan Dibatalkan*\n\n` +
      `Pesanan Anda telah dibatalkan oleh admin.\n` +
      `Ketik *bayar* untuk membuat pesanan baru. 🙏`,
  );
  console.log("🗑️ Pesanan dibatalkan untuk:", phone);
  res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
});
