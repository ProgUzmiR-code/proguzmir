// api/invite.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Minimal HTTP handler for serverless environments (Next.js / Vercel / similar)
export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const wallet = (body.wallet || req.query?.wallet || '').toString();
        if (!wallet) return res.status(400).json({ error: 'wallet required' });

        // Query users who were referred by this wallet (referrer_id)
        const { data, error } = await supabase
            .from('user_states')
            .select('wallet, prc_wei, diamond, first_name, username')
            .eq('referrer_id', wallet);

        if (error) return res.status(500).json({ error: error.message || String(error) });

        // Normalize response
        const friends = (data || []).map(f => ({
            wallet: f.wallet || null,
            username: f.username || null,
            first_name: f.first_name || (f.wallet ? f.wallet : 'Unknown'),
            prc_wei: f.prc_wei ? String(f.prc_wei) : '0',
            diamond: typeof f.diamond === 'number' ? f.diamond : Number(f.diamond || 0)
        }));

        return res.json({ friends });
    } catch (err) {
        console.error('api/invite error', err);
        return res.status(500).json({ error: String(err) });
    }
}
