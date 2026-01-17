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
    // Faqat kerakli ustunlarni va top 100 ta userni olamiz
    const { data, error } = await supabase
      .from('user_states')
      .select('wallet, prc_wei')
      .limit(200); 

    if (error) throw error;

    return res.status(200).json({ leaderboard: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
