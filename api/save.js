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

    // 1. User ID ni olish
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');
    if (!user.id) return res.status(400).json({ error: 'Missing user ID' });

    const wallet = String(user.id);

    // 2. Bazaga yoziladigan obyektni yig'ish
    // Faqat "state" ichida kelgan ma'lumotlarnigina yangilaymiz (undefined bo'lsa tegmaymiz)
    const updates = {
      wallet: wallet,
      updated_at: new Date().toISOString()
    };

    // User info (har doim yangilash zarar qilmaydi)
    if (user.first_name) updates.first_name = user.first_name;
    if (user.last_name) updates.last_name = user.last_name;

    // --- MOLIYAVIY QISM (Auto-saveda keladi) ---
    if (state.prcWei !== undefined) updates.prc_wei = String(state.prcWei);
    if (state.diamond !== undefined) updates.diamond = Number(state.diamond);
    if (state.keysTotal !== undefined) updates.keys_total = Number(state.keysTotal);
    if (state.keysUsed !== undefined) updates.keys_used = Number(state.keysUsed);
    
    // Hamyonlar
    if (state.tonWallet !== undefined) updates.ton_wallet = state.tonWallet;
    if (state.cryptoWallet !== undefined) updates.crypto_wallet = state.cryptoWallet;

    // --- TO'LIQ QISM (Ilova yopilganda keladi) ---
    if (state.energy !== undefined) updates.energy = Number(state.energy);
    if (state.maxEnergy !== undefined) updates.max_energy = Number(state.maxEnergy);
    if (state.tapsUsed !== undefined) updates.taps_used = Number(state.tapsUsed);
    if (state.selectedSkin !== undefined) updates.selected_skin = state.selectedSkin;
    if (state.todayIndex !== undefined) updates.today_index = Number(state.todayIndex);
    if (state.rank !== undefined) updates.rank = state.rank;
    
    // JSON maydonlar
    if (state.ownedSkins !== undefined) updates.owned_skins = state.ownedSkins; // JSON.stringify frontda qilinadi yoki shunday yuboriladi
    if (state.dailyWeekStart !== undefined) updates.daily_week_start = state.dailyWeekStart;
    if (state.dailyClaims !== undefined) updates.daily_claims = state.dailyClaims;
    if (state.cardsLvl !== undefined) updates.cards_lvl = state.cardsLvl;
    if (state.boosts !== undefined) updates.boosts = state.boosts;
    if (state.claimDate !== undefined) updates.claim_date = state.claimDate;
    if (state.completedTasks !== undefined) updates.completed_tasks = state.completedTasks;

    // 3. UPSERT (Faqat o'zgarganlarni yangilaydi)
    const { error } = await supabase
      .from('user_states')
      .upsert(updates, { onConflict: 'wallet' });

    if (error) throw error;

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('API Save Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
