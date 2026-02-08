// /wallet/donate.js
// --- DONATE FUNKSIYALARI ---

// 1. TON Donate
async function donateTonFunc() {
    const input = document.getElementById('donateTonAmount');
    let amount = parseFloat(input.value);

    // Agar bo'sh bo'lsa yoki noto'g'ri raqam bo'lsa
    if (!amount || amount <= 0) {
        alert("Iltimos, to'g'ri miqdor kiriting!");
        return;
    }

    if (!window.tonConnectUI || !window.tonConnectUI.connected) {
        alert("Avval TON hamyonni ulang!");
        // Sahifani tepaga hamyon ulash joyiga olib chiqamiz
        document.getElementById('btnTon').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // MERCHANT_TON - bu wallet.js da aniqlangan sizning hamyoningiz
    // Agar u yo'q bo'lsa, xatolik chiqmasligi uchun tekshiramiz
    if (!MERCHANT_TON) {
        alert("Tizim yuklanmoqda, kuting...");
        return;
    }

    const amountNano = Math.floor(amount * 1e9).toString();

    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
            {
                address: MERCHANT_TON,
                amount: amountNano
            }
        ]
    };

    try {
        await window.tonConnectUI.sendTransaction(transaction);
        alert(`Katta rahmat! ${amount} TON qabul qilindi 💎`);
        input.value = ""; // Inputni tozalash
    } catch (e) {
        console.error(e);
        if (!e.message.includes("User rejected")) {
            alert("Xatolik yuz berdi.");
        }
    }
}

// 2. Stars Donate (Bot orqali invoice kerak)
function donateStarsFunc() {
    const input = document.getElementById('donateStarsAmount');
    let amount = parseInt(input.value);

    if (!amount || amount <= 0) {
        alert("Iltimos, to'g'ri miqdor kiriting!");
        return;
    }

    // Stars odatda Telegram Bot Invoice orqali to'lanadi.
    // WebAppda invoice ochish uchun: Telegram.WebApp.openInvoice(invoiceUrl)
    
    // Hozircha bu yerga shunchaki ogohlantirish yoki 
    // agar sizda invoice link yasaydigan API bo'lsa, o'shani ulaymiz.
    
    // Misol uchun:
    // const invoiceLink = `https://t.me/SizningBotingiz?start=donate_${amount}`;
    // window.open(invoiceLink, '_blank');

    alert(`Siz ${amount} Stars yubormoqchisiz. \nBu funksiya tez orada bot orqali ishga tushadi!`);
    
    // Agar backend tayyor bo'lsa, shu yerda invoice API chaqiriladi.
}
