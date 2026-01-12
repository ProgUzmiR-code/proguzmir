// // Supabase sozlamalari
// const SUPABASE_URL = 'https://iqcpsqqsdspbonmurjxp.supabase.co';
// const SUPABASE_ANON_KEY = 'sb_publishable_HFFtHiGVPBNg-AtRApiFqA_NKfMDevH';
// const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// // State-ni Supabase-ga sinxronizatsiya qilish
// async function syncSnapshotToSupabase(state) {
//     if (!state.wallet) return;

//     const { error } = await supabaseClient
//         .from('user_states')
//         .upsert({
//             wallet: state.wallet,
//             prc_wei: state.prcWei.toString(),
//             diamond: state.diamond,
//             taps_used: state.tapsUsed,
//             tap_cap: state.tapCap,
//             selected_skin: state.selectedSkin,
//             energy: state.energy,
//             max_energy: state.maxEnergy,
//             today_index: state.todayIndex,
//             last_sync: new Date().toISOString()
//         }, { onConflict: 'wallet' });

//     if (error) console.warn('Supabase sync error:', error.message);
// }

// /**
//  * Normalize identifier into a wallet key used for DB (prefer tg_{id}, fallback user_{username})
//  * Accepts: { tgId } or { username } or plain string
//  */
// function normalizeUserKey(idOrObj) {
//     if (!idOrObj) return 'guest';
//     if (typeof idOrObj === 'object') {
//         if (idOrObj.tgId) return 'tg_' + String(idOrObj.tgId);
//         if (idOrObj.username) return 'user_' + String(idOrObj.username).toLowerCase();
//     }
//     const s = String(idOrObj);
//     if (/^\d+$/.test(s)) return 'tg_' + s;
//     if (s.startsWith('tg_') || s.startsWith('user_')) return s;
//     return 'user_' + s.toLowerCase();
// }

// /**
//  * Upsert user state into "user_states" table.
//  * state: { wallet, prcWei (BigInt or string), diamond, tapsUsed, tapCap, selectedSkin, energy, maxEnergy, todayIndex }
//  */
// async function syncUserStateToSupabase(state) {
//     try {
//         const client = window.supabaseClient || (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY) : null);
//         if (!client) { console.warn('syncUserStateToSupabase: supabase client not initialized'); return; }

//         const walletKey = normalizeUserKey(state.wallet || localStorage.getItem('proguzmir_wallet') || state.tgId || state.username);
//         const payload = {
//             wallet: walletKey,
//             prc_wei: (state.prcWei !== undefined) ? String(state.prcWei) : '0',
//             diamond: Number(state.diamond || 0),
//             taps_used: Number(state.tapsUsed || 0),
//             tap_cap: Number(state.tapCap || 0),
//             selected_skin: state.selectedSkin || null,
//             energy: Number(state.energy || 0),
//             max_energy: Number(state.maxEnergy || 0),
//             today_index: (typeof state.todayIndex === 'number') ? state.todayIndex : 0,
//             last_sync: new Date().toISOString()
//         };
//         console.log('Synchronizing user state to Supabase:', payload);
        
//         const { error } = await client.from('user_states').upsert(payload, { onConflict: 'wallet' });
//         if (error) console.warn('Supabase sync error:', error.message || error);
//     } catch (err) {
//         console.warn('syncUserStateToSupabase error', err);
//     }
// }




import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Telegram initData verify
function verifyTelegramInitData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = [...urlParams.entries()]
    .sort()
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, state } = req.body;
  if (!verifyTelegramInitData(initData)) {
    return res.status(403).json({ error: 'Invalid Telegram data' });
  }

  const user = JSON.parse(new URLSearchParams(initData).get('user'));

  const payload = {
    id: user.id,
    wallet: `tg_${user.id}`,
    username: user.username || null,
    first_name: user.first_name || null,
    prc_wei: state.prcWei,
    diamond: state.diamond,
    energy: state.energy,
    max_energy: state.maxEnergy,
    taps_used: state.tapsUsed,
    selected_skin: state.selectedSkin,
    today_index: state.todayIndex,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('users')
    .upsert(payload);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true });
}

