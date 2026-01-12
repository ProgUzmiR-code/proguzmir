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
    .update(process.env.BOT_TOKEN) // use BOT_TOKEN from .env
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