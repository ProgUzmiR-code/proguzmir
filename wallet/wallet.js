// /wallet/wallet.js

// --- GLOBAL O'ZGARUVCHILAR ---
let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Mahsulotlar (USD va STARS narxlari bilan)
const PRICES = {
    'gem1': { name: "500 diamond", usd: 1.19, stars: 50 },
    'gem2': { name: "2,500 diamond", usd: 4.99, stars: 250 },
    'gem3': { name: "5,000 diamond", usd: 9.98, stars: 500 },
    'gem4': { name: "10,000 diamond", usd: 19.96, stars: 1000 },
    'gem5': { name: "25,000 diamond", usd: 49.99, stars: 2500 },
    'gem6': { name: "50,000 diamond", usd: 99.98, stars: 5000 }
};

// --- 1. SOZLAMALARNI YUKLASH ---
async function loadWalletConfig() {
    try {
        const response = await fetch('/api/wallet-data.js');
        const data = await response.json();
        if (data.ton_address && data.evm_address) {
            MERCHANT_TON = data.ton_address;
            MERCHANT_EVM = data.evm_address;
            console.log("Wallet addresses loaded ✅");
        }
    } catch (error) {
        console.error("Error loading config:", error);
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
        console.error(`${symbol} Error getting price:`, e);
        alert("No internet connection or Course failed. Please try again.");
        return null;
    }
}

// --- 3. ASOSIY SOTIB OLISH FUNKSIYASI ---

function buyItem(itemId) {
    const item = PRICES[itemId];
    if (!item) {
        alert("Mahsulot topilmadi!");
        return;
    }

    // Modal elementlarini olish
    const modal = document.getElementById('paymentModal');
    const title = document.getElementById('paymentItemName');
    const container = document.getElementById('paymentOptions');

    // Sarlavhani o'rnatish
    title.innerText = `${item.name} (${item.usd}$)`;
    container.innerHTML = ""; // Oldingi tugmalarni tozalash

    // Hamyon holatini tekshirish
    const walletType = localStorage.getItem("proguzmir_wallet_type");

    // 1. TON tugmasi (HTML kodi)
    const tonBtnHTML = `
        <button class="pay-option-btn btn-ton-pay" onclick="processPayment('${itemId}', 'ton')">
            <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040"> Pay with TON
        </button>`;

    // 2. EVM (BNB) tugmasi (HTML kodi)
    const evmBtnHTML = `
        <button class="pay-option-btn btn-evm-pay" onclick="processPayment('${itemId}', 'evm')">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"> Pay with BNB
        </button>`;

    // 3. Stars tugmasi (HTML kodi) - Narxi bilan chiqadi
    const starsBtnHTML = `
        <button class="pay-option-btn btn-stars-pay" onclick="processPayment('${itemId}', 'stars')">
            <img src="/image/ton-stars.png"> Pay with Stars <span style="color: #ffd700;">(${item.stars} ★)</span>
        </button>`;


    // --- MANTIQ (Siz so'ragan qism) ---

    if (walletType === 'ton') {
        // Agar TON ulangan bo'lsa: TON + Stars
        container.innerHTML += tonBtnHTML;
        container.innerHTML += starsBtnHTML;
    } 
    else if (walletType === 'evm') {
        // Agar EVM ulangan bo'lsa: EVM + Stars
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    } 
    else {
        // Agar hech narsa ulanmagan bo'lsa: TON + EVM + Stars
        container.innerHTML += tonBtnHTML;
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    }

    // Modalni ko'rsatish
    modal.style.display = "flex";
}

// Modalni yopish
function closePaymentModal() {
    document.getElementById('paymentModal').style.display = "none";
}

// --- TANLANGAN TO'LOVNI BOSHLASH ---
async function processPayment(itemId, method) {
    closePaymentModal(); // Modalni yopamiz

    const item = PRICES[itemId];
    
    // 1. STARS orqali to'lov
    if (method === 'stars') {
        if(typeof initStarsPayment === 'function') {
            // Supabase funksiyasiga yuborish
            await initStarsPayment(item.stars, item.name); 
        } else {
            alert("Stars tizimi yuklanmagan!");
        }
        return;
    }

    // 2. TON orqali to'lov
    if (method === 'ton') {
        // Agar TON ulanmagan bo'lsa, ulatamiz
        if (localStorage.getItem("proguzmir_wallet_type") !== 'ton') {
            await window.tonConnectUI.openModal();
            // Ulangandan keyin qayta urinib ko'rish mumkin
            return;
        }

        const tonPrice = await getCryptoPrice("TONUSDT");
        if (!tonPrice) return;
        
        const amountTon = (item.usd / tonPrice).toFixed(4);
        
        if (confirm(`${item.name} uchun ${amountTon} TON to'laysizmi?`)) {
            await payWithTon(amountTon);
        }
        return;
    }

    // 3. EVM (BNB) orqali to'lov
    if (method === 'evm') {
        // Agar EVM ulanmagan bo'lsa
        if (localStorage.getItem("proguzmir_wallet_type") !== 'evm') {
             if (window.initMetaMaskWallet) window.initMetaMaskWallet();
             alert("Iltimos, MetaMask hamyonni ulang!");
             return;
        }

        const bnbPrice = await getCryptoPrice("BNBUSDT");
        if (!bnbPrice) return;

        const amountBnb = (item.usd / bnbPrice).toFixed(6);

        if (confirm(`${item.name} uchun ${amountBnb} BNB to'laysizmi?`)) {
            await payWithEvm(amountBnb, item.name);
        }
        return;
    }
}


// --- 4. TON TIZIMI (REAL TON COIN YUBORISH) ---
// Eslatma: Bu yerda endi USDT emas, haqiqiy TON so'raladi (kurs bo'yicha hisoblangan)
async function payWithTon(amountTon) {
    try {
        if (!window.tonConnectUI) {
            alert("The TON system did not load. Please try again.");
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
        console.log("TON Payment success:", result);
        alert("Payment successful! ✅");

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("User rejected")) {
            alert("Error: " + e.message);
        }
    }
}

// --- 5. EVM / METAMASK TIZIMI ---
async function payWithEvm(amountBnb, itemName) {

    // 1. Tizimni tekshirish va YUKLASH
    if (!window.evmModal) {
        console.log("MetaMask system not found. Restarting...");

        if (window.initMetaMaskWallet) {
            await window.initMetaMaskWallet(); // Kutamiz
        }

        // Agar shunda ham bo'lmasa:
        if (!window.evmModal) {
            alert("System is loading... Please wait a few seconds and try again.");
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
                alert("Please select the BNB Smart Chain network in MetaMask.");
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
        alert(`Payment sent! ✅\nHash: ${txHash}`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("rejected")) {
            alert("Error: " + e.message);
        }
    }
}
