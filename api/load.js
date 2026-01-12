// async function loadUserStateFromSupabase(walletOrIdentifier) {
//     try {
//         const client = window.supabaseClient || (typeof supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY ? supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY) : null);
//         if (!client) { console.warn('loadUserStateFromSupabase: supabase client not initialized'); return null; }

//         // normalize incoming identifier into our wallet key convention
//         function normalizeUserKeyLocal(idOrObj) {
//             if (!idOrObj) return 'guest';
//             if (typeof idOrObj === 'object') {
//                 if (idOrObj.tgId) return 'tg_' + String(idOrObj.tgId);
//                 if (idOrObj.username) return 'user_' + String(idOrObj.username).toLowerCase();
//             }
//             const s = String(idOrObj);
//             if (/^\d+$/.test(s)) return 'tg_' + s;
//             if (s.startsWith('tg_') || s.startsWith('user_')) return s;
//             return 'user_' + s.toLowerCase();
//         }

//         const walletKey = normalizeUserKeyLocal(walletOrIdentifier || localStorage.getItem('proguzmir_wallet') || '');

//         const { data, error } = await client.from('user_states').select('*').eq('wallet', walletKey).maybeSingle();
//         if (error) { console.warn('loadUserStateFromSupabase error', error); return null; }
//         if (!data) return null;

//         return {
//             prcWei: BigInt(data.prc_wei || '0'),
//             diamond: Number(data.diamond || 0),
//             tapsUsed: Number(data.taps_used || 0),
//             tapCap: Number(data.tap_cap || 0),
//             selectedSkin: data.selected_skin || '',
//             energy: Number(data.energy || 0),
//             maxEnergy: Number(data.max_energy || 0),
//             todayIndex: Number(data.today_index || 0),
//             wallet: data.wallet
//         };
//     } catch (err) {
//         console.warn('loadUserStateFromSupabase error', err);
//         return null;
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

  const { initData } = req.body;

  if (!verifyTelegramInitData(initData)) {
    return res.status(403).json({ error: 'Invalid Telegram data' });
  }

  const user = JSON.parse(new URLSearchParams(initData).get('user'));
  const wallet = `tg_${user.id}`;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet', wallet)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ user: data || null });
}