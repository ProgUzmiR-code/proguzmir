import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MA'LUMOTLARNI TEKSHIRISH FUNKSIYASI
function verifyTelegramInitData(initData) {
  const BOT_TOKEN = process.env.BOT_TOKEN; // Vercel Settings'ga qo'shing
  if (!BOT_TOKEN) return false;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
}

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
    const { initData, state } = req.body;

    if (!initData || !state) {
      return res.status(400).json({ error: 'Missing initData or state' });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');

    if (!user.id) {
      return res.status(400).json({ error: 'Missing user ID from Telegram' });
    }

    const wallet = `tg_${user.id}`;

    // YANGI: Extended state with all fields
    const { data, error } = await supabase
      .from('user_states')
      .upsert({
        wallet: wallet,
        prc_wei: String(state.prcWei || '0'),
        diamond: Number(state.diamond || 0),
        taps_used: Number(state.tapsUsed || 0),
        tap_cap: Number(state.tapCap || 0),
        selected_skin: state.selectedSkin || null,
        energy: Number(state.energy || 0),
        max_energy: Number(state.maxEnergy || 0),
        today_index: Number(state.todayIndex || 0),

        // YANGI: Daily quest data
        daily_week_start: state.dailyWeekStart || null,
        daily_claims: state.dailyClaims ? JSON.stringify(state.dailyClaims) : null,

        // YANGI: Income/Card upgrade data
        cards_lvl: state.cardsLvl ? JSON.stringify(state.cardsLvl) : null,

        // YANGI: Boosts/Upgrades data
        boosts: state.boosts ? JSON.stringify(state.boosts) : null,

        // YANGI: Daily claim date — har kunning claim sanasi
        claim_date: state.claimDate || null,

        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, wallet });
  } catch (err) {
    console.error('Save API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
