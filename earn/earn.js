// earn/earn.js
(function () {
    if (window._earnScriptLoaded) return;
    window._earnScriptLoaded = true;

    const BASE_WEI = 1n;

    function getGlobalState() { return (typeof state !== 'undefined') ? state : null; }
    function getDiamond() { const s = getGlobalState(); return s ? (s.diamond || 0) : 0; }
    function setDiamond(v) { const s = getGlobalState(); if (s) s.diamond = v; }
    function getKeysTotal() { const s = getGlobalState(); return s ? (s.keysTotal || 0) : 0; }
    function setKeysTotal(v) { const s = getGlobalState(); if (s) s.keysTotal = v; }
    function getKeysUsed() { const s = getGlobalState(); return s ? (s.keysUsed || 0) : 0; }
    function setKeysUsed(v) { const s = getGlobalState(); if (s) s.keysUsed = v; }

    function updateKeyDisplay() {
        document.querySelectorAll('[data-key-total-display]').forEach(el => el.innerText = String(getKeysTotal()));
        document.querySelectorAll('[data-key-used-display]').forEach(el => el.innerText = String(getKeysUsed()));
    }

    setInterval(updateKeyDisplay, 1000);
    setTimeout(updateKeyDisplay, 100);

    window.updateDailyLoginTaskIcon = function () {
        const dailyLoginArrow = document.getElementById('dailyLoginArrow');
        const dailyLoginItem = document.getElementById('dailyLoginTask');
        const s = getGlobalState();

        if (!dailyLoginArrow || !dailyLoginItem || !s) return;

        const claims = s.dailyClaims || [false, false, false, false, false, false, false];
        const todayIndex = s.todayIndex || 0;

        if (claims[todayIndex]) {
            dailyLoginItem.classList.add('is-completed');
            dailyLoginArrow.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
        } else {
            dailyLoginItem.classList.remove('is-completed');
            dailyLoginArrow.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/arrow.svg" alt=""></span>`;
        }
    };
    setTimeout(window.updateDailyLoginTaskIcon, 300);

    function initAllInviteItemsState() {
        const s = getGlobalState();
        if (!s) return;
        const completedTasksText = s.completedTasks || ""; // Endi bu string (vergul bilan) yoki massiv bo'lishi mumkin

        document.querySelectorAll('.invite-item.bton:not(#dailyLoginTask)').forEach(it => {
            const taskId = it.getAttribute('data-task-id');
            if (!taskId) return;

            // Agar vazifa oldin bajarilgan bo'lsa
            if (completedTasksText.includes(taskId)) {
                it.classList.add('is-completed');
                const arrowDiv = it.querySelector('.invite-arrow');
                if (arrowDiv && !arrowDiv.querySelector('img[src*="done.svg"]')) {
                    arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
                }
            }
        });
        window.updateDailyLoginTaskIcon();
    }
    setTimeout(initAllInviteItemsState, 500);

    // 🚀 BARCHA CLICK'LAR UCHUN YAGONA EVENT LISTENER
    document.addEventListener('click', async function (ev) {
        // 1. Tablarni o'zgartirish
        const tab = ev.target.closest('.tab_item');
        if (tab) {
            const tabs = document.querySelectorAll('.tab_item');
            tabs.forEach(item => item.classList.remove('checked1'));
            tab.classList.add('checked1');

            const target = tab.getAttribute('data-target');
            const mainContainer = document.querySelector('.earn-main');

            if (mainContainer) {
                if (target === 'active') {
                    mainContainer.classList.add('tab_active_view');
                    mainContainer.classList.remove('tab_inactive_view');
                } else {
                    mainContainer.classList.add('tab_inactive_view');
                    mainContainer.classList.remove('tab_active_view');
                }
            }
            return;
        }

        const item = ev.target.closest('.invite-item.bton');
        if (!item || item.id === 'dailyLoginTask' || item.id === 'watchAdBtn' || item.id === 'taskAdBtn') return;

        // 2. Tranzaksiya vazifalarini ushlab qolish
        const taskType = item.getAttribute('data-task-type');
        if (taskType === 'ton_transaction' || taskType === 'stars_transaction' || taskType === 'bnb_transaction') {
            ev.preventDefault();
            if (item.classList.contains('is-completed')) return;
            alert("Please make a purchase from the 'Recharge' section of the Wallet page to complete the task.");
            return;
        }

        // 3. Claim tugmasi bosilganda (Supabase jarayoni)
        if (ev.target.classList.contains('claim-inline-btn')) {
            const taskId = item.getAttribute('data-task-id');
            const anchor = item.querySelector('a');
            const href = anchor ? (anchor.getAttribute('data-href') || anchor.getAttribute('href')) : '';

            if (!taskId) {
                console.error("HTML da data-task-id topilmadi!");
                return;
            }

            // A) Ssilka birinchi marta bosilyaptimi?
            if (!item.classList.contains('visited')) {
                item.classList.add('visited');
                if (href) {
                    try {
                        if (window.Telegram && window.Telegram.WebApp) {
                            window.Telegram.WebApp.openLink(href);
                        } else {
                            window.open(href, '_blank');
                        }
                    } catch (e) {
                        window.open(href, '_blank');
                    }
                }

                // 3 soniya kutish
                ev.target.innerText = "Checking...";
                ev.target.classList.add('processing'); // O'chirib bo'lmaydigan qilib turamiz

                setTimeout(() => {
                    ev.target.innerText = "Claim Reward";
                    ev.target.classList.remove('processing');
                }, 3000);
                return;
            }

            // B) Ssilka oldin bosilgan va endi mukofotni tekshiramiz
            await processReward(item, ev.target, taskId);
            return;
        }

        // 4. Agar tugma emas, butun blok bosilsa - ssilkani ochib, tugmani Claim ga aylantirish
        const anchor = item.querySelector('a[href]');
        if (!anchor) return;

        ev.preventDefault();
        const href = anchor.getAttribute('href');

        try {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openLink(href);
            } else {
                window.open(href, '_blank');
            }
        } catch (e) {
            window.open(href, '_blank');
        }

        const arrowDiv = item.querySelector('.invite-arrow');
        if (arrowDiv) {
            anchor.setAttribute('data-href', href);
            arrowDiv.innerHTML = `<button class="claim-inline-btn visited">Check</button>`;
            // Darhol ssilkani ochgani uchun check qilib qo'yamiz
            setTimeout(() => {
                const btn = arrowDiv.querySelector('.claim-inline-btn');
                if (btn) btn.innerText = "Claim Reward";
            }, 3000);
        }
    });

    // 🔒 BACKEND (Sizning API) ORQALI MUKOFOT BERISH MANTIG'I
    async function processReward(item, claimBtn, taskId) {
        if (claimBtn.classList.contains('processing')) return;
        claimBtn.classList.add('processing');
        claimBtn.innerHTML = `<span class="loading-dots"></span>`;

        try {
            const userWallet = getGlobalState()?.wallet;
            if (!userWallet) {
                alert("Foydalanuvchi hamyoni topilmadi!");
                throw new Error("Wallet not found in state");
            }

            // Supabase o'rniga, O'ZIMIZNING BACKEND ga so'rov yuboramiz
            const response = await fetch('/api/earn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    wallet: userWallet,
                    taskId: taskId
                })
            });

            const data = await response.json();

            if (data.success) {
                // MUVAFFAQIYATLI: Balansni va HTMLni yangilash
                setDiamond(getDiamond() + data.added_diamonds);
                setKeysTotal(getKeysTotal() + data.added_keys);
                setKeysUsed(getKeysUsed() + data.added_keys);

                updateKeyDisplay();
                const top = document.getElementById('diamondTop');
                if (top) top.textContent = '💎 ' + getDiamond();

                // Animatsiya
                try {
                    const particleCount = Math.min(12, Math.max(4, Math.round(data.added_diamonds / 5000) + data.added_keys));
                    animateRewardParticles(item, particleCount);
                } catch (e) { }

                // UI ni bajarilgan holatga o'tkazish
                const arrowDiv = item.querySelector('.invite-arrow');
                if (arrowDiv) {
                    arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
                }
                item.classList.add('is-completed');

                // Mahalliy (local) saqlash
                const s = getGlobalState();
                if (s) {
                    s.completedTasks = (s.completedTasks ? s.completedTasks + "," : "") + taskId;
                    if (typeof saveState === 'function') saveState(s);
                    if (typeof saveUserState === 'function') saveUserState(s);
                }

            } else {
                // 🚀 AQLLI HIMOYA: Agar backend "allaqachon bajargan" desa
                if (data.message && data.message.includes('allaqachon')) {
                    // Xato ko'rsatmasdan, darhol UI'ni to'g'irlab qo'yamiz (Done qilib yashil qilamiz)
                    item.classList.add('is-completed');
                    const arrowDiv = item.querySelector('.invite-arrow');
                    if (arrowDiv) {
                        arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
                    }

                    // Va mahalliy xotirani ham to'g'irlab qo'yamiz
                    const s = getGlobalState();
                    if (s) {
                        s.completedTasks = (s.completedTasks ? s.completedTasks + "," : "") + taskId;
                        if (typeof saveState === 'function') saveState(s);
                    }
                } else {
                    // Haqiqiy xatolik bo'lsagina alert chiqaramiz
                    alert(data.message || "Xatolik yuz berdi");
                    claimBtn.classList.remove('processing');
                    claimBtn.innerHTML = 'Claim';
                }
            }

        } catch (err) {
            console.error("Xatolik yuz berdi:", err);
            claimBtn.classList.remove('processing');
            claimBtn.innerHTML = 'Error';
        }
    }

    // Zarralar animatsiyasi funksiyasi
    function animateRewardParticles(item, count) {
        if (!item || !count) return;
        const rect = item.getBoundingClientRect();
        const startX = rect.right - 40;
        const startY = rect.top + rect.height / 2;

        for (let i = 0; i < count; i++) {
            (function (idx) {
                const img = document.createElement('img');
                img.src = (idx % 2 === 0) ? '/image/diamond.png' : '/image/key.png';
                const size = Math.floor(12 + Math.random() * 30);
                img.style.position = 'fixed';
                img.style.left = (startX + (Math.random() * 40 - 20)) + 'px';
                img.style.top = (startY + (Math.random() * 20 - 10)) + 'px';
                img.style.width = size + 'px';
                img.style.height = 'auto';
                img.style.zIndex = 20000;
                img.style.pointerEvents = 'none';
                img.style.opacity = '1';
                img.style.transform = `translateY(0px) rotate(${Math.random() * 60 - 30}deg) scale(${0.8 + Math.random() * 0.6})`;
                img.style.transition = `transform ${900 + Math.random() * 700}ms cubic-bezier(.2,.9,.2,1), opacity ${900 + Math.random() * 700}ms linear`;
                document.body.appendChild(img);

                requestAnimationFrame(() => {
                    const dy = 120 + Math.random() * 180;
                    const dx = (Math.random() * 80 - 40);
                    const rot = Math.random() * 360;
                    img.style.transform = `translate(${dx}px, -${dy}px) rotate(${rot}deg) scale(${0.6 + Math.random()})`;
                    img.style.opacity = '0';
                });

                setTimeout(() => {
                    if (img.parentElement) img.parentElement.removeChild(img);
                }, 1700 + Math.random() * 800);
            })(i);
        }
    }

    // Sahifa ko'rinishlarini yuklash
    if (document.readyState !== 'loading') {
        const mainContainer = document.querySelector('.earn-main');
        if (mainContainer) mainContainer.classList.add('tab_active_view');
    }

    // Ads Limit funksiyasi
    function initAdLimit() {
        const s = getGlobalState();
        if (s) {
            if (typeof s.dailyAdsWatched === 'undefined') s.dailyAdsWatched = 0;
            const adsLeft = 5 - s.dailyAdsWatched;

            const counterEl = document.getElementById('adCounterDisplay');
            if (counterEl) counterEl.innerText = adsLeft > 0 ? adsLeft : 0;

            if (adsLeft <= 0) {
                const btn = document.getElementById('watchAdBtn');
                if (btn) {
                    btn.classList.add('is-completed');
                    const arrowDiv = btn.querySelector('.invite-arrow');
                    if (arrowDiv) arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
                }
            }
        }
    }
    setTimeout(initAdLimit, 500);

    // Adsgram reklama funksiyasi
    // --- Yordamchi funksiyalar (Kunlik ad limit uchun) ---
    function getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function getAdData() {
        let dataStr = localStorage.getItem('adWatchData');
        let today = getTodayString();

        if (dataStr) {
            let data = JSON.parse(dataStr);
            // Agar saqlangan sana bugungi sana bo'lmasa, hisoblagichni nolga tushiramiz (Yangi kun)
            if (data.date !== today) {
                data = { date: today, count: 0 };
                localStorage.setItem('adWatchData', JSON.stringify(data));
            }
            return data;
        } else {
            // Agar umuman ma'lumot yo'q bo'lsa, yangi yaratamiz
            let data = { date: today, count: 0 };
            localStorage.setItem('adWatchData', JSON.stringify(data));
            return data;
        }
    }

    function incrementAdData() {
        let data = getAdData();
        data.count += 1;
        localStorage.setItem('adWatchData', JSON.stringify(data));
        return data;
    }
    // -----------------------------------------------------

    // Ads Limit funksiyasi (Yangilangan)
    function initAdLimit() {
        const adData = getAdData();
        const adsLeft = 5 - adData.count;

        const counterEl = document.getElementById('adCounterDisplay');
        if (counterEl) counterEl.innerText = adsLeft > 0 ? adsLeft : 0;

        if (adsLeft <= 0) {
            const btn = document.getElementById('watchAdBtn');
            if (btn) {
                btn.classList.add('is-completed');
                const arrowDiv = btn.querySelector('.invite-arrow');
                if (arrowDiv) arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
            }
        }
    }
    setTimeout(initAdLimit, 500);

    // Adsgram reklama funksiyasi (Yangilangan)
    window.showRewardedAd = function (btnElement) {
        if (typeof AdController === 'undefined' || !AdController) {
            alert("Reklama tizimi yuklanmoqda, biroz kuting...");
            return;
        }

        const adData = getAdData();
        let adsLeft = 5 - adData.count;

        if (adsLeft <= 0) {
            alert("Siz bugungi barcha reklamalarni ko'rib bo'ldingiz. Iltimos ertaga qayta urinib ko'ring!");
            return;
        }

        AdController.show().then((result) => {
            // Mukofotlarni berish
            let currentDiamond = getDiamond();
            let currentTotalKeys = getKeysTotal();
            let currentUsedKeys = getKeysUsed();

            setDiamond(currentDiamond + 2000);
            setKeysTotal(currentTotalKeys + 2);
            setKeysUsed(currentUsedKeys + 2);

            // 1 ta reklama ko'rildi deb localStorage'ga saqlash
            const newData = incrementAdData();
            adsLeft = 5 - newData.count;

            // UIni yangilash
            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();

            const counterEl = document.getElementById('adCounterDisplay');
            if (counterEl) {
                counterEl.innerText = adsLeft > 0 ? adsLeft : 0;
            }

            if (adsLeft <= 0) {
                btnElement.classList.add('is-completed');
                const arrowDiv = btnElement.querySelector('.invite-arrow');
                if (arrowDiv) {
                    arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
                }
            }

            try { animateRewardParticles(btnElement, 15); } catch (e) { }

            // Asosiy state'ni ham saqlab qo'yamiz (Olmos va kalitlar uchun)
            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s);
                if (typeof saveUserState === 'function') saveUserState(s);
            }

        }).catch((error) => {
            console.log("Ad not seen or error:", error);
            alert("To receive a reward, you must watch the ad to the end or the ad was not found. Please try again.");
        });
    };

    // ADSGRAM TASK 
    const taskElement = document.querySelector("adsgram-task[data-block-id='task-25934']");

    if (taskElement) {
        taskElement.addEventListener("reward", (event) => {
            let currentDiamond = getDiamond();
            let currentTotalKeys = getKeysTotal();
            let currentUsedKeys = getKeysUsed();

            setDiamond(currentDiamond + 3000);
            setKeysTotal(currentTotalKeys + 2);
            setKeysUsed(currentUsedKeys + 2);

            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();

            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s);
                if (typeof saveUserState === 'function') saveUserState(s);
            }

            try { animateRewardParticles(taskElement, 20); } catch (e) { }
            alert("Congratulations! You completed the task and received 3000 💎 and 2 🗝️ key!");
        });

        taskElement.addEventListener("onError", (event) => {
            taskElement.style.display = 'none';
        });

        taskElement.addEventListener("onBannerNotFound", (event) => {
            taskElement.style.display = 'none';
        });
    }

})();