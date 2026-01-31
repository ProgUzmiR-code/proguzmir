// api/save.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const Base62 = {
  chars: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  decode(str) {
    if (!str) return null;
    let num = 0n;
    try {
      for (let i = 0; i < str.length; i++) {
        const index = this.chars.indexOf(str[i]);
        if (index === -1) return null; // Noto'g'ri belgi bo'lsa
        num = num * 62n + BigInt(index);
      }
      return num.toString();
    } catch (e) {
      return null;
    }
  }
};


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
    const startParam = urlParams.get('start_param'); // ref_<encoded> or null

    const wallet = String(user.id);
    // Decode referrer from start_param if present
    let referrerId = null;
    if (startParam && startParam.startsWith('ref_')) {
      const code = startParam.replace('ref_', '');
      // Base62 decode helper (returns decimal string)
      const base62Decode = (s) => {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let num = 0n;
        for (let i = 0; i < s.length; i++) {
          const idx = chars.indexOf(s[i]);
          if (idx < 0) throw new Error('Invalid base62 char');
          num = num * 62n + BigInt(idx);
        }
        return num.toString();
      };

      try {
        if (/^[0-9a-zA-Z]+$/.test(code)) {
          // likely Base62-encoded numeric id
          referrerId = base62Decode(code);
        } else {
          // fallback: decode URL-safe base64 (replace - _ with + /)
          const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
          try {
            referrerId = Buffer.from(b64, 'base64').toString('utf8');
          } catch (e) {
            referrerId = code; // last resort: store raw code
          }
        }
      } catch (err) {
        console.warn('referrer decode failed, storing raw code', err);
        referrerId = code;
      }
    }


    if (!user.id) {
      return res.status(400).json({ error: 'Missing user ID from Telegram' });
    }

    // YANGI: Foydalanuvchi mavjudligini tekshirish (yangi foydalanuvchimi?)
    const { data: existingUser } = await supabase
      .from('user_states')
      .select('wallet')
      .eq('wallet', wallet)
      .single();

    const isNewUser = !existingUser;

    // Safely extract wallet fields from incoming state (support camelCase and snake_case)
    const tonWalletVal = state && (state.tonWallet || state.ton_wallet) ? (state.tonWallet || state.ton_wallet) : null;
    const cryptoWalletVal = state && (state.cryptoWallet || state.crypto_wallet) ? (state.cryptoWallet || state.crypto_wallet) : null;

    // Foydalanuvchini upsert qilish
    const { data, error } = await supabase
      .from('user_states')
      .upsert({
        wallet: wallet,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        prc_wei: String(state.prcWei || '0'),
        diamond: Number(state.diamond || 0),
        taps_used: Number(state.tapsUsed || 0),
        tap_cap: Number(state.tapCap || 0),
        selected_skin: state.selectedSkin || null,
        energy: Number(state.energy || 0),
        max_energy: Number(state.maxEnergy || 0),
        today_index: Number(state.todayIndex || 0),
        rank: state.rank || 'bronze',
        referrer_id: referrerId || null,
        daily_week_start: state.dailyWeekStart || null,
        daily_claims: state.dailyClaims ? JSON.stringify(state.dailyClaims) : null,
        cards_lvl: state.cardsLvl ? JSON.stringify(state.cardsLvl) : null,
        boosts: state.boosts ? JSON.stringify(state.boosts) : null,
        claim_date: state.claimDate || null,
        // YANGI: keys fields
        keys_total: Number(state.keysTotal || 0),
        keys_used: Number(state.keysUsed || 0),
        // persist wallets from incoming state
        ton_wallet: tonWalletVal,
        crypto_wallet: cryptoWalletVal,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'wallet'
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // YANGI: Yangi foydalanuvchi bo'lsa va referrer_id mavjud bo'lsa, referrer'ga bonus berish
    if (isNewUser && referrerId) {
      try {
        // /api/referral-bonus chaqirish
        const bonusRes = await fetch(
          `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://proguzmir.vercel.app/'}/api/referral-bonus`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerId: referrerId,
              newUserWallet: wallet
            })
          }
        );

        if (!bonusRes.ok) {
          console.warn('Referral bonus API error:', await bonusRes.text());
        } else {
          console.log('Referral bonus given:', await bonusRes.json());
        }
      } catch (bonusErr) {
        console.warn('Referral bonus error (non-critical):', bonusErr);
        // Hatolik bo'lsa ham, foydalanuvchi ro'yxatdan o'tgan bo'ladi
      }
    }

    return res.status(200).json({ ok: true, wallet, isNewUser });
  } catch (err) {
    console.error('Save API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
