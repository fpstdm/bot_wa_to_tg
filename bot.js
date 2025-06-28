const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const figlet = require('figlet');

const CONFIG_FILE = 'config.json';

let config = {};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function loadOrCreateConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        console.log(`\n📚 جاري تحميل الإعدادات من ملف ${CONFIG_FILE}...`);
        const rawConfig = fs.readFileSync(CONFIG_FILE);
        config = JSON.parse(rawConfig);
        console.log('✅ تم تحميل الإعدادات بنجاح.');
    } else {
        console.log(`\n⚙️ ملف الإعدادات ${CONFIG_FILE} غير موجود. الرجاء إدخال البيانات المطلوبة:`);
        
        config.telegram = {};
        config.whatsapp = {};

        config.telegram.token = await askQuestion('الرجاء إدخال توكن بوت التلجرام الخاص بك: ');
        
        let tgGroupsInput = await askQuestion('الرجاء إدخال معرفات مجموعات التلجرام المستهدفة (يمكنك إدخال أكثر من معرف، افصل بينها بفاصلة ,): ');
        config.telegram.targetGroups = tgGroupsInput.split(',').map(id => id.trim());

        let waGroupsInput = await askQuestion('الرجاء إدخال معرفات مجموعات الواتساب المستهدفة (يمكنك إدخال أكثر من معرف، افصل بينها بفاصلة ,): ');
        config.whatsapp.targetGroups = waGroupsInput.split(',').map(id => id.trim());
        
        config.whatsapp.authPath = 'baileys_auth_info';

        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`\n🎉 تم حفظ الإعدادات في ملف ${CONFIG_FILE}. يمكنك تعديله يدويًا لاحقًا.`);
    }
    rl.close();
}

let tgBot;

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function handleWhatsAppMessage(msg) {
    try {
        const fpstdm1 = msg.key.fromMe;
        const fpstdm2 = Object.keys(msg.message)[0];
        let fpstdm3 = '';
        let fpstdm4 = null;
        let fpstdm5 = {};
        const fpstdm6 = msg.pushName || 'مستخدم واتساب';

        if (fpstdm1) return;

        if (msg.message.conversation) {
            fpstdm3 = `${fpstdm6}: ${msg.message.conversation}`;
        } else if (msg.message.extendedTextMessage?.text) {
            fpstdm3 = `${fpstdm6}: ${msg.message.extendedTextMessage.text}`;
        } else if (msg.message[fpstdm2]?.caption) {
            fpstdm3 = `${fpstdm6}: ${msg.message[fpstdm2].caption}`;
        } else {
            fpstdm3 = `${fpstdm6}: [ميديا]`;
        }

        fpstdm3 = `رد ${fpstdm3}`;

        for (const targetGroup of config.telegram.targetGroups) {
            switch (fpstdm2) {
                case 'conversation':
                case 'extendedTextMessage':
                    await tgBot.sendMessage(targetGroup, fpstdm3);
                    break;
                    
                case 'imageMessage':
                    fpstdm4 = await downloadAndConvert(msg.message.imageMessage, 'image');
                    await tgBot.sendPhoto(
                        targetGroup,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'videoMessage':
                    fpstdm4 = await downloadAndConvert(msg.message.videoMessage, 'video');
                    await tgBot.sendVideo(
                        targetGroup,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'documentMessage':
                    fpstdm4 = await downloadAndConvert(msg.message.documentMessage, 'document');
                    fpstdm5 = {
                        filename: msg.message.documentMessage.fileName || 'document',
                        contentType: msg.message.documentMessage.mimetype
                    };
                    await tgBot.sendDocument(
                        targetGroup,
                        fpstdm4,
                        { caption: fpstdm3 },
                        fpstdm5
                    );
                    break;
                    
                case 'audioMessage':
                    fpstdm4 = await downloadAndConvert(msg.message.audioMessage, 'audio');
                    await tgBot.sendAudio(
                        targetGroup,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'stickerMessage':
                    fpstdm4 = await downloadAndConvert(msg.message.stickerMessage, 'sticker');
                    await tgBot.sendSticker(
                        targetGroup,
                        fpstdm4
                    );
                    break;
            }
        }
    } catch (error) {
        console.error('❌ خطأ في معالجة الرسالة:', error);
    }
}

async function downloadAndConvert(media, type) {
    const stream = await downloadContentFromMessage(media, type);
    return await streamToBuffer(stream);
}

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authPath);

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true,
        browser: ['WA-to-TG-Bot', 'Chrome', '1.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📲 مسح رمز QR للاتصال بالواتساب:');
            qrcode.generate(qr, { small: true });
            console.log('⏳ انتظر حتى يتم الاتصال...\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`🔌 تم قطع الاتصال: ${lastDisconnect.error?.message}`);
            
            if (shouldReconnect) {
                console.log('🔄 محاولة إعادة الاتصال...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('⛔ تم تسجيل الخروج من الواتساب. يرجى حذف مجلد المصادقة وإعادة تشغيل البوت للمسح مرة أخرى.');
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح بالواتساب!');
            console.log(`📢 سيتم إعادة توجيه الرسائل من مجموعات الواتساب: ${config.whatsapp.targetGroups.join(', ')}`);
            console.log(`➡️ إلى مجموعات التلجرام: ${config.telegram.targetGroups.join(', ')}`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;
        
        if (config.whatsapp.targetGroups.includes(msg.key.remoteJid)) {
            await handleWhatsAppMessage(msg);
        }
    });
}

function displayFpstdmArt() {
    const banner = figlet.textSync('FPSTDM', {
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout:   'default',
      width:            process.stdout.columns,
      whitespaceBreak:  true
    });

    const green = '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(green + banner + reset);
    
    const creditBox = `
\x1b[38;5;240m┌───────────────┐
│ \x1b[38;5;118mgit+tg:fpstdm\x1b[38;5;240m │
└───────────────┘\x1b[0m`;

    console.log(creditBox);
}

(async () => {
    try {
        displayFpstdmArt();
        console.log('🚀 بدء تشغيل بوت نقل الرسائل من واتساب إلى تلجرام');
        
        await loadOrCreateConfig();

        tgBot = new TelegramBot(config.telegram.token, { polling: false });
        console.log(`🤖 باستخدام توكن التلجرام: ${config.telegram.token.substring(0, 5)}...`);

        await connectToWhatsApp();
    } catch (error) {
        console.error('❌ فشل تشغيل البوت:', error);
        process.exit(1);
    }
})();

process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف البوت...');
    process.exit();
});
