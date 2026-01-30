// wallet.js

// Global o'zgaruvchilar
let tonConnectUI;
let evmModal;
const KEY_CONNECTED_WALLET = "proguzmir_crypto_wallet";
const KEY_WALLET_TYPE = "proguzmir_wallet_type";

// ❗ DIQQAT: Bu yerga Reown (WalletConnect) Project ID qo'yilishi kerak.
// Supabase ID emas! (cloud.reown.com dan olingan ID)
const projectId = "4d9838cef79b26992ff9102c92999f79"; 

// ❗ TOKEN MA'LUMOTLARI
const MY_TOKEN = {
    address: '0x5212983A60Ba0Ab8EBB66353F351A61D1e64D71A', // Token manzili
    symbol: 'PRC',     // Token nomi
    decimals: 18,      // O'nlik xonasi
    image: 'https://proguzmir.vercel.app/image/logotiv.png', // Rasm (https)
    chainId: 137       // 137 = Polygon Mainnet
};

let appKitInitialized = false;

// 1. AppKit (MetaMask) ni ishga tushirish funksiyasi
async function initAppKit() {
    // Agar kutubxona HTML da ulanmagan bo'lsa, xato bermasligi uchun tekshiramiz
    if (appKitInitialized || !window.AppKitLibrary) {
        console.log("AppKit kutubxonasi hali yuklanmadi yoki topilmadi.");
        return;
    }
    
    const { createAppKit, EthersAdapter, networks } = window.AppKitLibrary;

    try {
        evmModal = createAppKit({
            adapters: [new EthersAdapter()],
            networks,
            projectId,
            metadata: {
                name: 'ProgUzmiR',
                description: 'Token Airdrop App',
                url: 'https://proguzmir.vercel.app',
                icons: ['https://proguzmir.vercel.app/image/logo.png']
            }
        });

        // Hodisalarni tinglash
        evmModal.subscribeEvents(state => {
            if (state.data.event === 'CONNECT_SUCCESS') {
                const address = evmModal.getAddress(); 
                saveWallet(address, 'evm');
                updateUI();
                
                // Ulangandan so'ng 1 soniya o'tib tokenni taklif qilish
                setTimeout(() => {
                    addTokenToWallet(); 
                }, 1000);
            }
            
            if (state.data.event === 'DISCONNECT_SUCCESS') {
                disconnectWallet(null, false);
            }
        });

        // Agar sahifa yangilanganda allaqachon ulangan bo'lsa
        if (evmModal.getIsConnected()) {
            const address = evmModal.getAddress();
            saveWallet(address, 'evm');
        }

        appKitInitialized = true;
        console.log("MetaMask (AppKit) ishga tushdi!");
        
    } catch (error) {
        console.error("AppKit xatosi:", error);
    }
}

// 2. Tokenni MetaMaskga qo'shish
async function addTokenToWallet() {
    try {
        if (!evmModal || !evmModal.getIsConnected()) {
            alert("Avval hamyonni ulang!");
            return;
        }

        const provider = evmModal.getProvider();
        if(!provider) return;

        const wasAdded = await provider.request({
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

        if (wasAdded) {
            alert("Token muvaffaqiyatli qo'shildi!");
        }
    } catch (error) {
        console.error(error);
    }
}

// 3. Asosiy sahifa funksiyasi (Faqat bitta bo'lishi kerak!)
function initWalletPage() {
    console.log("Wallet page initialized");

    // MetaMaskni ishga tushirishga harakat qilamiz
    if(window.AppKitLibrary) {
        initAppKit();
    } else {
        // Internet sekin bo'lsa, 1.5 soniyadan keyin qayta urinib ko'radi
        setTimeout(initAppKit, 1500);
    }

    // TON Connectni sozlash
    if (!tonConnectUI) {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://proguzmir.vercel.app/tonconnect-manifest.json', 
            buttonRootId: null
        });

        tonConnectUI.onStatusChange(wallet => {
            if (wallet) {
                const userFriendlyAddress = TON_CONNECT_UI.toUserFriendlyAddress(wallet.account.address);
                saveWallet(userFriendlyAddress, 'ton');
                updateUI();
            } else {
                if (localStorage.getItem(KEY_WALLET_TYPE) === 'ton') {
                    disconnectWallet(null, false);
                }
            }
        });
    }

    // Tugmani sozlash
    const connectBtn = document.querySelector('.invite-listm2 .ds button');
    
    // UI ni hozirgi holatga keltirish
    checkConnectedWallet(connectBtn);
    updateUI(); 

    if (connectBtn) {
        // Eski hodisalarni tozalash
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (localStorage.getItem(KEY_CONNECTED_WALLET)) {
                // Agar ulangan bo'lsa
                if(localStorage.getItem(KEY_WALLET_TYPE) === 'evm') {
                    // MetaMask bo'lsa: Token qo'shish yoki Uzishni tanlash
                    if(confirm("Tokenni MetaMaskga qo'shmoqchimisiz? (Bekor qilish = Hamyonni uzish)")) {
                        addTokenToWallet();
                    } else {
                        disconnectWallet(newBtn, true);
                    }
                } else {
                    // TON bo'lsa uzish
                    disconnectWallet(newBtn, true);
                }
            } else {
                // Ulanmagan bo'lsa modalni ochish
                openSelectionModal(newBtn);
            }
        });
    }
}

// Modal ochish
function openSelectionModal() {
    const modal = document.createElement('div');
    modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;`;
    
    modal.innerHTML = `
        <div style="background: #06121a; padding: 25px; border-radius: 15px; border: 1px solid #ffd700; text-align: center; width: 300px;">
            <h3 style="color: #fff; margin-bottom: 20px;">Hamyonni tanlang</h3>
            <button id="btnTon" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #0098EA; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://cryptologos.cc/logos/toncoin-ton-logo.svg?v=040" width="20"> TON Wallet
            </button>
            <button id="btnMetaMask" style="width: 100%; padding: 12px; margin-bottom: 20px; background: #5a77df; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width="20"> MetaMask / EVM
            </button>
            <button id="btnClose" style="background: transparent; border: 1px solid #fff; color: #fff; padding: 5px 15px; border-radius: 5px; cursor: pointer;">Yopish</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btnTon').onclick = async () => { modal.remove(); try { await tonConnectUI.openModal(); } catch (e) {} };
    
    document.getElementById('btnMetaMask').onclick = () => { 
        modal.remove(); 
        if(evmModal) evmModal.open(); 
        else {
            alert("Tizim yuklanmoqda... Qayta urining");
            initAppKit();
        }
    };
    
    document.getElementById('btnClose').onclick = () => modal.remove();
}

function saveWallet(address, type) {
    localStorage.setItem(KEY_CONNECTED_WALLET, address);
    localStorage.setItem(KEY_WALLET_TYPE, type);
    console.log("Saqlandi:", address);
}

function checkConnectedWallet(btnElement) {
    const address = localStorage.getItem(KEY_CONNECTED_WALLET);
    if (address && btnElement) {
        updateUI();
    }
}

async function disconnectWallet(btnElement, showAlert = true) {
    const type = localStorage.getItem(KEY_WALLET_TYPE);
    if (type === 'ton' && tonConnectUI) await tonConnectUI.disconnect();
    if (type === 'evm' && evmModal) await evmModal.disconnect();
    
    localStorage.removeItem(KEY_CONNECTED_WALLET);
    localStorage.removeItem(KEY_WALLET_TYPE);
    updateUI();
    if(showAlert) alert("Hamyon uzildi.");
}

function updateUI() {
    const btn = document.querySelector('.invite-listm2 .ds button');
    if (!btn) return;
    const address = localStorage.getItem(KEY_CONNECTED_WALLET);
    const type = localStorage.getItem(KEY_WALLET_TYPE);

    if (address) {
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        const icon = type === 'ton' ? '💎' : '🦊';
        btn.innerHTML = `<span>${icon} ${shortAddr} (Token +)</span>`;
        btn.style.background = "#28a745";
        btn.style.color = "#fff";
    } else {
        btn.innerHTML = `<span><i aria-hidden="true" style="display: none;"></i>Connect Wallet</span>`;
        btn.style.background = ""; 
        btn.style.color = "";
    }
}

// Global qilish
window.initWalletPage = initWalletPage;
