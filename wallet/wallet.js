// /wallet/wallet.js

let MERCHANT_TON = null;
let MERCHANT_EVM = null;

// Sahifa yuklanishi bilan Vercel API dan manzillarni olib kelamiz
async function loadWalletConfig() {
    try {
        const response = await fetch('/api/wallet-data.js');
        const data = await response.json();

        if (data.ton_address && data.evm_address) {
            MERCHANT_TON = data.ton_address;
            MERCHANT_EVM = data.evm_address;
            console.log("Hamyon manzillari serverdan yuklandi ✅");
        } else {
            console.error("Serverdan manzillar kelmadi ❌");
        }
    } catch (error) {
        console.error("Konfiguratsiyani yuklashda xatolik:", error);
    }
}

// Konfiguratsiyani ishga tushiramiz
loadWalletConfig();

// USDT dagi narxlar (O'zgarmas)
const PRICES = {
    'gem1': { name: "500 diamond", usd: 1.19 },
    'gem2': { name: "2,500 diamond", usd: 5.99 },
    'gem3': { name: "5,000 diamond", usd: 11.99 },
    'gem4': { name: "10,000 diamond", usd: 23.99 },
    'gem5': { name: "25,000 diamond", usd: 54.99 },
    'gem6': { name: "50,000 diamond", usd: 109.99 }
};

// Kontrakt manzillari
const USDT_TON_MASTER = "EQCxE6mUtQJKFnGfaROT9AEpxuca6u3rn7wY63989H9-0B8X"; // TON USDT
const USDT_BSC_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT (BEP-20)


// --- 2. ASOSIY SOTIB OLISH FUNKSIYASI ---
async function buyItem(itemId) {
    const item = PRICES[itemId];
    if (!item) return;

    const walletType = localStorage.getItem("proguzmir_wallet_type");

    if (walletType === 'ton') {
        if (confirm(`${item.name} uchun ${item.usd} USDT to'laysizmi?`)) {
            await payWithTonUsdt(item.usd);
        }
    } else if (walletType === 'evm') {
        if (confirm(`${item.name} uchun ${item.usd} USDT (BSC) to'laysizmi?`)) {
            await payWithEvmUsdt(item.usd);
        }
    } else {
        alert("Sotib olish uchun avval hamyonni ulang!");
        document.querySelector('.invite-listm2').scrollIntoView({ behavior: 'smooth' });
    }
}


// --- 3. TON TO'LOV FUNKSIYASI ---
// --- YORDAMCHI KUTISH FUNKSIYASI ---
function waitForTonLib(retries = 20) {
    return new Promise((resolve, reject) => {
        // Agar allaqachon bor bo'lsa
        if (window.tonConnectUI) {
            return resolve(window.tonConnectUI);
        }

        // Agar yo'q bo'lsa, tekshirishni boshlaymiz
        let count = 0;
        const interval = setInterval(() => {
            count++;
            if (window.tonConnectUI) {
                clearInterval(interval);
                resolve(window.tonConnectUI);
            } else if (count >= retries) {
                clearInterval(interval);
                reject("TON kutubxonasi vaqtida yuklanmadi");
            }
        }, 100); // Har 100ms da tekshiradi (jami 2 soniya kutadi)
    });
}

// --- 3. TON TO'LOV FUNKSIYASI (YANGILANGAN) ---
async function payWithTonUsdt(usdAmount) {
    try {
        await waitForTonLib();
        if (!window.tonConnectUI.connected) {
            await window.tonConnectUI.openModal();
            return;
        }

        const tonweb = new TonWeb();
        const amountUnits = Math.round(usdAmount * 1000000); // 6 decimals
        const userAddress = window.tonConnectUI.account.address;

        // Jetton transfer payload yaratish
        const cell = new TonWeb.boc.Cell();
        cell.bits.writeUint(0xf8a7ea5, 32); 
        cell.bits.writeUint(0, 64);         
        cell.bits.writeCoins(new TonWeb.utils.BN(amountUnits));
        cell.bits.writeAddress(new TonWeb.utils.Address(MERCHANT_TON)); 
        cell.bits.writeAddress(new TonWeb.utils.Address(userAddress)); 
        cell.bits.writeBit(false);          
        cell.bits.writeCoins(new TonWeb.utils.BN(1)); 
        cell.bits.writeBit(false);          

        const bocString = TonWeb.utils.bytesToBase64(await cell.toBoc());

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{
                address: USDT_TON_MASTER,
                amount: "60000000", // 0.06 TON gaz uchun
                payload: bocString
            }]
        };

        await window.tonConnectUI.sendTransaction(tx);
        alert("To'lov yuborildi! ✅");
    } catch (e) { console.error(e); }
}

// --- 4. EVM (METAMASK) TO'LOV FUNKSIYASI (TUZATILGAN) ---
async function payWithEvmUsdt(usdAmount) {
    try {
        const account = window.evmModal.getAccount();
        if (!account.isConnected) {
            window.evmModal.open();
            return;
        }

        const walletProvider = window.evmModal.getProvider();
        
        // 18 decimals hisoblash
        const amountUnits = BigInt(Math.round(usdAmount * 1e18));
        const data = "0xa9059cbb" + 
                     MERCHANT_EVM.replace('0x', '').padStart(64, '0') + 
                     amountUnits.toString(16).padStart(64, '0');

        const txParams = {
            from: account.address,
            to: USDT_BSC_ADDRESS,
            value: "0x0",
            data: data
        };

        const txPromise = walletProvider.request({
            method: 'eth_sendTransaction',
            params: [txParams]
        });

        // Mobil qurilmalarda MetaMaskni ochish
        if (/Android|iPhone/i.test(navigator.userAgent)) {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = "metamask://"; a.target = "_blank";
                a.click();
            }, 500);
        }

        await txPromise;
        alert("To'lov tasdiqlandi! ✅");
    } catch (e) { console.error(e); }
}
