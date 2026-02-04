// /wallet/wallet.js

let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Sahifa yuklanishi bilan Vercel API dan manzillarni olib kelamiz
async function loadWalletConfig() {
    try {
        const response = await fetch('/api/wallet-data.js');
        const data = await response.json();

        if (data.ton_address && data.evm_address) {
            MERCHANT_TON = data.ton_address;
            MERCHANT_EVM = data.evm_address;
            console.log("Hamyon manzillari serverdan yuklandi ✅");
        } else {
            console.error("Serverdan manzillar kelmadi ❌");
        }
    } catch (error) {
        console.error("Konfiguratsiyani yuklashda xatolik:", error);
    }
}

// Konfiguratsiyani ishga tushiramiz
loadWalletConfig();

// Mahsulot narxlari (Bular o'zgarmas qolaveradi)
const PRICES = {
    'gem1': { name: "500 diamond", ton: '200000000', eth: '0.0004' },
    'gem2': { name: "2,500 diamond", ton: '1000000000', eth: '0.002' },
    'gem3': { name: "5,000 diamond", ton: '2000000000', eth: '0.004' },
    'gem4': { name: "10,000 diamond", ton: '4000000000', eth: '0.008' },
    'gem5': { name: "25,000 diamond", ton: '10000000000', eth: '0.018' },
    'gem6': { name: "50,000 diamond", ton: '20000000000', eth: '0.036' }
};

// --- 2. ASOSIY SOTIB OLISH FUNKSIYASI ---
async function buyItem(itemId) {
    console.log("Tanlangan mahsulot: " + itemId);

    // 0. Manzillar yuklanganini tekshirish (MUHIM)
    if (!MERCHANT_TON || !MERCHANT_EVM) {
        alert("Tizim ma'lumotlari yuklanmoqda... Iltimos, 2 soniya kutib qayta bosing.");
        // Agar yuklanmagan bo'lsa, qayta urinib ko'ramiz
        loadWalletConfig();
        return;
    }

    // 1. Mahsulot bazada borligini tekshiramiz
    const item = PRICES[itemId];
    if (!item) {
        alert("Xatolik: Bunday mahsulot topilmadi!");
        return;
    }

    // 2. Qaysi hamyon ulanganini aniqlaymiz
    const walletType = localStorage.getItem("proguzmir_wallet_type");

    if (walletType === 'ton') {
        if (confirm(`${item.name} ni TON orqali sotib olasizmi?`)) {
            await payWithTon(item.ton);
        }
    } else if (walletType === 'evm') {
        if (confirm(`${item.name} ni MetaMask (BNB/ETH) orqali sotib olasizmi?`)) {
            await payWithEvm(item.eth);
        }
    } else {
        alert("Sotib olish uchun avval hamyonni (TON yoki MetaMask) ulang!");
        document.querySelector('.invite-listm2').scrollIntoView({ behavior: 'smooth' });
    }
}

// --- 3. TON TO'LOV FUNKSIYASI ---
async function payWithTon(amountNano) {
    if (!window.tonConnectUI || !window.tonConnectUI.connected) {
        alert("TON hamyon ulanmagan yoki uzilib qolgan!");
        return;
    }

    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
            {
                address: MERCHANT_TON, // Endi bu yerda serverdan kelgan manzil bo'ladi
                amount: amountNano
            }
        ]
    };

    try {
        const result = await window.tonConnectUI.sendTransaction(transaction);
        console.log("TON To'lov muvaffaqiyatli:", result);
        alert("To'lov qabul qilindi! Hisobingiz tez orada to'ldiriladi.");
    } catch (e) {
        console.error(e);
        alert("To'lov bekor qilindi.");
    }
}

// --- 4. EVM (METAMASK) TO'LOV FUNKSIYASI ---
async function payWithEvm(amountEth, itemName) {

    // 1. Agar MetaMask tizimi umuman yuklanmagan bo'lsa
    if (!window.evmModal) {
        console.log("MetaMask tizimi topilmadi. Qayta ishga tushirilmoqda...");

        if (window.initMetaMaskWallet) {
            try {
                await window.initMetaMaskWallet();
            } catch (e) {
                console.error("Init Error:", e);
            }
        }

        // Ikkinchi marta tekshiramiz
        if (!window.evmModal) {
            alert("Tizim hali yuklanmadi. Iltimos, sahifani yangilab (Reload) qayta urinib ko'ring.");
            return;
        }
    }

    // 2. Ulanish holatini tekshirish (YANGI USUL)
    // getIsConnected() o'rniga getAccount().isConnected ishlatamiz
    let isConnected = false;
    try {
        const account = window.evmModal.getAccount();
        isConnected = account.isConnected;
    } catch (e) {
        console.warn("Account holatini olishda xatolik:", e);
    }

    if (!isConnected) {
        console.log("Sessiya uzilgan. Qayta ulanish so'ralmoqda...");
        await window.evmModal.open(); // Ulanish oynasini ochamiz
        return;
    }

    // 3. To'lov jarayoni
    try {
        const provider = window.evmModal.getProvider();
        const account = window.evmModal.getAccount();
        const myAddress = account.address; // Manzilni to'g'ri joydan olamiz

        if (!myAddress) {
            alert("Hamyon manzili aniqlanmadi. Qayta ulaning.");
            return;
        }

        // Matematik hisob (xavfsiz)
        const weiValue = BigInt(Math.round(parseFloat(amountEth) * 1e18)).toString(16);

        const txParams = {
            from: myAddress,
            to: MERCHANT_EVM,
            value: "0x" + weiValue,
        };

        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        console.log("Tranzaksiya yuborildi. Hash:", txHash);
        showNotification(`${itemName} to'lovi yuborildi! Hash: ${txHash}`, 'success');

    } catch (e) {
        console.error(e);
        showNotification("Xatolik: " + (e.message || "Bekor qilindi"), 'error');
    }
}
