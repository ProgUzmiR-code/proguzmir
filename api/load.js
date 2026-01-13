import { createClient } from '@supabase/supabase-js';

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

    const wallet = `tg_${user.id}`;

    const { data, error } = await supabase
      .from('user_states')
      .select('*')
      .eq('wallet', wallet)
      .maybeSingle();

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: error.message });
    }

    // YANGI: JSONB columns are already objects, don't parse them
    let result = null;
    if (data) {
      result = {
        ...data,
        // JSONB columns come as objects, not strings
        // Only parse if they're strings (defensive programming)
        daily_claims: typeof data.daily_claims === 'string' 
          ? JSON.parse(data.daily_claims) 
          : (data.daily_claims || null),
        cards_lvl: typeof data.cards_lvl === 'string' 
          ? JSON.parse(data.cards_lvl) 
          : (data.cards_lvl || null),
        boosts: typeof data.boosts === 'string' 
          ? JSON.parse(data.boosts) 
          : (data.boosts || null)
      };
    }

    return res.status(200).json({ user: result || null });
  } catch (err) {
    console.error('Load API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}