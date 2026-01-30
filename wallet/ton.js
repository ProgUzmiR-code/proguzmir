// ton.js - Faqat TON Wallet uchun javobgar

const TON_KEYS = {
    WALLET: "proguzmir_crypto_wallet",
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

// ton.js ichidagi setupTonButton funksiyasi

function setupTonButton() {
    const btnTon = document.getElementById('btnTon');
    if (!btnTon) return;

    // Eski klonlarni tozalash
    const newBtn = btnTon.cloneNode(true);
    btnTon.parentNode.replaceChild(newBtn, btnTon);

    newBtn.addEventListener('click', async (e) => {
        // Agar bosilgan element "Disconnect" tugmasi bo'lsa yoki umumiy div bo'lsa
        const currentType = localStorage.getItem(TON_KEYS.TYPE);

        if (currentType === 'ton') {
            // ❗ YANGI QISM: Tasdiqlash oynasi (OK / Cancel)
            const isConfirmed = confirm("Haqiqatan ham TON hamyonini uzmoqchimisiz?");
            
            if (isConfirmed) {
                // Agar "OK" bossa, uzamiz
                await tonConnectUI.disconnect();
                clearTonData();
            }
            // Agar "Cancel" bossa, hech narsa qilmaymiz
        } 
        else if (!currentType) {
            try { await tonConnectUI.openModal(); } catch (e) { console.error(e); }
        } 
        else {
            alert("Avval MetaMask hamyonni uzing!");
        }
    });
}


// ton.js dagi updateTonUI funksiyasi

function updateTonUI() {
    const btnTon = document.getElementById('btnTon');
    if (!btnTon) return;

    const walletType = localStorage.getItem(TON_KEYS.TYPE);
    const address = localStorage.getItem(TON_KEYS.WALLET);

    // Elementlarni topamiz
    const textSpan = btnTon.querySelector('.invite-info span');
    const arrowDiv = btnTon.querySelector('.invite-arrow'); // Strelka turgan joy
    
    // Asl strelka kodi (qaytarish uchun)
    const defaultArrow = `
        <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
            <img src="/image/arrow.svg" alt="">
        </span>`;

    if (walletType === 'ton' && address) {
        // ULANGAN HOLAT
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        
        btnTon.style.background = "rgba(40, 167, 69, 0.15)"; // Och yashil fon
        btnTon.style.border = "1px solid #28a745"; // Yashil hoshiya
        
        if(textSpan) textSpan.innerHTML = `Ulandi: <b style="color:#fff">${shortAddr}</b>`;
        
        // Strelka o'rniga "Uzish" tugmasini qo'yamiz
        if(arrowDiv) arrowDiv.innerHTML = `<button class="disconnect-btn">Uzish</button>`;
        
    } else {
        // UZILGAN (ODDIY) HOLAT
        btnTon.style.background = "";
        btnTon.style.border = "";
        
        if(textSpan) textSpan.innerText = "Connect TON Wallet";
        
        // Strelkani qaytarib joyiga qo'yamiz
        if(arrowDiv) arrowDiv.innerHTML = defaultArrow;
    }
}


// Yordamchi funksiyalar
function saveTonData(address) {
    localStorage.setItem(TON_KEYS.WALLET, address);
    localStorage.setItem(TON_KEYS.TYPE, 'ton');
    updateTonUI();
}

function clearTonData() {
    if (localStorage.getItem(TON_KEYS.TYPE) === 'ton') {
        localStorage.removeItem(TON_KEYS.WALLET);
        localStorage.removeItem(TON_KEYS.TYPE);
        updateTonUI();
    }
}

// Global qilish (index.js chaqirishi uchun)
window.initTonWallet = initTonWallet;
