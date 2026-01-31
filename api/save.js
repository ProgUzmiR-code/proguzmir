// api/save.js

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MA'LUMOTLARNI TEKSHIRISH FUNKSIYASI
function verifyTelegramInitData(initData) {
  const BOT_TOKEN = process.env.BOT_TOKEN;
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { initData, state } = req.body;

    if (!initData || !state) {
      return res.status(400).json({ error: 'Missing initData or state' });
    }

    // 1. Telegramdan kelgan ma'lumotni o'qiymiz
    const urlParams = new URLSearchParams(initData);
    const user = JSON.parse(urlParams.get('user') || '{}');
    const startParam = urlParams.get('start_param');

    if (!user.id) {
      return res.status(400).json({ error: 'Missing user ID from Telegram' });
    }

    // ❗ O'ZGARISH: wallet o'rniga tg_id ishlatamiz
    const tgId = String(user.id);

    // Referrer ID ni aniqlash (Base62 decode)
    let referrerId = null;
    if (startParam && startParam.startsWith('ref_')) {
      const code = startParam.replace('ref_', '');
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
          referrerId = base62Decode(code);
        } else {
          referrerId = code; 
        }
      } catch (err) {
        console.warn('referrer decode failed', err);
        referrerId = code;
      }
    }

    // 2. Foydalanuvchi bor-yo'qligini tekshirish (tg_id bo'yicha)
    const { data: existingUser } = await supabase
      .from('user_states')
      .select('tg_id') 
      .eq('tg_id', tgId) // ❗ wallet -> tg_id
      .single();

    const isNewUser = !existingUser;

    // 3. Bazaga yozish (Upsert)
    const { data, error } = await supabase
      .from('user_states')
      .upsert({
        tg_id: tgId, // ❗ wallet -> tg_id (Asosiy kalit)
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        
        // O'yin ma'lumotlari
        prc_wei: String(state.prcWei || '0'),
        diamond: Number(state.diamond || 0),
        taps_used: Number(state.tapsUsed || 0),
        tap_cap: Number(state.tapCap || 0),
        selected_skin: state.selectedSkin || null,
        energy: Number(state.energy || 0),
        max_energy: Number(state.maxEnergy || 0),
        today_index: Number(state.todayIndex || 0),
        rank: state.rank || 'bronze',
        
        // Referal
        referrer_id: isNewUser ? (referrerId || null) : undefined, // Faqat yangi user bo'lsa yozamiz
        
        daily_week_start: state.dailyWeekStart || null,
        daily_claims: state.dailyClaims ? JSON.stringify(state.dailyClaims) : null,
        cards_lvl: state.cardsLvl ? JSON.stringify(state.cardsLvl) : null,
        boosts: state.boosts ? JSON.stringify(state.boosts) : null,
        claim_date: state.claimDate || null,
        keys_total: Number(state.keysTotal || 0),
        keys_used: Number(state.keysUsed || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tg_id' // ❗ wallet -> tg_id
      });

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // 4. Referal bonusi (Agar yangi user bo'lsa)
    if (isNewUser && referrerId) {
      try {
        const bonusRes = await fetch(
          `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://proguzmir.vercel.app/'}/api/referral-bonus`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referrerId: referrerId,
              newUserTgId: tgId // ❗ Nomini o'zgartirdik aniqlik uchun
            })
          }
        );
        if (!bonusRes.ok) console.warn('Referral bonus API error:', await bonusRes.text());
      } catch (bonusErr) {
        console.warn('Referral bonus error:', bonusErr);
      }
    }

    return res.status(200).json({ ok: true, tgId, isNewUser });
  } catch (err) {
    console.error('Save API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
