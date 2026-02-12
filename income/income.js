(function () {
    const BASE_WEI = 1000n;
    const MAX_LVL = 50;

    // Storage Keys
    const KEY_DIAMOND = "proguzmir_diamond";
    const KEY_KEYS = "proguzmir_keys_total";
    const KEY_PRC = "proguzmir_prc_wei";
    const KEY_WALLET = "proguzmir_wallet";
    const KEY_CARD_DATA = "proguzmir_cards_lvl";

    // Helper functions
    function makeUserKey(baseKey, wallet) { return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest"; }
    function getWallet() { return localStorage.getItem(KEY_WALLET) || ""; }

    // --- GETTERS & SETTERS ---
    function getDiamond() { return parseInt(localStorage.getItem(makeUserKey(KEY_DIAMOND, getWallet())) || "0", 10); }
    function setDiamond(v) { localStorage.setItem(makeUserKey(KEY_DIAMOND, getWallet()), String(v)); }

    function getKeys() { return parseInt(localStorage.getItem(makeUserKey(KEY_KEYS, getWallet())) || "0", 10); }
    function setKeys(v) { localStorage.setItem(makeUserKey(KEY_KEYS, getWallet()), String(v)); }

    function getPRCWei() { try { return BigInt(localStorage.getItem(makeUserKey(KEY_PRC, getWallet())) || "0"); } catch (e) { return 0n; } }
    function setPRCWei(v) { localStorage.setItem(makeUserKey(KEY_PRC, getWallet()), v.toString()); }

    // --- UI Elements ---
    const upgradeBtn = document.querySelector('.update-btn');
    const pop = document.getElementById('pop');
    let lastClickedBooItem = null;

    // Header UI Update
    function updateHeaderUI() {
        const dEl = document.getElementById('diamondCount');
        if (dEl) dEl.textContent = getDiamond();

        const kEl = document.getElementById('keyCount');
        if (kEl) kEl.textContent = getKeys();
    }
    updateHeaderUI();
    setInterval(updateHeaderUI, 1000);

    // --- CARD STATE MANAGEMENT ---

    function saveCardState(id, dataObj) {
        const wallet = getWallet();
        const allData = JSON.parse(localStorage.getItem(makeUserKey(KEY_CARD_DATA, wallet)) || "{}");
        allData[id] = dataObj;
        localStorage.setItem(makeUserKey(KEY_CARD_DATA, wallet), JSON.stringify(allData));
    }

    function loadCardsState() {
        const wallet = getWallet();
        const allData = JSON.parse(localStorage.getItem(makeUserKey(KEY_CARD_DATA, wallet)) || "{}");

        document.querySelectorAll('.boo-item').forEach(item => {
            const id = item.getAttribute('data-target');

            if (allData[id]) {
                const data = allData[id];
                const isUnlocked = data.unlocked;
                const lvl = data.lvl || 0;
                const diamondCost = data.cost || 100;

                const lockIcon = item.querySelector('.lock-icon');
                const keyDiv = item.querySelector('.boo__num__key');
                const coinDiv = item.querySelector('.boo__num__coin');
                const lvlText = item.querySelector('.boo__num_coin_text');

                if (isUnlocked) {
                    // OCHILGAN
                    if (lockIcon) lockIcon.style.display = 'none';
                    if (keyDiv) keyDiv.style.display = 'none';
                    if (coinDiv) {
                        coinDiv.style.display = 'flex';
                        coinDiv.textContent = (lvl >= MAX_LVL) ? "MAX" : `💎${diamondCost}`;
                    }
                    if (lvlText) lvlText.textContent = (lvl >= MAX_LVL) ? "MAX" : `lvl ${lvl}`;

                    if (lvl >= MAX_LVL) item.classList.add('max-reached');

                    const costSpan = item.querySelector('.boo__cost span');
                    if (costSpan) costSpan.textContent = diamondCost;

                } else {
                    // QULFLANGAN
                    if (lockIcon) lockIcon.style.display = 'flex';
                    if (keyDiv) keyDiv.style.display = 'flex';
                    if (coinDiv) coinDiv.style.display = 'none';
                }
            }
        });
    }

    loadCardsState();

    // --- CLICK HANDLER (POPUP OCHISH) ---
    document.querySelectorAll('.boo-item').forEach(item => {
        item.addEventListener('click', function () {
            lastClickedBooItem = this;
            const id = this.getAttribute('data-target');

            // Tekshirish: Qulflanganmi?
            const lockIcon = this.querySelector('.lock-icon');
            const isLocked = (lockIcon && lockIcon.style.display !== 'none');

            const title = this.querySelector('.boo-title').textContent;
            const img = this.querySelector('.boo-icon img').src;

            // Popup asosiy rasmlar
            pop.querySelector('.energy__title').textContent = title;
            pop.querySelector('.energy__img img').src = img;

            // Popup ichidagi o'zgaruvchi elementlar
            const btnNumDiv = pop.querySelector('.btns .btn.active .btn-num div');
            const btnImg = pop.querySelector('.btns .btn.active .btn-num img');
            const updateBtnText = pop.querySelector('.update-btn');

            // --- YANGI: Qulf holatiga qarab o'rta qismni (energy__threetitle) o'zgartirish ---
            const threeTitleItalic = pop.querySelector('.energy__threetitle i');
            const threeTitleImg = pop.querySelector('.energy__threetitle img');
            const threeTitleSpan = pop.querySelector('#prcIncreaseValue'); // Yoki span

            if (isLocked) {
                // --- UNLOCK MODI (QULF) ---

                // 1. Popup tepasidagi level
                pop.querySelector('.energy__lv .n').textContent = "Locked";
                pop.querySelector('.energy__lv .t').textContent = "lvl 0";

                // 2. O'rta qism: FOYDALANUVCHIDA MAVJUD KALITLAR
                threeTitleItalic.textContent = "Your Keys"; // Yoki "Key Balance"
                threeTitleImg.src = "/image/key.png";
                threeTitleSpan.textContent = getKeys(); // Borda bor kalitlar soni

                // 3. Tugma: Kalit narxi
                const keyText = this.querySelector('.boo__num__key').textContent.trim();
                const keyCost = parseInt(keyText.match(/\d+/)[0], 10);

                btnImg.src = "/image/key.png";
                btnNumDiv.textContent = keyCost;
                updateBtnText.textContent = "Unlock";

                upgradeBtn.dataset.action = "unlock";
                upgradeBtn.dataset.cost = keyCost;

            } else {
                // --- UPGRADE MODI (DIAMOND) ---
                const lvlText = this.querySelector('.boo__num_coin_text').textContent;
                if (lvlText === "MAX") return;

                const currentLvl = parseInt(lvlText.replace('lvl', '').trim()) || 0;
                const nextLvl = currentLvl + 1;

                // HTML dan Diamond narxini olish
                const diamondText = this.querySelector('.boo__num__coin').textContent.replace('💎', '').trim();
                const diamondCost = parseInt(diamondText, 10);

                // 1. Level ko'rsatish
                pop.querySelector('.energy__lv .n').textContent = lvlText;
                pop.querySelector('.energy__lv .t').textContent = (nextLvl >= MAX_LVL) ? "MAX" : `lvl ${nextLvl}`;

                // 2. O'rta qism: PRC FOYDA QO'SHILISHI
                threeTitleItalic.textContent = "PRC";
                threeTitleImg.src = "/image/coin.png";
                threeTitleSpan.textContent = "+" + diamondCost; // Qancha foyda qo'shilishi (narxga teng deb oldim)

                // 3. Tugma: Diamond narxi
                btnImg.src = "/image/diamond.png";
                btnNumDiv.textContent = diamondCost;
                updateBtnText.textContent = "Upgrade";

                upgradeBtn.dataset.action = "upgrade";
                upgradeBtn.dataset.cost = diamondCost;
            }

            pop.style.display = 'flex';
        });
    });

    // --- ACTION BUTTON HANDLER ---
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function () {
            if (upgradeBtn.classList.contains('disabled') || upgradeBtn.dataset.busy === '1') return;
            if (!lastClickedBooItem) return;

            const action = upgradeBtn.dataset.action;
            const cost = parseInt(upgradeBtn.dataset.cost, 10);
            const id = lastClickedBooItem.getAttribute('data-target');

            upgradeBtn.dataset.busy = '1';
            let success = false;

            if (action === "unlock") {
                // --- UNLOCK QILISH ---
                const currentKeys = getKeys();
                if (currentKeys >= cost) {
                    setKeys(currentKeys - cost);
                    success = true;

                    // Unlock bo'lganda UI o'zgarishi
                    const lockIcon = lastClickedBooItem.querySelector('.lock-icon');
                    const keyDiv = lastClickedBooItem.querySelector('.boo__num__key');
                    const coinDiv = lastClickedBooItem.querySelector('.boo__num__coin');

                    lockIcon.style.display = 'none';
                    keyDiv.style.display = 'none';
                    coinDiv.style.display = 'flex';

                    // Default narxni olish
                    const startDiamondCost = parseInt(coinDiv.textContent.replace('💎', '').trim()) || 100;

                    saveCardState(id, { unlocked: true, lvl: 0, cost: startDiamondCost });

                    // Muvaffaqiyatli ochilganda oynani yopish
                    pop.style.display = 'none';
                    // Yoki agar oynani yopmasdan darrov "Upgrade" rejimiga o'tkazmoqchi bo'lsangiz, shu yerda qayta render qilish kerak.
                    // Hozircha yopib qo'ya qolamiz.

                    alert("Card Unlocked!");

                } else {
                    alert(`Not enough Keys! Need ${cost} keys.`);
                }

            } else if (action === "upgrade") {
                // --- UPGRADE QILISH ---
                const currentDiamonds = getDiamond();
                if (currentDiamonds >= cost) {
                    setDiamond(currentDiamonds - cost);
                    success = true;

                    // Profit (PRC) qo'shish
                    let prcBonus = BigInt(cost) * BASE_WEI;
                    setPRCWei(getPRCWei() + prcBonus);

                    // Kartani yangilash
                    const lvlEl = lastClickedBooItem.querySelector('.boo__num_coin_text');
                    const coinDiv = lastClickedBooItem.querySelector('.boo__num__coin');
                    const costSpan = lastClickedBooItem.querySelector('.boo__cost span');

                    let curLvl = parseInt(lvlEl.textContent.replace('lvl', '').trim()) || 0;
                    let newLvl = curLvl + 1;
                    let newCost = cost + 100;

                    // DOM yangilash
                    if (newLvl >= MAX_LVL) {
                        lvlEl.textContent = "MAX";
                        coinDiv.textContent = "MAX";
                        if (costSpan) costSpan.textContent = "MAX";

                        saveCardState(id, { unlocked: true, lvl: MAX_LVL, cost: newCost });
                        pop.style.display = 'none';
                    } else {
                        lvlEl.textContent = `lvl ${newLvl}`;
                        coinDiv.textContent = `💎${newCost}`;
                        if (costSpan) costSpan.textContent = newCost;

                        saveCardState(id, { unlocked: true, lvl: newLvl, cost: newCost });

                        // Oynani (Popup) yangilash: Keyingi levelga tayyorlash
                        pop.querySelector('.energy__lv .n').textContent = `lvl ${newLvl}`;
                        pop.querySelector('.energy__lv .t').textContent = (newLvl + 1 >= MAX_LVL) ? "MAX" : `lvl ${newLvl + 1}`;

                        // O'rta qismni yangilash: PRC
                        pop.querySelector('#prcIncreaseValue').textContent = "+" + newCost;

                        // Tugmani yangilash
                        pop.querySelector('.btns .btn.active .btn-num div').textContent = newCost;
                        upgradeBtn.dataset.cost = newCost;
                    }
                } else {
                    alert(`Not enough Diamonds! Need ${cost} diamonds.`);
                }
            }

            if (success) {
                updateHeaderUI();
                try { if (window.parent && window.parent.updateHeaderPRC) window.parent.updateHeaderPRC(); } catch (e) { }
            }

            startCooldown(upgradeBtn, 1);
            delete upgradeBtn.dataset.busy;
        });
    }

    // Popup Close
    document.querySelector('.btn-close').addEventListener('click', () => {
        pop.style.display = 'none';
    });

    function startCooldown(btn, seconds) {
        const origText = btn.textContent;
        btn.classList.add('disabled');
        let rem = seconds;

        const iv = setInterval(() => {
            rem--;
            if (rem <= 0) {
                clearInterval(iv);
                btn.classList.remove('disabled');
                btn.textContent = origText;
            }
        }, 1000);
    }
})();
