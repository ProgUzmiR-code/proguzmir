//wallet/wallet.js
    // 1. O'zgaruvchilarni WINDOW obyektiga yuklaymiz (Xatolikni oldini olish uchun)
    window.MERCHANT_TON = "UQBeExO967kLwsqqiI_MgPwQGqvbXpvLj4GTGg3ESFbzZDGd"; 
    window.MERCHANT_EVM = "0xecf8bcbd1157913c5b5e061e02f20ed7eeb5933e";
    
    // Mahsulot narxlari
    window.PRICES = {
        'gem1': { name: "500 diamond", ton: '200000000', eth: '0.0004' },
        'gem2': { name: "2,500 diamond", ton: '1000000000', eth: '0.002' },
        'gem3': { name: "5,000 diamond", ton: '2000000000', eth: '0.004' },
        'gem4': { name: "10,000 diamond", ton: '4000000000', eth: '0.008' },
        'gem5': { name: "25,000 diamond", ton: '10000000000', eth: '0.018' },
        'gem6': { name: "50,000 diamond", ton: '20000000000', eth: '0.036' }
    };

    // --- SOTIB OLISH FUNKSIYASI ---
    window.buyItem = async function(itemId) {
        console.log("Tanlangan mahsulot: " + itemId);

        const item = window.PRICES[itemId];
        if (!item) {
            alert("Xatolik: Bunday mahsulot topilmadi!");
            return;
        }

        const walletType = localStorage.getItem("proguzmir_wallet_type");

        if (walletType === 'ton') {
            if (confirm(`${item.name} ni TON orqali sotib olasizmi?`)) {
                await payWithTon(item.ton);
            }
        } else if (walletType === 'evm') {
            if (confirm(`${item.name} ni MetaMask (BNB/ETH) orqali sotib olasizmi?`)) {
                await payWithEvm(item.eth);
            }
        } else {
            alert("Sotib olish uchun avval hamyonni (TON yoki MetaMask) ulang!");
            // Sahifani tepaga siljitish (xavfsiz yo'l bilan)
            const list = document.querySelector('.invite-listm2');
            if(list) list.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // --- TON TO'LOV ---
    async function payWithTon(amountNano) {
        if (!window.tonConnectUI || !window.tonConnectUI.connected) {
            alert("TON hamyon ulanmagan!");
            return;
        }

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 600,
            messages: [{ address: window.MERCHANT_TON, amount: amountNano }]
        };

        try {
            const result = await window.tonConnectUI.sendTransaction(transaction);
            alert("To'lov qabul qilindi!");
        } catch (e) {
            console.error(e);
            alert("To'lov bekor qilindi.");
        }
    }

    // --- EVM (METAMASK) TO'LOV ---
    async function payWithEvm(amountEth) {
        // 1. Tizim tekshiruvi
        if (!window.evmModal) {
            if(window.initMetaMaskWallet) await window.initMetaMaskWallet();
            if(!window.evmModal) {
                alert("Tizim yuklanmadi. Sahifani yangilang.");
                return;
            }
        }

        // 2. Ulanish tekshiruvi (YANGI USUL)
        const account = window.evmModal.getAccount();
        if (!account.isConnected) {
            await window.evmModal.open();
            return;
        }

        // 3. Provider va Manzil
        try {
            const provider = window.evmModal.getProvider();
            if (!provider) throw new Error("Provider topilmadi"); // [ERROR] yechimi

            const myAddress = account.address;
            const weiValue = BigInt(Math.round(parseFloat(amountEth) * 1e18)).toString(16);

            const txParams = {
                from: myAddress,
                to: window.MERCHANT_EVM,
                value: "0x" + weiValue,
            };

            const txHash = await provider.request({
                method: 'eth_sendTransaction',
                params: [txParams],
            });

            alert("To'lov yuborildi! Hash: " + txHash);

        } catch (e) {
            console.error(e);
            alert("Xatolik: " + e.message);
        }
    }

    // --- TUGMALARNI SOZLASH (addEventListener null xatosini yechish) ---
    // Bu funksiya elementlar paydo bo'lguncha kutadi
    function initButtonsSafe() {
        const btnMeta = document.getElementById('btnMetaMask');
        const btnTon = document.getElementById('btnTon');

        if (btnMeta && window.setupMetaMaskButton) {
            window.setupMetaMaskButton(); // crypto.js dagi funksiyani chaqiramiz
        }
        
        // Agar tugmalar hali yo'q bo'lsa, 500ms dan keyin qayta urinib ko'ramiz
        if (!btnMeta || !btnTon) {
            setTimeout(initButtonsSafe, 500);
        }
    }

    // Sahifa yuklangandan so'ng 100ms o'tib ishga tushadi
    setTimeout(initButtonsSafe, 100);


