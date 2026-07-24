/** @format */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function analyzeBuktiPembayaran(imageBuffer, expectedAmount) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const today = new Date();
    const todayStr = today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const yesterdayStr = new Date(today - 86400000).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );

    const prompt = `Kamu adalah sistem verifikasi pembayaran QRIS otomatis.

Hari ini adalah: ${todayStr}

Analisis gambar bukti pembayaran ini dan tentukan:
1. Apakah ini bukti pembayaran yang valid (screenshot dari aplikasi e-wallet/m-banking seperti DANA, GoPay, OVO, dll)?
2. Berapa nominal yang dibayarkan? (dalam angka saja)
3. Apakah nominal sesuai dengan yang diharapkan: Rp ${expectedAmount.toLocaleString("id-ID")}?
4. Apakah tanggal transaksi adalah hari ini (${todayStr}) atau kemarin (${yesterdayStr})?

Jawab HANYA dalam format JSON berikut tanpa penjelasan tambahan:
{
  "valid": true/false,
  "amount": 0,
  "match": true/false,
  "reason": "alasan singkat"
}

Catatan penting:
- valid: true HANYA jika gambar adalah screenshot bukti pembayaran dari aplikasi e-wallet/m-banking DAN tanggal transaksi adalah hari ini atau kemarin
- valid: false jika tanggal transaksi lebih dari 1 hari yang lalu
- amount: nominal yang tertera di bukti (angka saja, tanpa titik/koma)
- match: true jika nominal sesuai atau mendekati (toleransi 5%)
- reason: penjelasan singkat dalam bahasa Indonesia`;

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response.text();

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Format response tidak valid");

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("🤖 Gemini analisis:", parsed);
    return parsed;
  } catch (err) {
    console.error("❌ Gemini error:", err.message);
    return {
      valid: false,
      amount: 0,
      match: false,
      reason: "Gagal menganalisis gambar",
    };
  }
}

module.exports = { analyzeBuktiPembayaran };
