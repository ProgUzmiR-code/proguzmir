import { createClient } from '@supabase/supabase-js';

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
        if (index === -1) return null;
        num = num * 62n + BigInt(index);
      }
      return num.toString();
    } catch (e) {
      return null;
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Frontenddan kelayotgan ma'lumotlar:
    // isPremium - bu yangi kirgan odam Premiummi yoki yo'q?
    const { userId, startParam, isPremium } = req.body;

    if (!userId || !startParam) {
      return res.status(400).json({ error: 'Missing userId or startParam' });
    }

    console.log(`🔗 Referral check: ${userId} -> ${startParam} (Premium: ${isPremium})`);

    // 1. Referrer ID ni aniqlash
    let referrerId = null;
    if (startParam.startsWith('ref_')) {
      const rawCode = startParam.replace('ref_', '');
      let decoded = Base62.decode(rawCode);
      referrerId = decoded || rawCode;
    } else {
      referrerId = startParam;
    }

    // O'zini o'zi taklif qilish yo'q
    if (!referrerId || referrerId === userId) {
      return res.json({ message: "Self-referral ignored" });
    }

    // 2. User allaqachon taklif qilinganmi?
    const { data: userRecord } = await supabase
      .from('user_states')
      .select('referrer_id')
      .eq('wallet', userId)
      .single();

    // Agar allaqachon referali bo'lsa, bonus bermaymiz, shunchaki qaytamiz
    if (userRecord && userRecord.referrer_id) {
      return res.json({ success: false, message: "Already invited" });
    }

    // 3. DO'STNI SAQLASH (Link qilish)
    // Shu bilan birga yangi userning "is_premium" statusini ham yozib ketamiz
    const { error: updateError } = await supabase
      .from('user_states')
      .upsert({
        wallet: userId,
        referrer_id: referrerId,
        is_premium: !!isPremium, // <--- BAZAGA YOZAMIZ
        updated_at: new Date().toISOString()
      }, { onConflict: 'wallet' });

    if (updateError) {
      console.error('Referral link error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // --- 4. BONUS BERISH QISMI (ENG MUHIMI) ---
    
    // Bonus miqdori: Agar yangi user Premium bo'lsa 50k, yo'qsa 25k
    const BONUS_AMOUNT = isPremium ? 50000 : 25000;

    // Referrer (taklif qilgan odam) ni topamiz va balansini oshiramiz
    // Supabase RPC funksiyasi bo'lmasa, oldin o'qib, keyin yozamiz:
    
    const { data: referrerData } = await supabase
        .from('user_states')
        .select('diamond, wallet')
        .eq('wallet', referrerId)
        .single();

    if (referrerData) {
        const newBalance = (referrerData.diamond || 0) + BONUS_AMOUNT;

        await supabase
            .from('user_states')
            .update({ diamond: newBalance })
            .eq('wallet', referrerId);
            
        console.log(`💰 Bonus added! ${referrerId} got +${BONUS_AMOUNT} diamonds.`);
    }

    return res.json({ success: true, referrerId, bonusAdded: BONUS_AMOUNT });

  } catch (err) {
    console.error('API Referral Save Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
