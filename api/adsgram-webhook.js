// api/adsgram-webhook.js
// api/adsgram-webhook.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userid = req.query.userid;

    if (!userid) {
        return res.status(400).json({ error: 'Missing userid parameter' });
    }

    try {
        // 1. Supabase'dan shu foydalanuvchini topamiz
        // Jadval: user_states | ID ustuni: wallet
        const { data: user, error: fetchError } = await supabase
            .from('user_states') 
            .select('diamond, keys_total')
            .eq('wallet', userid) 
            .single();

        if (fetchError || !user) {
            console.log("Foydalanuvchi topilmadi yoki xato:", fetchError);
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Balansga 2000 tanga va 2 ta kalit qo'shamiz
        const newDiamond = (user.diamond || 0) + 2000;
        const newKeysTotal = (user.keys_total || 0) + 2;

        // 3. Yangilangan balansni bazaga saqlaymiz
        const { error: updateError } = await supabase
            .from('user_states')
            .update({ 
                diamond: newDiamond,
                keys_total: newKeysTotal
            })
            .eq('wallet', userid);

        if (updateError) {
            throw updateError;
        }

        // 4. Adsgram'ga "OK" deb javob qaytaramiz
        return res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook xatosi:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}