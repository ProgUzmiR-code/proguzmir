// api/key.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Faqat POST so\'rovlar ruxsat etilgan' });
    }

    const { telegram_id, task_id, user_code } = req.body;

    if (!telegram_id || !task_id || !user_code) {
        return res.status(400).json({ success: false, message: "Barcha ma'lumotlar kiritilmagan" });
    }

    try {

        const { data: videoData, error: videoError } = await supabase
            .from('video_codes')
            .select('*')
            .eq('task_id', task_id)
            .eq('secret_code', user_code)
            .single();

        if (videoError || !videoData) {
            return res.status(400).json({ success: false, message: "Noto'g'ri kod kiritildi!" });
        }

        const { data: userData, error: userError } = await supabase
            .from('user_states')
            .select('diamond, keys_total') // Ham olmosni, ham kalitni olamiz
            .eq('wallet', telegram_id)
            .single();

        if (userError || !userData) {
            return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi" });
        }

        const currentDiamond = parseInt(userData.diamond) || 0;
        const currentKeys = parseInt(userData.keys_total) || 0;

        const newDiamondBalance = currentDiamond + 300000;
        const newKeysTotal = currentKeys + 1;


        const { data: updateData, error: updateError } = await supabase
            .from('user_states')
            .update({
                diamond: newDiamondBalance,
                keys_total: newKeysTotal
            })
            .eq('wallet', telegram_id)
            .select();

        if (updateError) {
            console.error('Supabase update error:', updateError);
            return res.status(500).json({ success: false, message: "Hisobni yangilashda xatolik: " + updateError.message });
        }
        if (!updateData || updateData.length === 0) {
            return res.status(500).json({ success: false, message: "Hisob yangilanmadi. Foydalanuvchi topilmadi yoki o'zgarish amalga oshmadi." });
        }

        return res.status(200).json({
            success: true,
            message: "Tabriklaymiz! To'g'ri kod. Hisobingizga 300,000 olmos va 1 ta kalit qo'shildi!",
            new_diamond: newDiamondBalance,
            new_keys: newKeysTotal
        });

    } catch (error) {
        console.error("API Xatolik:", error);
        return res.status(500).json({ success: false, message: "Serverda xatolik yuz berdi" });
    }
}
