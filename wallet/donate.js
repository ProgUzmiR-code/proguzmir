// /wallet/donate.js
// --- DONATE FUNKSIYALARI ---

// 1. TON Donate
async function donateTonFunc() {
    const input = document.getElementById('donateTonAmount');
    let amount = parseFloat(input.value);

    // Agar bo'sh bo'lsa yoki noto'g'ri raqam bo'lsa
    if (!amount || amount <= 0) {
        alert("Please enter the correct amount!");
        return;
    }

    if (!window.tonConnectUI || !window.tonConnectUI.connected) {
        alert("Please connect your TON wallet first!");
        // Sahifani tepaga hamyon ulash joyiga olib chiqamiz
        document.getElementById('btnTon').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // MERCHANT_TON - bu wallet.js da aniqlangan sizning hamyoningiz
    // Agar u yo'q bo'lsa, xatolik chiqmasligi uchun tekshiramiz
    if (!MERCHANT_TON) {
        alert("System is loading, please wait...");
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
        alert(`Thank you very much! ${amount} TON received 💎`);
        input.value = ""; // Inputni tozalash
    } catch (e) {
        console.error(e);
        if (!e.message.includes("User rejected")) {
            alert("An error occurred.");
        }
    }
}

// wallet/donate.js ichidagi donateStarsFunc ni quyidagicha o'zgartiring:

function donateStarsFunc() {
    const input = document.getElementById('donateStarsAmount');
    let amount = parseInt(input.value);

    if (!amount || amount <= 0) {
        alert("Please enter the correct amount!");
        return;
    }

    // wallet/stars.js dagi funksiyani chaqiramiz
    if (typeof initStarsPayment === 'function') {
        initStarsPayment(amount);
    } else {
        alert("The Stars system is not fully loaded yet. Please refresh the page.");
    }
}

