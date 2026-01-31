// api/leaderboard.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        // ❗ tg_id va connected_wallet ni olamiz
        const { data, error } = await supabase
            .from('user_states')
            .select('tg_id, connected_wallet, prc_wei, diamond, first_name, last_name')
            .order('diamond', { ascending: false }) // Olmos bo'yicha tartiblash (ixtiyoriy)
            .limit(100);

        if (error) throw error;

        return res.status(200).json({ leaderboard: data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}