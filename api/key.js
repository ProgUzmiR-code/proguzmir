import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // Faqat POST so'rovlarni qabul qilamiz
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Faqat POST so\'rovlar ruxsat etilgan' });
    }

    // Frontenddan kelgan ma'lumotlarni ajratib olamiz
    const { telegram_id, task_id, user_code } = req.body;

    if (!telegram_id || !task_id || !user_code) {
        return res.status(400).json({ success: false, message: 'Barcha ma\'lumotlar kiritilmagan' });
    }

    try {
        // 1. Kiritilgan kod to'g'riligini 'video_codes' jadvalidan tekshiramiz
        const { data: videoData, error: videoError } = await supabase
            .from('video_codes')
            .select('*')
            .eq('task_id', task_id)
            .eq('secret_code', user_code)
            .single(); // .single() faqat bitta aniq qatorni kutadi

        // Agar kod xato bo'lsa yoki topilmasa
        if (videoError || !videoData) {
            return res.status(400).json({ success: false, message: "Noto'g'ri kod kiritildi!" });
        }

        // 2. Foydalanuvchini topamiz va uning hozirgi balansini olamiz
        const { data: userData, error: userError } = await supabase
            .from('user_states') // O'zingizning foydalanuvchilar jadvalingiz nomi (masalan 'users')
            .select('diamond') // Balans saqlanadigan ustun nomi
            .eq('telegram_id', telegram_id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
        }

        // 3. Balansga 300,000 tanga qo'shamiz
        const newBalance = userData.balance + 300000;

        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('telegram_id', telegram_id);

        if (updateError) throw updateError;

        // Hammasi muvaffaqiyatli yakunlandi!
        return res.status(200).json({ 
            success: true, 
            message: "Tabriklaymiz! To'g'ri kod. Hisobingizga 300,000 tanga qo'shildi!",
            new_balance: newBalance
        });

    } catch (error) {
        console.error("API Xatolik:", error);
        return res.status(500).json({ success: false, message: 'Serverda xatolik yuz berdi' });
    }
}
