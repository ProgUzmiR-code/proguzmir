// api/invite.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// small Base62 helper (used as best-effort match)
const Base62 = {
    chars: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    encode(num) {
        let str = "";
        let n = BigInt(num);
        if (n === 0n) return this.chars[0];
        while (n > 0n) {
            str = this.chars[Number(n % 62n)] + str;
            n /= 62n;
        }
        return str;
    }
};

// Minimal HTTP handler for serverless environments (Next.js / Vercel / similar)
export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('Supabase env missing');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        const wallet = (body.wallet || req.query?.wallet || '').toString().trim();
        if (!wallet) return res.status(400).json({ error: 'wallet required' });

        // Try multiple possible values for referrer_id to be tolerant to storage formats
        const candidates = [wallet, `${wallet}`];
        try {
            // also add Base62 encoded numeric variant as a best-effort match
            if (/^\d+$/.test(wallet)) candidates.push(Base62.encode(wallet));
        } catch (e) { /* ignore */ }

        let data = null;
        let error = null;

        // Try queries sequentially so we can surface the first successful result
        for (const candidate of candidates) {
            const { data, error } = await supabase
                .from('user_states')
                .select('wallet, prc_wei, diamond, first_name') // username ni olib tashladik
                .eq('referrer_id', candidate);

            if (error) {
                console.error('Supabase error:', error);
                return res.status(500).json({ error: error.message });
            }

            if (q.error) {
                // non-fatal: note error and continue trying other candidates
                console.warn('Supabase query error for candidate', candidate, q.error);
                error = q.error;
                continue;
            }
            if (q.data && q.data.length) {
                data = q.data;
                error = null;
                break;
            }
        }

        // If no data found but no query error, return empty list
        if (!data) {
            if (error) {
                console.error('api/invite supabase error:', error);
                return res.status(500).json({ error: String(error.message || error) });
            }
            return res.json({ friends: [] });
        }

        // Normalize response
        const friends = (data || []).map(f => ({
            wallet: f.wallet || null,
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
