# 💳 Sistem Pembayaran QRIS via WhatsApp

Bot WhatsApp otomatis untuk pembayaran QRIS dengan verifikasi bukti bayar menggunakan **Gemini AI** dan pencatatan transaksi ke **Google Sheets**.

---

## ✨ Fitur Utama

- 📱 **Bot WhatsApp** — Pelanggan bisa bayar langsung via chat WhatsApp
- 🖼️ **Kirim Gambar QRIS** — Gambar QR dikirim langsung ke chat pelanggan
- 🤖 **Verifikasi Otomatis** — Gemini AI membaca screenshot bukti bayar pelanggan
- 📊 **Laporan Google Sheets** — Semua transaksi otomatis tercatat di spreadsheet
- 🖥️ **Admin Panel** — Dashboard web untuk monitor & konfirmasi transaksi
- 💰 **QRIS Statis DANA** — Menggunakan QRIS statis dari merchant DANA

---

## 🔄 Alur Pembayaran

```
Pelanggan kirim "bayar"
        ↓
Bot minta nominal
        ↓
Pelanggan kirim nominal (misal: 50000)
        ↓
Bot kirim gambar QRIS + instruksi
        ↓
Pelanggan bayar via e-wallet/m-banking
        ↓
Pelanggan kirim screenshot bukti bayar
        ↓
Gemini AI verifikasi otomatis
        ↓
✅ Konfirmasi berhasil + data masuk Google Sheets
```

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Fungsi |
|---|---|
| **Node.js** | Runtime server |
| **Express.js** | Web framework |
| **Baileys** | Library WhatsApp (tanpa Docker) |
| **Gemini AI 2.5 Flash** | Verifikasi bukti pembayaran |
| **Google Sheets API** | Laporan transaksi otomatis |
| **QRIS Statis DANA** | Metode pembayaran |

---

## 📋 Prasyarat

Sebelum instalasi, pastikan sudah ada:

- [Node.js v18+](https://nodejs.org)
- Akun Google (untuk Gemini AI & Google Sheets)
- Nomor WhatsApp aktif (khusus untuk bot)
- QRIS statis dari DANA (sebagai merchant)

---

## 🚀 Instalasi & Setup

### 1. Clone Repository

```bash
git clone https://github.com/username/payment-whatsapp.git
cd payment-whatsapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi File .env

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Lalu isi nilai-nilainya:

```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_SHEETS_ID=your_google_spreadsheet_id_here
```

### 4. Tambahkan File yang Diperlukan

Tambahkan file berikut ke folder project (tidak termasuk di repo karena alasan keamanan):

- `credentials.json` — Google Service Account key (download dari Google Cloud Console)
- `qris-statis.jpeg` — Gambar QRIS statis merchant kamu
- `.env` — Konfigurasi API keys

### 5. Setup Google Sheets

1. Buat spreadsheet baru di [sheets.google.com](https://sheets.google.com)
2. Rename tab menjadi **"Transaksi"**
3. Copy Spreadsheet ID dari URL dan masukkan ke `.env`
4. Share spreadsheet ke email service account dari `credentials.json` sebagai **Editor**

### 6. Setup Gemini AI

1. Buka [aistudio.google.com](https://aistudio.google.com)
2. Buat API key baru
3. Enable **Generative Language API** di Google Cloud Console
4. Masukkan API key ke `.env`

### 7. Jalankan Server

```bash
node index.js
```

### 8. Scan QR WhatsApp

Saat pertama kali jalan, QR code muncul di terminal:

1. Buka WhatsApp di HP
2. Masuk ke **Perangkat Tertaut** → **Tautkan Perangkat**
3. Scan QR di terminal
4. Tunggu: `✅ WhatsApp terhubung!`

---

## 📁 Struktur File

```
payment-whatsapp/
├── index.js           # Server utama + logika bot
├── whatsapp.js        # Koneksi WhatsApp via Baileys
├── gemini.js          # Verifikasi bukti bayar via Gemini AI
├── sheets.js          # Simpan transaksi ke Google Sheets
├── admin.html         # Admin panel web interface
├── .env.example       # Template konfigurasi
├── .gitignore         # File yang tidak diupload ke GitHub
├── package.json       # Dependencies
│
├── credentials.json   # ⚠️ TIDAK di-upload (Google Service Account)
├── qris-statis.jpeg   # ⚠️ TIDAK di-upload (gambar QRIS merchant)
├── .env               # ⚠️ TIDAK di-upload (API keys rahasia)
├── node_modules/      # ⚠️ TIDAK di-upload (install dengan npm install)
└── wa-session/        # ⚠️ TIDAK di-upload (session WhatsApp)
```

---

## 🖥️ Admin Panel

Akses admin panel setelah server jalan:

```
http://localhost:4000/admin
```

**Fitur:**
- 📋 Tab **Pending** — Daftar pesanan menunggu konfirmasi
- 📊 Tab **Riwayat** — Semua transaksi yang sudah diproses
- ✅ Tombol **Konfirmasi** — Konfirmasi manual pembayaran
- ❌ Tombol **Batalkan** — Batalkan pesanan pelanggan
- 🔄 Auto refresh setiap 10 detik

---

## 💬 Perintah Bot WhatsApp

| Perintah Pelanggan | Respons Bot |
|---|---|
| `halo` / `hai` / `hello` | Pesan sambutan + daftar menu |
| `bayar` / `qris` / `pesan` | Minta nominal pembayaran |
| `[angka]` misal `50000` | Kirim gambar QRIS + instruksi bayar |
| `[kirim gambar bukti bayar]` | Gemini verifikasi otomatis |
| `bantuan` / `help` / `info` | Panduan penggunaan |

---

## 📊 Kolom Google Sheets

| Kolom | Keterangan |
|---|---|
| ID Transaksi | Format TRX + timestamp unik |
| Nomor WA | Nomor WhatsApp pelanggan |
| Nominal | Nominal pembayaran (angka) |
| Status | Berhasil / Nominal Tidak Sesuai / Bukti Tidak Valid / Dikonfirmasi Admin / Dibatalkan Admin |
| Waktu | Waktu transaksi |
| Alasan Gemini | Hasil analisis AI |
| Nominal Terdeteksi | Nominal yang terbaca Gemini dari gambar |

---

## ⚠️ Troubleshooting

**WhatsApp logout / reconnect: false**
```bash
rm -rf wa-session/
node index.js
# Scan QR ulang
```

**Gemini error 429 (quota habis)**
- Tunggu reset jam 07.00 WIB esok hari
- Atau buat project Google baru dan generate API key baru

**Google Sheets error: Unable to parse range**
- Rename tab sheet menjadi **"Transaksi"** (bukan Sheet1)

**credentials.json not found**
```powershell
Copy-Item "E:\Downloads\sturdy-conduit*.json" "D:\payment-whatsapp\credentials.json"
```

**Gemini menolak bukti bayar yang valid**
- Pastikan screenshot diambil hari ini atau kemarin
- Kirim gambar yang lebih jelas
- Gunakan konfirmasi manual di admin panel

---

## 🔒 Keamanan

- Jangan pernah upload `.env` dan `credentials.json` ke GitHub
- Gunakan nomor WhatsApp khusus untuk bot (bukan nomor pribadi)
- Admin panel tidak memiliki autentikasi — akses hanya dari jaringan lokal

---

## 📄 Lisensi

MIT License — bebas digunakan dan dimodifikasi.

---

## 👤 Developer

**xcode** — Sorong Selatan  
Sistem Pembayaran QRIS WhatsApp v2.0
