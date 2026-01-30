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


// ❗ SIZNING TOKEN MA'LUMOTLARINGIZ (O'ZGARTIRING)
const MY_TOKEN = {
    address: '0x5212983A60Ba0Ab8EBB66353F351A61D1e64D71A', // Token kontrakt manzili (Masalan bu USDT)
    symbol: 'PRC',     // Token ramzi (Ticker)
    decimals: 18,      // O'nlik xonalar soni
    image: 'https://proguzmir.vercel.app/image/logotiv.png', // Token rasmi (https bo'lishi shart)
    chainId: 137       // Qaysi tarmoqda? (137=Polygon, 56=BSC, 1=Ethereum)
};

let appKitInitialized = false;

// 1. AppKit (MetaMask) ni ishga tushirish
async function initAppKit() {
    if (appKitInitialized || !window.AppKitLibrary) return;
    
    const { createAppKit, EthersAdapter, networks } = window.AppKitLibrary;

    // Tarmoqlar ro'yxatini to'g'irlang (Sizning tokeningiz qaysi tarmoqda bo'lsa)
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

    // Ulanishni kuzatish
    evmModal.subscribeEvents(async state => {
        // Ulanish muvaffaqiyatli bo'lsa
        if (state.data.event === 'CONNECT_SUCCESS') {
            const address = evmModal.getAddress(); 
            saveWallet(address, 'evm');
            updateUI();
            
            // ❗ Ulanish bilanoq tokenni qo'shishni taklif qilish
            setTimeout(() => {
                addTokenToWallet(); 
            }, 1000);
        }
        
        if (state.data.event === 'DISCONNECT_SUCCESS') {
            disconnectWallet(null, false);
        }
    });
    
    // Agar sahifa yangilansa va oldin ulangan bo'lsa
    if (evmModal.getIsConnected()) {
        const address = evmModal.getAddress();
        saveWallet(address, 'evm');
    }

    appKitInitialized = true;
}

// 2. Tokenni MetaMaskga qo'shish funksiyasi (ENG MUHIM QISM)
async function addTokenToWallet() {
    try {
        if (!evmModal || !evmModal.getIsConnected()) {
            alert("Avval hamyonni ulang!");
            return;
        }

        // Providerni olamiz
        const provider = evmModal.getProvider();
        
        // Agar provider topilmasa (ba'zan sekin yuklanadi)
        if(!provider) {
            console.error("Provider not found");
            return;
        }

        // Token qo'shish so'rovi (EIP-747)
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
            alert("Token hamyonga muvaffaqiyatli qo'shildi!");
        } else {
            console.log("Foydalanuvchi rad etdi");
        }
    } catch (error) {
        console.error(error);
        alert("Xatolik: Tokenni qo'shib bo'lmadi. Tarmoq to'g'riligini tekshiring.");
    }
}

// 3. Asosiy sahifa funksiyasi
function initWalletPage() {
    console.log("Wallet page initialized");

    if(window.AppKitLibrary) {
        initAppKit();
    } else {
        setTimeout(initAppKit, 1500);
    }

    // TON qismi o'zgarishsiz qoladi...
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
                if (localStorage.getItem(KEY_WALLET_TYPE) === 'ton') disconnectWallet(null, false);
            }
        });
    }

    // Tugmani sozlash
    const connectBtn = document.querySelector('.invite-listm2 .ds button');
    updateUI(); 

    if (connectBtn) {
        const newBtn = connectBtn.cloneNode(true);
        connectBtn.parentNode.replaceChild(newBtn, connectBtn);

        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (localStorage.getItem(KEY_CONNECTED_WALLET)) {
                // Agar ulangan bo'lsa, yana tokenni qo'shishni taklif qilishimiz mumkin
                // Yoki uzish menyusini chiqarish
                if(localStorage.getItem(KEY_WALLET_TYPE) === 'evm') {
                    if(confirm("Tokenni MetaMaskga qo'shmoqchimisiz? (Bekor qilish = Hamyonni uzish)")) {
                        addTokenToWallet();
                    } else {
                        disconnectWallet(newBtn, true);
                    }
                } else {
                    disconnectWallet(newBtn, true);
                }
            } else {
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
                <img src="https://ton.org/download/ton_symbol.png" width="20"> TON Wallet
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
        else initAppKit(); 
    };
    document.getElementById('btnClose').onclick = () => modal.remove();
}

function saveWallet(address, type) {
    localStorage.setItem(KEY_CONNECTED_WALLET, address);
    localStorage.setItem(KEY_WALLET_TYPE, type);
    // Shu yerda address ni serveringizga yuborishingiz mumkin
    console.log("Saqlandi:", address);
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
        // Tugmada "Token qo'shish" yozuvi chiqadi
        btn.innerHTML = `<span>${icon} ${shortAddr} (Token +)</span>`;
        btn.style.background = "#28a745";
        btn.style.color = "#fff";
    } else {
        btn.innerHTML = `<span><i aria-hidden="true" style="display: none;"></i>Connect Wallet</span>`;
        btn.style.background = ""; 
        btn.style.color = "";
    }
}

window.initWalletPage = initWalletPage;
