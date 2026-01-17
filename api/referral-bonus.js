import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const REFERRAL_BONUS = 500n; // 500 almonds

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { referrerId, newUserWallet } = req.body;

        if (!referrerId || !newUserWallet) {
            return res.status(400).json({ error: 'Missing referrerId or newUserWallet' });
        }

        // Yangi foydalanuvchini tekshirish
        const { data: newUser, error: userError } = await supabase
            .from('user_states')
            .select('wallet, referrer_id')
            .eq('wallet', newUserWallet)
            .single();

        if (userError || !newUser) {
            return res.status(400).json({ error: 'New user not found' });
        }

        // Agar bu foydalanuvchi allaqachon referrer_id bor bo'lsa (takrorlangan ro'yxatdan o'tish)
        if (newUser.referrer_id) {
            return res.status(400).json({ error: 'User already has a referrer' });
        }

        // Referrer bo'yicha foydalanuvchini topish
        const { data: referrer, error: refError } = await supabase
            .from('user_states')
            .select('diamond')
            .eq('wallet', referrerId)
            .single();

        if (refError || !referrer) {
            return res.status(400).json({ error: 'Referrer not found' });
        }

        // Referrer'ga bonus qo'shish
        const newDiamond = (BigInt(referrer.diamond || 0) + REFERRAL_BONUS).toString();

        const { error: updateError } = await supabase
            .from('user_states')
            .update({ diamond: newDiamond })
            .eq('wallet', referrerId);

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        return res.status(200).json({
            ok: true,
            bonusGiven: REFERRAL_BONUS.toString(),
            newUserWallet,
            referrerWallet: referrerId
        });
    } catch (err) {
        console.error('Referral bonus API error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
}
