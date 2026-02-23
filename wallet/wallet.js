// /wallet/wallet.js

// --- GLOBAL O'ZGARUVCHILAR ---
let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Mahsulotlar (USD va STARS narxlari bilan)
const PRICES = {
    'gem1': { name: "1000 diamond", val: 1000, bonus: 1000, usd: 1.19, stars: 60 },
    'gem2': { name: "5,000 diamond", val: 5000, bonus: 5000, usd: 4.99, stars: 250 },
    'gem3': { name: "10,000 diamond", val: 10000, bonus: 10000, usd: 9.98, stars: 500 },
    'gem4': { name: "20,000 diamond", val: 20000, bonus: 20000, usd: 19.96, stars: 1000 },
    'gem5': { name: "50,000 diamond", val: 50000, bonus: 50000, usd: 49.99, stars: 2500 },
    'gem6': { name: "100,000 diamond", val: 100000, bonus: 100000, usd: 99.98, stars: 5000 }
};

// --- 1. SOZLAMALARNI YUKLASH ---
async function loadWalletConfig() {
    try {
        const response = await fetch('/api/wallet-data.js');
        const data = await response.json();
        if (data.ton_address && data.evm_address) {
            MERCHANT_TON = data.ton_address;
            MERCHANT_EVM = data.evm_address;
            console.log("Wallet addresses loaded");
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
// --- YORDAMCHI FUNKSIYA: Hamyon rasmini aniqlash ---
function getEvmIcon() {
    // Default: MetaMask rasmi
    let defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";

    // Agar EVM hamyon ulanmagan bo'lsa, default qaytaradi
    if (localStorage.getItem("proguzmir_wallet_type") !== 'evm') {
        return defaultIcon;
    }

    if (window.evmModal) {
        try {
            // 1-usul: AppKit ma'lumotlaridan olish (Eng aniq)
            const info = window.evmModal.getWalletInfo();
            if (info && info.icon) return info.icon; // Hamyonning o'z rasmi

            // 2-usul: Nomidan aniqlash
            if (info && info.name) {
                const name = info.name.toLowerCase();
                if (name.includes("trust")) return "https://cryptologos.cc/logos/trust-wallet-token-twt-logo.svg?v=026";
                if (name.includes("binance")) return "https://cryptologos.cc/logos/binance-coin-bnb-logo.svg?v=026";
                if (name.includes("bitkeep") || name.includes("bitget")) return "https://raw.githubusercontent.com/bitkeepwallet/download/main/logo/png/bitkeep_logo_square.png";
                if (name.includes("okx")) return "https://cryptologos.cc/logos/okb-okb-logo.svg?v=029";
                if (name.includes("safepal")) return "https://pbs.twimg.com/profile_images/1676907573033500672/L3z-Y-3__400x400.jpg";
            }

            // 3-usul: Provayder flaglaridan aniqlash
            const provider = window.evmModal.getWalletProvider();
            if (provider) {
                if (provider.isTrust) return "https://cryptologos.cc/logos/trust-wallet-token-twt-logo.svg?v=026";
                if (provider.isBitKeep) return "https://raw.githubusercontent.com/bitkeepwallet/download/main/logo/png/bitkeep_logo_square.png";
            }
        } catch (e) {
            console.log("Icon aniqlashda xatolik:", e);
        }
    }

    return defaultIcon;
}

// --- 3. ASOSIY SOTIB OLISH FUNKSIYASI ---
function buyItem(itemId) {
    const item = PRICES[itemId];
    if (!item) {
        alert("Product not found!");
        return;
    }

    const modal = document.getElementById('paymentModal');
    const title = document.getElementById('paymentItemName');
    const container = document.getElementById('paymentOptions');

    if (!modal) return;

    // Sarlavha
    title.innerText = `${item.name} (${item.usd}$)`;
    container.innerHTML = "";

    const walletType = localStorage.getItem("proguzmir_wallet_type");

    // 🔥 YANGILIK: Hamyon rasmini va nomini aniqlaymiz
    const evmIconUrl = getEvmIcon();
    let evmButtonText = "Pay with BNB";

    // Agar Trust yoki Binance bo'lsa, tugma nomini ham chiroyli qilish mumkin (ixtiyoriy)
    if (evmIconUrl.includes("trust")) evmButtonText = "Pay with Trust Wallet";
    else if (evmIconUrl.includes("binance")) evmButtonText = "Pay with Binance";

    // 1. TON tugmasi
    const tonBtnHTML = `
        <button class="pay-option-btn btn-ton-pay" onclick="processPayment('${itemId}', 'ton')">
            <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040"> Pay with TON
        </button>`;

    // 2. EVM (BNB) tugmasi - 🔥 Rasm o'zgaruvchi (evmIconUrl) ga almashtirildi
    const evmBtnHTML = `
        <button class="pay-option-btn btn-evm-pay" onclick="processPayment('${itemId}', 'evm')">
            <img src="${evmIconUrl}" style="border-radius: 50%;"> ${evmButtonText}
        </button>`;

    // 3. Stars tugmasi
    const starsBtnHTML = `
        <button class="pay-option-btn btn-stars-pay" onclick="processPayment('${itemId}', 'stars')">
            <img src="/image/ton-stars.png"> Pay with Stars <span style="color: #ffd700;">(${item.stars} ★)</span>
        </button>`;

    // Modal ichiga tugmalarni joylash
    if (walletType === 'ton') {
        container.innerHTML += tonBtnHTML;
        container.innerHTML += starsBtnHTML;
    } else if (walletType === 'evm') {
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    } else {
        container.innerHTML += tonBtnHTML;
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    }

    modal.style.display = "flex";
}


// Modalni yopish
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = "none";
}

// --- 4. BONUS TIZIMI ---
function getRewardAmount(itemId) {
    const item = PRICES[itemId];
    if (!item) return { amount: 0, desc: "Unknown" };

    // Xotiradan tekshiramiz: "bu_buyum_oldin_olinganmi?"
    const hasBoughtKey = "bought_" + itemId;
    const hasBought = localStorage.getItem(hasBoughtKey);

    let finalAmount = item.val;
    let description = `+${item.val} Diamonds`;

    // Agar oldin sotib olinmagan bo'lsa (First Time Bonus)
    if (!hasBought) {
        finalAmount = item.val + item.bonus; // 2x Bonus
        description = `+${item.val} + ${item.bonus} (Bonus) Diamonds`;

        // Endi "sotib olindi" deb belgilab qo'yamiz
        localStorage.setItem(hasBoughtKey, "true");

        // Agar kerak bo'lsa, vizual belgini yashirish funksiyasini shu yerga qo'shish mumkin
        // hideBonusBadge(itemId); 
    }

    return { amount: finalAmount, desc: description };
}

// Bonus belgisini yashirish (Vizual)
function hideBonusBadge(itemId) {
    // Bu funksiya keyinchalik sahifa yangilanganda ham ishlashi uchun
    // index.html dagi tegishli divni topib 'display: none' qilishi kerak
    // Hozircha shart emas, lekin logika shunda.
}


// 2. Yangi tranzaksiya qo'shish funksiyasi
function addTransactionRecord(title, amountStr, methodType) {
    // Iconni aniqlash
    let iconUrl = "";
    if (methodType === 'TON') iconUrl = "https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040";
    else if (methodType === 'BNB') iconUrl = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";
    else if (methodType === 'Stars') iconUrl = "/image/ton-stars.png";
    else iconUrl = "./image/gems_pile.jpg"; // Default

    // Hozirgi vaqt
    const now = new Date();
    // 0 qo'shib formatlash (09:05 kabi)
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const dateStr = now.toLocaleDateString() + ' ' + timeStr;

    const newRecord = {
        title: title,       // Masalan: "500 Diamonds"
        amount: amountStr,  // Masalan: "1.19$" yoki "50 TON"
        method: methodType, // "TON", "BNB", "Stars"
        icon: iconUrl,
        date: dateStr
    };

    // Eskilarini olib, yangisini qo'shamiz
    const history = JSON.parse(localStorage.getItem('user_transactions')) || [];
    history.push(newRecord);

    // Xotiraga saqlash
    localStorage.setItem('user_transactions', JSON.stringify(history));

    // Ekranni yangilash
    loadTransactions();
}
// --- TRANZAKSIYALAR TARIXI TIZIMI ---

// 1. Tarixni yuklash (Sahifa ochilganda)
function loadTransactions() {
    const history = JSON.parse(localStorage.getItem('user_transactions')) || [];
    const container = document.getElementById('historyContainer');
    const msg = document.getElementById('noTransMsg');

    if (!container) return;

    container.innerHTML = ""; // Tozalash

    if (history.length > 0) {
        msg.style.display = 'none'; // "No records" yozuvini yashirish
        // Oxirgi tranzaksiya tepada turishi uchun teskari aylantiramiz
        history.reverse().forEach(item => {
            const html = `
                <div class="trans-item">
                    <div class="trans-left">
                        <div class="trans-icon">
                            <img src="${item.icon}" alt="icon">
                        </div>
                        <div class="trans-info">
                            <h4>${item.title}</h4>
                            <p>${item.method}</p>
                        </div>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amount">+ ${item.amount}</span>
                        <span class="trans-date">${item.date}</span>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    } else {
        msg.style.display = 'block';
    }
}

// Sahifa yuklanganda ishga tushsin
document.addEventListener('DOMContentLoaded', loadTransactions);


// --- TANLANGAN TO'LOVNI BOSHLASH ---
async function processPayment(itemId, method) {
    closePaymentModal(); // Modalni yopamiz

    const item = PRICES[itemId];

    // --- 1. STARS ---
    if (method === 'stars') {
        if (typeof initStarsPayment === 'function') {
            // Stars to'lovini kutamiz
            const isPaid = await initStarsPayment(item.stars, item.name);

            if (isPaid) {
                const reward = getRewardAmount(itemId);

                // Tranzaksiya tarixiga yozish
                addTransactionRecord(reward.desc, `${item.stars} Stars`, "Stars");

                // Bu yerda foydalanuvchi balansiga olmos qo'shish funksiyasini chaqirasiz
                completeEarnTask('#stars_payment');

                alert(`Successful! You were given ${reward.desc} ! 💎`);
            }
        } else {
            alert("Stars system not loaded!");
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

        if (confirm(`Would you pay ${amountTon} TON (${item.usd}$) for ${item.name}?`)) {
            await payWithTon(amountTon, itemId);
        }
        return;
    }

    // 3. EVM (BNB) orqali to'lov
    if (method === 'evm') {
        // Agar EVM ulanmagan bo'lsa
        if (localStorage.getItem("proguzmir_wallet_type") !== 'evm') {
            if (window.initMetaMaskWallet) window.initMetaMaskWallet();
            alert("Please connect your MetaMask wallet!");
            return;
        }

        const bnbPrice = await getCryptoPrice("BNBUSDT");
        if (!bnbPrice) return;

        const amountBnb = (item.usd / bnbPrice).toFixed(6);

        if (confirm(`Would you pay ${amountBnb} BNB (${item.usd}$) for ${item.name}?`)) {
            await payWithEvm(amountBnb, item.name, itemId);
        }
        return;
    }
}


// --- 4. TON TIZIMI (REAL TON COIN YUBORISH) ---
// Eslatma: Bu yerda endi USDT emas, haqiqiy TON so'raladi (kurs bo'yicha hisoblangan)
async function payWithTon(amountTon, itemId) {
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

        // Muvaffaqiyatli bo'lsa:
        const reward = getRewardAmount(itemId);
        addTransactionRecord(reward.desc, `${amountTon} TON`, "TON");

        completeEarnTask('#ton_payment');

        alert(`Payment accepted! ✅\nYou have been given ${reward.desc}`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("User rejected")) {
            alert("Error: " + e.message);
        }
    }
}

// --- 8. EVM (BNB) TO'LOV TIZIMI ---
async function payWithEvm(amountBnb, itemName, itemId) {

    // 1. Tizimni tekshirish
    if (!window.evmModal) {
        if (window.initMetaMaskWallet) await window.initMetaMaskWallet();
        if (!window.evmModal) {
            alert("Tizim yuklanmoqda... Qayta urinib ko'ring.");
            return;
        }
    }

    const account = window.evmModal.getAccount();
    if (!account.isConnected) {
        await window.evmModal.open();
        return;
    }

    // Manzil borligini tekshirish
    if (!MERCHANT_EVM) {
        alert("Merchant EVM address not loaded. Please refresh the page.");
        return;
    }

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // Tarmoqni tekshirish (BNB Smart Chain - 56)
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        if (chainId !== '0x38' && parseInt(chainId) !== 56) {
            try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }],
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

        // 1. So'rovni yuboramiz (Promise holatida, kutmasdan)
        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
        });

        // 2. MAJBURIY REDIRECT (Universal wc://)
        if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            setTimeout(() => {
                const link = document.createElement('a');
                link.href = "wc://";

                link.target = "_blank";
                link.rel = "noopener noreferrer";

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 500); // 1 soniya kutib ochamiz
        }

        // 3. Natijani kutamiz
        const txHash = await txPromise;

        console.log("BNB Success:", txHash);

        // Muvaffaqiyatli:
        const reward = getRewardAmount(itemId);
        addTransactionRecord(reward.desc, `${amountBnb} BNB`, "BNB");
        completeEarnTask('#bnb_payment');

        alert(`Payment sent! ✅\nYou have been given ${reward.desc}`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("rejected")) {
            if (e.message?.includes("insufficient funds") || e.message?.includes("gas")) {
                alert("Error: Insufficient BNB balance (Gas fee also required).");
            } else {
                alert("Error: " + e.message);
            }
        }
    }
}

// Earn bo'limidagi vazifalarni avtomat bajarildi deb belgilash va 300k olmos + 20 kalit berish
function completeEarnTask(taskId) {
    // 1. Foydalanuvchi holatini (state) olish
    let s = (typeof state !== 'undefined') ? state : JSON.parse(localStorage.getItem('user_state') || '{}');
    
    if (!s.completedTasks) s.completedTasks = {};

    // 2. Agar vazifa oldin bajarilmagan bo'lsa (faqat 1 marta beriladi)
    if (!s.completedTasks[taskId]) {
        s.completedTasks[taskId] = true; // Bajarildi deb belgilash
        
        // 3. Mukofotni qo'shish: 300,000 olmos va 20 ta kalit
        s.diamond = (s.diamond || 0) + 300000;
        s.keysTotal = (s.keysTotal || 0) + 20;
        s.keysUsed = (s.keysUsed || 0) + 20; 

        // 4. Ma'lumotlarni saqlash
        if (typeof state !== 'undefined') state = s; // Ochiq holatni yangilash
        localStorage.setItem('user_state', JSON.stringify(s));
        
        if (typeof saveState === 'function') saveState(s);
        if (typeof saveUserState === 'function') saveUserState(s);
        
        // 5. Ekranda olmos sonini o'zgartirish (Wallet pageda ko'rinishi uchun)
        const diamondDisplay = document.querySelector('[data-diamond-display]');
        if (diamondDisplay) diamondDisplay.innerText = s.diamond;
        
        // 6. Mukofot berilgani haqida xabar
        setTimeout(() => {
            alert("🎉 Congratulations! 'Transaction' task completed: +300,000 💎 and +20 🔑 added!");
        }, 500); // Asosiy xabardan keyin chiqishi uchun biroz kutamiz
    }
}

