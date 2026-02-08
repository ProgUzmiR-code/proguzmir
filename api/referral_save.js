import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Base62 Decoder (friends.js dagi bilan bir xil)
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, startParam } = req.body;

    if (!userId || !startParam) {
      return res.status(400).json({ error: 'Missing userId or startParam' });
    }

    console.log(`🔗 Referral check for user: ${userId} with param: ${startParam}`);

    // 1. Referal ID ni aniqlash (Decode)
    let referrerId = null;
    
    if (startParam.startsWith('ref_')) {
      const rawCode = startParam.replace('ref_', '');
      
      // Avval Base62 decode qilib ko'ramiz
      let decoded = Base62.decode(rawCode);
      
      // Agar decode bo'lmasa (raqamni o'zi bo'lsa), rawCode ni olamiz
      referrerId = decoded || rawCode;
    } else {
      // Agar "ref_" bo'lmasa, shunchaki o'zini olamiz
      referrerId = startParam;
    }

    // 2. O'zini o'zi taklif qilishdan himoya
    if (!referrerId || referrerId === userId) {
      return res.json({ message: "Self-referral ignored" });
    }

    // 3. Bazada user borligini va referali bor-yo'qligini tekshirish
    // Biz userning 'wallet' ustuniga qarab qidiramiz
    const { data: userRecord, error: fetchError } = await supabase
      .from('user_states')
      .select('referrer_id')
      .eq('wallet', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 - bu "row not found" xatosi
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    // Agar user allaqachon referalga ega bo'lsa, hech narsa qilmaymiz
    if (userRecord && userRecord.referrer_id) {
      return res.json({ success: false, message: "User already has a referrer" });
    }

    // 4. Referalni yozish (UPDATE)
    // Agar user hali bazada bo'lmasa, biz uni yaratishimiz kerak (UPSERT)
    // Yoki save.js allaqachon yaratgan bo'lsa, shunchaki UPDATE qilamiz.
    // Eng ishonchli yo'l: UPSERT, lekin faqat referrer_id va wallet bilan.
    
    const { error: updateError } = await supabase
      .from('user_states')
      .upsert({
        wallet: userId,
        referrer_id: referrerId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'wallet' }); // Faqat mavjud bo'lsa yangilaydi yoki yangi yaratadi

    if (updateError) {
      console.error('Referral save error:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ success: true, referrerId: referrerId });

  } catch (err) {
    console.error('API Referral Save Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
