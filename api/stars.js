// /api/stars.js
const TelegramBot = require('node-telegram-bot-api');

// Botingiz TOKENini Vercel "Environment Variables" bo'limiga qo'shganingizga ishonch hosil qiling (BOT_TOKEN)
// Yoki test uchun shu yerga vaqtincha yozib turishingiz mumkin: '123456:ABC-...'
const token = process.env.BOT_TOKEN; 
const bot = new TelegramBot(token);

export default async function handler(req, res) {
    // Faqat POST so'rovlarini qabul qilamiz
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Frontenddan kelgan ma'lumotni o'qiymiz
        const { amount } = req.body;

        // Tekshiruv
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Iltimos, to‘g‘ri miqdor kiriting (min 1 star)' });
        }

        // --- STARS INVOICE YARATISH ---
        const title = "Loyihani qo‘llab-quvvatlash";
        const description = `${amount} Stars xayriya uchun`;
        const payload = `donate_${Date.now()}_${Math.floor(Math.random() * 1000)}`; // Unikal ID
        const providerToken = ""; // ❗ MUHIM: Telegram Stars uchun bu BO'SH bo'lishi shart!
        const currency = "XTR";   // ❗ MUHIM: Stars valyuta kodi
        
        // Narxlar ro'yxati (1 amount = 1 Star)
        const prices = [
            { label: "Donation", amount: parseInt(amount) } 
        ];

        // Telegram API orqali havola yaratamiz
        const invoiceLink = await bot.createInvoiceLink(
            title,
            description,
            payload,
            providerToken,
            currency,
            prices
        );

        // Havolani Frontendga qaytaramiz
        return res.status(200).json({ url: invoiceLink });

    } catch (error) {
        console.error("Stars API Error:", error);
        return res.status(500).json({ error: "To'lov havolasini yaratishda xatolik bo'ldi." });
    }
}
