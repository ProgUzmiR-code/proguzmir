// wallet/stars.js

async function initStarsPayment(amount) {
    console.log("Supabase orqali Stars to'lovi: " + amount);

    if (!window.Telegram || !window.Telegram.WebApp) {
        alert("Faqat Telegram ichida ishlaydi!");
        return;
    }

    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id || 0;

    try {
        // supabase.functions.invoke bu avtomatik tarzda to'g'ri URLga boradi
        // 'stars-invoice' - bu biz yaratgan funksiya nomi
        const { data, error } = await supabase.functions.invoke('stars-invoice', {
            body: { amount: amount, userId: userId }
        });

        if (error) throw error;
        if (!data.invoiceLink) throw new Error("Link qaytmadi");

        console.log("Invoice olindi:", data.invoiceLink);

        // Telegramda to'lovni ochish
        tg.openInvoice(data.invoiceLink, (status) => {
            if (status === 'paid') {
                alert("Rahmat! To'lov amalga oshdi! ⭐️");
                tg.close();
            } else {
                console.log("To'lov holati:", status);
            }
        });

    } catch (err) {
        console.error("Supabase Error:", err);
        alert("Xatolik: " + err.message);
    }
}
