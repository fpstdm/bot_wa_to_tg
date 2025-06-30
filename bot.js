const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const figlet = require('figlet');

const fpstdm1 = 'config.json';
const fpstdm2 = 10; 

let config = {
    telegram: { token: '' },
    whatsapp: { authPath: 'baileys_auth_info' },
    forwarding_paths: [],
    adminTelegramId: '',
    isWhatsAppForwardingEnabled: true
};

let fpstdm3; 

const fpstdm4 = {}; 
const fpstdm5 = []; 
const fpstdm6 = new Map(); 
const fpstdm7 = new Map(); 

const fpstdm8 = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function fpstdm9(fpstdm10) {
    return new Promise(resolve => fpstdm8.question(fpstdm10, resolve));
}

async function fpstdm11() {
    if (fs.existsSync(fpstdm1)) {
        const fpstdm12 = fs.readFileSync(fpstdm1);
        const fpstdm13 = JSON.parse(fpstdm12);
        config = { ...config, ...fpstdm13 }; 
        fpstdm3 = config.adminTelegramId;
    } else {
        config.telegram.token = await fpstdm9('الرجاء إدخال توكن بوت التلجرام الخاص بك: ');
        config.adminTelegramId = await fpstdm9('الرجاء إدخال معرف التلجرام الخاص بك كمسؤول (Your Telegram Admin ID): ');
        
        fpstdm3 = config.adminTelegramId;

        fpstdm14();
    }
    fpstdm8.close();
}

function fpstdm14() {
    fs.writeFileSync(fpstdm1, JSON.stringify(config, null, 2));
}

async function fpstdm15(fpstdm16, fpstdm17) {
    if (config.forwarding_paths.length >= fpstdm2) {
        return `❌ لا يمكن إضافة المزيد من المسارات. الحد الأقصى هو ${fpstdm2}.`;
    }
    if (!fpstdm16.endsWith('@g.us')) {
        return '❌ معرف مجموعة الواتساب (JID) غير صحيح. يجب أن ينتهي بـ "@g.us".';
    }
    if (!fpstdm17.startsWith('-100')) {
        return '❌ معرف دردشة التلجرام (ChatID) غير صحيح. يجب أن يبدأ بـ "-100".';
    }

    const fpstdm18 = config.forwarding_paths.find(
        p => p.wa_jid === fpstdm16 && p.tg_chat_id === fpstdm17
    );

    if (fpstdm18) {
        return '⚠️ هذا المسار موجود بالفعل.';
    }

    config.forwarding_paths.push({ wa_jid: fpstdm16, tg_chat_id: fpstdm17 });
    fpstdm14();
    return `✅ تم إضافة مسار تحويل جديد: واتساب (\`${fpstdm16}\`) ➡️ تلجرام (\`${fpstdm17}\`).`;
}

async function fpstdm19(fpstdm20) {
    const fpstdm21 = config.forwarding_paths.length;
    config.forwarding_paths = config.forwarding_paths.filter(
        p => p.wa_jid !== fpstdm20 && p.tg_chat_id !== fpstdm20
    );

    if (config.forwarding_paths.length < fpstdm21) {
        fpstdm14();
        return `✅ تم إزالة مسار التحويل المرتبط بـ "${fpstdm20}" بنجاح.`;
    } else {
        return `❌ لم يتم العثور على مسار تحويل لـ "${fpstdm20}".`;
    }
}

let tgBot;
let waSock; 

async function fpstdm22(fpstdm23) {
    const fpstdm24 = [];
    for await (const fpstdm25 of fpstdm23) {
        fpstdm24.push(fpstdm25);
    }
    return Buffer.concat(fpstdm24);
}

async function fpstdm26(fpstdm27) {
    if (!config.isWhatsAppForwardingEnabled) {
        return; 
    }

    try {
        const fpstdm28 = fpstdm27.key.fromMe;
        const fpstdm29 = Object.keys(fpstdm27.message)[0]; 
        let fpstdm30 = '';
        let fpstdm31 = null;
        let fpstdm32 = {};
        const fpstdm33 = fpstdm27.pushName || 'مستخدم واتساب';

        if (fpstdm28 || !fpstdm27.message) return;

        const fpstdm34 = fpstdm27.key.remoteJid;
        let fpstdm35 = 'محادثة فردية';

        if (fpstdm34.endsWith('@g.us')) {
            if (!fpstdm6.has(fpstdm34)) {
                try {
                    const fpstdm36 = await waSock.groupMetadata(fpstdm34);
                    if (fpstdm36 && fpstdm36.subject) {
                        fpstdm35 = fpstdm36.subject;
                        fpstdm6.set(fpstdm34, fpstdm35);
                    }
                } catch (fpstdm37) {
                    fpstdm6.set(fpstdm34, 'مجموعة غير معروفة'); 
                    fpstdm35 = 'مجموعة غير معروفة';
                }
            } else {
                fpstdm35 = fpstdm6.get(fpstdm34);
            }
        }

        const fpstdm38 = config.forwarding_paths.filter(
            path => path.wa_jid === fpstdm34
        );

        if (fpstdm38.length === 0) {
            return; 
        }

        if (fpstdm27.message.conversation) {
            fpstdm30 = fpstdm27.message.conversation;
        } else if (fpstdm27.message.extendedTextMessage?.text) {
            fpstdm30 = fpstdm27.message.extendedTextMessage.text;
        } else if (fpstdm27.message[fpstdm29]?.caption) {
            fpstdm30 = fpstdm27.message[fpstdm29].caption;
        } else {
            fpstdm30 = '[ميديا]';
        }

        const fpstdm39 = `[${fpstdm35}] ${fpstdm33}: ${fpstdm30}`;

        const fpstdm40 = `[WA: ${fpstdm33} in ${fpstdm35} (${fpstdm34})] ${fpstdm30.substring(0, 50)}...`;
        fpstdm5.push({ timestamp: new Date().toISOString(), text: fpstdm40 });
        if (fpstdm5.length > 10) {
            fpstdm5.shift(); 
        }

        for (const path of fpstdm38) {
            const fpstdm41 = path.tg_chat_id;

            switch (fpstdm29) {
                case 'conversation':
                case 'extendedTextMessage':
                    await tgBot.sendMessage(fpstdm41, fpstdm39);
                    break;
                    
                case 'imageMessage':
                    fpstdm31 = await fpstdm42(fpstdm27.message.imageMessage, 'image');
                    await tgBot.sendPhoto(
                        fpstdm41,
                        fpstdm31,
                        { caption: fpstdm39 }
                    );
                    break;
                    
                case 'videoMessage':
                    fpstdm31 = await fpstdm42(fpstdm27.message.videoMessage, 'video');
                    await tgBot.sendVideo(
                        fpstdm41,
                        fpstdm31,
                        { caption: fpstdm39 }
                    );
                    break;
                    
                case 'documentMessage':
                    fpstdm31 = await fpstdm42(fpstdm27.message.documentMessage, 'document');
                    fpstdm32 = {
                        filename: fpstdm27.message.documentMessage.fileName || 'document',
                        contentType: fpstdm27.message.documentMessage.mimetype
                    };
                    await tgBot.sendDocument(
                        fpstdm41,
                        fpstdm31,
                        { caption: fpstdm39 },
                        fpstdm32
                    );
                    break;
                    
                case 'audioMessage':
                    fpstdm31 = await fpstdm42(fpstdm27.message.audioMessage, 'audio');
                    await tgBot.sendAudio(
                        fpstdm41,
                        fpstdm31,
                        { caption: fpstdm39 }
                    );
                    break;
                    
                case 'stickerMessage':
                    fpstdm31 = await fpstdm42(fpstdm27.message.stickerMessage, 'sticker');
                    await tgBot.sendSticker(
                        fpstdm41,
                        fpstdm31
                    );
                    break;
            }
        }
    } catch (fpstdm43) {
        if (fpstdm3 && tgBot) {
            try {
                await tgBot.sendMessage(fpstdm3.toString(), `⚠️ حدث خطأ في البوت: ${fpstdm43.message}`);
            } catch (fpstdm44) {
            }
        }
    }
}

async function fpstdm42(fpstdm45, fpstdm46) {
    const fpstdm47 = await downloadContentFromMessage(fpstdm45, fpstdm46);
    return await fpstdm22(fpstdm47);
}

async function fpstdm48() {
    const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authPath);

    waSock = makeWASocket({ 
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true,
        browser: ['WA-to-TG-Bot', 'Chrome', '1.0']
    });

    waSock.ev.on('connection.update', async (fpstdm49) => {
        const { connection, lastDisconnect, qr } = fpstdm49;

        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const fpstdm50 = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (fpstdm50) {
                setTimeout(fpstdm48, 5000);
            }
        } else if (connection === 'open') {
            if (fpstdm3) {
                 tgBot.sendMessage(fpstdm3.toString(), "✅ تم الاتصال بنجاح بالواتساب! البوت جاهز للعمل.", { reply_markup: { keyboard: mainMenuKeyboard.keyboard, resize_keyboard: true } });
            }
        }
    });

    waSock.ev.on('creds.update', saveCreds);

    waSock.ev.on('messages.upsert', async ({ messages }) => {
        const fpstdm51 = messages[0];
        
        if (!fpstdm51.message || fpstdm51.key.fromMe) return;
        
        await fpstdm26(fpstdm51);
    });
}

function fpstdm52() {
    const fpstdm53 = figlet.textSync('FPSTDM', {
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout:   'default',
      width:            process.stdout.columns,
      whitespaceBreak:  true
    });

    const fpstdm54 = '\x1b[32m';
    const fpstdm55 = '\x1b[0m';

    console.log(fpstdm54 + fpstdm53 + fpstdm55);
    
    const fpstdm56 = `
\x1b[38;5;240m┌───────────────┐
│ \x1b[38;5;118mgit+tg:fpstdm\x1b[38;5;240m │
└───────────────┘\x1b[0m`;

    console.log(fpstdm56);
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
        [{ text: '⏸️ إيقاف مؤقت للتحويل' }], 
        [{ text: '▶️ تشغيل التحويل' }],
        [{ text: '🔙 رجوع للقائمة الرئيسية' }]
    ],
    resize_keyboard: true
};

async function fpstdm57() {
    tgBot.onText(/\/start/, async (fpstdm58) => {
        const fpstdm59 = fpstdm58.chat.id;
        const fpstdm60 = fpstdm58.from.id.toString();
        const fpstdm61 = fpstdm58.from.first_name || 'يا صديقي';

        if (fpstdm60 !== fpstdm3.toString()) {
            tgBot.sendMessage(fpstdm59, `أهلاً بك ${fpstdm61}! أنا بوت تحويل رسائل واتساب إلى تلجرام. لا يمكنك التحكم بي مباشرة. يرجى التواصل مع المطور @fpstdm.`, { reply_markup: { remove_keyboard: true }});
            return;
        }

        const fpstdm62 = `أهلاً بك (${fpstdm61}) في بوت المطور علي!
لتواصل تلجرام او رؤية المشاريع على GitHub: @fpstdm

اختر من القائمة أدناه لإدارة مجموعات التحويل:
- **إضافة وحذف**: لإضافة أو إزالة مسارات التحويل.
- **قائمة المجموعات**: لعرض جميع مسارات التحويل الحالية.
- **آخر 10 رسائل**: لعرض آخر 10 رسائل تم إعادة توجيهها.
- **ايديهات**: لعرض معرفات مجموعات الواتساب والتليجرام.
- **الضبط**: لإيقاف أو تشغيل البوت.`;

        tgBot.sendMessage(fpstdm59, fpstdm62, {
            reply_markup: mainMenuKeyboard,
            parse_mode: 'Markdown'
        });
    });

    tgBot.on('message', async (fpstdm63) => {
        const fpstdm64 = fpstdm63.chat.id;
        const fpstdm65 = fpstdm63.from.id.toString();
        const fpstdm66 = fpstdm63.text;

        if (fpstdm63.chat.type === 'group' || fpstdm63.chat.type === 'supergroup') {
            if (!fpstdm7.has(fpstdm64.toString())) {
                fpstdm7.set(fpstdm64.toString(), fpstdm63.chat.title);
            }
        }

        if (fpstdm65 !== fpstdm3.toString() || (fpstdm66 && fpstdm66.startsWith('/start'))) {
            return;
        }
        
        if (fpstdm4[fpstdm65] && fpstdm4[fpstdm65].command === 'add_wa') {
            const fpstdm67 = fpstdm66.trim();
            fpstdm4[fpstdm65].data.wa_jid = fpstdm67;
            fpstdm4[fpstdm65].command = 'add_tg';
            tgBot.sendMessage(fpstdm64, 'الآن، أرسل معرف مجموعة التلجرام (Chat ID) المستهدفة (يجب أن يبدأ بـ "-100"):');
            return;
        } else if (fpstdm4[fpstdm65] && fpstdm4[fpstdm65].command === 'add_tg') {
            const fpstdm68 = fpstdm66.trim();
            const fpstdm69 = fpstdm4[fpstdm65].data.wa_jid;
            delete fpstdm4[fpstdm65];

            const fpstdm70 = await fpstdm15(fpstdm69, fpstdm68);
            tgBot.sendMessage(fpstdm64, fpstdm70, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
            return;
        } else if (fpstdm4[fpstdm65] && fpstdm4[fpstdm65].command === 'remove') { 
            const fpstdm71 = fpstdm66.trim();
            delete fpstdm4[fpstdm65];

            const fpstdm72 = await fpstdm19(fpstdm71);
            tgBot.sendMessage(fpstdm64, fpstdm72, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
            return;
        }
        
        switch (fpstdm66) {
            case '➕ إضافة وحذف':
                tgBot.sendMessage(fpstdm64, 'اختر الإجراء:', { reply_markup: addRemoveMenuKeyboard });
                break;

            case '➕ إضافة مجموعات':
                fpstdm4[fpstdm65] = { command: 'add_wa', data: {} };
                tgBot.sendMessage(fpstdm64, 'الرجاء إرسال معرف مجموعة الواتساب (JID) التي تريد مراقبتها (يجب أن ينتهي بـ "@g.us"):');
                break;

            case '➖ حذف مجموعات':
                fpstdm4[fpstdm65] = { command: 'remove', data: {} };
                tgBot.sendMessage(fpstdm64, 'الرجاء إرسال معرف مجموعة الواتساب (JID) أو معرف مجموعة التلجرام (Chat ID) الذي تريد حذفه:\nمثال: `120363359585296306@g.us` أو `-1001695595612`', { parse_mode: 'Markdown' });
                break;

            case '📋 قائمة المجموعات':
                if (config.forwarding_paths.length === 0) {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ لا توجد مسارات تحويل معرفة حاليًا.', { reply_markup: mainMenuKeyboard });
                    return;
                }
                let fpstdm73 = '📊 مسارات التحويل الحالية:\n';
                config.forwarding_paths.forEach((path, index) => {
                    fpstdm73 += `${index + 1}. واتساب: \`${path.wa_jid}\` ➡️ تلجرام: \`${path.tg_chat_id}\`\n`;
                });
                tgBot.sendMessage(fpstdm64, fpstdm73, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
                break;

            case '📜 آخر 10 رسائل':
                if (fpstdm5.length === 0) {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ لم يتم تسجيل أي رسائل بعد.', { reply_markup: mainMenuKeyboard });
                } else {
                    let fpstdm74 = '📜 آخر 10 رسائل تم إعادة توجيهها:\n\n';
                    fpstdm5.forEach(msg => {
                        fpstdm74 += `\`[${new Date(msg.timestamp).toLocaleTimeString()}]\` ${msg.text}\n`; 
                    });
                    tgBot.sendMessage(fpstdm64, fpstdm74, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
                }
                break;

            case '🆔 ايديهات':
                tgBot.sendMessage(fpstdm64, 'اختر نوع المعرفات التي تريد عرضها:', { reply_markup: idsMenuKeyboard });
                break;

            case '🆔 ايديهات مجموعات واتساب':
                if (fpstdm6.size === 0) {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ لم يتم التقاط أي معرفات مجموعات واتساب بعد. بمجرد أن يستقبل البوت رسالة من مجموعة، سيظهر معرفها واسمها هنا.', { reply_markup: idsMenuKeyboard });
                } else {
                    let fpstdm75 = '🆔 معرفات وأسماء مجموعات الواتساب المعروفة:\n\n';
                    fpstdm6.forEach((name, jid) => {
                        fpstdm75 += `*${name}*\n\`${jid}\`\n\n`;
                    });
                    tgBot.sendMessage(fpstdm64, fpstdm75, { parse_mode: 'Markdown', reply_markup: idsMenuKeyboard });
                }
                break;

            case '🆔 ايديهات مجموعات تلجرام':
                if (fpstdm7.size === 0) {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ لم يتم التقاط أي معرفات مجموعات تلجرام بعد. بمجرد أن يستقبل البوت رسالة في مجموعة، سيظهر معرفها واسمها هنا.', { reply_markup: idsMenuKeyboard });
                } else {
                    let fpstdm76 = '🆔 معرفات وأسماء مجموعات التلجرام المعروفة:\n\n';
                    fpstdm7.forEach((name, id) => {
                        fpstdm76 += `*${name}*\n\`${id}\`\n\n`;
                    });
                    tgBot.sendMessage(fpstdm64, fpstdm76, { parse_mode: 'Markdown', reply_markup: idsMenuKeyboard });
                }
                break;

            case '⚙️ الضبط':
                tgBot.sendMessage(fpstdm64, 'قائمة الضبط:', { reply_markup: settingsKeyboard });
                break;

            case '⏸️ إيقاف مؤقت للتحويل':
                if (config.isWhatsAppForwardingEnabled) {
                    config.isWhatsAppForwardingEnabled = false;
                    fpstdm14();
                    tgBot.sendMessage(fpstdm64, '✅ تم إيقاف تحويل رسائل الواتساب مؤقتًا. لن يتم تحويل أي رسائل حتى تقوم بتشغيله مجدداً.', { reply_markup: settingsKeyboard });
                } else {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ تحويل رسائل الواتساب متوقف بالفعل.', { reply_markup: settingsKeyboard });
                }
                break;

            case '▶️ تشغيل التحويل':
                if (!config.isWhatsAppForwardingEnabled) {
                    config.isWhatsAppForwardingEnabled = true;
                    fpstdm14();
                    tgBot.sendMessage(fpstdm64, '✅ تم تشغيل تحويل رسائل الواتساب بنجاح. ستبدأ الرسائل بالتحويل الآن.', { reply_markup: settingsKeyboard });
                } else {
                    tgBot.sendMessage(fpstdm64, 'ℹ️ تحويل رسائل الواتساب قيد التشغيل بالفعل.', { reply_markup: settingsKeyboard });
                }
                break;
            
            case '🔙 رجوع للقائمة الرئيسية':
                tgBot.sendMessage(fpstdm64, 'العودة إلى القائمة الرئيسية.', { reply_markup: mainMenuKeyboard });
                break;
            
            default:
                break;
        }
    });

    tgBot.onText(/\/remove (.+)/, async (fpstdm77, fpstdm78) => {
        const fpstdm79 = fpstdm77.chat.id;
        const fpstdm80 = fpstdm77.from.id.toString();

        if (fpstdm80 !== fpstdm3.toString()) {
            tgBot.sendMessage(fpstdm79, '❌ أنت غير مصرح لك باستخدام هذا الأمر.');
            return;
        }

        const fpstdm81 = fpstdm78[1];
        const fpstdm82 = await fpstdm19(fpstdm81);
        tgBot.sendMessage(fpstdm79, fpstdm82, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard });
    });
}

(async () => {
    try {
        fpstdm52();
        
        await fpstdm11();

        if (!config.telegram.token) {
        }
        if (!config.adminTelegramId) {
        }

        tgBot = new TelegramBot(config.telegram.token, { polling: true });
        
        fpstdm57();
        
        await fpstdm48();
    } catch (fpstdm83) {
    }
})();

process.on('SIGINT', () => {
    process.exit();
});
