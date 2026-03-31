// api/adsgram-webhook.js
import { createClient } from '@supabase/supabase-js';

// Supabase'ga ulanish (O'z kalitlaringizni .env fayldan oladi)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // CORS sozlamalari (Adsgram serveridan kelishiga ruxsat berish)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Adsgram har doim GET so'rov yuboradi
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // URL orqali kelayotgan parametrni (userid) qabul qilib olamiz
    const { userid } = req.query;

    if (!userid) {
        return res.status(400).json({ error: 'Missing userid parameter' });
    }

    try {
        // 1. Supabase'dan shu foydalanuvchini topamiz
        // DIQQAT: 'users' degan jadval nomini o'zingizning bazangizdagi nomga almashtiring!
        const { data: user, error: fetchError } = await supabase
            .from('users') 
            .select('diamond, keysTotal')
            .eq('telegram_id', userid) // Yoki sizda id qanday saqlangan bo'lsa o'shani yozing
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Balansga 2000 tanga va 2 ta kalit qo'shamiz
        const newDiamond = (user.diamond || 0) + 2000;
        const newKeysTotal = (user.keysTotal || 0) + 2;

        // 3. Yangilangan balansni bazaga saqlaymiz
        const { error: updateError } = await supabase
            .from('users')
            .update({ 
                diamond: newDiamond,
                keysTotal: newKeysTotal
            })
            .eq('telegram_id', userid);

        if (updateError) {
            throw updateError;
        }

        // 4. Adsgram'ga "Hammasi joyida, pulni berdik!" deb javob qaytaramiz
        return res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}