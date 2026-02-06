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

// Mahsulot narxlari
const PRICES = {
    'gem1': { name: "500 diamond", ton: '200000000', usdt: '1.19' },
    'gem2': { name: "2,500 diamond", ton: '1000000000', usdt: '5.99' },
    'gem3': { name: "5,000 diamond", ton: '2000000000', usdt: '11.99' },
    'gem4': { name: "10,000 diamond", ton: '4000000000', usdt: '23.99' },
    'gem5': { name: "25,000 diamond", ton: '10000000000', usdt: '54.99' },
    'gem6': { name: "50,000 diamond", ton: '20000000000', usdt: '109.99' }
};

// USDT (BEP-20) Kontrakt manzili (BNB Smart Chain uchun)
const USDT_BSC_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// --- 2. ASOSIY SOTIB OLISH FUNKSIYASI ---
async function buyItem(itemId) {
    console.log("Tanlangan mahsulot: " + itemId);

    if (!MERCHANT_TON || !MERCHANT_EVM) {
        alert("Tizim ma'lumotlari yuklanmoqda... Iltimos, 2 soniya kutib qayta bosing.");
        loadWalletConfig();
        return;
    }

    const item = PRICES[itemId];
    if (!item) {
        alert("Xatolik: Bunday mahsulot topilmadi!");
        return;
    }

    const walletType = localStorage.getItem("proguzmir_wallet_type");

    if (walletType === 'ton') {
        if (confirm(`${item.name} ni TON orqali sotib olasizmi?`)) {
            await payWithTon(item.ton);
        }
    } else if (walletType === 'evm') {
        // USDT narxini yuboramiz
        if (confirm(`${item.name} ni USDT (BNB Chain) orqali ${item.usdt}$ ga sotib olasizmi?`)) {
            await payWithEvm(item.usdt);
        }
    } else {
        alert("Sotib olish uchun avval hamyonni (TON yoki MetaMask) ulang!");
        const list = document.querySelector('.invite-listm2');
        if(list) list.scrollIntoView({ behavior: 'smooth' });
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

// --- 4. EVM (USDT - BSC) TO'LOV FUNKSIYASI ---
async function payWithEvm(amountUsdt) {

    // 1. AppKit tekshiruvi
    if (!window.evmModal) {
        alert("MetaMask tizimi yuklanmadi. Sahifani yangilang.");
        return;
    }

    const account = window.evmModal.getAccount();
    if (!account.isConnected) {
        alert("Hamyon uzilgan. Qayta ulaning.");
        window.evmModal.open();
        return;
    }

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // --- A. TARMOG'NI TEKSHIRISH (BNB Smart Chain - 56) ---
        // USDT (BEP-20) faqat BSC tarmog'ida mavjud.
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        
        // 0x38 bu 56 (BNB Chain)
        if (chainId !== '0x38' && parseInt(chainId) !== 56) {
            try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }],
                });
            } catch (switchError) {
                alert("Iltimos, MetaMaskda 'BNB Smart Chain' tarmog'ini tanlang!");
                return;
            }
        }

        // --- B. USDT DATA YASASH ---
        // Bizga merchant manzili kerak
        if (!MERCHANT_EVM) {
            alert("Sotuvchi hamyoni topilmadi.");
            return;
        }

        // 1. Transfer funksiyasi kodi: 0xa9059cbb
        const methodId = "0xa9059cbb";

        // 2. Manzilni 64 talik formatga keltirish (padding)
        const cleanAddress = MERCHANT_EVM.replace('0x', '');
        const paddedAddress = cleanAddress.padStart(64, '0');

        // 3. Summani hisoblash (BSC da USDT 18 xona)
        // 1.19 USDT -> 1.19 * 10^18
        const amountFloat = parseFloat(amountUsdt);
        const amountBigInt = BigInt(Math.round(amountFloat * 1e18));
        const paddedAmount = amountBigInt.toString(16).padStart(64, '0');

        // Yakuniy Data
        const dataPayload = methodId + paddedAddress + paddedAmount;

        const txParams = {
            from: myAddress,
            to: USDT_BSC_ADDRESS, // Diqqat: Pul USDT kontraktiga boradi
            value: "0x0",         // BNB yubormayapmiz, shuning uchun 0
            data: dataPayload     // Hamma gap shunda
        };

        console.log("USDT so'rovi yuborilmoqda...");

        // --- C. TRANZAKSIYA YUBORISH ---
        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        // --- D. TELEGRAM UCHUN MAXSUS PUSH ---
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            setTimeout(() => {
                // Xavfsiz usulda MetaMaskni ochamiz
                const link = document.createElement('a');
                link.href = "metamask://";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 1000);
        }

        const txHash = await txPromise;
        console.log("Success:", txHash);
        alert(`USDT To'lov yuborildi! ✅\nHash: ${txHash}`);

    } catch (e) {
        console.error("USDT Error:", e);
        // User rad etganda chiroyli xabar
        if (e.message && e.message.includes("rejected")) {
            console.log("User rejected");
        } else {
            alert("Xatolik: " + e.message + "\n\nEslatma: Hisobingizda Gaz uchun ozgina BNB bo'lishi shart!");
        }
    }
}
