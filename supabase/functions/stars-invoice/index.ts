// supabase/functions/stars-invoice/index.ts

// 1. CORS sozlamalari (Frontenddan murojaat qilish uchun ruxsat)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 2. Serverni ishga tushirish (Deno.serve - zamonaviy usul, import shart emas)
Deno.serve(async (req) => {
  
  // A. Agar brauzer "tekshiruv" (OPTIONS) so'rovini yuborsa, darhol ruxsat beramiz
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // B. Frontenddan kelgan ma'lumotlarni o'qiymiz
    const { amount, title, description, payload } = await req.json()

    // C. Bot Tokenini olish (Supabase Secrets dan)
    const botToken = Deno.env.get('BOT_TOKEN')
    if (!botToken) {
      throw new Error('BOT_TOKEN topilmadi! (Supabase secrets ni tekshiring)')
    }

    // D. Telegram API ga "Invoice Link" so'rab murojaat qilamiz
    const telegramPayload = {
      title: title || "Telegram Stars",
      description: description || "Xizmat uchun to'lov",
      payload: payload || "{}", 
      provider_token: "", // ❗ DIQQAT: Stars uchun bu BO'SH bo'lishi SHART!
      currency: "XTR",    // ❗ Telegram Stars valyutasi
      prices: [
        { label: "Stars", amount: parseInt(amount) } // Narxi
      ]
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload)
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API xatosi')
    }

    // E. Natijani (linkni) Frontendga qaytaramiz
    return new Response(
      JSON.stringify({ invoiceLink: data.result }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    // F. Xatolik bo'lsa
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
