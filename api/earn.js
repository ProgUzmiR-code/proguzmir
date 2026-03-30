// api/earn.js (Next.js yoki Vercel API misolida)
import { createClient } from '@supabase/supabase-js';

// Supabase ulanishi (Service Role Key yordamida - barcha huquqlarga ega)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Faqat POST so'rovlarni qabul qilamiz
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Faqat POST so\'rov qabul qilinadi' });
    }

    try {
        const { wallet, taskId } = req.body;

        if (!wallet || !taskId) {
            return res.status(400).json({ success: false, message: 'Ma\'lumotlar to\'liq emas' });
        }

        // 🔒 XAVFSIZLIK: Bu yerda Telegram initData yoki HMAC tekshiruvini 
        // amalga oshirsangiz bo'ladi (xakerlar qalbaki so'rov yubormasligi uchun).

        // Supabase bazasidagi biz yaratgan SQL funksiyani chaqiramiz
        const { data, error } = await supabase.rpc('claim_task_reward', {
            p_wallet: wallet,
            p_task_id: taskId
        });

        if (error) {
            console.error("Supabase xatosi:", error);
            return res.status(500).json({ success: false, message: "Baza bilan ishlashda xatolik" });
        }

        // Supabase qaytargan javobni (data.success, data.added_diamonds) frontendga jo'natamiz
        return res.status(200).json(data);

    } catch (error) {
        console.error("Server xatosi:", error);
        return res.status(500).json({ success: false, message: "Ichki server xatosi" });
    }
}