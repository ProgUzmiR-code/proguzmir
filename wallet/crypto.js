// cripto.js (metamask.js)

const EVM_KEYS = {
    WALLET: "proguzmir_crypto_wallet",
    TYPE: "proguzmir_wallet_type"
};

// Reown Project ID
const projectId = "4d9838cef79b26992ff9102c92999f79"; 

// Token ma'lumotlari
const MY_TOKEN = {
    address: '0x5212983A60Ba0Ab8EBB66353F351A61D1e64D71A', 
    symbol: 'PRC', 
    decimals: 18, 
    image: 'https://proguzmir.vercel.app/image/logotiv.png?v=1', 
    chainId: 137 
};

let evmModal;
let retryCount = 0;

// 1. AppKitni ishga tushirish
async function initMetaMaskSystem() {
    if (!window.AppKitLibrary) {
        if (retryCount < 20) {
            retryCount++;
            setTimeout(initMetaMaskSystem, 500);
            return;
        }
        console.error("AppKit Library topilmadi");
        return;
    }

    if (evmModal) return; 

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
            }
        });

        // Hodisalarni tinglash
        evmModal.subscribeEvents(state => {
            if (state.data.event === 'CONNECT_SUCCESS') {
                const address = evmModal.getAddress();
                saveEvmData(address);
                
                // Ulanganda tokenni taklif qilish (ixtiyoriy)
                setTimeout(() => addToken(), 1000);
            }
            if (state.data.event === 'DISCONNECT_SUCCESS') {
                clearEvmData();
            }
        });

        // Sahifa yangilanganda tekshirish
        if (evmModal.getIsConnected()) {
            const address = evmModal.getAddress();
            saveEvmData(address);
        }
        
        setupMetaMaskButton(); 
        updateMetaMaskUI();

    } catch (e) { console.error("AppKit Init Error:", e); }
}

// 2. Token qo'shish
async function addToken() {
    try {
        if (!evmModal || !evmModal.getIsConnected()) return;
        const provider = evmModal.getProvider();
        if(!provider) return;

        await provider.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address: MY_TOKEN.address,
                    symbol: MY_TOKEN.symbol,
                    decimals: MY_TOKEN.decimals,
                    image: MY_TOKEN.image,
                },
            },
        });
    } catch (e) { console.error(e); }
}

// 3. Asosiy funksiya
function initMetaMaskWallet() {
    initMetaMaskSystem();
    setupMetaMaskButton();
    updateMetaMaskUI();
}

// 4. Tugmani sozlash (ENG MUHIM O'ZGARISH SHU YERDA)
function setupMetaMaskButton() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    const newBtn = btnMeta.cloneNode(true);
    btnMeta.parentNode.replaceChild(newBtn, btnMeta);

    newBtn.addEventListener('click', () => {
        // TON ulangan bo'lsa ogohlantiramiz
        if (localStorage.getItem("proguzmir_wallet_type") === 'ton') {
            alert("Avval TON hamyonni uzing!");
            return;
        }

        // Qolgan barcha holatlarda (Ulangan bo'lsa ham, bo'lmasa ham)
        // REOWN oynasini ochamiz. U o'zi hal qiladi (Connect yoki Account View)
        if(evmModal) {
            evmModal.open();
        } else {
            alert("Tizim yuklanmoqda... kuting.");
            initMetaMaskSystem();
        }
    });
}

// cripto.js ichidagi updateMetaMaskUI funksiyasi

function updateMetaMaskUI() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    const walletType = localStorage.getItem(EVM_KEYS.TYPE);
    const address = localStorage.getItem(EVM_KEYS.WALLET);
    
    // Elementlarni topamiz
    const textSpan = btnMeta.querySelector('.invite-info span');
    const arrowDiv = btnMeta.querySelector('.invite-arrow'); // O'ng tomondagi tugma joyi
    const iconImg = btnMeta.querySelector('.invite-icon img'); // ❗ Rasm elementi

    // Standart rasm (Ulanmaganda chiqadigan)
    const defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";

    if (walletType === 'evm' && address) {
        // --- ULANGAN HOLAT ---
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        
        btnMeta.style.background = "rgba(40, 167, 69, 0.15)";
        btnMeta.style.border = "1px solid #28a745";
        
        if(textSpan) textSpan.innerHTML = `Connected: <b style="color:#fff">${shortAddr}</b>`;
        
        // 1. Rasmni o'zgartirish (AppKitdan ma'lumot olamiz)
        if (evmModal) {
            const walletInfo = evmModal.getWalletInfo(); // Hamyon info
            if (walletInfo && walletInfo.icon) {
                iconImg.src = walletInfo.icon; // Masalan, Trust Wallet logosi
            }
        } 
    } else {
        // --- ULANMAGAN HOLAT ---
        btnMeta.style.background = "";
        btnMeta.style.border = "";
        
        if(textSpan) textSpan.innerText = "Connect MetaMask / EVM";
        
        // Rasmni asl holiga qaytarish
        if(iconImg) iconImg.src = defaultIcon;
    }
}

function saveEvmData(address) {
    localStorage.setItem(EVM_KEYS.WALLET, address);
    localStorage.setItem(EVM_KEYS.TYPE, 'evm');

    // Bazaga 'evm' deb yuboramiz
    if (window.saveWalletToDb) {
        window.saveWalletToDb(address, 'evm');
    }

    updateMetaMaskUI();
}

function clearEvmData() {
    if (localStorage.getItem(EVM_KEYS.TYPE) === 'evm') {
        localStorage.removeItem(EVM_KEYS.WALLET);
        localStorage.removeItem(EVM_KEYS.TYPE);
        
        // Bazadan o'chirish shart emas, chunki shunchaki sessiyadan chiqdi.
        // Agar xohlasangiz, bu yerda ham API chaqirib 'crypto_wallet': null qilish mumkin.
        
        updateMetaMaskUI();
    }
}

window.initMetaMaskWallet = initMetaMaskWallet;
