// مكتبات Node.js المطلوبة
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const fs = require('fs'); // فقط لحفظ مسار المصادقة

// --- إعدادات التكوين ---
const AUTH_PATH = 'baileys_auth_info_id_finder'; // مسار ملف المصادقة الجديد لمنع التداخل

// دالة رئيسية للاتصال بالواتساب
async function connectToWhatsAppIdFinder() {
    // استخدم مسار مصادقة مختلف لمنع التداخل مع البوت الأساسي
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_PATH);

    const sock = makeWASocket({
        logger: P({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true,
        browser: ['WhatsApp-ID-Finder', 'Chrome', '1.0']
    });

    // معالجة تحديثات الاتصال
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📲 امسح رمز QR للاتصال بالواتساب (جالب المعرفات):');
            qrcode.generate(qr, { small: true });
            console.log('⏳ انتظر حتى يتم الاتصال...\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`🔌 تم قطع الاتصال: ${lastDisconnect.error?.message}`);
            
            if (shouldReconnect) {
                console.log('🔄 محاولة إعادة الاتصال بجالب المعرفات...');
                setTimeout(connectToWhatsAppIdFinder, 5000);
            } else {
                console.log('⛔ تم تسجيل الخروج من الواتساب. يرجى حذف مجلد المصادقة الجديد وإعادة تشغيل جالب المعرفات.');
            }
        } else if (connection === 'open') {
            console.log('✅ تم الاتصال بنجاح بالواتساب (جالب المعرفات جاهز)!');
            console.log('✉️ الآن، أرسل أي رسالة في أي مجموعة واتساب لترى معرفها.');
        }
    });

    // حفظ بيانات الاعتماد عند التحديث
    sock.ev.on('creds.update', saveCreds);

    // معالجة الرسائل الواردة
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        
        // نتجاهل الرسائل المرسلة من البوت نفسه أو التي لا تحتوي على محتوى
        if (!msg.message || msg.key.fromMe) return;

        // إذا كانت الرسالة من مجموعة (أي أن remoteJid ينتهي بـ @g.us)
        if (msg.key.remoteJid.endsWith('@g.us')) {
            const groupId = msg.key.remoteJid;
            const groupName = msg.pushName || 'مجموعة غير معروفة الاسم'; // اسم المرسل هو غالبا اسم المجموعة في رسائل الواتس
            
            // نطبع المعرف واسم المجموعة في سطر الأوامر
            console.log(`\n🎉 تم العثور على معرف مجموعة:`);
            console.log(`اسم المجموعة (تقريبي): ${groupName}`);
            console.log(`معرف المجموعة (WhatsApp ID): ${groupId}`);
            console.log(`-----------------------------------`);
            console.log(`يمكنك نسخ هذا المعرف واستخدامه في السكريبت الأساسي.`);
        }
    });
}

// بدء التشغيل
(async () => {
    try {
        console.log('🚀 بدء تشغيل جالب معرفات مجموعات الواتساب');
        await connectToWhatsAppIdFinder();
    } catch (error) {
        console.error('❌ فشل تشغيل جالب المعرفات:', error);
        process.exit(1);
    }
})();

// إغلاق نظيف عند إنهاء البرنامج
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف جالب معرفات الواتساب...');
    process.exit();
});

