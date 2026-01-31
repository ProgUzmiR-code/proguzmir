// api/invite.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        // Frontenddan 'wallet' deb kelsa ham, bu aslida tg_id
        const userId = (body.wallet || req.query?.wallet || '').toString().trim();

        if (!userId) return res.status(400).json({ error: 'User ID required' });

        // Bazadan shu odam taklif qilganlarni qidiramiz
        const { data, error } = await supabase
            .from('user_states')
            .select('tg_id, connected_wallet, prc_wei, diamond, first_name')
            .eq('referrer_id', userId); // ❗ referrer_id endi tg_id ga teng bo'lishi kerak

        if (error) {
            console.error('Invite API Error:', error);
            return res.status(500).json({ error: error.message });
        }

        const friends = (data || []).map(f => ({
            tg_id: f.tg_id, // ❗ wallet -> tg_id
            wallet: f.connected_wallet, // Ulangan hamyon (agar bor bo'lsa)
            first_name: f.first_name || 'Unknown',
            prc_wei: f.prc_wei ? String(f.prc_wei) : '0',
            diamond: Number(f.diamond || 0)
        }));

        return res.json({ friends });

    } catch (err) {
        console.error('api/invite error', err);
        return res.status(500).json({ error: String(err) });
    }
}
