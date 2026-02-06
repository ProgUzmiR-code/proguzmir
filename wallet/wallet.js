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
    'gem1': { name: "500 diamond", ton: '200000000', usdt: '1.19' },   // usdt narxi qo'shildi
    'gem2': { name: "2,500 diamond", ton: '1000000000', usdt: '5.99' },
    'gem3': { name: "5,000 diamond", ton: '2000000000', usdt: '11.99' },
    'gem4': { name: "10,000 diamond", ton: '4000000000', usdt: '23.99' },
    'gem5': { name: "25,000 diamond", ton: '10000000000', usdt: '54.99' },
    'gem6': { name: "50,000 diamond", ton: '20000000000', usdt: '109.99' }
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
        if (confirm(`${item.name} ni USDT orqali (${item.usdt}$) sotib olasizmi?`)) {
            await payWithEvm(item.usdt, item.name); 
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

// --- 4. EVM (USDT) TO'LOV FUNKSIYASI ---
async function payWithEvm(amountUsdt, itemName) {

    if (!window.evmModal) {
        alert("MetaMask tizimi yuklanmadi.");
        return;
    }

    const account = window.evmModal.getAccount();
    if (!account || !account.isConnected) {
        alert("Hamyon uzilgan. Qayta ulang.");
        window.evmModal.open();
        return;
    }

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // 1. TARMOG'NI ANIQLASH
        // Chain ID ni olamiz (decimal formatda, masalan 56 yoki 1)
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(chainId, 16);

        let contractAddress = "";
        let decimals = 18; // Default

        // BSC Mainnet (ID: 56 yoki 0x38)
        if (chainIdDec === 56) {
            contractAddress = USDT_CONTRACTS.BSC;
            decimals = 18; // BSC da USDT odatda 18 decimal
        } 
        // Ethereum Mainnet (ID: 1 yoki 0x1)
        else if (chainIdDec === 1) {
            contractAddress = USDT_CONTRACTS.ETH;
            decimals = 6;  // ETH da USDT 6 decimal (DIQQAT!)
        } 
        // Polygon (ID: 137) - Agar kerak bo'lsa
        else if (chainIdDec === 137) {
            contractAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; // Polygon USDT
            decimals = 6;
        }
        else {
            alert("Iltimos, MetaMaskda 'BNB Smart Chain' yoki 'Ethereum' tarmog'ini tanlang!");
            // Tarmoqni o'zgartirishni so'rash (BSC ga o'tkazishga harakat qilamiz)
             try {
                 await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // 0x38 = 56 (BSC)
                });
                // Qayta chaqiramiz
                return payWithEvm(amountUsdt, itemName);
            } catch (e) {
                console.error(e);
                return;
            }
        }

        console.log(`Tarmoq: ${chainIdDec}, Kontrakt: ${contractAddress}, Decimals: ${decimals}`);

        // 2. DATA (PAYLOAD) YASASH
        // ERC-20 Transfer funksiyasi kodi: 0xa9059cbb
        // Parametr 1: Merchant Address (32 baytga to'ldirilgan)
        // Parametr 2: Summa (32 baytga to'ldirilgan)

        // Summani hisoblash
        const amountFloat = parseFloat(amountUsdt);
        // BigInt bilan aniq hisoblash: amount * (10 ^ decimals)
        const amountBigInt = BigInt(Math.round(amountFloat * (10 ** decimals)));
        
        // Merchant manzilini tozalash (0x ni olib tashlash)
        const cleanAddress = MERCHANT_EVM.replace('0x', '');
        
        // 1-parametr: Manzilni oldiga 0 qo'shib 64 ta belgiga yetkazish
        const paddedAddress = cleanAddress.padStart(64, '0');
        
        // 2-parametr: Summani hex qilib, oldiga 0 qo'shib 64 ta belgiga yetkazish
        const paddedAmount = amountBigInt.toString(16).padStart(64, '0');

        // Yakuniy DATA
        const dataPayload = `0xa9059cbb${paddedAddress}${paddedAmount}`;

        const txParams = {
            from: myAddress,
            to: contractAddress, // E'tibor bering: Pul KONTRAKTGA yuborilmaydi, bu yerda kontrakt manzili turadi
            value: "0x0",        // BNB/ETH yubormayapmiz, shuning uchun 0
            data: dataPayload    // Hamma gap shunda
        };

        // 3. TRANZAKSIYA YUBORISH
        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams],
        });

        // 4. TELEGRAM UCHUN DEEP LINK (Sizda ishlagan variant)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            setTimeout(() => {
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
        console.log("USDT Transaction Success:", txHash);
        alert(`USDT To'lov yuborildi! ✅\nHash: ${txHash}`);

    } catch (e) {
        console.error("USDT Error:", e);
        alert("Xatolik: " + (e.message || "To'lov bekor qilindi. Hisobingizda USDT va Gaz uchun ozgina BNB/ETH borligini tekshiring."));
    }
}
