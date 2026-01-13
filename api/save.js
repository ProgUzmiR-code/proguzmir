import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MA'LUMOTLARNI TEKSHIRISH FUNKSIYASI
function verifyTelegramInitData(initData) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Vercel Settings'ga qo'shing
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
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { initData, state } = req.body;

    // Tekshiruv
    if (!verifyTelegramInitData(initData)) {
      return res.status(403).json({ error: 'Invalid Telegram data' });
    }

    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user'));

    const payload = {
      id: user.id, // Supabase'da 'id' ustuni bormi?
      wallet: `tg_${user.id}`,
      username: user.username || null,
      first_name: user.first_name || null,
      prc_wei: String(state.prcWei || '0'),
      diamond: Number(state.diamond || 0),
      energy: Number(state.energy || 0),
      max_energy: Number(state.maxEnergy || 0),
      taps_used: Number(state.tapsUsed || 0),
      selected_skin: state.selectedSkin || null,
      today_index: Number(state.todayIndex || 0),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('user_states')
      .upsert(payload, { onConflict: 'id' }); // 'id' Primary Key ekanligini tekshiring

    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    console.error('Xatolik:', err);
    res.status(500).json({ error: err.message });
  }
}
