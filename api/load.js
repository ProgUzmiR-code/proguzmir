import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });

    // Telegram ID ni olish
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');
    const wallet = String(user.id);

    // Bazadan o'qish
    const { data, error } = await supabase
      .from('user_states')
      .select('*')
      .eq('wallet', wallet)
      .maybeSingle();

    if (error) throw error;

    // Agar user bazada yo'q bo'lsa (yangi user)
    if (!data) {
        return res.status(200).json({ user: null }); // Null qaytaramiz, frontend buni tushunadi
    }

    // JSON poliyalarni chiroyli qilib qaytaramiz
    // Muhim: Agar ustun bazada bo'lmasa, undefined ketmasligi uchun null tekshiruvini qilamiz
    const safeJson = (val) => {
        if (!val) return null;
        try { return typeof val === 'string' ? JSON.parse(val) : val; } catch(e) { return null; }
    };

    const result = {
        ...data,
        daily_claims: safeJson(data.daily_claims),
        cards_lvl: safeJson(data.cards_lvl),
        boosts: safeJson(data.boosts),
        owned_skins: safeJson(data.owned_skins) || ["bronze.png"], // Default qiymat
        completed_tasks: safeJson(data.completed_tasks) || {}
    };

    return res.status(200).json({ user: result });

  } catch (err) {
    console.error('Load Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
