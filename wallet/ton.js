// ton.js - Faqat TON Wallet uchun javobgar

const TON_KEYS = {
    WALLET: "proguzmir_ton_wallet",
    TYPE: "proguzmir_wallet_type"
};

let tonConnectUI;

// Asosiy ishga tushirish funksiyasi (buni index.js chaqiradi)
function initTonWallet() {
    console.log("TON Wallet moduli ishga tushdi");

    // 1. TonConnectni sozlash
    if (!tonConnectUI) {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            // Manifest manzili (To'liq URL bo'lishi shart)
            manifestUrl: 'https://proguzmir.vercel.app/tonconnect-manifest.json', 
            buttonRootId: null
        });

        // Ulanish holatini kuzatish
        tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                const rawAddress = wallet.account.address;
                const userFriendly = TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
                saveTonData(userFriendly);
                updateTonUI();
            } else {
                // Agar TON o'chirilgan bo'lsa va hozirgi rejim TON bo'lsa
                if (localStorage.getItem(TON_KEYS.TYPE) === 'ton') {
                    clearTonData();
                }
            }
        });
    }

    // 2. Tugmani sozlash va UI ni yangilash
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
                const isConfirmed = confirm("Haqiqatan ham TON hamyonini uzmoqchimisiz?");
                if (isConfirmed) {
                    await tonConnectUI.disconnect();
                    clearTonData();
                }
            }
            // Boshqa joy bosilsa, hech narsa bo'lmaydi (jim turadi)
        } 
        else if (!currentType) {
            // Ulanmagan bo'lsa, butun tugma ishlayveradi
            try { await tonConnectUI.openModal(); } catch (e) { console.error(e); }
        } 
        else {
            alert("Avval MetaMask hamyonni uzing!");
        }
    });
}


// ton.js ichidagi updateTonUI funksiyasi

function updateTonUI() {
    const btnTon = document.getElementById('btnTon');
    if (!btnTon) return;

    const walletType = localStorage.getItem(TON_KEYS.TYPE);
    const address = localStorage.getItem(TON_KEYS.WALLET);

    // Elementlarni topamiz
    const textSpan = btnTon.querySelector('.invite-info span');
    const arrowDiv = btnTon.querySelector('.invite-arrow');
    const iconImg = btnTon.querySelector('.invite-icon img'); // ❗ Rasm elementi

    // Standart rasm
    const defaultIcon = "https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040";

    if (walletType === 'ton' && address) {
        // --- ULANGAN HOLAT ---
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        
        btnTon.style.background = "rgba(40, 167, 69, 0.15)";
        btnTon.style.border = "1px solid #28a745";
        
        if(textSpan) textSpan.innerHTML = `Connected: <b style="color:#fff">${shortAddr}</b>`;
        
        // 1. Rasmni o'zgartirish (Tonkeeper, MyTonWallet va h.k.)
        if (tonConnectUI && tonConnectUI.wallet && tonConnectUI.wallet.imageUrl) {
            iconImg.src = tonConnectUI.wallet.imageUrl;
        }

        // 2. O'ng tomon (Strelkani "Uzish" tugmasiga aylantirish)
        // Agar siz TON da "Uzish" tugmasi turishini xohlasangiz:
        if(arrowDiv) arrowDiv.innerHTML = `<button class="disconnect-btn">Uzish</button>`;
        
    } else {
        // --- ULANMAGAN HOLAT ---
        btnTon.style.background = "";
        btnTon.style.border = "";
        
        if(textSpan) textSpan.innerText = "Connect TON Wallet";
        
        // Rasmni va strelkani asl holiga qaytarish
        if(iconImg) iconImg.src = defaultIcon;
        if(arrowDiv) arrowDiv.innerHTML = `
            <span class="scoped-svg-icon">
                <img src="/image/arrow.svg" alt="">
            </span>`;
    }
}


function saveTonData(address) {
    localStorage.setItem(TON_KEYS.WALLET, address);
    localStorage.setItem(TON_KEYS.TYPE, 'ton');

    // Bazaga 'ton' deb yuboramiz
    if (window.saveWalletToDb) {
        window.saveWalletToDb(address, 'ton');
    }

    updateTonUI();
}

function clearTonData() {
    if (localStorage.getItem(TON_KEYS.TYPE) === 'ton') {
        localStorage.removeItem(TON_KEYS.WALLET);
        localStorage.removeItem(TON_KEYS.TYPE);
        updateTonUI();
    }
}

window.initTonWallet = initTonWallet;
