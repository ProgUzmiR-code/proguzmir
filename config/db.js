// config/db.js

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default function handler(req, res) {
  // Bu funksiya Vercel serverida ishlaydi va .env ni o'qiy oladi
  res.status(200).json({
    ton_address: process.env.MERCHANT_TON,
    evm_address: process.env.MERCHANT_EVM,
  });
}
