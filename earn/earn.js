// ==========================================
// EARN.JS - TO'LIQ FUNKSIYALIK VA XAVFSIZ VERSIYA
// ==========================================

(function () {
    // Takroriy yuklanishning oldini olish
    if (window._earnScriptLoaded) return;
    window._earnScriptLoaded = true;

    const BASE_WEI = 1000n;

    // --- GLOBAL STATE BILAN ISHLASH UCHUN GETTER/SETTER'LAR ---
    function getGlobalState() {
        return (typeof state !== 'undefined') ? state : null;
    }

    function getDiamond() { const s = getGlobalState(); return s ? (s.diamond || 0) : 0; }
    function setDiamond(v) { const s = getGlobalState(); if (s) s.diamond = v; }
    
    function getKeysTotal() { const s = getGlobalState(); return s ? (s.keysTotal || 0) : 0; }
    function setKeysTotal(v) { const s = getGlobalState(); if (s) s.keysTotal = v; }
    
    function getKeysUsed() { const s = getGlobalState(); return s ? (s.keysUsed || 0) : 0; }
    function setKeysUsed(v) { const s = getGlobalState(); if (s) s.keysUsed = v; }

    function getPRCWei() { const s = getGlobalState(); return (s && s.prcWei) ? BigInt(s.prcWei) : 0n; }
    function setPRCWei(v) { const s = getGlobalState(); if (s) s.prcWei = v; }

    // ==========================================
    // UI YANGILASH FUNKSIYALARI
    // ==========================================
    
    // Ekrandagi Kalit raqamlarini yangilash
    function updateKeyDisplay() {
        const totalEl = document.getElementById('totalKeys');
        const usedEl = document.getElementById('usedKeys');
        if (totalEl) totalEl.innerText = String(getKeysTotal());
        if (usedEl) usedEl.innerText = String(getKeysUsed());
    }

    // Daily Login vazifasini UI da belgilash
    window.updateDailyLoginTaskIcon = function() {
        const dailyLoginArrow = document.getElementById('dailyLoginArrow');
        const dailyLoginItem = document.getElementById('dailyLoginTask');
        const s = getGlobalState();

        if (!dailyLoginArrow || !dailyLoginItem || !s) return;

        const claims = s.dailyClaims || [false, false, false, false, false, false, false];
        const todayIndex = s.todayIndex || 0;
        const isDailyClaimed = claims[todayIndex];

        if (isDailyClaimed) {
            dailyLoginItem.classList.add('is-completed');
            dailyLoginArrow.innerHTML = `
                <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                    <img src="/image/done.svg" alt="">
                </span>`;
        } else {
            dailyLoginItem.classList.remove('is-completed');
            dailyLoginArrow.innerHTML = `
                <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                    <img src="/image/arrow.svg" alt="">
                </span>`;
        }
    };

    // Sahifa yuklanganda vazifalar holatini o'qish (Bajarilganlarni Inactive ga o'tkazish uchun)
    function initAllInviteItemsState() {
        const s = getGlobalState();
        if (!s) return;
        
        // Supabase'dan kelgan completedTasks yozuvini olamiz (yoki bo'sh ob'ekt)
        const completed = s.completedTasks || {};

        document.querySelectorAll('.invite-item.bton:not(#dailyLoginTask)').forEach(it => {
            const anchor = it.querySelector('a');
            if (!anchor) return;
            
            // Linkni ID sifatida ishlatamiz
            const href = anchor.getAttribute('href') || anchor.getAttribute('data-original-href') || anchor.getAttribute('data-href');
            if (!href) return;

            // Agar shu vazifa bajarilgan bo'lsa
            if (completed[href]) {
                it.classList.add('is-completed');
                const arrowDiv = it.querySelector('.invite-arrow');
                if (arrowDiv && !arrowDiv.querySelector('img[src*="done.svg"]')) {
                    arrowDiv.innerHTML = `
                        <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                            <img src="/image/done.svg" alt="">
                        </span>`;
                }
            }
        });
        
        // Daily ni ham darhol tekshirish
        window.updateDailyLoginTaskIcon();
    }

    // Sahifa render qilingach ma'lumotlarni o'qiymiz
    setTimeout(() => {
        updateKeyDisplay();
        initAllInviteItemsState();
    }, 300);

    // ==========================================
    // VAZIFALAR VA TUGMALARNI BOSHQARISH
    // ==========================================

    document.addEventListener('click', async function (ev) {
        // --- 1. TABLARNI ALMASHTIRISH (Active / Inactive) ---
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

        // --- 2. VAZIFAGA BOSISh ---
        const item = ev.target.closest('.invite-item.bton');
        if (!item || item.id === 'dailyLoginTask') return;

        // A. CLAIM tugmasi bosilsa
        if (ev.target.classList.contains('claim-inline-btn')) {
            if (ev.target.classList.contains('processing')) return;
            
            const anchor = item.querySelector('a');
            const href = anchor ? (anchor.getAttribute('data-href') || anchor.getAttribute('data-original-href') || anchor.getAttribute('href')) : '';
            awardBonusAndCloseInline(item, href);
            return;
        }

        // B. Birinchi marta (Havolani) bosganda
        const anchor = item.querySelector('a[href]');
        if (!anchor) return;

        ev.preventDefault();
        const href = anchor.getAttribute('href');

        // Linkni ochish
        try {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.openLink(href);
            } else {
                window.open(href, '_blank');
            }
        } catch (e) {
            window.open(href, '_blank');
        }

        // Claim tugmasini ko'rsatish
        const arrowDiv = item.querySelector('.invite-arrow');
        if (arrowDiv) {
            anchor.setAttribute('data-href', href); 
            arrowDiv.innerHTML = `<button class="claim-inline-btn">Claim</button>`;
        }
    });

    // ==========================================
    // MUKOFOT BERISH VA ANIMATSIYA
    // ==========================================

    function awardBonusAndCloseInline(item, href) {
        const claimBtn = item.querySelector('.claim-inline-btn');
        if (!claimBtn || claimBtn.classList.contains('processing')) return;

        claimBtn.classList.add('processing');
        claimBtn.innerHTML = `<span class="loading-dots"></span>`;

        // 2.5 soniya kutish (Tekshirish jarayoni imitatsiyasi)
        setTimeout(() => {
            // 1. Kalitlarni hisoblash
            let bonusKeys = 0;
            const keysNode = item.querySelector('.invite__keys');
            if (keysNode) {
                const m = (keysNode.textContent || '').match(/(\d+)/);
                if (m) bonusKeys = parseInt(m[1], 10) || 0;
            }

            // 2. Olmoslarni hisoblash
            let diamonds = 0;
            const numNode = item.querySelector('.invite__num');
            if (numNode) {
                const txt = numNode.textContent || '';
                const match = txt.match(/💎\s*([\d,]+)/) || txt.match(/([\d,]+)\s*$/);
                if (match) diamonds = parseInt(match[1].replace(/,/g, ''), 10) || 0;
            }

            // 3. MUKOFOTNI GLOBAL STATE'GA QO'SHISH (Asosiy o'zgarish shu yerda)
            if (bonusKeys > 0) {
                setKeysTotal(getKeysTotal() + bonusKeys);
                setKeysUsed(getKeysUsed() + bonusKeys);
            }
            if (diamonds > 0) {
                setDiamond(getDiamond() + diamonds);
            }

            // 4. UI ni darhol yangilash
            updateKeyDisplay();
            const top = document.getElementById('diamondTop');
            if (top) top.textContent = '💎 ' + getDiamond();
            
            // Asosiy sahifadagi diamondni ham yangilash (Agar funksiya bor bo'lsa)
            if (typeof updateHeaderDiamond === 'function') {
                try { updateHeaderDiamond(); } catch (e) {}
            }

            // 5. Zarralar animatsiyasini chaqirish (Siz xohlagan funksiya)
            try {
                const particleCount = Math.min(12, Math.max(4, Math.round((diamonds || 0) / 5000) + (bonusKeys || 0)));
                animateRewardParticles(item, particleCount);
            } catch (e) {}

            // 6. Tugmani Done ga almashtirish
            const arrowDiv = item.querySelector('.invite-arrow');
            if (arrowDiv) {
                arrowDiv.innerHTML = `
                    <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                        <img src="/image/done.svg" alt="">
                    </span>`;
            }

            // 7. Vazifani yopish va bajarilgan deb belgilash
            markAsCompleted(item, href);
            item.style.display = 'none';

            // 💾 8. SERVERGA SAQLASH (Eng muhimi!)
            const s = getGlobalState();
            if (s && typeof saveState === 'function') {
                saveState(s); 
                if (typeof saveUserState === 'function') saveUserState(s);
            }

            if (typeof showToast === 'function') showToast('Bonus claimed!');
        }, 2500);
    }

    // --- SIZNING ZARRALAR ANIMATSIYASINGIZ (O'ZGARISHSZ) ---
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

    // --- SIZNING VAZIFANI BAJARILGAN DEB BELGILASHINGIZ ---
    function markAsCompleted(item, href) {
        if (!item) return;
        
        item.classList.add('is-completed');
        
        const a = item.querySelector('a');
        if (a) {
            const originalHref = a.getAttribute('href');
            if (originalHref) {
                a.setAttribute('data-original-href', originalHref);
            }
            a.removeAttribute('href'); 
            a.style.cursor = 'default'; 
            a.style.pointerEvents = 'none'; 
            a.onclick = function (e) {
                e.preventDefault();
                return false;
            };
        }

        // Bajarilgan vazifalarni serverga ketadigan state ga yozamiz
        const s = getGlobalState();
        if (s && href) {
            if (!s.completedTasks) s.completedTasks = {};
            s.completedTasks[href] = true;
        }
    }

    // Sahifa yuklanganda default holat: Active
    if (document.readyState !== 'loading') {
        const mainContainer = document.querySelector('.earn-main');
        if (mainContainer) mainContainer.classList.add('tab_active_view');
    }
})();
