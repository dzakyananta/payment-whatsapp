/** @format */

const { google } = require("googleapis");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

let sheets = null;

// ============================================================
// Inisialisasi Google Sheets
// ============================================================
async function initSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });

  const client = await auth.getClient();
  sheets = google.sheets({ version: "v4", auth: client });

  // Buat header jika sheet kosong
  await initHeader();
  console.log("✅ Google Sheets terhubung!");
}

async function initHeader() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Transaksi!A1:G1",
    });

    // Kalau belum ada header, buat header dulu
    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: "Transaksi!A1:G1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "ID Transaksi",
              "Nomor WA",
              "Nominal",
              "Status",
              "Waktu",
              "Alasan Gemini",
              "Nominal Terdeteksi",
            ],
          ],
        },
      });
      console.log("✅ Header spreadsheet dibuat!");
    }
  } catch (err) {
    console.error("❌ Gagal init header:", err.message);
  }
}

// ============================================================
// Simpan transaksi ke spreadsheet
// ============================================================
async function saveTransaction({
  phone,
  amount,
  status,
  reason,
  detectedAmount,
}) {
  try {
    const id = "TRX" + Date.now();
    const waktu = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Makassar",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const phone_clean = phone
      .replace("@s.whatsapp.net", "")
      .replace("@lid", "")
      .replace("@c.us", "");

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Transaksi!A:G",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            id,
            phone_clean,
            amount,
            status,
            waktu,
            reason || "-",
            detectedAmount || "-",
          ],
        ],
      },
    });

    console.log(`✅ Transaksi disimpan ke Sheets: ${id} - ${status}`);
    return id;
  } catch (err) {
    console.error("❌ Gagal simpan ke Sheets:", err.message);
    return null;
  }
}

module.exports = { initSheets, saveTransaction };
