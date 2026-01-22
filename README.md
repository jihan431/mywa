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

### 1. Clone repository
```bash
git clone https://github.com/jihan431/mywa.git
cd mywa
```

### 2. Install system dependencies (PENTING!)

**Untuk Ubuntu/Debian:**
```bash
chmod +x install-deps.sh
sudo ./install-deps.sh
```

**Atau manual:**
```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libgbm1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libx11-6 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils wget
```

### 3. Install Node dependencies
```bash
npm install
```

### 4. Jalankan bot
```bash
npm start
```

### 5. Setup WhatsApp
- Scan QR code yang muncul di terminal dengan WhatsApp
- Tunggu hingga muncul "WhatsApp Connected!"

### 6. Mulai gunakan
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

3. **HP Android bisa offline!**
   - Setelah scan QR, HP tidak perlu online
   - Bot jalan seperti WhatsApp Web
   - Pesan tetap masuk ke Telegram walaupun HP mati

## 🛠️ Troubleshooting

### Error: libgbm.so.1 not found (Chrome dependencies)
```bash
# Jalankan install script
sudo ./install-deps.sh

# Atau install manual (Ubuntu/Debian)
sudo apt-get install -y libgbm1 libgtk-3-0 libnss3 libx11-xcb1
```

### QR Code tidak muncul
```bash
# Hapus session lama dan coba lagi
rm -rf .wwebjs_auth .wwebjs_cache
npm start
```

### Bot tidak merespon di Telegram
- Pastikan token bot benar di `.env`
- Kirim `/start` ke bot terlebih dahulu
- Cek console untuk error messages

### Pesan tidak di-forward
- Cek status dengan `/status`
- Pastikan WhatsApp masih connected
- Restart bot jika perlu

## 🚀 Production Deployment dengan PM2

```bash
# Install PM2
npm install -g pm2

# Start bot
pm2 start index.js --name mywa

# Monitor
pm2 monit

# Logs
pm2 logs mywa

# Auto-start on reboot
pm2 startup
pm2 save
```

## 📝 Notes

- Session WhatsApp disimpan di folder `.wwebjs_auth/`
- Message cache berlaku 24 jam
- Bot support group chat WhatsApp
- Semua media otomatis di-forward ke Telegram
- File `.env` sudah include token bot (siap pakai)

## 🔐 Security

- Jangan share file `.env` ke publik
- Jangan share QR code WhatsApp ke orang lain
- Token bot Telegram adalah rahasia
- Untuk repository publik, hapus `.env` atau ganti token!

## 📄 License

MIT License
