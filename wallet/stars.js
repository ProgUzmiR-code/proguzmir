// wallet/stars.js

async function initStarsPayment(amount) {
    console.log("Stars to'lovi boshlanmoqda: " + amount);

    // 1. Telegram WebApp borligini tekshirish
    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Bu funksiya faqat Telegram ichida ishlaydi!");
        return;
    }

    const tg = window.Telegram.WebApp;

    try {
        // 2. Serverdan Invoice Link olish
        // Sizning Render yoki Vercel dagi backend manzilingiz
        const response = await fetch('/api/stars', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                amount: amount,
                userId: tg.initDataUnsafe?.user?.id || 0 // Foydalanuvchi IDsi
            })
        });

        const data = await response.json();

        if (!data.ok || !data.invoiceLink) {
            throw new Error(data.message || "Invoice yaratishda xatolik");
        }

        console.log("Invoice olindi:", data.invoiceLink);

        // 3. Telegram orqali to'lov oynasini ochish
        tg.openInvoice(data.invoiceLink, (status) => {
            if (status === 'paid') {
                console.log("To'lov muvaffaqiyatli!");
                alert(`Muvaffaqiyatli! ${amount} Stars yuborildi ⭐️`);
                
                // Ixtiyoriy: Sahifani yangilash yoki balansni o'zgartirish
                tg.close();
            } else if (status === 'cancelled') {
                console.log("To'lov bekor qilindi");
            } else {
                console.log("To'lov holati:", status);
            }
        });

    } catch (error) {
        console.error("Stars Error:", error);
        alert("Xatolik: " + error.message);
    }
}
