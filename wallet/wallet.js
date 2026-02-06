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

// --- 4. EVM (METAMASK) TO'LOV FUNKSIYASI (TUZATILGAN) ---
async function payWithEvm(amountEth, itemName) {

    // 1. Tizim yuklanganini tekshirish
    if (!window.evmModal) {
        alert("MetaMask tizimi hali yuklanmadi. Iltimos kuting.");
        return;
    }

    // 2. Accountni tekshirish
    const account = window.evmModal.getAccount();
    if (!account || !account.isConnected) {
        alert("Hamyon uzilib qolgan. Iltimos, qayta ulang.");
        window.evmModal.open();
        return;
    }

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // --- MUHIM: TARMOG'NI TEKSHIRISH (POLYGON - 137) ---
        // Agar foydalanuvchi boshqa tarmoqda bo'lsa, tranzaksiya chiqmaydi.
        // Cripto.js da siz chainId: 137 (Polygon) deb yozgansiz.
        const TARGET_CHAIN_ID = '0x89'; // 137 hex formatda (Polygon)
        // Agar BNB bo'lsa: '0x38' (56), Ethereum bo'lsa: '0x1' (1)
        
        try {
             await walletProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: TARGET_CHAIN_ID }],
            });
        } catch (switchError) {
            // Agar tarmoq qo'shilmagan bo'lsa, xatolik berishi mumkin,
            // lekin ko'pincha "Switch" so'rovi ishlaydi.
            console.log("Tarmoqni o'zgartirishda muammo:", switchError);
        }

        // --- TO'LOV PARAMETRLARI ---
        const ethValue = parseFloat(amountEth);
        const weiString = (ethValue * 1e18).toLocaleString('fullwide', { useGrouping: false }).split('.')[0];
        const hexValue = "0x" + BigInt(weiString).toString(16);

        const txParams = {
            from: myAddress,
            to: MERCHANT_EVM,
            value: hexValue,
            data: "0x"
        };

        console.log("Tranzaksiya yuborilmoqda...");

        // --- TRANZAKSIYA VA REDIRECT ---
        
        // 1. So'rovni yuboramiz (await qilmay turamiz)
        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        // 2. TELEGRAM UCHUN MAXSUS "PUSH" (Turtki)
        // Biz "dapp/" havolasini emas, to'g'ridan-to'g'ri "metamask://" sxemasini ishlatamiz.
        // Bu saytni yangilamaydi, faqat ilovani ochadi.
        
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            setTimeout(() => {
                // Bu havola shunchaki MetaMaskni "uyg'otadi"
                window.location.href = "wc://"; 
            }, 500);
        }

        // 3. Endi javobni kutamiz
        const txHash = await txPromise;

        console.log("Tranzaksiya muvaffaqiyatli:", txHash);
        alert(`To'lov yuborildi! ✅\nHash: ${txHash}`);

    } catch (e) {
        console.error("Xatolik:", e);
        if (e.message && e.message.includes("rejected")) {
            // User bekor qildi, hech narsa demaymiz yoki:
            console.log("User bekor qildi");
        } else {
            alert("Xatolik: " + e.message);
        }
    }
}
