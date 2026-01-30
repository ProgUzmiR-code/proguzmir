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
    image: 'https://proguzmir.vercel.app/image/logotiv.png', 
    chainId: 137 
};

let evmModal;
let retryCount = 0; // Qayta urinishlar soni

// AppKitni ishga tushirish (KUTISH REJIMI BILAN)
async function initMetaMaskSystem() {
    // 1. Agar kutubxona hali yuklanmagan bo'lsa
    if (!window.AppKitLibrary) {
        if (retryCount < 20) { // 10 soniyagacha kutadi (20 * 500ms)
            console.log(`AppKit kutilmoqda... (${retryCount + 1})`);
            retryCount++;
            setTimeout(initMetaMaskSystem, 500); // 0.5 soniyadan keyin qayta urinamiz
            return;
        } else {
            console.error("Xatolik: AppKit Library (index.html) yuklanmadi. Internetni tekshiring.");
            return;
        }
    }

    // 2. Agar allaqachon yuklangan bo'lsa, qaytamiz
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
                icons: ['https://proguzmir.vercel.app/image/logotiv.png']
            }
        });

        // Hodisalarni tinglash
        evmModal.subscribeEvents(state => {
            if (state.data.event === 'CONNECT_SUCCESS') {
                const address = evmModal.getAddress();
                saveEvmData(address);
                
                // Token qo'shishni taklif qilish
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
        console.log("MetaMask tizimi muvaffaqiyatli ishga tushdi!");
        
        // Agar tugma oldin bosilgan bo'lsa va kutish holatida bo'lsa, uni faollashtiramiz
        setupMetaMaskButton(); 
        updateMetaMaskUI();

    } catch (e) { console.error("AppKit Init Error:", e); }
}

// Token qo'shish funksiyasi
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
        alert("Token muvaffaqiyatli qo'shildi!");
    } catch (e) { console.error(e); }
}

// Asosiy ishga tushirish (index.js chaqiradi)
function initMetaMaskWallet() {
    console.log("MetaMask moduli chaqirildi...");
    initMetaMaskSystem(); // Bu funksiya o'zi kutib turadi
    setupMetaMaskButton();
    updateMetaMaskUI();
}

// Tugmani sozlash
function setupMetaMaskButton() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    // Eski eventlarni tozalash
    const newBtn = btnMeta.cloneNode(true);
    btnMeta.parentNode.replaceChild(newBtn, btnMeta);

    newBtn.addEventListener('click', () => {
        const currentType = localStorage.getItem(EVM_KEYS.TYPE);

        if (currentType === 'evm') {
            if(confirm("Haqiqatan ham MetaMask hamyonini uzmoqchimisiz?")) {
                if(evmModal) evmModal.disconnect();
                clearEvmData();
            }
        } else if (!currentType) {
            // Agar modal hali tayyor bo'lmasa
            if(evmModal) {
                evmModal.open();
            } else { 
                alert("Tizim yuklanmoqda... Iltimos, 2 soniya kuting va qayta bosing."); 
                initMetaMaskSystem(); // Qayta chaqirib ko'ramiz
            }
        } else {
            alert("Avval TON hamyonni uzing!");
        }
    });
}

// UI Yangilash
function updateMetaMaskUI() {
    const btnMeta = document.getElementById('btnMetaMask');
    if (!btnMeta) return;

    const walletType = localStorage.getItem(EVM_KEYS.TYPE);
    const address = localStorage.getItem(EVM_KEYS.WALLET);
    const textSpan = btnMeta.querySelector('.invite-info span');
    const arrowDiv = btnMeta.querySelector('.invite-arrow');

    // Asl strelka
    const defaultArrow = `
        <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
            <img src="/image/arrow.svg" alt="">
        </span>`;

    if (walletType === 'evm' && address) {
        const shortAddr = address.slice(0, 4) + "..." + address.slice(-4);
        btnMeta.style.background = "rgba(40, 167, 69, 0.3)";
        btnMeta.style.border = "1px solid #28a745";
        if(textSpan) textSpan.innerHTML = `Ulandi: <b style="color:#fff">${shortAddr}</b>`;
        
        // Strelka o'rniga Uzish tugmasi
        if(arrowDiv) arrowDiv.innerHTML = `<button class="disconnect-btn">Uzish</button>`;
    } else {
        btnMeta.style.background = "";
        btnMeta.style.border = "";
        if(textSpan) textSpan.innerText = "Connect MetaMask / EVM";
        if(arrowDiv) arrowDiv.innerHTML = defaultArrow;
    }
}

// Yordamchi funksiyalar
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

// Global qilish
window.initMetaMaskWallet = initMetaMaskWallet;
