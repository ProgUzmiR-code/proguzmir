// api/wallet-data.js (Backend)

export default function handler(req, res) {
  res.status(200).json({
    ton_address: process.env.MERCHANT_TON, // Oldindan bor edi
    evm_address: process.env.MERCHANT_EVM, // Oldindan bor edi
    
    // Yangi qo'shilganlar:
    supabase_url: process.env.SUPABASE_FUNCTION_URL, 
    supabase_key: process.env.SUPABASE_ANON_KEY
  });
}


