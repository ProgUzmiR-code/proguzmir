//  /wallet/cripto.js (metamask.js)
// --- SOZLAMALAR ---
const EVM_KEYS = {
    WALLET: "proguzmir_crypto_wallet",
    TYPE: "proguzmir_wallet_type"
};

// Reown Project ID (To'g'ri ekanligiga ishonch hosil qiling)
const projectId = "4d9838cef79b26992ff9102c92999f79"; 



let evmModal;
let retryCount = 0;

// --- 1. APPKITNI ISHGA TUSHIRISH ---
async function initMetaMaskSystem() {
    // Kutubxona yuklanishini kutish
    if (!window.AppKitLibrary) {
        if (retryCount < 20) {
            retryCount++;
            setTimeout(initMetaMaskSystem, 500);
            return;
        }
        console.error("AppKit Library (CDN) topilmadi!");
        return;
    }

    if (evmModal) return; // Allaqachon bor bo'lsa, qayta yaratmaymiz

    const { createAppKit, EthersAdapter, networks } = window.AppKitLibrary;

    try {
        evmModal = createAppKit({
            adapters: [new EthersAdapter()],
            networks,
            projectId,
            metadata: {
                name: 'ProgUzmiR',
                description: 'Token Airdrop',
                url: 'https://proguzmir.vercel.app',
                icons: ['https://proguzmir.vercel.app/image/logotiv.png?v=1']
            },
            features: {
                analytics: true 
            }
        });

        // ❗ MUHIM: Modalni global oynaga chiqaramiz (wallet.js ko'rishi uchun)
        window.evmModal = evmModal;

        // Hodisalarni tinglash
        evmModal.subscribeEvents(state => {
            if (state.data.event === 'CONNECT_SUCCESS') {
                const account = evmModal.getAccount();
                saveEvmData(account.address);
            }
            if (state.data.event === 'DISCONNECT_SUCCESS') {
                clearEvmData();
            }
        });

        // Sahifa yangilanganda ulanishni tekshirish
        const account = evmModal.getAccount();
        if (account && account.isConnected) {
            saveEvmData(account.address);
        }

        // Tugmani sozlash
        setupMetaMaskButton(); 
        updateMetaMaskUI();

    } catch (e) { 
        console.error("AppKit Init Error:", e); 
    }
}

// --- 2. TUGMANI SOZLASH ---
function setupMetaMaskButton() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    // Eski hodisalarni tozalash uchun tugmani yangilaymiz
    const newBtn = btnMeta.cloneNode(true);
    btnMeta.parentNode.replaceChild(newBtn, btnMeta);

    newBtn.addEventListener('click', () => {
        // Agar TON ulangan bo'lsa, xato beramiz
        if (localStorage.getItem("proguzmir_wallet_type") === 'ton') {
            alert("Avval TON hamyonni uzing!");
            return;
        }

        if(evmModal) {
            evmModal.open();
        } else {
            alert("Tizim yuklanmoqda... kuting.");
            initMetaMaskSystem();
        }
    });
}

// Bu funksiyani ham global qilamiz (wallet.html chaqirishi uchun)
window.setupMetaMaskButton = setupMetaMaskButton;

// --- 3. UI YANGILASH ---
function updateMetaMaskUI() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    const walletType = localStorage.getItem(EVM_KEYS.TYPE);
    const address = localStorage.getItem(EVM_KEYS.WALLET);
    
    const textSpan = btnMeta.querySelector('.invite-info span');
    const iconImg = btnMeta.querySelector('.invite-icon img'); 
    const defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";

    if (walletType === 'evm' && address) {
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        btnMeta.style.background = "rgba(40, 167, 69, 0.15)";
        btnMeta.style.border = "1px solid #28a745";
        if(textSpan) textSpan.innerHTML = `Connected: <b style="color:#fff">${shortAddr}</b>`;
        
        // Ikonkani yangilashga harakat qilamiz
        if (evmModal) {
            const walletInfo = evmModal.getWalletInfo();
            if (walletInfo && walletInfo.icon) iconImg.src = walletInfo.icon;
        }
    } else {
        btnMeta.style.background = "";
        btnMeta.style.border = "";
        if(textSpan) textSpan.innerText = "Connect MetaMask / EVM";
        if(iconImg) iconImg.src = defaultIcon;
    }
}

// --- YORDAMCHI FUNKSIYALAR ---
function saveEvmData(address) {
    localStorage.setItem(EVM_KEYS.WALLET, address);
    localStorage.setItem(EVM_KEYS.TYPE, 'evm');
    updateMetaMaskUI();
}

function clearEvmData() {
    if (localStorage.getItem(EVM_KEYS.TYPE) === 'evm') {
        localStorage.removeItem(EVM_KEYS.WALLET);
        localStorage.removeItem(EVM_KEYS.TYPE);
        updateMetaMaskUI();
    }
}

// Global funksiyani e'lon qilamiz
window.initMetaMaskWallet = initMetaMaskWallet;
