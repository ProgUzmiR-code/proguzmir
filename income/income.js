(function () {
    const BASE_WEI = 1000n;
    const MAX_LVL = 50;

    // --- DIQQAT: LOCALSTORAGE O'RNIGA GLOBAL 'state' DAN FOYDALANAMIZ ---

    // Getter va Setterlar (Faqat global xotiraga ulanadi)
    function getDiamond() { return state ? state.diamond : 0; }
    function setDiamond(v) { if (state) state.diamond = v; }

    // Eslatma: Asosiy faylda kalitlar keysTotal deb nomlangan
    function getKeys() { return state ? (state.keysTotal || 0) : 0; }
    function setKeys(v) { if (state) state.keysTotal = v; }

    function getPRCWei() { return state && state.prcWei ? BigInt(state.prcWei) : 0n; }
    function setPRCWei(v) { if (state) state.prcWei = v; }

    // --- UI Elements ---
    const upgradeBtn = document.querySelector('.update-btn');
    const pop = document.getElementById('pop');
    let lastClickedBooItem = null;

    // Header UI Update (Income sahifasining o'zidagi raqamlar)
    function updateHeaderUI() {
        const dEl = document.getElementById('diamondCount');
        if (dEl) dEl.textContent = getDiamond();

        const kEl = document.getElementById('keyCount');
        if (kEl) kEl.textContent = getKeys();
    }
    
    // Boshlang'ich yuklash
    updateHeaderUI();
    setInterval(updateHeaderUI, 1000);

    // --- CARD STATE MANAGEMENT (Kartalar darajasini saqlash) ---
    function saveCardState(id, dataObj) {
        if (!state) return;
        if (!state.cardsLvl) state.cardsLvl = {};
        
        state.cardsLvl[id] = dataObj;
        // saveState(state) chaqirilganda bu o'z-o'zidan Supabase'ga ketadi
    }

    function loadCardsState() {
        if (!state) return;
        const allData = state.cardsLvl || {};

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

    // Sahifa ochilganda kartalarni holatini yuklash
    setTimeout(loadCardsState, 100); // Kichik kechikish global state to'la yuklanishi uchun

    // --- CLICK HANDLER (POPUP OCHISH) ---
    document.querySelectorAll('.boo-item').forEach(item => {
        item.addEventListener('click', function () {
            lastClickedBooItem = this;
            const id = this.getAttribute('data-target');

            const lockIcon = this.querySelector('.lock-icon');
            const isLocked = (lockIcon && lockIcon.style.display !== 'none');

            const title = this.querySelector('.boo-title').textContent;
            const img = this.querySelector('.boo-icon img').src;

            pop.querySelector('.energy__title').textContent = title;
            pop.querySelector('.energy__img img').src = img;

            const btnNumDiv = pop.querySelector('.btns .btn.active .btn-num div');
            const btnImg = pop.querySelector('.btns .btn.active .btn-num img');
            const updateBtnText = pop.querySelector('.update-btn');

            const threeTitleItalic = pop.querySelector('.energy__threetitle i');
            const threeTitleImg = pop.querySelector('.energy__threetitle img');
            const threeTitleSpan = pop.querySelector('#prcIncreaseValue'); 

            if (isLocked) {
                // UNLOCK MODI
                pop.querySelector('.energy__lv .n').textContent = "Locked";
                pop.querySelector('.energy__lv .t').textContent = "lvl 0";

                threeTitleItalic.textContent = "Your Keys"; 
                threeTitleImg.src = "./image/key.png";
                threeTitleSpan.textContent = getKeys(); 

                const keyText = this.querySelector('.boo__num__key').textContent.trim();
                const keyCost = parseInt(keyText.match(/\d+/)[0], 10);

                btnImg.src = "./image/key.png";
                btnNumDiv.textContent = keyCost;
                updateBtnText.textContent = "Unlock";

                upgradeBtn.dataset.action = "unlock";
                upgradeBtn.dataset.cost = keyCost;

            } else {
                // UPGRADE MODI
                const lvlText = this.querySelector('.boo__num_coin_text').textContent;
                if (lvlText === "MAX") return;

                const currentLvl = parseInt(lvlText.replace('lvl', '').trim()) || 0;
                const nextLvl = currentLvl + 1;

                const diamondText = this.querySelector('.boo__num__coin').textContent.replace('💎', '').trim();
                const diamondCost = parseInt(diamondText, 10);

                pop.querySelector('.energy__lv .n').textContent = lvlText;
                pop.querySelector('.energy__lv .t').textContent = (nextLvl >= MAX_LVL) ? "MAX" : `lvl ${nextLvl}`;

                threeTitleItalic.textContent = "PRC";
                threeTitleImg.src = "./image/coin.png";
                threeTitleSpan.textContent = "+" + diamondCost; 

                btnImg.src = "./image/diamond.png";
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
                const currentKeys = getKeys();
                if (currentKeys >= cost) {
                    setKeys(currentKeys - cost);
                    success = true;

                    const lockIcon = lastClickedBooItem.querySelector('.lock-icon');
                    const keyDiv = lastClickedBooItem.querySelector('.boo__num__key');
                    const coinDiv = lastClickedBooItem.querySelector('.boo__num__coin');

                    lockIcon.style.display = 'none';
                    keyDiv.style.display = 'none';
                    coinDiv.style.display = 'flex';

                    const startDiamondCost = parseInt(coinDiv.textContent.replace('💎', '').trim()) || 100;

                    saveCardState(id, { unlocked: true, lvl: 0, cost: startDiamondCost });
                    pop.style.display = 'none';

                    if (typeof showToast === 'function') showToast("Card Unlocked!");
                } else {
                    alert(`Not enough Keys! Need ${cost} keys.`);
                }

            } else if (action === "upgrade") {
                const currentDiamonds = getDiamond();
                if (currentDiamonds >= cost) {
                    setDiamond(currentDiamonds - cost);
                    success = true;

                    let prcBonus = BigInt(cost) * BASE_WEI;
                    setPRCWei(getPRCWei() + prcBonus);

                    const lvlEl = lastClickedBooItem.querySelector('.boo__num_coin_text');
                    const coinDiv = lastClickedBooItem.querySelector('.boo__num__coin');
                    const costSpan = lastClickedBooItem.querySelector('.boo__cost span');

                    let curLvl = parseInt(lvlEl.textContent.replace('lvl', '').trim()) || 0;
                    let newLvl = curLvl + 1;
                    let newCost = cost + 100;

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

                        pop.querySelector('.energy__lv .n').textContent = `lvl ${newLvl}`;
                        pop.querySelector('.energy__lv .t').textContent = (newLvl + 1 >= MAX_LVL) ? "MAX" : `lvl ${newLvl + 1}`;
                        pop.querySelector('#prcIncreaseValue').textContent = "+" + newCost;
                        pop.querySelector('.btns .btn.active .btn-num div').textContent = newCost;
                        upgradeBtn.dataset.cost = newCost;
                    }
                } else {
                    alert(`Not enough Diamonds! Need ${cost} diamonds.`);
                }
            }

            if (success) {
                updateHeaderUI();
                
                // 💾 DIQQAT: Xarid qilingandan so'ng darhol global o'zgarishlarni saqlaymiz va ekranni yangilaymiz
                if (typeof saveState === 'function') saveState(state);
                if (typeof updateHeaderPRC === 'function') updateHeaderPRC();
                if (typeof updateHeaderDiamond === 'function') updateHeaderDiamond();
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
