// /wallet/ton.js - Faqat TON Wallet uchun javobgar

const TON_KEYS = {
    WALLET: "proguzmir_ton_wallet",
    TYPE: "proguzmir_wallet_type"
};

let tonConnectUI;


// ✅ YANGI: Biz window.tonConnectUI dan foydalanamiz
// --- ton.js ---

function initTonWallet() {
    console.log("TON Wallet moduli ishga tushdi");

    if (!window.tonConnectUI) {
        window.tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://proguzmir.vercel.app/tonconnect-manifest.json',
            buttonRootId: null
        });

        window.tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                const rawAddress = wallet.account.address;
                const userFriendly = TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);

                // --- YANGI: Rasmni olish va saqlash ---
                let walletImage = null;
                if (wallet.imageUrl) {
                    walletImage = wallet.imageUrl;
                } else if (wallet.device && wallet.device.appName === 'telegram-wallet') {
                    // Telegram Wallet uchun maxsus rasm (agar avtomat chiqmasa)
                    walletImage = "https://wallet.tg/images/logo-288.png";
                }

                saveTonData(userFriendly, walletImage); // Rasmni ham saqlaymiz
                // -------------------------------------

            } else {
                if (localStorage.getItem(TON_KEYS.TYPE) === 'ton') {
                    clearTonData();
                }
            }
        });
    }

    setupTonButton();
    updateTonUI();
}

// ton.js ichida

function setupTonButton() {
    const btnTon = document.getElementById('btnTon');
    if (!btnTon) return;

    // Eski klonlarni tozalash
    const newBtn = btnTon.cloneNode(true);
    btnTon.parentNode.replaceChild(newBtn, btnTon);

    newBtn.addEventListener('click', async (e) => {
        const currentType = localStorage.getItem(TON_KEYS.TYPE);

        if (currentType === 'ton') {
            // ❗ MUHIM: Faqat "disconnect-btn" klassi bor element bosilsa ishlaydi
            if (e.target.classList.contains('disconnect-btn')) {
                const isConfirmed = confirm("Do you really want to disconnect the TON wallet?");
                if (isConfirmed) {
                    window.tonConnectUI.disconnect();
                    clearTonData();
                }
            }
            // Boshqa joy bosilsa, hech narsa bo'lmaydi (jim turadi)
        }
        else if (!currentType) {
            // Ulanmagan bo'lsa, butun tugma ishlayveradi
            try { await window.tonConnectUI.openModal(); } catch (e) { console.error(e); }
        }
        else {
            alert("First, disconnect your MetaMask wallet!");
        }
    });
}


// UI yangilash funksiyasi
function updateTonUI() {
    const btnTon = document.getElementById('btnTon');
    if (!btnTon) return;

    const walletType = localStorage.getItem(TON_KEYS.TYPE);
    const address = localStorage.getItem(TON_KEYS.WALLET);
    // Saqlangan rasmni olamiz
    const savedImage = localStorage.getItem("proguzmir_ton_image");

    const textSpan = btnTon.querySelector('.invite-info span');
    const arrowDiv = btnTon.querySelector('.invite-arrow');
    const iconImg = btnTon.querySelector('.invite-icon img');

    const defaultIcon = "https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040";

    if (walletType === 'ton' && address) {
        // --- ULANGAN ---
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        btnTon.style.background = "rgba(40, 167, 69, 0.15)";
        btnTon.style.border = "1px solid #28a745";
        if (textSpan) textSpan.innerHTML = `Connected: <b style="color:#fff">${shortAddr}</b>`;

        // 1. Rasmni qo'yish
        // Avval saqlangan rasmni tekshiramiz, keyin TonConnect jonli obyektini
        if (savedImage) {
            iconImg.src = savedImage;
        } else if (window.tonConnectUI && window.tonConnectUI.wallet && window.tonConnectUI.wallet.imageUrl) {
            iconImg.src = window.tonConnectUI.wallet.imageUrl;
        }

        if (arrowDiv) arrowDiv.innerHTML = `<button class="disconnect-btn">Disconnect</button>`;
    } else {
        // --- ULANMAGAN ---
        btnTon.style.background = "";
        btnTon.style.border = "";
        if (textSpan) textSpan.innerText = "Connect TON Wallet";
        if (iconImg) iconImg.src = defaultIcon;
        if (arrowDiv) arrowDiv.innerHTML = `<span class="scoped-svg-icon"><img src="/image/arrow.svg" alt=""></span>`;
    }
}




// saveTonData ni o'zgartiramiz: rasm qabul qiladigan qilamiz
function saveTonData(address, imageUrl) {
    localStorage.setItem(TON_KEYS.WALLET, address);
    localStorage.setItem(TON_KEYS.TYPE, 'ton');

    // Agar rasm kelsa, saqlaymiz
    if (imageUrl) {
        localStorage.setItem("proguzmir_ton_image", imageUrl);
    }

    if (window.saveWalletToDb) {
        window.saveWalletToDb(address, 'ton');
    }
    updateTonUI();
}

function clearTonData() {
    if (localStorage.getItem(TON_KEYS.TYPE) === 'ton') {
        localStorage.removeItem(TON_KEYS.WALLET);
        localStorage.removeItem(TON_KEYS.TYPE);
        localStorage.removeItem("proguzmir_ton_image"); // Rasmni ham o'chiramiz
        updateTonUI();
    }
}



window.initTonWallet = initTonWallet;

// Sahifa to'liq yuklangandan so'ng darhol ishga tushadi
document.addEventListener('DOMContentLoaded', () => {
    // Agar hali ishga tushmagan bo'lsa, ishga tushirsin
    if (!window.tonConnectUI) {
        initTonWallet();
    }
});

