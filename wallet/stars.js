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
async function initStarsPayment(amount) {
    console.log("Supabase orqali Stars to'lovi: " + amount);

    // Config yuklanganini tekshiramiz
    if (!STARS_CONFIG.url || !STARS_CONFIG.key) {
        await loadStarsConfig(); // Agar yuklanmagan bo'lsa, qayta urinib ko'ramiz
        if (!STARS_CONFIG.url) {
            alert("System settings could not be loaded. Please refresh the page.");
            return false;
        }
    }

    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Works only within Telegram!");
        return false;
    }

    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id || 0;

    try {
        // 2. Supabase Edge Functionga so'rov (Serverdan kelgan URL va KEY bilan)
        const response = await fetch(STARS_CONFIG.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STARS_CONFIG.key}`
            },
            body: JSON.stringify({
                amount: amount,
                title: "Support Project",
                description: `To the ProgUzmiR project ${amount} Stars charity`,
                payload: `donate_${userId}_${Date.now()}`
            })
        });

        const data = await response.json();

        if (data.error || !data.invoiceLink) {
            throw new Error(data.error || "Invoice link not received");
        }

        console.log("Invoice olindi:", data.invoiceLink);

        // 3. Telegramda to'lov oynasini ochish
        return new Promise((resolve) => {
            tg.openInvoice(data.invoiceLink, (status) => {
                if (status === 'paid') {
                    tg.HapticFeedback.notificationOccurred('success');
                    resolve(true); 
                } else if (status === 'cancelled') {
                    console.log("To'lov bekor qilindi");
                    resolve(false);
                } else {
                    console.log("To'lov holati:", status);
                    resolve(false);
                }
            });
        });

    } catch (err) {
        console.error("Supabase Error:", err);
        alert("Error: " + err.message);
        return false;
    }
}
