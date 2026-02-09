// api/stars.js (Server tomoni)
const axios = require('axios'); // Agar yo'q bo'lsa: npm install axios

// Express route misoli
module.exports = async (req, res) => {
    
    // CORS ruxsatlari (Agar frontend va backend boshqa domenda bo'lsa)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, message: 'Method not allowed' });
    }

    try {
        const { amount, userId } = req.body;

        // Validatsiya
        if (!amount || amount < 1) {
            return res.status(400).json({ ok: false, message: 'Miqdor noto‘g‘ri' });
        }

        const BOT_TOKEN = process.env.BOT_TOKEN; // .env faylidan oling
        if (!BOT_TOKEN) {
            throw new Error("Bot token serverda sozlanmagan!");
        }

        // Telegram API ga so'rov yuborish
        const telegramResponse = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            title: "Support Project",       // To'lov nomi
            description: `Donating ${amount} Stars to ProgUzmiR`, // Tavsif
            payload: `donate_${userId}_${Date.now()}`, // Ichki ID (Supabasega yozish uchun kerak bo'ladi)
            provider_token: "",             // Stars uchun bu BO'SH bo'lishi shart!
            currency: "XTR",                // Stars valyutasi kodi
            prices: [
                { label: "Donate", amount: parseInt(amount) } // Stars miqdori (bunda 1 = 1 Star)
            ]
        });

        if (telegramResponse.data.ok) {
            // Muvaffaqiyatli
            return res.status(200).json({
                ok: true,
                invoiceLink: telegramResponse.data.result
            });
        } else {
            console.error("Telegram API Error:", telegramResponse.data);
            return res.status(500).json({ ok: false, message: 'Telegram rad etdi' });
        }

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ ok: false, message: error.message });
    }
};
