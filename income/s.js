(function () {
            const BASE_WEI = 1000n;
            const MAX_LVL = 50; // Eng yuqori daraja
            const KEY_DIAMOND = "proguzmir_diamond";
            const KEY_PRC = "proguzmir_prc_wei";
            const KEY_WALLET = "proguzmir_wallet";
            const KEY_CARD_DATA = "proguzmir_cards_lvl"; // Kartalar ma'lumotlari uchun kalit

            function makeUserKey(baseKey, wallet) { return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest"; }
            function getWallet() { return localStorage.getItem(KEY_WALLET) || ""; }
            function getDiamond() { return parseInt(localStorage.getItem(makeUserKey(KEY_DIAMOND, getWallet())) || "0", 10); }
            function setDiamond(v) { localStorage.setItem(makeUserKey(KEY_DIAMOND, getWallet()), String(v)); }
            function getPRCWei() { try { return BigInt(localStorage.getItem(makeUserKey(KEY_PRC, getWallet())) || "0"); } catch (e) { return 0n; } }
            function setPRCWei(v) { localStorage.setItem(makeUserKey(KEY_PRC, getWallet()), v.toString()); }

            const upgradeBtn = document.querySelector('.update-btn');
            const pop = document.getElementById('pop');
            let lastClickedBooItem = null;

            // --- YANGI: Kartalar holatini saqlash va yuklash funksiyalari ---
            function saveCardState(id, lvl, cost) {
                const wallet = getWallet();
                const data = JSON.parse(localStorage.getItem(makeUserKey(KEY_CARD_DATA, wallet)) || "{}");
                data[id] = { lvl, cost };
                localStorage.setItem(makeUserKey(KEY_CARD_DATA, wallet), JSON.stringify(data));
            }

            function loadCardsState() {
                const wallet = getWallet();
                const data = JSON.parse(localStorage.getItem(makeUserKey(KEY_CARD_DATA, wallet)) || "{}");

                document.querySelectorAll('.boo-item').forEach(item => {
                    const id = item.getAttribute('data-target');
                    if (data[id]) {
                        item.querySelector('.boo__num_coin_text').textContent = `lvl ${data[id].lvl}`;
                        item.querySelector('.boo__num__coin').textContent = `💎${data[id].cost}`;
                        const spanCost = item.querySelector('.boo__cost span');
                        if (spanCost) spanCost.textContent = data[id].cost;
                    }
                });
            }

            // Sahifa yuklanganda saqlangan holatni tiklash
            loadCardsState();

            // 1. BOO-ITEM BOSILGANDA
            document.querySelectorAll('.boo-item').forEach(item => {
                item.addEventListener('click', function () {
                    lastClickedBooItem = this;
                    const title = this.querySelector('.boo-title').textContent;
                    const img = this.querySelector('.boo-icon img').src;
                    const lvl = this.querySelector('.boo__num_coin_text').textContent;
                    const diamondCost = this.querySelector('.boo__num__coin').textContent.replace('💎', '').trim();

                    pop.querySelector('.energy__title').textContent = title;
                    pop.querySelector('.energy__img img').src = img;
                    pop.querySelector('.energy__lv .n').textContent = lvl;
                    let nextLvlNum = parseInt(lvl.replace('lvl', '').trim()) + 1;
                    pop.querySelector('.energy__lv .t').textContent = `lvl ${nextLvlNum}`;
                    pop.querySelector('.btns .btn.active .btn-num div').textContent = diamondCost;

                    pop.style.display = 'flex';
                });
            });

            // 2. UPGRADE TUGMASI BOSILGANDA
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', function () {
                    if (upgradeBtn.classList.contains('disabled') || upgradeBtn.dataset.busy === '1') return;

                    const diamondNumDiv = document.querySelector('.btns .btn.active .btn-num div');
                    const diamondCost = parseInt(diamondNumDiv.textContent, 10);
                    let currentDiamonds = getDiamond();

                    if (currentDiamonds < diamondCost) {
                        alert(`${diamondCost} diamonds required!`);
                        return;
                    }

                    upgradeBtn.dataset.busy = '1';

                    // Balansni yangilash
                    currentDiamonds -= diamondCost;
                    setDiamond(currentDiamonds);
                    setPRCWei(getPRCWei() + (BASE_WEI * BigInt(diamondCost)));
                    document.getElementById('diamondCount').textContent = currentDiamonds;

                    if (lastClickedBooItem) {
                        const id = lastClickedBooItem.getAttribute('data-target');
                        const cardLvlDiv = lastClickedBooItem.querySelector('.boo__num_coin_text');
                        const cardDiamondDiv = lastClickedBooItem.querySelector('.boo__num__coin');

                        let currentLvl = parseInt(cardLvlDiv.textContent.replace('lvl', '').trim());
                        let newLvl = currentLvl + 1;
                        let newCost = diamondCost + 100;

                        // DOM ni yangilash
                        cardLvlDiv.textContent = `lvl ${newLvl}`;
                        cardDiamondDiv.textContent = `💎${newCost}`;
                        const spanCost = lastClickedBooItem.querySelector('.boo__cost span');
                        if (spanCost) spanCost.textContent = newCost;

                        pop.querySelector('.energy__lv .n').textContent = `lvl ${newLvl}`;
                        pop.querySelector('.energy__lv .t').textContent = `lvl ${newLvl + 1}`;
                        diamondNumDiv.textContent = newCost;

                        // --- SAQLASH ---
                        saveCardState(id, newLvl, newCost);
                    }

                    // --- YANGI: Parent page dagi header PRC ni yangilash ---
                    try {
                        if (typeof parent !== 'undefined' && parent.updateHeaderPRC) {
                            parent.updateHeaderPRC();
                        } else if (typeof window.opener !== 'undefined' && window.opener.updateHeaderPRC) {
                            window.opener.updateHeaderPRC();
                        }
                    } catch (e) { /* ignore cross-origin or undefined errors */ }

                    startCooldown(upgradeBtn, 1); // 1 soniya sovutish
                    delete upgradeBtn.dataset.busy;
                });
            }

            function startCooldown(btn, seconds) {
                const origHTML = btn.innerHTML;
                btn.classList.add('disabled');
                let rem = seconds;
                const iv = setInterval(() => {
                    btn.textContent = `Wait (${rem}s)`;
                    rem--;
                    if (rem < 0) {
                        clearInterval(iv);
                        btn.classList.remove('disabled');
                        btn.innerHTML = origHTML;
                    }
                }, 1000);
            }
        })();