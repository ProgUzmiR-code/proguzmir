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
// --- YORDAMCHI KUTISH FUNKSIYASI ---
function waitForTonLib(retries = 20) {
    return new Promise((resolve, reject) => {
        // Agar allaqachon bor bo'lsa
        if (window.tonConnectUI) {
            return resolve(window.tonConnectUI);
        }

        // Agar yo'q bo'lsa, tekshirishni boshlaymiz
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (window.tonConnectUI) {
                clearInterval(interval);
                resolve(window.tonConnectUI);
            } else if (count >= retries) {
                clearInterval(interval);
                reject("TON kutubxonasi vaqtida yuklanmadi");
            }
        }, 100); // Har 100ms da tekshiradi (jami 2 soniya kutadi)
    });
}

// --- 3. TON TO'LOV FUNKSIYASI (YANGILANGAN) ---

async function payWithTon(amountNano) {

    try {
        // 1. Kutubxona yuklanishini kutamiz (maksimal 2 soniya)
        await waitForTonLib();
    } catch (error) {
        // Agar 2 soniya kutilganda ham yuklanmasa:
        console.error(error);

        // Ehtimol initTonWallet chaqirilmagandir, majburan chaqirib ko'ramiz
        if (window.initTonWallet) {
            window.initTonWallet();
            alert("Tizim ishga tushirilmoqda... Iltimos, yana bir marta bosing.");
        } else {
            alert("Internet past yoki TON tizimi yuklanmadi. Sahifani yangilang.");
        }
        return;
    }

    // 2. Endi aniq window.tonConnectUI mavjud
    if (!window.tonConnectUI.connected) {
        // Agar ulangan deb ko'rinsa ham, aslida uzilgan bo'lishi mumkin
        // Shuning uchun xatolik chiqsa modalni ochamiz
        try {
            await window.tonConnectUI.openModal();
        } catch (e) {
            console.error("Modal ochishda xato:", e);
        }
        return; // Modal ochilgandan keyin funksiya to'xtaydi, user ulanib qayta bosishi kerak
    }

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
        const result = await window.tonConnectUI.sendTransaction(transaction);
        console.log("TON To'lov muvaffaqiyatli:", result);
        alert("To'lov muvaffaqiyatli amalga oshirildi! ✅");

        // Backendga xabar berish (ixtiyoriy)
        // verifyPaymentOnServer(result);

    } catch (e) {
        console.error("To'lov xatosi:", e);
        if (e.message && e.message.includes("User rejected")) {
            // User bekor qildi, hech narsa demasak ham bo'ladi yoki:
            console.log("Foydalanuvchi bekor qildi");
        } else {
            alert("To'lov amalga oshmadi. Qayta urinib ko'ring.");
        }
    }
}



// --- 4. EVM (METAMASK) TO'LOV FUNKSIYASI ---
async function payWithEvm(amountEth, itemName) {
    // 1. AppKit modal yuklanganini tekshirish
    if (!window.evmModal) {
        console.log("MetaMask tizimi topilmadi. Qayta ishga tushirilmoqda...");
        if (window.initMetaMaskWallet) {
            await window.initMetaMaskWallet();
        }
        if (!window.evmModal) {
            alert("Tizim yuklanmadi. Sahifani yangilab qayta urinib ko'ring.");
            return;
        }
    }

    // 2. Ulanish holatini tekshirish
    const account = window.evmModal.getAccount();
    if (!account.isConnected) {
        console.log("Sessiya uzilgan. Qayta ulanish so'ralmoqda...");
        await window.evmModal.open();
        return;
    }

    // 3. To'lov jarayoni
    try {
        // MUHIM: EthersAdapter ishlatayotganingiz uchun providerni Ethers orqali olish kerak
        // yoki to'g'ridan-to'g'ri WalletConnect provideridan foydalanish kerak
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        if (!myAddress || !walletProvider) {
            alert("Hamyon ma'lumotlari topilmadi. Qayta ulaning.");
            return;
        }

        // Qiymatni Wei ga o'tkazish (18 ta nol)
        // 0.0004 ETH -> "0x16bcc41e90000" (hex formatda)
        const weiValue = "0x" + (BigInt(Math.round(parseFloat(amountEth) * 1e18))).toString(16);

        const txParams = {
            from: myAddress,
            to: MERCHANT_EVM,
            value: weiValue,
            // Ba'zan chainId xatoligi bermasligi uchun uni ham qo'shgan ma'qul
            // data: "0x", // Oddiy o'tkazma uchun bo'sh
        };
        // Mobil qurilmalarda foydalanuvchini hamyonga yo'naltirish uchun 
        // tranzaksiya so'rovidan oldin kichik bildirishnoma ko'rsatish yaxshi amaliyot
        console.log("Tranzaksiya so'ralmoqda...");

        // AppKit/WalletConnect orqali tranzaksiya so'rovi
        const txHash = await walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        console.log("Tranzaksiya yuborildi. Hash:", txHash);
        alert(`To'lov yuborildi! Hash: ${txHash}`);

    } catch (e) {
        console.error("MetaMask to'lov xatosi:", e);
        // Foydalanuvchi rad etgan bo'lsa
        if (e.code === 4001 || e.message.includes("rejected")) {
            alert("To'lov foydalanuvchi tomonidan bekor qilindi.");
        }// Telegram Webview ichida Deep Link xatosi bo'lsa
        else if (e.message.includes("connector") || e.code === -32000) {
            alert("Hamyon bilan aloqa uzildi. Iltimos, hamyon ilovasiga kirib tranzaksiyani tasdiqlang yoki qayta ulaning.");
        } else {
            alert("Xatolik yuz berdi: " + (e.message || "Tranzaksiya amalga oshmadi"));
        }
    }
}
