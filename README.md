# Pendaftaran Event (Gratis) — GitHub Pages + Google Sheets

Aplikasi sederhana untuk pendaftaran event:
- Field: **nama**, **status pembayaran**, **hari kegiatan**, **biaya**, **lokasi**
- Otomatis membuat **rekap per hari** dan **rekap per bulan**
- Hosting **gratis** di GitHub Pages
- Data tersimpan di **Google Sheets** lewat **Google Apps Script** (gratis)

## 1) Setup Google Sheets
1. Buat Google Sheet baru (contoh nama: `Pendaftaran Yoga`).
2. Dari menu: **Extensions → Apps Script**.
3. Buat file script (misalnya `Code.gs`), lalu paste isi dari `apps-script/Code.gs`.
4. Ubah nilai `API_KEY` (bebas, misalnya `pendaftaran-event`) dan kalau perlu `SHEET_NAME`.

## 2) Deploy Apps Script sebagai Web App
1. Klik **Deploy → New deployment**.
2. Pilih type: **Web app**.
3. `Execute as`: **Me**
4. `Who has access`: **Anyone**
5. Klik **Deploy** lalu copy URL Web App yang berakhiran `/exec`.

> Jika Anda mengubah script, lakukan **Deploy → Manage deployments → Edit** lalu **Deploy** ulang.

## 3) Jalankan di GitHub Pages
1. Buat repo GitHub baru (public/private).
2. Upload semua file project ini.
3. Edit `app.js`:
   - `CONFIG.SCRIPT_URL` = URL Web App Apps Script
   - `CONFIG.API_KEY` = sama persis dengan `API_KEY` di `Code.gs`
4. Di repo: **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main` (atau `master`), folder `/root`
5. Buka URL GitHub Pages yang muncul.

## Catatan keamanan
Ini dibuat untuk kebutuhan sederhana (internal). Karena aplikasi bersifat statis di GitHub Pages, `API_KEY` akan terlihat di browser. Untuk keamanan yang benar (akun/login + aturan akses), perlu backend/auth.

Kalau Anda ingin versi lebih aman (login admin, role, atau hanya admin yang bisa lihat rekap), bilang ya.
