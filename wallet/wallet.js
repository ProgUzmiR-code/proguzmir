// /wallet/wallet.js

// --- GLOBAL O'ZGARUVCHILAR ---
let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Mahsulotlar (Faqat USD narxi yoziladi)
const PRICES = {
    'gem1': { name: "500 diamond", usd: 1.19 },
    'gem2': { name: "2,500 diamond", usd: 5.99 },
    'gem3': { name: "5,000 diamond", usd: 11.99 },
    'gem4': { name: "10,000 diamond", usd: 23.99 },
    'gem5': { name: "25,000 diamond", usd: 54.99 },
    'gem6': { name: "50,000 diamond", usd: 109.99 }
};

// --- 1. SOZLAMALARNI YUKLASH ---
async function loadWalletConfig() {
    try {
        const response = await fetch('/api/wallet-data.js');
        const data = await response.json();
        if (data.ton_address && data.evm_address) {
            MERCHANT_TON = data.ton_address;
            MERCHANT_EVM = data.evm_address;
            console.log("Hamyon manzillari yuklandi ✅");
        }
    } catch (error) {
        console.error("Config yuklashda xato:", error);
    }
}
loadWalletConfig();

// --- 2. KURS ECHISH (API) ---
// Binance API orqali narxlarni olamiz (Bepul va tez)
async function getCryptoPrice(symbol) {
    try {
        // symbol: "TONUSDT" yoki "BNBUSDT"
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        return parseFloat(data.price);
    } catch (e) {
        console.error(`${symbol} narxini olishda xatolik:`, e);
        alert("Internet bilan aloqa yo'q yoki Kursni olib bo'lmadi. Qayta urinib ko'ring.");
        return null;
    }
}

// --- 3. ASOSIY SOTIB OLISH FUNKSIYASI ---
async function buyItem(itemId) {
    console.log("Tanlangan: " + itemId);

    // 0. Tizim yuklanmagan bo'lsa, uni majburan yuklaymiz
    if (!MERCHANT_TON || !MERCHANT_EVM) {
        // Agar config yuklanmagan bo'lsa
        loadWalletConfig();
    }

    // --- MUHIM TUZATISH: AppKitni tekshirish ---
    // Agar MetaMask tizimi hali yuklanmagan bo'lsa, uni ishga tushiramiz
    if (!window.evmModal && window.initMetaMaskWallet) {
        console.log("Tizim topilmadi, ishga tushirilmoqda...");
        window.initMetaMaskWallet(); // Tizimni uyg'otamiz
    }
    // -------------------------------------------

    // 1. Mahsulot bormi?
    const item = PRICES[itemId];
    if (!item) {
        alert("Xatolik: Mahsulot topilmadi!");
        return;
    }

    // 2. Hamyon turi?
    const walletType = localStorage.getItem("proguzmir_wallet_type");

    if (walletType === 'ton') {
        const tonPrice = await getCryptoPrice("TONUSDT"); 
        if (!tonPrice) return;
        const amountTon = (item.usd / tonPrice).toFixed(4); 

        if (confirm(`${item.name} uchun ${amountTon} TON (${item.usd}$) to'laysizmi?`)) {
            await payWithTon(amountTon);
        }

    } else if (walletType === 'evm') {
        const bnbPrice = await getCryptoPrice("BNBUSDT");
        if (!bnbPrice) return;
        const amountBnb = (item.usd / bnbPrice).toFixed(6);

        if (confirm(`${item.name} uchun ${amountBnb} BNB (${item.usd}$) to'laysizmi?`)) {
            // Tizim yuklanishi uchun ozgina vaqt kerak bo'lishi mumkin, shuning uchun tekshiramiz
            if (!window.evmModal) {
                alert("Tizim yuklanmoqda... Iltimos, 3 soniya kutib, qayta bosing.");
                // Yana bir bor urinib ko'ramiz
                if(window.initMetaMaskWallet) window.initMetaMaskWallet();
            } else {
                await payWithEvm(amountBnb, item.name);
            }
        }

    } else {
        alert("Iltimos, avval hamyonni ulang!");
        // Agar iloji bo'lsa, wallet bo'limiga o'tkazish
        if(document.querySelector('.invite-listm2')) {
            document.querySelector('.invite-listm2').scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// --- 4. TON TIZIMI (REAL TON COIN YUBORISH) ---
// Eslatma: Bu yerda endi USDT emas, haqiqiy TON so'raladi (kurs bo'yicha hisoblangan)
async function payWithTon(amountTon) {
    try {
        if (!window.tonConnectUI) {
            alert("TON tizimi yuklanmadi.");
            return;
        }

        if (!window.tonConnectUI.connected) {
            await window.tonConnectUI.openModal();
            return;
        }

        // TON ni NanoTON ga o'tkazish (1 TON = 1,000,000,000)
        const amountNano = Math.floor(parseFloat(amountTon) * 1e9).toString();

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [
                {
                    address: MERCHANT_TON,
                    amount: amountNano
                }
            ]
        };

        const result = await window.tonConnectUI.sendTransaction(transaction);
        console.log("TON To'lov success:", result);
        alert("To'lov muvaffaqiyatli! ✅");

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("User rejected")) {
            alert("Xatolik: " + e.message);
        }
    }
}

// --- 5. EVM / METAMASK TIZIMI ---
async function payWithEvm(amountBnb, itemName) {

    // 1. Tizimni tekshirish va YUKLASH
    if (!window.evmModal) {
        console.log("MetaMask tizimi topilmadi. Qayta ishga tushirilmoqda...");
        
        if (window.initMetaMaskWallet) {
            await window.initMetaMaskWallet(); // Kutamiz
        }

        // Agar shunda ham bo'lmasa:
        if (!window.evmModal) {
            alert("Tizim yuklanmoqda... Iltimos, bir necha soniya kutib qayta urinib ko'ring.");
            // Qayta ishga tushirishga urinish (fon rejimida)
            if (typeof initMetaMaskSystem === 'function') initMetaMaskSystem();
            return;
        }
    }

    // 2. Account tekshirish
    const account = window.evmModal.getAccount();
    if (!account.isConnected) {
        // Agar ulanmagan bo'lsa, ulanish oynasini ochamiz
        await window.evmModal.open();
        return;
    }

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // Tarmog'ni tekshirish (BNB Smart Chain - 56)
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        if (chainId !== '0x38' && parseInt(chainId) !== 56) {
             try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // 56
                });
            } catch (err) {
                alert("Iltimos, MetaMaskda BNB Smart Chain tarmog'ini tanlang.");
                return;
            }
        }

        const weiValue = "0x" + BigInt(Math.floor(parseFloat(amountBnb) * 1e18)).toString(16);

        const txParams = {
            from: myAddress,
            to: MERCHANT_EVM,
            value: weiValue,
            data: "0x"
        };

        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
        });

        // --- AQLLI REDIRECT ---
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            setTimeout(() => {
                const link = document.createElement('a');
                let deepLink = "wc://"; 

                // Provayderni aniqlash
                if (walletProvider) {
                    if (walletProvider.isTrust) deepLink = "trust://";
                    else if (walletProvider.isMetaMask) deepLink = "metamask://";
                    else if (walletProvider.isBitKeep || walletProvider.isBitget) deepLink = "bitkeep://";
                    else if (walletProvider.isSafePal) deepLink = "safepalwallet://";
                    else if (walletProvider.isTokenPocket) deepLink = "tpoutside://";
                }
                
                link.href = deepLink; 
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 1000);
        }

        const txHash = await txPromise;
        console.log("BNB Success:", txHash);
        alert(`To'lov yuborildi! ✅\nHash: ${txHash}`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("rejected")) {
            alert("Xatolik: " + e.message);
        }
    }
}
