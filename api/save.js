import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ... (verifyTelegramInitData funksiyasi o'zgarishsiz qoladi)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, state } = req.body;
  if (!verifyTelegramInitData(initData)) {
    return res.status(403).json({ error: 'Invalid Telegram data' });
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));

  const payload = {
    id: user.id, // Bu Supabase'da Primary Key bo'lishi kerak
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

  // onConflict ni 'id' ga o'zgartiring agar 'wallet' Unique bo'lmasa
  const { error } = await supabase
    .from('user_states')
    .upsert(payload, { onConflict: ['id'] });

  if (error) {
    console.error('Supabase Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
}

