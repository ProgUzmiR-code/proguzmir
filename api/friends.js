// api/friends.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { referrer } = req.query;

        if (!referrer) {
            return res.status(400).json({ error: 'Missing referrer' });
        }

        // Referrer bo'yicha taklif qilingan do'stlarni olish
        const { data, error } = await supabase
            .from('user_states')
            .select('first_name, prc_wei, wallet')
            .eq('referrer_id', `ref_tg_${referrer}`);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({
            friends: data || [],
            count: data?.length || 0
        });
    } catch (err) {
        console.error('Friends API error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
}