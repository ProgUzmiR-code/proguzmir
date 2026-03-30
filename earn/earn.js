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

    // ✅ 1. Barcha kalit ko'rsatkichlarini bittada yangilaymiz (Xuddi Diamond kabi)
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

    function markAsCompleted(item, taskId) {
        if (!item) return;
        item.classList.add('is-completed');
        const a = item.querySelector('a');
        if (a) {
            a.removeAttribute('href');
            a.style.cursor = 'default';
            a.style.pointerEvents = 'none';
            a.onclick = (e) => { e.preventDefault(); return false; };
        }

        const s = getGlobalState();
        if (s && taskId) {
            if (!s.completedTasks) s.completedTasks = {};
            s.completedTasks[taskId] = true;
        }
    }

    function initAllInviteItemsState() {
        const s = getGlobalState();
        if (!s) return;
        const completed = s.completedTasks || {};

        document.querySelectorAll('.invite-item.bton:not(#dailyLoginTask)').forEach(it => {
            const anchor = it.querySelector('a');
            if (!anchor) return;
            const href = anchor.getAttribute('href') || anchor.getAttribute('data-original-href') || anchor.getAttribute('data-href');
            if (!href) return;

            if (completed[href]) {
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

    document.addEventListener('click', function (ev) {
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

        // Shu qatorni toping va shunday o'zgartiring:
        const item = ev.target.closest('.invite-item.bton');
        if (!item || item.id === 'dailyLoginTask' || item.id === 'watchAdBtn' || item.id === 'taskAdBtn') return;


        // 🔥 YANGI QO'SHILGAN KOD: Tranzaksiya vazifalarini ushlab qolish
        const taskType = item.getAttribute('data-task-type');
        if (taskType === 'ton_transaction' || taskType === 'stars_transaction' || taskType === 'bnb_transaction') {
            ev.preventDefault(); // Ssilkani ochishni to'xtatadi

            // Agar vazifa allaqachon bajarilgan bo'lsa, hech narsa qilmaydi
            if (item.classList.contains('is-completed')) return;

            // Foydalanuvchiga xabar chiqarish
            alert("Please make a purchase from the 'Recharge' section of the Wallet page to complete the task.");
            return; // Shu yerda to'xtaydi va Claim tugmasiga aylanib qolmaydi
        }
        // -----------------------------------------------------------

        if (ev.target.classList.contains('claim-inline-btn')) {
            if (ev.target.classList.contains('processing')) return;
            const anchor = item.querySelector('a');
            const href = anchor ? (anchor.getAttribute('data-href') || anchor.getAttribute('data-original-href') || anchor.getAttribute('href')) : '';
            awardBonusAndCloseInline(item, href);
            return;
        }

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
            arrowDiv.innerHTML = `<button class="claim-inline-btn">Claim</button>`;
        }
    });

    function awardBonusAndCloseInline(item, href) {
        const claimBtn = item.querySelector('.claim-inline-btn');
        if (!claimBtn || claimBtn.classList.contains('processing')) return;

        claimBtn.classList.add('processing');
        claimBtn.innerHTML = `<span class="loading-dots"></span>`;

        setTimeout(() => {
            let bonusKeys = 0;
            let diamonds = 0;

            const keysNode = item.querySelector('.invite__keys');
            if (keysNode) {
                const m = (keysNode.textContent || '').match(/(\d+)/);
                if (m) bonusKeys = parseInt(m[1], 10) || 0;
            }

            const numNode = item.querySelector('.invite__num');
            if (numNode) {
                const txt = numNode.textContent || '';
                const match = txt.match(/💎\s*([\d,]+)/) || txt.match(/([\d,]+)\s*$/);
                if (match) diamonds = parseInt(match[1].replace(/,/g, ''), 10) || 0;
            }

            // ✅ 2. XATO TO'G'RILANDI: Topilganda faqat Totalga qo'shiladi! Used ga tegilmaydi!
            if (bonusKeys > 0) {
                setKeysTotal(getKeysTotal() + bonusKeys);
                setKeysUsed(getKeysUsed() + bonusKeys);

            }
            if (diamonds > 0) {
                setDiamond(getDiamond() + diamonds);
            }

            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();
            if (typeof updateHeaderDiamond === 'function') {
                try { updateHeaderDiamond(); } catch (e) { }
            }

            try {
                const particleCount = Math.min(12, Math.max(4, Math.round((diamonds || 0) / 5000) + (bonusKeys || 0)));
                animateRewardParticles(item, particleCount);
            } catch (e) { }

            const arrowDiv = item.querySelector('.invite-arrow');
            if (arrowDiv) {
                arrowDiv.innerHTML = `<span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon"><img src="/image/done.svg" alt=""></span>`;
            }

            markAsCompleted(item, href);
            item.style.display = 'none';

            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s);
                if (typeof saveUserState === 'function') saveUserState(s);
            }

            if (typeof showToast === 'function') showToast('Bonus claimed!');
        }, 2500);
    }

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

    if (document.readyState !== 'loading') {
        const mainContainer = document.querySelector('.earn-main');
        if (mainContainer) mainContainer.classList.add('tab_active_view');
    }


    // ... tepadagi boshqa kodlaringiz ...

    if (document.readyState !== 'loading') {
        const mainContainer = document.querySelector('.earn-main');
        if (mainContainer) mainContainer.classList.add('tab_active_view');
    }

    // 🔥 REKLAMA KO'RSATISH FUNKSIYASINI SHU YERGA (YOPILISHDAN OLDIN) QO'SHAMIZ
    window.showRewardedAd = function (btnElement) {
        if (typeof AdController === 'undefined' || !AdController) {
            alert("Reklama tizimi yuklanmoqda, biroz kuting...");
            return;
        }

        AdController.show().then((result) => {
            console.log("The ad has been viewed in full! Rewarding the user...");

            // 1. Tanga va kalitlarni qo'shish
            let currentDiamond = getDiamond();
            let currentTotalKeys = getKeysTotal();
            let currentUsedKeys = getKeysUsed();

            setDiamond(currentDiamond + 2000); // 2,000 olmos qo'shish
            setKeysTotal(currentTotalKeys + 2); // 2 ta kalit qo'shish
            setKeysUsed(currentUsedKeys + 2);

            // 2. Ekranda ko'rsatkichlarni yangilash
            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();
            if (typeof updateHeaderDiamond === 'function') {
                try { updateHeaderDiamond(); } catch (e) { }
            }

            // 3. Zarralar animatsiyasi (ixtiyoriy)
            try {
                animateRewardParticles(btnElement, 15);
            } catch (e) { }

            // 4. Ma'lumotlarni saqlash (refresh berganda o'chib ketmasligi uchun)
            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s);
                if (typeof saveUserState === 'function') saveUserState(s);
            }

            alert("Congratulations! You received 2,000 💎 and 2 keys!");

        }).catch((error) => {
            console.log("Ad not seen or error:", error);
            alert("To receive a reward, you must watch the ad to the end or the ad was not found. Please try again.");
        });
    };

    // TASK UCHUN EVENT LISTENER'LAR
    const taskElement = document.querySelector("adsgram-task[data-block-id='task-25934']");
    
    if (taskElement) {
        // 1. Vazifa bajarilganda ishlaydigan kod (Pul berish)
        taskElement.addEventListener("reward", (event) => {
            console.log(`Task muvaffaqiyatli bajarildi! ID: ${event.detail}`);

            let currentDiamond = getDiamond();
            let currentTotalKeys = getKeysTotal();
            let currentUsedKeys = getKeysUsed();

            // 30,000 tanga va 3 ta kalit qo'shish
            setDiamond(currentDiamond + 300); 
            setKeysTotal(currentTotalKeys + 2); 
            setKeysUsed(currentUsedKeys + 2);

            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();
            if (typeof updateHeaderDiamond === 'function') {
                try { updateHeaderDiamond(); } catch (e) { }
            }

            // Ma'lumotlarni serverga saqlash
            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s);
                if (typeof saveUserState === 'function') saveUserState(s);
            }

            // Animatsiya chiqarish (ixtiyoriy)
            try { animateRewardParticles(taskElement, 20); } catch (e) { }

            alert("Congratulations! You completed the task and received 300 💎 and 2 key!");
        });

        // 2. Agar reklamada xatolik bo'lsa
        taskElement.addEventListener("onError", (event) => {
            console.log(`Task xatosi: ${event.detail}`);
            // ✅ Xato bo'lsa, kulrang blokni yashirish:
            taskElement.style.display = 'none';
        });

        // 3. Agar vazifa topilmasa
        taskElement.addEventListener("onBannerNotFound", (event) => {
            console.log(`Task topilmadi: ${event.detail}`);
            // alert("This task does not exist yet."); // Istasangiz yoqib qo'yishingiz mumkin
            // ✅ Reklama yo'q bo'lsa, kulrang blokni yashirish:
            taskElement.style.display = 'none';
        });
    }

})(); // <-- EARN.JS FAYLINING ENG OXIRGI QATORI SHU BO'LISHI SHART
