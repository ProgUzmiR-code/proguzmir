import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Vercel (frontend) Supabasega ulanishi uchun ruxsatlar (CORS)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Agar brauzer shunchaki "tekshiruv" (OPTIONS) yuborsa, darhol "OK" deymiz
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Frontenddan (index.html) kelgan ma'lumotni o'qiymiz
    const { amount, title, description, payload } = await req.json()

    // Bot tokenini xavfsiz joydan olamiz
    const botToken = Deno.env.get('BOT_TOKEN')
    if (!botToken) {
      throw new Error('BOT_TOKEN topilmadi!')
    }

    // 3. Telegram API ga "Invoice Link" so'rab murojaat qilamiz
    const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title || "Telegram Stars", // Mahsulot nomi
        description: description || "Xizmat uchun to'lov", // Tavsif
        payload: payload || "{}", // O'zingizga kerakli ichki ma'lumot
        provider_token: "", // DIQQAT: Stars uchun bu bo'sh bo'lishi SHART!
        currency: "XTR", // Telegram Stars valyutasi
        prices: [
          { label: "Stars", amount: parseInt(amount) } // Narxi (masalan, 100)
        ]
      })
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.description || 'Telegram API xatosi')
    }

    // 4. Natijani (linkni) Frontendga qaytaramiz
    return new Response(
      JSON.stringify({ invoiceLink: data.result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    // Xatolik bo'lsa
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
