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

    // Tekshiruv (ixtiyoriy - agar Telegram initData bo'lmasa)
    // if (!verifyTelegramInitData(initData)) {
    //   return res.status(403).json({ error: 'Invalid Telegram data' });
    // }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');

    const wallet = user.id ? `tg_${user.id}` : 'guest';

    // Upsert operatsiyasi (yangi ma'lumot qo'shish yoki mavjudni yangilash)
    const { error } = await supabase
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
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet'
      });

    if (error) {
      console.error('Supabase upsert xatosi:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, wallet });
  } catch (err) {
    console.error('Save API xatosi:', err);
    return res.status(500).json({ error: err.message || 'Server xatosi' });
  }
}
