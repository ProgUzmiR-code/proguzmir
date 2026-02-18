//  /wallet/cripto.js (metamask.js)

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
    chainId: 56 // BNB Smart Chain (Polygon uchun 137, Ethereum uchun 1)
};

let evmModal;
let retryCount = 0;

// 1. AppKitni ishga tushirish
async function initMetaMaskSystem() {
    console.log("EVM Wallet system ishga tushdi");

    if (!window.AppKitLibrary) {
        if (retryCount < 20) {
            retryCount++;
            setTimeout(initMetaMaskSystem, 500);
            return;
        }
        console.error("AppKit Library not found");
        return;
    }

    if (evmModal) return;

    const { createAppKit, EthersAdapter, networks } = window.AppKitLibrary;

    try {
        evmModal = createAppKit({
            adapters: [new EthersAdapter()],
            networks,
            projectId,
            // MOBIL QURILMALAR UCHUN QO'SHILADI:
            allWallets: 'SHOW', // Hamyonlar ro'yxatini ko'rsatish
            enableInjected: true, // Mavjud hamyonlarni aniqlash
            metadata: {
                name: 'ProgUzmiR',
                description: 'Token Airdrop',
                url: 'https://proguzmir.vercel.app',
                icons: ['https://proguzmir.vercel.app/image/logotiv.png?v=1'],
                // AVTOMATIK QAYTISH VA DEEP LINK UCHUN:
                redirect: {
                    native: 'https://t.me/proguzmir_bot/app', // O'z bot manzilingizni yozing
                    universal: 'https://proguzmir.vercel.app'
                }
            }
        });

        // Hodisalarni tinglash
        evmModal.subscribeEvents(state => {
            if (state.data.event === 'CONNECT_SUCCESS') {
                const account = evmModal.getAccount();
                if (account && account.address) {
                    saveEvmData(account.address);
                    // Ulanganda tokenni taklif qilish (ixtiyoriy)
                    setTimeout(() => addToken(), 1000);
                }
            }
            if (state.data.event === 'DISCONNECT_SUCCESS') {
                clearEvmData();
            }
        });

        // Sahifa yangilanganda tekshirish
        try {
            const account = evmModal.getAccount();
            if (account && account.isConnected && account.address) {
                saveEvmData(account.address);
            }
        } catch (e) {
            console.log("Account verification error:", e);
        }

        window.evmModal = evmModal; // Globalga qo'yamiz
        setupMetaMaskButton();
        updateMetaMaskUI();

    } catch (e) {
        console.error("AppKit Init Error:", e);
    }
}

// 2. Token qo'shish
async function addToken() {
    try {
        if (!evmModal) return;

        const account = evmModal.getAccount();
        if (!account || !account.isConnected) return;

        const provider = evmModal.getProvider();
        if (!provider) return;

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
    console.log("EVM Wallet moduli ishga tushdi");

    initMetaMaskSystem();
    setupMetaMaskButton();
    updateMetaMaskUI();
}

// 4. Tugmani sozlash
function setupMetaMaskButton() {
    console.log("setupMetaMaskButton called");
    const btnMeta = document.getElementById('btnMetaMask');
    console.log("MetaMask tugmachasini sozlash:", btnMeta);
    if (!btnMeta) return;

    const newBtn = btnMeta.cloneNode(true);
    btnMeta.parentNode.replaceChild(newBtn, btnMeta);

    newBtn.addEventListener('click', () => {
        // TON ulangan bo'lsa ogohlantiramiz
        if (localStorage.getItem("proguzmir_wallet_type") === 'ton') {
            alert("First disconnect the TON wallet!");
            return;
        }

        // Qolgan barcha holatlarda
        if (evmModal) {
            evmModal.open();
        } else {
            alert("system is loading... please wait.");
            initMetaMaskSystem();
        }
    });
}

window.setupMetaMaskButton = setupMetaMaskButton;

// 5. UI ni yangilash
// --- wallet.js / cripto.js ---

function updateMetaMaskUI() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    const walletType = localStorage.getItem(EVM_KEYS.TYPE);
    const address = localStorage.getItem(EVM_KEYS.WALLET);

    const textSpan = btnMeta.querySelector('.invite-info span');
    const arrowDiv = btnMeta.querySelector('.invite-arrow');
    const iconImg = btnMeta.querySelector('.invite-icon img');

    const defaultIcon = "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg";

    if (walletType === 'evm' && address) {
        // --- ULANGAN ---
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        btnMeta.style.background = "rgba(40, 167, 69, 0.15)";
        btnMeta.style.border = "1px solid #28a745";
        if (textSpan) textSpan.innerHTML = `Connected: <b style="color:#fff">${shortAddr}</b>`;

        // --- YANGI: Hamyon rasmini aniqlash ---
        let walletIconUrl = defaultIcon;

        if (window.evmModal) {
            try {
                // 1-usul: AppKitdan rasmiy ma'lumotni olish
                const walletInfo = window.evmModal.getWalletInfo();
                if (walletInfo && walletInfo.icon) {
                    walletIconUrl = walletInfo.icon;
                }
                else {
                    // 2-usul: Agar rasm kelmasa, Provayderni tekshiramiz
                    const provider = window.evmModal.getProvider();
                    if (provider) {
                        if (provider.isTrust) {
                            walletIconUrl = "https://cryptologos.cc/logos/trust-wallet-token-twt-logo.svg?v=026";
                        } else if (provider.isBitKeep || provider.isBitget) {
                            walletIconUrl = "https://raw.githubusercontent.com/bitkeepwallet/download/main/logo/png/bitkeep_logo_square.png";
                        } else if (provider.isSafePal) {
                            walletIconUrl = "https://pbs.twimg.com/profile_images/1676907573033500672/L3z-Y-3__400x400.jpg"; // SafePal
                        } else if (provider.isMetaMask) {
                            walletIconUrl = defaultIcon;
                        } else if (provider.isOkxWallet || provider.isOKExWallet) {
                            walletIconUrl = "https://cryptologos.cc/logos/okb-okb-logo.svg?v=029";
                        }
                    }
                }
            } catch (e) {
                console.log("Error in determining icon:", e);
            }
        }

        // Rasmni o'rnatamiz
        if (iconImg) iconImg.src = walletIconUrl;

        if (arrowDiv) arrowDiv.innerHTML = `<span class="scoped-svg-icon"><img src="/image/arrow.svg" alt=""></span>`;
    } else {
        // --- ULANMAGAN ---
        btnMeta.style.background = "";
        btnMeta.style.border = "";
        if (textSpan) textSpan.innerText = "Connect MetaMask / EVM";
        if (iconImg) iconImg.src = defaultIcon;
        if (arrowDiv) arrowDiv.innerHTML = `<span class="scoped-svg-icon"><img src="/image/arrow.svg" alt=""></span>`;
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
        updateMetaMaskUI();
    }
}

window.initMetaMaskWallet = initMetaMaskWallet;

