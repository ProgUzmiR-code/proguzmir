// wallet/stars.js

// Global o'zgaruvchilar (bo'sh turadi, serverdan to'ldiriladi)
let STARS_CONFIG = {
    url: null,
    key: null
};

// 1. Konfiguratsiyani yuklash funksiyasi
async function loadStarsConfig() {
    try {
        // Bu api/wallet-data.js ga so'rov yuboradi
        const response = await fetch('/api/wallet-data.js'); 
        const data = await response.json();
        
        if (data.supabase_url && data.supabase_key) {
            STARS_CONFIG.url = data.supabase_url;
            STARS_CONFIG.key = data.supabase_key;
            console.log("Stars Config Loaded ✅");
        }
    } catch (error) {
        console.error("Config yuklashda xatolik:", error);
    }
}

// Sahifa yuklanganda configlarni olib kelamiz
loadStarsConfig();

// --- INIT STARS PAYMENT ---
// wallet/stars.js ichida

async function initStarsPayment(amount, itemName) {
    console.log(`Stars to'lovi: ${amount} ★ mahsulot: ${itemName}`);

    if (!STARS_CONFIG.url || !STARS_CONFIG.key) {
        await loadStarsConfig();
        if (!STARS_CONFIG.url) {
            alert("Tizim xatoligi: Config topilmadi.");
            return;
        }
    }

    if (!window.Telegram?.WebApp) {
        alert("Faqat Telegram ichida ishlaydi!");
        return;
    }

    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id || 0;

    try {
        // Serverga so'rov
        const response = await fetch(STARS_CONFIG.url, { // Bu yerda Supabase URL bo'lishi kerak
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STARS_CONFIG.key}`
            },
            body: JSON.stringify({
                amount: amount, // Narx (Stars da)
                title: itemName || "Game Item", // Mahsulot nomi
                description: `ProgUzmiR do'konidan ${itemName} sotib olish`,
                payload: `buy_${itemName}_${userId}_${Date.now()}` // Unikal ID
            })
        });

        const data = await response.json();

        if (data.error || !data.invoiceLink) {
            throw new Error(data.error || "Invoice link kelmadi");
        }

        // Telegramda to'lovni ochish
        tg.openInvoice(data.invoiceLink, (status) => {
            if (status === 'paid') {
                tg.HapticFeedback.notificationOccurred('success');
                alert("To'lov muvaffaqiyatli! ✅");
                
                // BU YERDA OLMOSLARNI QO'SHISH FUNKSIYASINI CHAQIRASIZ
                // Masalan: addDiamondsToUser(amount * 10); 
                addTransactionRecord(item.name, `${item.stars} Stars`, "Stars");
            } else if (status === 'cancelled') {
                // Bekor qilindi
            } else {
                alert("To'lov holati: " + status);
            }
        });

    } catch (err) {
        console.error("Stars Error:", err);
        alert("Xatolik: " + err.message);
    }
}
