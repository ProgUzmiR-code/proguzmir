// api/load.js
import supabase from '../config/db'; 

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS headers qo'shish
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');

    if (!user.id) {
      return res.status(400).json({ error: 'Missing user ID from Telegram' });
    }

    const wallet = String(user.id);

    const { data, error } = await supabase
      .from('user_states')
      .select('*')
      .eq('wallet', wallet)
      .maybeSingle();

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: error.message });
    }

    // YANGI: Parse JSON fields safely
    let result = null;
    if (data) {
      result = {
        ...data,
        daily_claims: data.daily_claims ? JSON.parse(data.daily_claims) : null,
        cards_lvl: data.cards_lvl ? JSON.parse(data.cards_lvl) : null,
        boosts: data.boosts ? JSON.parse(data.boosts) : null,
        claim_date: data.claim_date || null,
        rank: data.rank || 'bronze',  // YANGI: Rank field
        keys_total: data.keys_total || 0,  // YANGI: Keys fields
        keys_used: data.keys_used || 0,
        ton_wallet: data.ton_wallet || null,
        crypto_wallet: data.crypto_wallet || null
      };
    }

    return res.status(200).json({ user: result || null });
  } catch (err) {
    console.error('Load API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}