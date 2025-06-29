const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const figlet = require('figlet');

const fpstdm11 = 'config.json';
const fpstdm12 = 10;

let fpstdm13 = {
    telegram: { token: '' },
    whatsapp: { authPath: 'baileys_auth_info' },
    forwarding_paths: [],
    adminTelegramId: '' 
};

let ADMIN_TELEGRAM_ID; 

const fpstdm14 = {};
const fpstdm15 = [];
const fpstdm16 = new Map();
const fpstdm17 = new Map();

const fpstdm18 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function fpstdm19(fpstdm20) {
    return new Promise(fpstdm21 => fpstdm18.question(fpstdm20, fpstdm21));
}

async function fpstdm22() {
    if (fs.existsSync(fpstdm11)) {
        const fpstdm23 = fs.readFileSync(fpstdm11);
        fpstdm13 = JSON.parse(fpstdm23);
        ADMIN_TELEGRAM_ID = fpstdm13.adminTelegramId;
    } else {
        fpstdm13.telegram.token = await fpstdm19('الرجاء إدخال توكن بوت التلجرام الخاص بك: ');
        fpstdm13.adminTelegramId = await fpstdm19('الرجاء إدخال معرف التلجرام الخاص بك كمسؤول (Your Telegram Admin ID): ');
        
        ADMIN_TELEGRAM_ID = fpstdm13.adminTelegramId;

        fpstdm24();
    }
    fpstdm18.close();
}

function fpstdm24() {
    fs.writeFileSync(fpstdm11, JSON.stringify(fpstdm13, null, 2));
}

async function fpstdm25(fpstdm26, fpstdm27) {
    if (fpstdm13.forwarding_paths.length >= fpstdm12) {
        return `❌ لا يمكن إضافة المزيد من المسارات. الحد الأقصى هو ${fpstdm12}.`;
    }
    if (!fpstdm26.endsWith('@g.us')) {
        return '❌ معرف مجموعة الواتساب (JID) غير صحيح. يجب أن ينتهي بـ "@g.us".';
    }
    if (!fpstdm27.startsWith('-100')) {
        return '❌ معرف دردشة التلجرام (ChatID) غير صحيح. يجب أن يبدأ بـ "-100".';
    }

    const fpstdm28 = fpstdm13.forwarding_paths.find(
        fpstdm29 => fpstdm29.wa_jid === fpstdm26 && fpstdm29.tg_chat_id === fpstdm27
    );

    if (fpstdm28) {
        return '⚠️ هذا المسار موجود بالفعل.';
    }

    fpstdm13.forwarding_paths.push({ wa_jid: fpstdm26, tg_chat_id: fpstdm27 });
    fpstdm24();
    return `✅ تم إضافة مسار تحويل جديد: واتساب (\`${fpstdm26}\`) ➡️ تلجرام (\`${fpstdm27}\`).`;
}

async function fpstdm30(fpstdm31) {
    const fpstdm32 = fpstdm13.forwarding_paths.length;
    fpstdm13.forwarding_paths = fpstdm13.forwarding_paths.filter(
        fpstdm33 => fpstdm33.wa_jid !== fpstdm31 && fpstdm33.tg_chat_id !== fpstdm31
    );

    if (fpstdm13.forwarding_paths.length < fpstdm32) {
        fpstdm24();
        return `✅ تم إزالة مسار التحويل المرتبط بـ "${fpstdm31}" بنجاح.`;
    } else {
        return `❌ لم يتم العثور على مسار تحويل لـ "${fpstdm31}".`;
    }
}

let tgBot;
let waSock;

async function fpstdm34(fpstdm35) {
    const fpstdm36 = [];
    for await (const fpstdm37 of fpstdm35) {
        fpstdm36.push(fpstdm37);
    }
    return Buffer.concat(fpstdm36);
}

async function fpstdm38(fpstdm39) {
    try {
        const fpstdm1 = fpstdm39.key.fromMe;
        const fpstdm2 = Object.keys(fpstdm39.message)[0];
        let fpstdm3 = '';
        let fpstdm4 = null;
        let fpstdm5 = {};
        const fpstdm6 = fpstdm39.pushName || 'مستخدم واتساب';

        if (fpstdm1 || !fpstdm39.message) return;

        const fpstdm40 = fpstdm39.key.remoteJid;
        let fpstdm41 = 'محادثة فردية';

        if (fpstdm40.endsWith('@g.us')) {
            if (!fpstdm16.has(fpstdm40)) {
                try {
                    const fpstdm42 = await waSock.groupMetadata(fpstdm40);
                    if (fpstdm42 && fpstdm42.subject) {
                        fpstdm41 = fpstdm42.subject;
                        fpstdm16.set(fpstdm40, fpstdm41);
                    }
                } catch (fpstdm43) {
                    fpstdm16.set(fpstdm40, 'مجموعة غير معروفة');
                    fpstdm41 = 'مجموعة غير معروفة';
                }
            } else {
                fpstdm41 = fpstdm16.get(fpstdm40);
            }
        }

        const fpstdm44 = fpstdm13.forwarding_paths.filter(
            fpstdm45 => fpstdm45.wa_jid === fpstdm40
        );

        if (fpstdm44.length === 0) {
            return;
        }

        let fpstdm46 = '';
        if (fpstdm39.message.conversation) {
            fpstdm46 = fpstdm39.message.conversation;
        } else if (fpstdm39.message.extendedTextMessage?.text) {
            fpstdm46 = fpstdm39.message.extendedTextMessage.text;
        } else if (fpstdm39.message[fpstdm2]?.caption) {
            fpstdm46 = fpstdm39.message[fpstdm2].caption;
        } else {
            fpstdm46 = '[ميديا]';
        }

        fpstdm3 = `[${fpstdm41}] ${fpstdm6}: ${fpstdm46}`;

        const fpstdm47 = `[WA: ${fpstdm6} in ${fpstdm41} (${fpstdm40})] ${fpstdm46.substring(0, 50)}...`;
        fpstdm15.push({ timestamp: new Date().toISOString(), text: fpstdm47 });
        if (fpstdm15.length > 10) {
            fpstdm15.shift();
        }

        for (const fpstdm48 of fpstdm44) {
            const fpstdm49 = fpstdm48.tg_chat_id;

            switch (fpstdm2) {
                case 'conversation':
                case 'extendedTextMessage':
                    await tgBot.sendMessage(fpstdm49, fpstdm3);
                    break;
                    
                case 'imageMessage':
                    fpstdm4 = await fpstdm50(fpstdm39.message.imageMessage, 'image');
                    await tgBot.sendPhoto(
                        fpstdm49,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'videoMessage':
                    fpstdm4 = await fpstdm50(fpstdm39.message.videoMessage, 'video');
                    await tgBot.sendVideo(
                        fpstdm49,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'documentMessage':
                    fpstdm4 = await fpstdm50(fpstdm39.message.documentMessage, 'document');
                    fpstdm5 = {
                        filename: fpstdm39.message.documentMessage.fileName || 'document',
                        contentType: fpstdm39.message.documentMessage.mimetype
                    };
                    await tgBot.sendDocument(
                        fpstdm49,
                        fpstdm4,
                        { caption: fpstdm3 },
                        fpstdm5
                    );
                    break;
                    
                case 'audioMessage':
                    fpstdm4 = await fpstdm50(fpstdm39.message.audioMessage, 'audio');
                    await tgBot.sendAudio(
                        fpstdm49,
                        fpstdm4,
                        { caption: fpstdm3 }
                    );
                    break;
                    
                case 'stickerMessage':
                    fpstdm4 = await fpstdm50(fpstdm39.message.stickerMessage, 'sticker');
                    await tgBot.sendSticker(
                        fpstdm49,
                        fpstdm4
                    );
                    break;
            }
        }
    } catch (fpstdm51) {
        if (ADMIN_TELEGRAM_ID && tgBot) {
            try {
                await tgBot.sendMessage(ADMIN_TELEGRAM_ID.toString(), `⚠️ حدث خطأ في البوت: ${fpstdm51.message}`);
            } catch (fpstdm52) {}
        }
    }
}

async function fpstdm50(fpstdm53, fpstdm54) {
    const fpstdm55 = await downloadContentFromMessage(fpstdm53, fpstdm54);
    return await fpstdm34(fpstdm55);
}

async function fpstdm56() {
    const { state: fpstdm57, saveCreds: fpstdm58 } = await useMultiFileAuthState(fpstdm13.whatsapp.authPath);

    waSock = makeWASocket({ 
        logger: P({ level: 'silent' }),
        auth: fpstdm57,
        printQRInTerminal: true,
        browser: ['WA-to-TG-Bot', 'Chrome', '1.0']
    });

    waSock.ev.on('connection.update', async (fpstdm59) => {
        const { connection: fpstdm60, lastDisconnect: fpstdm61, qr: fpstdm62 } = fpstdm59;

        if (fpstdm62) {
            qrcode.generate(fpstdm62, { small: true });
        }

        if (fpstdm60 === 'close') {
            const fpstdm63 = fpstdm61.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            if (fpstdm63) {
                setTimeout(fpstdm56, 5000);
            }
        } else if (fpstdm60 === 'open') {
            if (ADMIN_TELEGRAM_ID) {
                 tgBot.sendMessage(ADMIN_TELEGRAM_ID.toString(), "✅ تم الاتصال بنجاح بالواتساب! البوت جاهز للعمل.", { reply_markup: { keyboard: mainMenuKeyboard.keyboard, resize_keyboard: true } });
            }
        }
    });

    waSock.ev.on('creds.update', fpstdm58);

    waSock.ev.on('messages.upsert', async ({ messages: fpstdm64 }) => {
        const fpstdm65 = fpstdm64[0];
        
        if (!fpstdm65.message || fpstdm65.key.fromMe) return;
        
        await fpstdm38(fpstdm65);
    });
}

function fpstdm66() {
    const fpstdm67 = figlet.textSync('FPSTDM', {
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout:   'default',
      width:            process.stdout.columns,
      whitespaceBreak:  true
    });

    const fpstdm68 = '\x1b[32m';
    const fpstdm69 = '\x1b[0m';

    console.log(fpstdm68 + fpstdm67 + fpstdm69);
    
    const fpstdm70 = `
\x1b[38;5;240m┌───────────────┐
│ \x1b[38;5;118mgit+tg:fpstdm\x1b[38;5;240m │
└───────────────┘\x1b[0m`;

    console.log(fpstdm70);
}

const mainMenuKeyboard = {
    keyboard: [
        [{ text: '➕ إضافة وحذف' }, { text: '📋 قائمة المجموعات' }],
        [{ text: '📜 آخر 10 رسائل' }, { text: '🆔 ايديهات' }],
        [{ text: '⚙️ الضبط' }]
    ],
    resize_keyboard: true
};

const addRemoveMenuKeyboard = {
    keyboard: [
        [{ text: '➕ إضافة مجموعات' }],
        [{ text: '➖ حذف مجموعات' }],
        [{ text: '🔙 رجوع للقائمة الرئيسية' }]
    ],
    resize_keyboard: true
};

const idsMenuKeyboard = {
    keyboard: [
        [{ text: '🆔 ايديهات مجموعات واتساب' }, { text: '🆔 ايديهات مجموعات تلجرام' }],
        [{ text: '🔙 رجوع للقائمة الرئيسية' }]
    ],
    resize_keyboard: true
};

const settingsKeyboard = {
    keyboard: [
        [{ text: '⏹️ إيقاف البوت' }, { text: '▶️ تشغيل البوت' }],
        [{ text: '🔙 رجوع للقائمة الرئيسية' }]
    ],
    resize_keyboard: true
};

async function fpstdm71() {
    tgBot.onText(/\/start/, async (fpstdm72) => {
        const fpstdm73 = fpstdm72.chat.id;
        const fpstdm74 = fpstdm72.from.id.toString();
        const fpstdm75 = fpstdm72.from.first_name || 'يا صديقي';

        if (fpstdm74 !== ADMIN_TELEGRAM_ID.toString()) {
            tgBot.sendMessage(fpstdm73, `أهلاً بك ${fpstdm75}! أنا بوت تحويل رسائل واتساب إلى تلجرام. لا يمكنك التحكم بي مباشرة. يرجى التواصل مع المطور @fpstdm.`, { reply_markup: { remove_keyboard: true }});
            return;
        }

        const fpstdm76 = `أهلاً بك (${fpstdm75}) في بوت المطور علي!
لتواصل تلجرام او رؤية المشاريع على GitHub: @fpstdm

اختر من القائمة أدناه لإدارة مجموعات التحويل:
- **إضافة وحذف**: لإضافة أو إزالة مسارات التحويل.
- **قائمة المجموعات**: لعرض جميع مسارات التحويل الحالية.
- **آخر 10 رسائل**: لعرض آخر 10 رسائل تم إعادة توجيهها.
- **ايديهات**: لعرض معرفات مجموعات الواتساب والتليجرام.
- **الضبط**: لإيقاف أو تشغيل البوت.`;

        tgBot.sendMessage(fpstdm73, fpstdm76, {
            reply_markup: mainMenuKeyboard,
            parse_mode: 'Markdown'
        });
    });

    tgBot.on('message', async (fpstdm77) => {
        const fpstdm78 = fpstdm77.chat.id;
        const fpstdm79 = fpstdm77.from.id.toString();
        const fpstdm80 = fpstdm77.text;

        if (fpstdm77.chat.type === 'group' || fpstdm77.chat.type === 'supergroup') {
            if (!fpstdm17.has(fpstdm78.toString())) {
                fpstdm17.set(fpstdm78.toString(), fpstdm77.chat.title);
            }
        }

        if (fpstdm79 !== ADMIN_TELEGRAM_ID.toString() || (fpstdm80 && fpstdm80.startsWith('/start'))) {
            return;
        }
        
        if (fpstdm14[fpstdm79] && fpstdm14[fpstdm79].command === 'add_wa') {
            const fpstdm81 = fpstdm80.trim();
            fpstdm14[fpstdm79].data.wa_jid = fpstdm81;
            fpstdm14[fpstdm79].command = 'add_tg';
            tgBot.sendMessage(fpstdm78, 'الآن، أرسل معرف مجموعة التلجرام (Chat ID) المستهدفة (يجب أن يبدأ بـ "-100"):');
            return;
        } else if (fpstdm14[fpstdm79] && fpstdm14[fpstdm79].command === 'add_tg') {
            const fpstdm82 = fpstdm80.trim();
            const fpstdm83 = fpstdm14[fpstdm79].data.wa_jid;
            delete fpstdm14[fpstdm79];

            const fpstdm84 = await fpstdm25(fpstdm83, fpstdm82);
            tgBot.sendMessage(fpstdm78, fpstdm84, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
            return;
        } else if (fpstdm14[fpstdm79] && fpstdm14[fpstdm79].command === 'remove') {
            const fpstdm85 = fpstdm80.trim();
            delete fpstdm14[fpstdm79];

            const fpstdm86 = await fpstdm30(fpstdm85);
            tgBot.sendMessage(fpstdm78, fpstdm86, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
            return;
        }
        
        switch (fpstdm80) {
            case '➕ إضافة وحذف':
                tgBot.sendMessage(fpstdm78, 'اختر الإجراء:', { reply_markup: addRemoveMenuKeyboard });
                break;

            case '➕ إضافة مجموعات':
                fpstdm14[fpstdm79] = { command: 'add_wa', data: {} };
                tgBot.sendMessage(fpstdm78, 'الرجاء إرسال معرف مجموعة الواتساب (JID) التي تريد مراقبتها (يجب أن ينتهي بـ "@g.us"):');
                break;

            case '➖ حذف مجموعات':
                fpstdm14[fpstdm79] = { command: 'remove', data: {} };
                tgBot.sendMessage(fpstdm78, 'الرجاء إرسال معرف مجموعة الواتساب (JID) أو معرف مجموعة التلجرام (Chat ID) الذي تريد حذفه:\nمثال: `120363359585296306@g.us` أو `-1001695595612`', { parse_mode: 'Markdown' });
                break;

            case '📋 قائمة المجموعات':
                if (fpstdm13.forwarding_paths.length === 0) {
                    tgBot.sendMessage(fpstdm78, 'ℹ️ لا توجد مسارات تحويل معرفة حاليًا.', { reply_markup: mainMenuKeyboard });
                    return;
                }
                let fpstdm87 = '📊 مسارات التحويل الحالية:\n';
                fpstdm13.forwarding_paths.forEach((fpstdm88, fpstdm89) => {
                    fpstdm87 += `${fpstdm89 + 1}. واتساب: \`${fpstdm88.wa_jid}\` ➡️ تلجرام: \`${fpstdm88.tg_chat_id}\`\n`;
                });
                tgBot.sendMessage(fpstdm78, fpstdm87, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
                break;

            case '📜 آخر 10 رسائل':
                if (fpstdm15.length === 0) {
                    tgBot.sendMessage(fpstdm78, 'ℹ️ لم يتم تسجيل أي رسائل بعد.', { reply_markup: mainMenuKeyboard });
                } else {
                    let fpstdm90 = '📜 آخر 10 رسائل تم إعادة توجيهها:\n\n';
                    fpstdm15.forEach(fpstdm91 => {
                        fpstdm90 += `\`[${new Date(fpstdm91.timestamp).toLocaleTimeString()}]\` ${fpstdm91.text}\n`;
                    });
                    tgBot.sendMessage(fpstdm78, fpstdm90, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
                }
                break;

            case '🆔 ايديهات':
                tgBot.sendMessage(fpstdm78, 'اختر نوع المعرفات التي تريد عرضها:', { reply_markup: idsMenuKeyboard });
                break;

            case '🆔 ايديهات مجموعات واتساب':
                if (fpstdm16.size === 0) {
                    tgBot.sendMessage(fpstdm78, 'ℹ️ لم يتم التقاط أي معرفات مجموعات واتساب بعد. بمجرد أن يستقبل البوت رسالة من مجموعة، سيظهر معرفها واسمها هنا.', { reply_markup: idsMenuKeyboard });
                } else {
                    let fpstdm92 = '🆔 معرفات وأسماء مجموعات الواتساب المعروفة:\n\n';
                    fpstdm16.forEach((fpstdm93, fpstdm94) => {
                        fpstdm92 += `*${fpstdm93}*\n\`${fpstdm94}\`\n\n`;
                    });
                    tgBot.sendMessage(fpstdm78, fpstdm92, { parse_mode: 'Markdown', reply_markup: idsMenuKeyboard });
                }
                break;

            case '🆔 ايديهات مجموعات تلجرام':
                if (fpstdm17.size === 0) {
                    tgBot.sendMessage(fpstdm78, 'ℹ️ لم يتم التقاط أي معرفات مجموعات تلجرام بعد. بمجرد أن يستقبل البوت رسالة في مجموعة، سيظهر معرفها واسمها هنا.', { reply_markup: idsMenuKeyboard });
                } else {
                    let fpstdm95 = '🆔 معرفات وأسماء مجموعات التلجرام المعروفة:\n\n';
                    fpstdm17.forEach((fpstdm96, fpstdm97) => {
                        fpstdm95 += `*${fpstdm96}*\n\`${fpstdm97}\`\n\n`;
                    });
                    tgBot.sendMessage(fpstdm78, fpstdm95, { parse_mode: 'Markdown', reply_markup: idsMenuKeyboard });
                }
                break;

            case '⚙️ الضبط':
                tgBot.sendMessage(fpstdm78, 'قائمة الضبط:', { reply_markup: settingsKeyboard });
                break;

            case '⏹️ إيقاف البوت':
                tgBot.sendMessage(fpstdm78, 'جاري إيقاف البوت. ليعمل مرة أخرى، استخدم الأمر `pm2 start wa-tg-bot` في Termux.').then(() => {
                    process.exit(0); 
                });
                break;

            case '▶️ تشغيل البوت':
                tgBot.sendMessage(fpstdm78, 'البوت لا يمكنه تشغيل نفسه إذا كان متوقفاً بالكامل. يرجى استخدام الأمر `pm2 start wa-tg-bot` في Termux لتشغيل البوت.', { reply_markup: settingsKeyboard });
                break;

            case '🔙 رجوع للقائمة الرئيسية':
                tgBot.sendMessage(fpstdm78, 'العودة إلى القائمة الرئيسية.', { reply_markup: mainMenuKeyboard });
                break;
            
            default:
                break;
        }
    });

    tgBot.onText(/\/remove (.+)/, async (fpstdm98, fpstdm99) => {
        const fpstdm100 = fpstdm98.chat.id;
        const fpstdm101 = fpstdm98.from.id.toString();

        if (fpstdm101 !== ADMIN_TELEGRAM_ID.toString()) {
            tgBot.sendMessage(fpstdm100, '❌ أنت غير مصرح لك باستخدام هذا الأمر.');
            return;
        }

        const fpstdm102 = fpstdm99[1];
        const fpstdm103 = await fpstdm30(fpstdm102);
        tgBot.sendMessage(fpstdm100, fpstdm103, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
    });
}


(async () => {
    try {
        fpstdm66();
        
        await fpstdm22();

        if (!fpstdm13.telegram.token) {
            process.exit(1);
        }
        if (!fpstdm13.adminTelegramId) {
             process.exit(1);
        }

        tgBot = new TelegramBot(fpstdm13.telegram.token, { polling: true });
        
        fpstdm71();
        
        await fpstdm56();
    } catch (fpstdm104) {
        process.exit(1);
    }
})();

process.on('SIGINT', () => {
    process.exit();
});
