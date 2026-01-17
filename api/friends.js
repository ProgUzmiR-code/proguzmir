// api/friends.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { referrer } = req.query;
    if (!referrer) {
        return res.status(400).json({ error: 'Missing referrer' });
    }

    const { data, error } = await supabase
        .from('user_states')
        .select('first_name, prc_wei')
        .eq('referrer_id', `ref_tg_${referrer}`);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({
        friends: data || [],
        count: data.length
    });
}