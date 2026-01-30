// wallet/wallet.js

// Global o'zgaruvchilar
let tonConnectUI;
const KEY_CONNECTED_WALLET = "proguzmir_crypto_wallet";
const KEY_WALLET_TYPE = "proguzmir_wallet_type"; // 'ton' yoki 'evm'
const projectId = "4d9838cef79b26992ff9102c92999f79"; // Supabase loyihangiz ID si

// 1. Sahifa yuklanganda ishga tushadigan asosiy funksiya
function initWalletPage() {
    console.log("Wallet page initialized");

    // TON Connectni sozlash
    if (!tonConnectUI) {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://proguzmir.vercel.app/tonconnect-manifest.json', // Manifest fayl manzili
            buttonRootId: null // Biz o'z tugmamizdan foydalanamiz
        });
    }

    // Tugmani topamiz
    const connectBtn = document.querySelector('.invite-listm2 .ds button');
    
    // Agar oldin ulangan bo'lsa, UI ni yangilaymiz
    checkConnectedWallet(connectBtn);

    if (connectBtn) {
        // Eski event listenerlarni tozalash uchun klonlaymiz
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Agar allaqachon ulangan bo'lsa, uzish (Disconnect) funksiyasini bajaramiz
            if (localStorage.getItem(KEY_CONNECTED_WALLET)) {
                disconnectWallet(newBtn);
            } else {
                openSelectionModal(newBtn);
            }
        });
    }
}

// 2. Tanlov Modalini yaratish (TON yoki MetaMask)
function openSelectionModal(btnElement) {
    // Modal HTML
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: #06121a; padding: 25px; border-radius: 15px; border: 1px solid #ffd700; text-align: center; width: 300px;">
            <h3 style="color: #fff; margin-bottom: 20px;">Hamyonni tanlang</h3>
            
            <button id="btnTon" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #0098EA; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040" width="20"> TON Wallet
            </button>
            
            <button id="btnMetaMask" style="width: 100%; padding: 12px; margin-bottom: 20px; background: #F6851B; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="20"> MetaMask / EVM
            </button>
            
            <button id="btnClose" style="background: transparent; border: 1px solid #fff; color: #fff; padding: 5px 15px; border-radius: 5px; cursor: pointer;">Yopish</button>
        </div>
    `;

    document.body.appendChild(modal);

    // TON tugmasi
    document.getElementById('btnTon').onclick = async () => {
        modal.remove();
        try {
            await tonConnectUI.openModal();
        } catch (e) {
            console.error(e);
        }
    };

    // MetaMask tugmasi
    document.getElementById('btnMetaMask').onclick = () => {
        modal.remove();
        connectMetaMask(btnElement);
    };

    // Yopish tugmasi
    document.getElementById('btnClose').onclick = () => modal.remove();
}

// 3. TON ulanishini kuzatish
// Bu kod TON Connect orqali ulanish o'zgarganda ishlaydi
if (typeof TON_CONNECT_UI !== 'undefined') {
    // Bu qism initWalletPage ichida tonConnectUI yaratilgandan keyin ishlashi kerak,
    // lekin global scope da turgani ma'qul, faqat tonConnectUI mavjudligini tekshiramiz.
}

// Biz buni initWalletPage ichiga qo'shishimiz mumkin yoki alohida listener
// TON Connectning o'z listeneri bor:
setTimeout(() => {
    if(tonConnectUI) {
        tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                const rawAddress = wallet.account.address;
                // TON manzilini o'qishga qulay formatga o'tkazish (User friendly)
                const userFriendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(rawAddress);
                
                saveWallet(userFriendlyAddress, 'ton');
                // UI ni yangilash uchun qayta init qilamiz yoki buttonni topamiz
                const btn = document.querySelector('.invite-listm2 .ds button');
                if(btn) updateBtnUI(btn, userFriendlyAddress, 'ton');
            } else {
                // Agar TON uzilsa
                const type = localStorage.getItem(KEY_WALLET_TYPE);
                if (type === 'ton') disconnectWallet(null);
            }
        });
    }
}, 1000);


// 4. MetaMask (EVM) ulanish funksiyasi
async function connectMetaMask(btnElement) {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            
            saveWallet(address, 'evm');
            updateBtnUI(btnElement, address, 'evm');
            
        } catch (error) {
            console.error(error);
            alert("Ulanishda xatolik yoki bekor qilindi.");
        }
    } else {
        alert("MetaMask topilmadi! Iltimos, MetaMask ilovasini o'rnating yoki brauzer kengaytmasidan foydalaning.");
        // Mobil telefonda bo'lsa, MetaMask appiga yo'naltirish (Deep Link)
        window.open('https://metamask.app.link/dapp/' + window.location.host);
    }
}

// 5. Ma'lumotni saqlash
function saveWallet(address, type) {
    localStorage.setItem(KEY_CONNECTED_WALLET, address);
    localStorage.setItem(KEY_WALLET_TYPE, type);
    // Agar serverga (Supabase) yozish kerak bo'lsa, shu yerda saveUserState() chaqiriladi
    // Masalan: state.cryptoWallet = address; saveUserState(state);
}

// 6. Ulanishni uzish
async function disconnectWallet(btnElement) {
    const type = localStorage.getItem(KEY_WALLET_TYPE);
    
    if (type === 'ton' && tonConnectUI) {
        await tonConnectUI.disconnect();
    }
    
    localStorage.removeItem(KEY_CONNECTED_WALLET);
    localStorage.removeItem(KEY_WALLET_TYPE);
    
    if (btnElement) {
        // Buttonni asl holiga qaytarish
        btnElement.innerHTML = `
            <span>
                <i aria-hidden="true" style="display: none;" role="presentation">account_balance_wallet</i>
                Connect Wallet
            </span>
        `;
        btnElement.style.background = ""; 
        btnElement.style.color = "";
    }
    alert("Hamyon uzildi.");
}

// 7. UI ni tekshirish va yangilash
function checkConnectedWallet(btnElement) {
    const address = localStorage.getItem(KEY_CONNECTED_WALLET);
    const type = localStorage.getItem(KEY_WALLET_TYPE);
    
    if (address && btnElement) {
        updateBtnUI(btnElement, address, type);
    }
}

function updateBtnUI(btn, address, type) {
    // Manzilni qisqartirish (masalan: 0x123...abc)
    const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
    const icon = type === 'ton' ? '💎' : '🦊'; // Oddiy ikonka
    
    btn.innerHTML = `<span>${icon} ${shortAddr} (Uzish)</span>`;
    btn.style.background = "#28a745"; // Yashil rang
    btn.style.color = "#fff";
}

// Agar bu script to'g'ridan-to'g'ri chaqirilsa, ishga tushirish
// Ammo index.js orqali yuklangani uchun, biz uni export qilishimiz yoki global qilishimiz kerak.
window.initWalletPage = initWalletPage;