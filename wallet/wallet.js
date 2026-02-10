// /wallet/wallet.js

// --- GLOBAL O'ZGARUVCHILAR ---
let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Mahsulotlar (Val = Asosiy miqdor, Bonus = Sovg'a, USD = Narx, Stars = Yulduz narxi)
const PRICES = {
    'gem1': { name: "500 Diamonds",   val: 500,   bonus: 500,   usd: 1.19,  stars: 60 },
    'gem2': { name: "2,500 Diamonds",  val: 2500,  bonus: 2500,  usd: 4.99,  stars: 250 },
    'gem3': { name: "5,000 Diamonds",  val: 5000,  bonus: 5000,  usd: 9.98,  stars: 500 },
    'gem4': { name: "10,000 Diamonds", val: 10000, bonus: 10000, usd: 19.96, stars: 1000 },
    'gem5': { name: "25,000 Diamonds", val: 25000, bonus: 25000, usd: 49.99, stars: 2500 },
    'gem6': { name: "50,000 Diamonds", val: 50000, bonus: 50000, usd: 99.98, stars: 5000 }
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
async function getCryptoPrice(symbol) {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await response.json();
        return parseFloat(data.price);
    } catch (e) {
        console.error(`${symbol} Error getting price:`, e);
        alert("No internet connection or Course failed. Please try again.");
        return null;
    }
}

// --- 3. MODAL OCHISH (TO'LOV TURINI TANLASH) ---
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

    if (!modal || !title || !container) {
        console.error("Modal elementlari topilmadi (HTML ni tekshiring)");
        return;
    }

    // Sarlavhani o'rnatish
    title.innerText = `${item.name} (${item.usd}$)`;
    container.innerHTML = ""; // Oldingi tugmalarni tozalash

    // Hamyon holatini tekshirish
    const walletType = localStorage.getItem("proguzmir_wallet_type");

    // 1. TON tugmasi
    const tonBtnHTML = `
        <button class="pay-option-btn btn-ton-pay" onclick="processPayment('${itemId}', 'ton')">
            <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040"> Pay with TON
        </button>`;

    // 2. EVM (BNB) tugmasi
    const evmBtnHTML = `
        <button class="pay-option-btn btn-evm-pay" onclick="processPayment('${itemId}', 'evm')">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"> Pay with BNB
        </button>`;

    // 3. Stars tugmasi
    const starsBtnHTML = `
        <button class="pay-option-btn btn-stars-pay" onclick="processPayment('${itemId}', 'stars')">
            <img src="/image/ton-stars.png"> Pay with Stars <span style="color: #ffd700;">(${item.stars} ★)</span>
        </button>`;

    // --- MANTIQ ---
    if (walletType === 'ton') {
        container.innerHTML += tonBtnHTML;
        container.innerHTML += starsBtnHTML;
    } 
    else if (walletType === 'evm') {
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    } 
    else {
        container.innerHTML += tonBtnHTML;
        container.innerHTML += evmBtnHTML;
        container.innerHTML += starsBtnHTML;
    }

    // Modalni ko'rsatish
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

// --- 5. TRANZAKSIYALARNI BOSHQARISH ---

// Tranzaksiya qo'shish
function addTransactionRecord(title, subTitle, methodType) {
    let iconUrl = "./image/gems_pile.jpg";
    if (methodType === 'TON') iconUrl = "https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040";
    else if (methodType === 'BNB') iconUrl = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";
    else if (methodType === 'Stars') iconUrl = "/image/ton-stars.png";

    const now = new Date();
    // 0 qo'shib formatlash (09:05 kabi)
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const dateStr = now.toLocaleDateString() + ' ' + timeStr;

    const newRecord = {
        title: title,       // "500 + 500 Diamonds"
        method: subTitle,   // "Via TON" yoki narx
        type: methodType,
        icon: iconUrl,
        date: dateStr
    };

    const history = JSON.parse(localStorage.getItem('user_transactions')) || [];
    history.push(newRecord);
    localStorage.setItem('user_transactions', JSON.stringify(history));

    loadTransactions(); // Ekranni yangilash
}

// Tarixni yuklash
function loadTransactions() {
    const history = JSON.parse(localStorage.getItem('user_transactions')) || [];
    const container = document.getElementById('historyContainer');
    const msg = document.getElementById('noTransMsg');

    if (!container) return;

    container.innerHTML = ""; 

    if (history.length > 0) {
        if (msg) msg.style.display = 'none';
        
        // Teskari tartibda (eng yangisi tepada)
        [...history].reverse().forEach(item => {
            const html = `
                <div class="trans-item">
                    <div class="trans-left">
                        <div class="trans-icon">
                            <img src="${item.icon}" alt="icon">
                        </div>
                        <div class="trans-info">
                            <h4>${item.title}</h4>
                            <p>${item.type}</p>
                        </div>
                    </div>
                    <div class="trans-right">
                        <span class="trans-amount" style="color:#28a745">${item.method}</span>
                        <span class="trans-date" style="display:block; font-size:10px; color:#666">${item.date}</span>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    } else {
        if (msg) msg.style.display = 'block';
    }
}

// Sahifa yuklanganda ishga tushsin
document.addEventListener('DOMContentLoaded', loadTransactions);


// --- 6. TO'LOV JARAYONI (ASOSIY LOGIKA) ---

async function processPayment(itemId, method) {
    closePaymentModal(); // Modalni yopamiz

    const item = PRICES[itemId];
    
    // --- 1. STARS ---
    if (method === 'stars') {
        if(typeof initStarsPayment === 'function') {
            // Stars to'lovini kutamiz
            const isPaid = await initStarsPayment(item.stars, item.name); 
            
            if (isPaid) {
                const reward = getRewardAmount(itemId);
                
                // Tranzaksiya tarixiga yozish
                addTransactionRecord(reward.desc, `${item.stars} Stars`, "Stars");
                
                // Bu yerda foydalanuvchi balansiga olmos qo'shish funksiyasini chaqirasiz
                // addDiamondsToUser(reward.amount);

                alert(`Muvaffaqiyatli! Sizga ${reward.desc} berildi! 💎`);
            }
        } else {
            alert("Stars tizimi yuklanmagan!");
        }
        return;
    }

    // --- 2. TON ---
    if (method === 'ton') {
        // Hamyon ulanmagan bo'lsa
        if (localStorage.getItem("proguzmir_wallet_type") !== 'ton') {
            if (window.tonConnectUI) window.tonConnectUI.openModal();
            return;
        }

        const tonPrice = await getCryptoPrice("TONUSDT");
        if (!tonPrice) return;

        const amountTon = (item.usd / tonPrice).toFixed(4);

        if (confirm(`${item.name} uchun ${amountTon} TON (${item.usd}$) to'laysizmi?`)) {
            // itemId ni ham yuboramiz, shunda bonusni hisoblay olamiz
            await payWithTon(amountTon, itemId);
        }
        return;
    }

    // --- 3. EVM (BNB) ---
    if (method === 'evm') {
        if (localStorage.getItem("proguzmir_wallet_type") !== 'evm') {
            if (window.initMetaMaskWallet) window.initMetaMaskWallet();
            alert("Iltimos, MetaMask hamyonni ulang!");
            return;
        }

        const bnbPrice = await getCryptoPrice("BNBUSDT");
        if (!bnbPrice) return;

        const amountBnb = (item.usd / bnbPrice).toFixed(6);

        if (confirm(`${item.name} uchun ${amountBnb} BNB (${item.usd}$) to'laysizmi?`)) {
            await payWithEvm(amountBnb, itemId);
        }
        return;
    }
}


// --- 7. TON TO'LOV TIZIMI ---
async function payWithTon(amountTon, itemId) {
    try {
        if (!window.tonConnectUI || !window.tonConnectUI.connected) {
            alert("TON hamyon ulanmagan.");
            return;
        }

        if (!MERCHANT_TON) {
            alert("Merchant hamyon manzili topilmadi.");
            return;
        }

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
        
        // addDiamondsToUser(reward.amount); // Balansga qo'shish

        alert(`To'lov qabul qilindi! ✅\nSizga ${reward.desc} berildi.`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("User rejected")) {
            alert("Xatolik: " + e.message);
        }
    }
}


// --- 8. EVM (BNB) TO'LOV TIZIMI ---
async function payWithEvm(amountBnb, itemId) {
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

    try {
        const walletProvider = window.evmModal.getWalletProvider();
        const myAddress = account.address;

        // Tarmoqni tekshirish (BNB Chain ID: 56)
        const chainId = await walletProvider.request({ method: 'eth_chainId' });
        if (chainId !== '0x38' && parseInt(chainId) !== 56) {
             try {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }],
                });
             } catch(err) {
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

        const txHash = await walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
        });

        console.log("BNB Success:", txHash);
        
        // Muvaffaqiyatli bo'lsa:
        const reward = getRewardAmount(itemId);
        addTransactionRecord(reward.desc, `${amountBnb} BNB`, "BNB");
        
        // addDiamondsToUser(reward.amount); // Balansga qo'shish

        alert(`To'lov yuborildi! ✅\nSizga ${reward.desc} berildi.`);

    } catch (e) {
        console.error(e);
        if (!e.message?.includes("rejected")) {
            alert("Xatolik: " + e.message);
        }
    }
}
