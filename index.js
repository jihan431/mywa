require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { Telegraf } = require('telegraf');
const qrcode = require('qrcode-terminal');
const NodeCache = require('node-cache');

// Konfigurasi
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
let TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || null;

// Cache untuk mapping message ID ke contact
const messageCache = new NodeCache({ stdTTL: 86400 }); // 24 jam
let messageCounter = 0;

// Cache untuk conversation state (waiting for reply)
const conversationState = new NodeCache({ stdTTL: 600 }); // 10 menit

// Initialize WhatsApp Client
const waClient = new Client({
    authStrategy: new LocalAuth({
        dataPath: process.env.SESSION_PATH || './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Initialize Telegram Bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// ==================== WhatsApp Events ====================

waClient.on('qr', (qr) => {
    console.log('📱 Scan QR Code di bawah ini dengan WhatsApp:');
    qrcode.generate(qr, { small: true });
});

waClient.on('ready', () => {
    console.log('✅ WhatsApp Connected!');
    if (TELEGRAM_CHAT_ID) {
        bot.telegram.sendMessage(TELEGRAM_CHAT_ID, '✅ WhatsApp Connected! Bot siap digunakan.');
    }
});

waClient.on('authenticated', () => {
    console.log('✅ WhatsApp Authenticated');
});

waClient.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp Authentication Failed:', msg);
});

waClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp Disconnected:', reason);
    if (TELEGRAM_CHAT_ID) {
        bot.telegram.sendMessage(TELEGRAM_CHAT_ID, `❌ WhatsApp Disconnected: ${reason}`);
    }
});

// Handle incoming WhatsApp messages
waClient.on('message', async (msg) => {
    try {
        // Skip messages dari diri sendiri
        if (msg.fromMe) return;

        // Dapatkan info contact
        const contact = await msg.getContact();
        const chat = await msg.getChat();
        const contactName = contact.pushname || contact.name || contact.number;
        const isGroup = chat.isGroup;
        const chatName = isGroup ? chat.name : contactName;

        // Generate unique message ID
        messageCounter++;
        const msgId = `msg_${messageCounter}`;
        
        // Simpan mapping message ID ke contact info
        messageCache.set(msgId, {
            contactId: msg.from,
            contactName: chatName,
            isGroup: isGroup,
            timestamp: Date.now()
        });

        // Format pesan untuk Telegram - SIMPLE VERSION
        let telegramMessage = `📨 *${chatName}*\n`;
        telegramMessage += `🆔 \`${msgId}\`\n`;
        telegramMessage += `─────────────────\n`;
        telegramMessage += msg.body || '[Media/File]';

        if (!TELEGRAM_CHAT_ID) {
            console.log('⚠️ TELEGRAM_CHAT_ID belum diset. Gunakan /start di bot Telegram.');
            return;
        }

        // Inline keyboard - cuma tombol Balas
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Balas', callback_data: `reply_${msgId}` }
                ]
            ]
        };

        // Kirim pesan ke Telegram dengan keyboard
        await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, telegramMessage, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });

        // Handle media (gambar, video, dokumen, dll)
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                
                if (media) {
                    const buffer = Buffer.from(media.data, 'base64');
                    
                    // Kirim media berdasarkan tipe
                    if (media.mimetype.startsWith('image/')) {
                        await bot.telegram.sendPhoto(TELEGRAM_CHAT_ID, {
                            source: buffer
                        }, {
                            caption: `📷 ${chatName} | ${msgId}`
                        });
                    } else if (media.mimetype.startsWith('video/')) {
                        await bot.telegram.sendVideo(TELEGRAM_CHAT_ID, {
                            source: buffer
                        }, {
                            caption: `🎥 ${chatName} | ${msgId}`
                        });
                    } else if (media.mimetype.startsWith('audio/')) {
                        await bot.telegram.sendAudio(TELEGRAM_CHAT_ID, {
                            source: buffer
                        }, {
                            caption: `🎵 ${chatName} | ${msgId}`
                        });
                    } else {
                        await bot.telegram.sendDocument(TELEGRAM_CHAT_ID, {
                            source: buffer,
                            filename: media.filename || 'file'
                        }, {
                            caption: `📎 ${chatName} | ${msgId}`
                        });
                    }
                }
            } catch (error) {
                console.error('Error downloading media:', error);
                await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, `⚠️ Gagal download media dari ${chatName}`);
            }
        }

        console.log(`📨 Forwarded message from ${chatName} to Telegram (${msgId})`);

    } catch (error) {
        console.error('Error handling WhatsApp message:', error);
    }
});

// ==================== Telegram Commands ====================

// Fungsi helper untuk reply ke WhatsApp
async function replyToWhatsApp(msgId, replyText, ctx) {
    try {
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.reply('❌ Message ID tidak ditemukan atau sudah expired.\nGunakan /list untuk melihat pesan terbaru.');
        }

        // Kirim pesan ke WhatsApp
        await waClient.sendMessage(msgData.contactId, replyText);
        
        await ctx.reply(`✅ Pesan berhasil dikirim ke:\n👤 ${msgData.contactName}\n📞 ${msgData.contactId}\n\n💬 Pesan: ${replyText}`, {
            parse_mode: 'Markdown'
        });

        console.log(`✉️ Reply sent to ${msgData.contactName}`);

    } catch (error) {
        console.error('Error sending reply:', error.message);
        await ctx.reply('❌ Gagal mengirim pesan. Pastikan WhatsApp masih terhubung.');
    }
}

// Command /start
bot.command('start', async (ctx) => {
    // Set chat ID otomatis
    if (!TELEGRAM_CHAT_ID) {
        TELEGRAM_CHAT_ID = ctx.chat.id;
        console.log(`✅ Telegram Chat ID set to: ${TELEGRAM_CHAT_ID}`);
    }

    const welcomeMsg = `🤖 *WhatsApp-Telegram Bridge*\n\n` +
        `Bot ini auto-forward semua pesan WhatsApp ke sini.\n` +
        `Klik tombol di bawah untuk quick access:`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: '📊 Status', callback_data: 'cmd_status' },
                { text: '📋 Pesan Terakhir', callback_data: 'cmd_list' }
            ],
            [
                { text: '📤 Kirim Pesan Baru', callback_data: 'cmd_send' }
            ],
            [
                { text: '❓ Bantuan', callback_data: 'cmd_help' }
            ]
        ]
    };

    await ctx.reply(welcomeMsg, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Command /help
bot.command('help', async (ctx) => {
    const helpMsg = `📖 *Bantuan WhatsApp-Telegram Bridge*\n\n` +
        `*Format Commands:*\n\n` +
        `1️⃣ *Balas Pesan WA*\n` +
        `   /reply <msg_id> <pesan>\n` +
        `   Contoh: /reply msg_5 Terima kasih atas pesannya!\n\n` +
        `2️⃣ *Kirim Pesan Baru*\n` +
        `   /send <nomor> <pesan>\n` +
        `   Contoh: /send 628123456789 Halo!\n` +
        `   Format nomor: 628xxx (dengan kode negara)\n\n` +
        `3️⃣ *Lihat Pesan Terakhir*\n` +
        `   /list - Menampilkan 10 pesan terakhir\n\n` +
        `4️⃣ *Cek Status*\n` +
        `   /status - Status koneksi WhatsApp\n\n` +
        `*Tips:*\n` +
        `• Setiap pesan yang masuk akan otomatis di-forward ke sini\n` +
        `• Copy Msg ID dari pesan yang masuk untuk reply\n` +
        `• Media (foto, video, file) juga otomatis di-forward`;

    await ctx.reply(helpMsg, { parse_mode: 'Markdown' });
});

// Command /status
bot.command('status', async (ctx) => {
    const waState = await waClient.getState();
    const isConnected = waState === 'CONNECTED';
    
    const statusMsg = `📊 *Status Bot*\n\n` +
        `WhatsApp: ${isConnected ? '✅ Connected' : '❌ Disconnected'}\n` +
        `State: ${waState}\n` +
        `Active Messages: ${messageCache.keys().length}\n` +
        `Total Forwarded: ${messageCounter}`;

    await ctx.reply(statusMsg, { parse_mode: 'Markdown' });
});

// Command /list
bot.command('list', async (ctx) => {
    const allKeys = messageCache.keys();
    
    if (allKeys.length === 0) {
        return ctx.reply('📭 Belum ada pesan yang tersimpan.');
    }

    // Ambil 10 pesan terakhir
    const recentKeys = allKeys.slice(-10).reverse();
    let listMsg = `📋 *10 Pesan Terakhir:*\n\n`;

    recentKeys.forEach((key) => {
        const data = messageCache.get(key);
        if (data) {
            const timeAgo = Math.floor((Date.now() - data.timestamp) / 60000); // menit
            listMsg += `🆔 \`${key}\`\n`;
            listMsg += `👤 ${data.contactName}\n`;
            listMsg += `⏰ ${timeAgo} menit lalu\n`;
            listMsg += `─────────────\n`;
        }
    });

    await ctx.reply(listMsg, { parse_mode: 'Markdown' });
});

// Command /reply
bot.command('reply', async (ctx) => {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 3) {
        return ctx.reply('❌ Format salah!\n\nGunakan: /reply <msg_id> <pesan>\nContoh: /reply msg_5 Halo, terima kasih!');
    }

    const msgId = args[1];
    const replyText = args.slice(2).join(' ');

    await replyToWhatsApp(msgId, replyText, ctx);
});

// Command /send
bot.command('send', async (ctx) => {
    const args = ctx.message.text.split(' ');
    
    if (args.length < 3) {
        return ctx.reply('❌ Format salah!\n\nGunakan: /send <nomor> <pesan>\nContoh: /send 628123456789 Halo dari Telegram!');
    }

    const phoneNumber = args[1];
    const messageText = args.slice(2).join(' ');

    try {
        // Format nomor dengan @c.us
        const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
        
        // Kirim pesan
        await waClient.sendMessage(chatId, messageText);
        
        await ctx.reply(`✅ Pesan berhasil dikirim ke:\n📞 ${phoneNumber}\n\n💬 Pesan: ${messageText}`);
        console.log(`✉️ Message sent to ${phoneNumber}`);

    } catch (error) {
        console.error('Error sending message:', error);
        await ctx.reply('❌ Gagal mengirim pesan.\n\nPastikan:\n• Nomor dalam format internasional (628xxx)\n• WhatsApp terhubung\n• Nomor valid');
    }
});

// ==================== Inline Button Handlers ====================

// Handle callback query (inline button clicks)
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    
    if (data.startsWith('reply_')) {
        // Tombol "Balas" - masuk conversation mode
        const msgId = data.replace('reply_', '');
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.answerCbQuery('❌ Message expired!', { show_alert: true });
        }
        
        // Set conversation state
        conversationState.set(`chat_${ctx.from.id}`, {
            mode: 'waiting_reply',
            msgId: msgId,
            contactName: msgData.contactName
        });
        
        await ctx.answerCbQuery();
        await ctx.reply(`💬 *Balas ke: ${msgData.contactName}*\n\n✍️ Ketik pesan Anda (atau /cancel untuk batal):`, {
            parse_mode: 'Markdown'
        });
        
    } else if (data.startsWith('cmd_')) {
        // Handle inline buttons dari /start
        await ctx.answerCbQuery();
        
        if (data === 'cmd_status') {
            const waState = await waClient.getState();
            const isConnected = waState === 'CONNECTED';
            
            const statusMsg = `📊 *Status Bot*\n\n` +
                `WhatsApp: ${isConnected ? '✅ Connected' : '❌ Disconnected'}\n` +
                `State: ${waState}\n` +
                `Active Messages: ${messageCache.keys().length}\n` +
                `Total Forwarded: ${messageCounter}`;

            await ctx.reply(statusMsg, { parse_mode: 'Markdown' });
            
        } else if (data === 'cmd_list') {
            const allKeys = messageCache.keys();
            
            if (allKeys.length === 0) {
                return ctx.reply('📭 Belum ada pesan yang tersimpan.');
            }

            const recentKeys = allKeys.slice(-10).reverse();
            let listMsg = `📋 *10 Pesan Terakhir:*\n\n`;

            recentKeys.forEach((key) => {
                const data = messageCache.get(key);
                if (data) {
                    const timeAgo = Math.floor((Date.now() - data.timestamp) / 60000);
                    listMsg += `🆔 \`${key}\`\n`;
                    listMsg += `👤 ${data.contactName}\n`;
                    listMsg += `⏰ ${timeAgo} menit lalu\n`;
                    listMsg += `─────────────\n`;
                }
            });

            await ctx.reply(listMsg, { parse_mode: 'Markdown' });
            
        } else if (data === 'cmd_send') {
            await ctx.reply('📤 *Kirim Pesan Baru*\n\nFormat: `/send <nomor> <pesan>`\n\nContoh:\n`/send 628123456789 Halo dari Telegram!`', {
                parse_mode: 'Markdown'
            });
            
        } else if (data === 'cmd_help') {
            const helpMsg = `📖 *Bantuan Bot*\n\n` +
                `*Fitur Utama:*\n` +
                `• Auto-forward pesan WA → Telegram\n` +
                `• Balas pesan dengan 1 klik\n` +
                `• Support media (foto, video, file)\n\n` +
                `*Cara Balas:*\n` +
                `1. Klik tombol 💬 *Balas*\n` +
                `2. Ketik pesan Anda\n` +
                `3. Pesan otomatis terkirim!\n\n` +
                `*Commands:*\n` +
                `/status - Cek status WA\n` +
                `/list - Pesan terakhir\n` +
                `/send <nomor> <pesan> - Kirim baru\n` +
                `/cancel - Batalkan reply\n\n` +
                `*Contoh Kirim:*\n` +
                `/send 628123456789 Halo!`;
            
            await ctx.reply(helpMsg, { parse_mode: 'Markdown' });
        }
        // Contact info button
        const msgId = data.replace('info_', '');
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.answerCbQuery('❌ Message expired!', { show_alert: true });
        }
        
        // Format contact info
        const contactInfo = `📇 *Info Kontak*\n\n` +
            `👤 Nama: ${msgData.contactName}\n` +
            `📞 ID: \`${msgData.contactId}\`\n` +
            `📁 Type: ${msgData.isGroup ? 'Group' : 'Personal'}\n` +
            `⏰ Pesan diterima: ${new Date(msgData.timestamp).toLocaleString('id-ID')}\n` +
            `🆔 Msg ID: \`${msgId}\`\n\n` +
            `_Gunakan /send ${msgData.contactId.replace('@c.us', '')} untuk kirim pesan baru_`;
        
        // Share contact button
        const contactKeyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Reply', callback_data: `reply_${msgId}` },
                    { text: '📤 Share Contact', callback_data: `share_${msgId}` }
                ]
            ]
        };
        
        await ctx.answerCbQuery();
        await ctx.reply(contactInfo, {
            parse_mode: 'Markdown',
            reply_markup: contactKeyboard
        });
        
    } else if (data.startsWith('quickreply_')) {
        // Send quick reply
        const parts = data.replace('quickreply_', '').split('_');
        const msgId = parts[0];
        const replyText = parts.slice(1).join('_');
        
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.answerCbQuery('❌ Message expired!', { show_alert: true });
        }
        
        try {
            await waClient.sendMessage(msgData.contactId, replyText);
            await ctx.answerCbQuery('✅ Pesan terkirim!');
            await ctx.reply(`✅ Reply terkirim ke *${msgData.contactName}*\n💬 "${replyText}"`, {
                parse_mode: 'Markdown'
            });
            console.log(`✉️ Quick reply sent to ${msgData.contactName}`);
        } catch (error) {
            console.error('Error sending quick reply:', error);
            await ctx.answerCbQuery('❌ Gagal mengirim!', { show_alert: true });
        }
        
    } else if (data.startsWith('custom_')) {
        // Custom reply - instruct user to use /reply command
        const msgId = data.replace('custom_', '');
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.answerCbQuery('❌ Message expired!', { show_alert: true });
        }
        
        await ctx.answerCbQuery();
        await ctx.reply(`✍️ Untuk custom reply, gunakan:\n\n\`/reply ${msgId} [pesan Anda]\`\n\nContoh:\n\`/reply ${msgId} Halo, terima kasih pesannya!\``, {
            parse_mode: 'Markdown'
        });
        
    } else if (data.startsWith('share_')) {
        // Share contact as vCard
        const msgId = data.replace('share_', '');
        const msgData = messageCache.get(msgId);
        
        if (!msgData) {
            return ctx.answerCbQuery('❌ Message expired!', { show_alert: true });
        }
        
        const phoneNumber = msgData.contactId.replace('@c.us', '');
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${msgData.contactName}\nTEL;TYPE=CELL:+${phoneNumber}\nEND:VCARD`;
        
        await ctx.answerCbQuery();
        await ctx.replyWithDocument({
            source: Buffer.from(vcard),
            filename: `${msgData.contactName}.vcf`
        }, {
            caption: `📇 Contact: ${msgData.contactName}\n📞 +${phoneNumber}`
        });
    }
});

// Handle text messages (untuk conversation mode)
bot.on('text', async (ctx) => {
    // Check if user is in conversation mode
    const state = conversationState.get(`chat_${ctx.from.id}`);
    
    if (state && state.mode === 'waiting_reply') {
        const msgData = messageCache.get(state.msgId);
        
        if (!msgData) {
            conversationState.del(`chat_${ctx.from.id}`);
            return ctx.reply('❌ Pesan sudah expired.');
        }
        
        // Get user's message
        const replyText = ctx.message.text;
        
        try {
            // Send to WhatsApp
            await waClient.sendMessage(msgData.contactId, replyText);
            
            await ctx.reply(`✅ Pesan terkirim ke *${msgData.contactName}*\n\n💬 "${replyText}"`, {
                parse_mode: 'Markdown'
            });
            
            console.log(`✉️ Reply sent to ${msgData.contactName}`);
            
        } catch (error) {
            console.error('Error sending message:', error.message);
            await ctx.reply('❌ Gagal mengirim pesan.');
        }
        
        // Clear conversation state
        conversationState.del(`chat_${ctx.from.id}`);
    }
});

// Command /cancel
bot.command('cancel', async (ctx) => {
    const state = conversationState.get(`chat_${ctx.from.id}`);
    
    if (state) {
        conversationState.del(`chat_${ctx.from.id}`);
        await ctx.reply('✅ Reply dibatalkan.');
    } else {
        await ctx.reply('Tidak ada aksi yang perlu dibatalkan.');
    }
});

// Error handler
bot.catch((err, ctx) => {
    console.error('Telegram bot error:', err);
});

// ==================== Start Bot ====================

console.log('🚀 Starting WhatsApp-Telegram Bridge Bot...');

// Initialize WhatsApp
waClient.initialize();

// Start Telegram bot
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => {
    console.log('⏹️ Stopping bot...');
    bot.stop('SIGINT');
    waClient.destroy();
});

process.once('SIGTERM', () => {
    console.log('⏹️ Stopping bot...');
    bot.stop('SIGTERM');
    waClient.destroy();
});

console.log('✅ Bot started successfully!');
console.log('📱 Scan QR code untuk koneksi WhatsApp');
console.log('💬 Kirim /start ke bot Telegram untuk mulai');
