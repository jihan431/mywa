# WhatsApp-Telegram Bridge Bot

Bot Telegram yang memungkinkan Anda membalas pesan WhatsApp langsung dari Telegram tanpa perlu membuka aplikasi WhatsApp.

## 🌟 Fitur

- ✅ Forward semua pesan WhatsApp ke Telegram secara real-time
- ✅ Reply ke pesan WhatsApp langsung dari Telegram
- ✅ Kirim pesan baru ke nomor WhatsApp manapun
- ✅ Support media (foto, video, audio, dokumen)
- ✅ Session persistence (tidak perlu scan QR setiap kali restart)
- ✅ Message tracking dengan unique ID
- ✅ Notifikasi status koneksi

## 📋 Requirement

- Node.js 16 atau lebih baru
- NPM atau Yarn
- Akun Telegram
- WhatsApp account

## 🚀 Instalasi

1. **Clone atau download project ini**

2. **Install dependencies:**
```bash
npm install
```

3. **Setup Telegram Bot:**
   - Buka [@BotFather](https://t.me/botfather) di Telegram
   - Kirim `/newbot` dan ikuti instruksi
   - Copy token yang diberikan
   - Paste token ke file `.env`

4. **Konfigurasi:**
   - File `.env` sudah otomatis dibuat dengan token Anda
   - `TELEGRAM_CHAT_ID` akan otomatis terisi saat Anda kirim `/start`

5. **Jalankan bot:**
```bash
npm start
```

6. **Setup WhatsApp:**
   - Scan QR code yang muncul di terminal dengan WhatsApp
   - Tunggu hingga muncul "WhatsApp Connected!"

7. **Mulai gunakan:**
   - Kirim `/start` ke bot Telegram Anda
   - Bot siap menerima dan membalas pesan!

## 📱 Cara Penggunaan

### Commands Telegram:

- `/start` - Mulai bot dan lihat welcome message
- `/help` - Bantuan lengkap
- `/status` - Cek status koneksi WhatsApp
- `/list` - Lihat 10 pesan terakhir
- `/reply <msg_id> <pesan>` - Balas pesan WhatsApp
- `/send <nomor> <pesan>` - Kirim pesan baru

### Contoh:

**Reply ke pesan:**
```
/reply msg_5 Terima kasih atas pesannya!
```

**Kirim pesan baru:**
```
/send 628123456789 Halo dari Telegram!
```

## 🔄 Cara Kerja

1. **WhatsApp → Telegram:**
   - Pesan WhatsApp masuk otomatis di-forward ke Telegram
   - Setiap pesan diberi unique ID (msg_1, msg_2, dst)
   - Media otomatis di-download dan di-forward

2. **Telegram → WhatsApp:**
   - Gunakan command `/reply` dengan message ID
   - Atau kirim pesan baru dengan `/send`
   - Konfirmasi otomatis dikirim ke Telegram

## 🛠️ Troubleshooting

**QR Code tidak muncul:**
- Pastikan terminal mendukung QR code display
- Atau cek file `.wwebjs_auth/` dan hapus jika perlu reset

**Bot tidak merespon di Telegram:**
- Pastikan token bot benar
- Kirim `/start` ke bot terlebih dahulu
- Cek console untuk error messages

**Pesan tidak di-forward:**
- Cek status dengan `/status`
- Pastikan WhatsApp masih connected
- Restart bot jika perlu

## 📝 Notes

- Session WhatsApp disimpan di folder `.wwebjs_auth/`
- Message cache berlaku 24 jam
- Bot support group chat WhatsApp
- Semua media otomatis di-forward ke Telegram

## 🔐 Security

- Jangan share file `.env` (sudah ada di `.gitignore`)
- Jangan share QR code WhatsApp ke orang lain
- Token bot Telegram adalah rahasia

## 📄 License

MIT License
