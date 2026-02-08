// earn/earn.js

// --- Keys management ---
// helper to get per-wallet storage key
function keysStorageKey(base) {
    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    return `${base}_${wallet}`;
}

// load keys for current wallet and update UI
function loadKeysFromStorage() {
    try {
        totalKeys = parseInt(localStorage.getItem(keysStorageKey(KEY_KEYS_TOTAL)) || '0', 10) || 0;
        usedKeys = parseInt(localStorage.getItem(keysStorageKey(KEY_KEYS_USED)) || '0', 10) || 0;
    } catch (e) {
        totalKeys = 0; usedKeys = 0;
    }
    updateKeyDisplay();
}

// persist current keys for current wallet
function saveKeysToStorage() {
    try {
        localStorage.setItem(keysStorageKey(KEY_KEYS_TOTAL), String(totalKeys));
        localStorage.setItem(keysStorageKey(KEY_KEYS_USED), String(usedKeys));
    } catch (e) { console.warn('saveKeysToStorage failed', e); }
}

// Ekrandagi raqamlarni yangilash funksiyasi
function updateKeyDisplay() {
    const totalEl = document.getElementById('totalKeys');
    const usedEl = document.getElementById('usedKeys');
    if (totalEl) totalEl.innerText = String(totalKeys);
    if (usedEl) usedEl.innerText = String(usedKeys);
}

// Kalit qo'shish funksiyasi (masalan, vazifa bajarganda)
function addKeys(amount) {
    amount = Number(amount) || 0;
    if (amount <= 0) return;
    totalKeys += amount;
    usedKeys += amount;
    saveKeysToStorage();
    updateKeyDisplay();
    // YANGI: sync to Supabase
    try { syncKeysToSupabase(); } catch (e) { console.warn('syncKeysToSupabase failed', e); }
}

// Kalitni ishlatish funksiyasi
function useKeys(amount) {
    amount = Number(amount) || 0;
    if (amount <= 0) return false;
    if (usedKeys >= amount) {
        usedKeys -= amount;
        saveKeysToStorage();
        updateKeyDisplay();
        // YANGI: sync to Supabase
        try { syncKeysToSupabase(); } catch (e) { console.warn('syncKeysToSupabase failed', e); }
        return true;
    } else {
        alert("Not enough keys!");
        return false;
    }
}

// YANGI: sync keys to Supabase
function syncKeysToSupabase() {
    if (!window.Telegram?.WebApp?.initData) return;
    const wallet = localStorage.getItem('proguzmir_wallet') || 'guest';
    const payload = {
        initData: Telegram.WebApp.initData,
        keys: {
            keysTotal: totalKeys,
            keysUsed: usedKeys
        }
    };
    try {
        fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(e => console.warn('syncKeysToSupabase fetch failed', e));
    } catch (e) { console.warn('syncKeysToSupabase error', e); }
}

// --- NEW: Function to update the Daily Login task's UI in Earn page ---
// This function needs access to global data related to daily claims, usually provided by index.js/render/daily.js
function updateDailyLoginTaskIcon() {
    const dailyLoginArrow = document.getElementById('dailyLoginArrow');
    const dailyLoginItem = document.getElementById('dailyLoginTask');

    // Check if elements and necessary global functions are available
    // These functions (getDailyData, getDailyIndexForToday, makeUserKey) are expected to be in global scope from index.js/render/daily.js
    if (!dailyLoginArrow || !dailyLoginItem || typeof getDailyData === 'undefined' || typeof getDailyIndexForToday === 'undefined' || typeof makeUserKey === 'undefined') {
        console.warn("Daily login UI update skipped: missing elements or global functions.");
        return;
    }

    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    const { weekStartISO, claims } = getDailyData(wallet);
    const todayIndex = getDailyIndexForToday(weekStartISO);

    // Determine if today's daily reward is claimed
    const isDailyClaimed = (todayIndex !== null && claims[todayIndex]);

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
}

// Expose the function globally for render/daily.js to call
window.updateDailyLoginTaskIcon = updateDailyLoginTaskIcon;


// --- O'ZGARTIRILGAN: invite-item click -> open link, set pending + show Claim button ---
document.addEventListener('click', async function (ev) {
    const item = ev.target.closest('.invite-item.bton');
    if (!item) return;

    // Skip the daily login item for this generic click handler, as its interaction is handled separately
    if (item.id === 'dailyLoginTask') return;

    // 1. Agar foydalanuchi "Claim" tugmasini bossa
    if (ev.target.classList.contains('claim-inline-btn')) {
        // guard: ignore if already processing
        if (ev.target.classList.contains('processing')) return;
        const anchor = item.querySelector('a');
        const href = anchor ? anchor.getAttribute('data-href') || anchor.getAttribute('href') : '';
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
        console.error("Error opening link:", e);
        window.open(href, '_blank');
    }

    // Show Claim button
    const arrowDiv = item.querySelector('.invite-arrow');
    if (arrowDiv) {
        // Linkni keyinroq ishlatish uchun 'data-href' sifatida saqlab qo'yamiz
        anchor.setAttribute('data-href', href);
        arrowDiv.innerHTML = `<button class="claim-inline-btn">Claim</button>`;
    }
});

function awardBonusAndCloseInline(item, href) {
    const claimBtn = item.querySelector('.claim-inline-btn');
    if (!claimBtn) return; // guard

    // prevent double-click / double execution
    if (claimBtn.classList.contains('processing')) return;

    const arrowDiv = item.querySelector('.invite-arrow');

    if (claimBtn) {
        claimBtn.classList.add('processing');
        claimBtn.innerHTML = `<span class="loading-dots"></span>`;
    }

    setTimeout(() => {
        // parse key bonus
        let bonusKeys = 0;
        const keysNode = item.querySelector('.invite__keys');
        if (keysNode) {
            const m = (keysNode.textContent || '').match(/(\d+)/);
            if (m) bonusKeys = parseInt(m[1], 10) || 0;
        }
        if (bonusKeys > 0) addKeys(bonusKeys);

        // parse diamond amount from invite__num (looks like "💎 20,000")
        let diamonds = 0;
        const numNode = item.querySelector('.invite__num');
        if (numNode) {
            const txt = numNode.textContent || '';
            const match = txt.match(/💎\s*([\d,]+)/) || txt.match(/([\d,]+)\s*$/);
            if (match) {
                diamonds = parseInt(match[1].replace(/,/g, ''), 10) || 0;
            }
        }

        // award diamonds
        if (diamonds > 0) {
            try {
                const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
                const keyDiamond = (typeof makeUserKey === 'function') ? makeUserKey(KEY_DIAMOND, wallet) : `proguzmir_diamond_${wallet}`;
                const cur = parseInt(localStorage.getItem(keyDiamond) || '0', 10) || 0;
                const updated = cur + diamonds;
                localStorage.setItem(keyDiamond, String(updated));
                document.querySelectorAll('[data-diamond-display]').forEach(el => el.textContent = String(updated));
                const top = document.getElementById('diamondTop');
                if (top) top.textContent = '💎 ' + String(updated);
                if (typeof updateHeaderDiamond === 'function') try { updateHeaderDiamond(); } catch (e) { /* ignore */ }
            } catch (e) { console.warn('award diamonds failed', e); }
        }

        // animate particles
        try {
            const particleCount = Math.min(12, Math.max(4, Math.round((diamonds || 0) / 5000) + (bonusKeys || 0)));
            animateRewardParticles(item, particleCount);
        } catch (e) { console.warn('particle animation failed', e); }

        // restore arrow icon
        if (arrowDiv) {
            arrowDiv.innerHTML = `
                <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                    <img src="/image/done.svg" alt="">
                </span>`;
        }

        // mark completed & hide
        try { markAsCompleted(item, href); } catch (e) { item.classList.add('is-completed'); }
        item.style.display = 'none';

        showToast('Bonus claimed!');
    }, 2500);
}

// animate floating reward particles from item position upward
function animateRewardParticles(item, count) {
    if (!item || !count) return;
    const rect = item.getBoundingClientRect();
    const startX = rect.right - 40; // near arrow
    const startY = rect.top + rect.height / 2;
    for (let i = 0; i < count; i++) {
        (function (idx) {
            const img = document.createElement('img');
            // alternate coin/key or randomize
            img.src = (idx % 2 === 0) ? '/image/diamond.png' : '/image/key.png';
            const size = Math.floor(12 + Math.random() * 30); // 12..42px
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

            // force layout then animate
            requestAnimationFrame(() => {
                const dy = 120 + Math.random() * 180; // upward distance
                const dx = (Math.random() * 80 - 40); // horizontal drift
                const rot = Math.random() * 360;
                img.style.transform = `translate(${dx}px, -${dy}px) rotate(${rot}deg) scale(${0.6 + Math.random()})`;
                img.style.opacity = '0';
            });

            // cleanup
            setTimeout(() => {
                if (img.parentElement) img.parentElement.removeChild(img);
            }, 1700 + Math.random() * 800);
        })(i);
    }
}

function markAsCompleted(item, href) {
    if (!item) return;

    // 1. Klass qo'shish
    item.classList.add('is-completed');

    // 2. Linkni (silkkani) topamiz va uni butunlay o'chiramiz
    const a = item.querySelector('a');
    if (a) {
        // Store the original href in a data attribute before removing the href, if it exists
        const originalHref = a.getAttribute('href');
        if (originalHref) {
            a.setAttribute('data-original-href', originalHref);
        }
        a.removeAttribute('href'); // Silkkani o'chirish
        a.style.cursor = 'default'; // Kursorni o'zgartirish
        a.style.pointerEvents = 'none'; // Bosishni butunlay taqiqlash

        // Agar bosilsa ham hech narsa qilmasligi uchun:
        a.onclick = function (e) {
            e.preventDefault();
            return false;
        };
        
    }
    
    // 3. LocalStorage-ga saqlash
    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    const claimKey = `proguzmir_claimed_${encodeURIComponent(href)}_${wallet}`;
    localStorage.setItem(claimKey, Date.now().toString());
}


// --- O'ZGARTIRILGAN: Initialize all invite items on load, including the Daily Login task ---
(function initAllInviteItemsState() {
    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    
    // Handle generic tasks
    // Exclude dailyLoginTask as it has its own specific update logic
    document.querySelectorAll('.invite-item.bton:not(#dailyLoginTask)').forEach(it => {
        const anchor = it.querySelector('a[href]');
        const href = anchor ? anchor.getAttribute('href') : null;
        if (!href) return;

        const claimKey = `proguzmir_claimed_${encodeURIComponent(href)}_${wallet}`;
        if (localStorage.getItem(claimKey)) {
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

    // Handle the specific Daily Login task separately
    updateDailyLoginTaskIcon();

})();

// Tablarni boshqarish funksiyasi
document.addEventListener('click', function (e) {
    const tab = e.target.closest('.tab_item');
    if (!tab) return;

    const tabs = document.querySelectorAll('.tab_item');
    tabs.forEach(item => item.classList.remove('checked'));
    tab.classList.add('checked');

    const target = tab.getAttribute('data-target');
    const mainContainer = document.querySelector('.earn-main');

    if (target === 'active') {
        mainContainer.classList.add('tab_active_view');
        mainContainer.classList.remove('tab_inactive_view');
        console.log("Showing active tasks");
    } else {
        mainContainer.classList.add('tab_inactive_view');
        mainContainer.classList.remove('tab_active_view');
        console.log("Showing inactive (completed) tasks");
    }
});

// Sahifa yuklanganda birinchi marta holatni sozlash
window.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.earn-main');
    if (mainContainer) {
        mainContainer.classList.add('tab_active_view');
    }
    // Call initAllInviteItemsState here to ensure all task states are set after DOM is ready
    initAllInviteItemsState(); 
});

// Sahifa yuklanganda default holat: Active
// This line might be redundant if DOMContentLoaded handles it, but good to keep it for robustness.
if (document.readyState !== 'loading') {
    const mainContainer = document.querySelector('.earn-main');
    if (mainContainer) {
        mainContainer.classList.add('tab_active_view');
    }
}

// initialize persisted keys when script loads / DOM ready
// This is already being called in DOMContentLoaded in earn.js, so remove the redundant call in index.js.
// Keeping this part here for consistency with original file, but logic merged above.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadKeysFromStorage);
} else {
    loadKeysFromStorage();
}
