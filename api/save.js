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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { initData, state } = req.body;

    if (!initData || !state) {
      return res.status(400).json({ error: 'Missing initData or state' });
    }

    // 1. Telegram User ID ni olish
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');
    
    if (!user.id) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    const wallet = String(user.id);

    // 2. Hamyonlarni olish
    const tonWalletVal = state.tonWallet || state.ton_wallet || null;
    const cryptoWalletVal = state.cryptoWallet || state.crypto_wallet || null;

    // 3. Ma'lumotlarni saqlash (UPSERT)
    // DIQQAT: Bu yerda 'referrer_id' YO'Q! Shuning uchun u o'chib ketmaydi.
    const { error } = await supabase
      .from('user_states')
      .upsert({
        wallet: wallet,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        // O'yin state
        prc_wei: String(state.prcWei || '0'),
        diamond: Number(state.diamond || 0),
        taps_used: Number(state.tapsUsed || 0),
        tap_cap: Number(state.tapCap || 0),
        selected_skin: state.selectedSkin || null,
        energy: Number(state.energy || 0),
        max_energy: Number(state.maxEnergy || 0),
        today_index: Number(state.todayIndex || 0),
        rank: state.rank || 'bronze',
        
        // Qo'shimcha
        daily_week_start: state.dailyWeekStart || null,
        daily_claims: state.dailyClaims ? JSON.stringify(state.dailyClaims) : null,
        cards_lvl: state.cardsLvl ? JSON.stringify(state.cardsLvl) : null,
        boosts: state.boosts ? JSON.stringify(state.boosts) : null,
        claim_date: state.claimDate || null,
        keys_total: Number(state.keysTotal || 0),
        keys_used: Number(state.keysUsed || 0),

        // Hamyonlar
        ton_wallet: tonWalletVal,
        crypto_wallet: cryptoWalletVal,

        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet' // Faqat o'zgarganlarni yangilaydi, referrer_id ga tegmaydi
      });

    if (error) {
      console.error('Supabase save error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('API Save Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
