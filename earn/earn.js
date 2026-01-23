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
}

// Kalitni ishlatish funksiyasi
function useKeys(amount) {
    amount = Number(amount) || 0;
    if (amount <= 0) return false;
    if (usedKeys >= amount) {
        usedKeys -= amount;
        saveKeysToStorage();
        updateKeyDisplay();
        return true;
    } else {
        alert("Kalitlar yetarli emas!");
        return false;
    }
}

// Test uchun: Sahifa yuklanganda 10 ta kalit qo'shish
// addKeys(10);

// --- NEW: invite-item click -> open link, verify membership, award bonus ---
document.addEventListener('click', async function (ev) {
    const item = ev.target.closest('.invite-item.bton');
    if (!item) return;

    // Agar foydalanuvchi aynan yangi paydo bo'lgan "Claim" tugmasini bossa
    if (ev.target.classList.contains('claim-inline-btn')) {
        const href = item.querySelector('a').getAttribute('href');
        awardBonusAndCloseInline(item, href);
        return;
    }

    const anchor = item.querySelector('a[href]');
    if (!anchor) return;

    ev.preventDefault();
    const href = anchor.getAttribute('href');

    // 1. Linkni ochish
    window.open(href, '_blank');

    // 2. invite-arrow ichini tozalab, "Claim" tugmasini joylash
    const arrowDiv = item.querySelector('.invite-arrow');
    if (arrowDiv) {
        arrowDiv.innerHTML = `<button class="claim-inline-btn">Claim</button>`;
    }
});

// Bonus berish funksiyasi (2 soniyalik kutish bilan)
function awardBonusAndCloseInline(item, href) {
    const claimBtn = item.querySelector('.claim-inline-btn');
    const arrowDiv = item.querySelector('.invite-arrow');
    
    if (claimBtn) {
        claimBtn.classList.add('processing');
        claimBtn.innerHTML = `<span class="loading-dots"></span>`;
    }

    setTimeout(() => {
        let bonusKeys = 0;
        const keysNode = item.querySelector('.invite__keys');
        if (keysNode) {
            const m = keysNode.textContent.match(/(\d+)/);
            if (m) bonusKeys = parseInt(m[1], 10) || 0;
        }

        if (bonusKeys > 0) addKeys(bonusKeys);

        // --- MUHIM O'ZGARIŞ: Strelkani qaytarish ---
        if (arrowDiv) {
            arrowDiv.innerHTML = `
                <span data-v-df5a9ee0="" aria-hidden="true" class="scoped-svg-icon">
                    <img src="/image/arrow.svg" alt="">
                </span>`;
        }

        markAsCompleted(item, href);
        
        // Elementni darhol yashiramiz (Active ro'yxatidan yo'qolishi uchun)
        item.style.display = 'none';
        
        showToast('Bonus claimed!');
    }, 2500); 
}



function markAsCompleted(item, href) {
    if (!item) return;

    // 1. Klass qo'shish
    item.classList.add('is-completed');

    // 2. Linkni (silkkani) topamiz va uni butunlay o'chiramiz
    const a = item.querySelector('a');
    if (a) {
        a.removeAttribute('href'); // Silkkani o'chirish
        a.style.cursor = 'default'; // Kursorni o'zgartirish
        a.style.pointerEvents = 'none'; // Bosishni butunlay taqiqlash
        
        // Agar bosilsa ham hech narsa qilmasligi uchun:
        a.onclick = function(e) {
            e.preventDefault();
            return false;
        };
    }

    // 3. LocalStorage-ga saqlash
    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    const claimKey = `proguzmir_claimed_${encodeURIComponent(href)}_${wallet}`;
    localStorage.setItem(claimKey, Date.now().toString());
}


// --- INIT: move already-claimed invite items to inactive on load ---
(function initClaimedInviteItems() {
    const wallet = (localStorage.getItem('proguzmir_wallet') || 'guest').toString();
    document.querySelectorAll('.invite-item.bton').forEach(it => {
        const anchor = it.querySelector('a[href]');
        const href = anchor ? anchor.getAttribute('href') : null;
        if (!href) return;

        const claimKey = `proguzmir_claimed_${encodeURIComponent(href)}_${wallet}`;
        if (localStorage.getItem(claimKey)) {
            it.classList.add('is-completed'); // Shunchaki klass qo'shdik
        }
    });
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
        console.log("Hozir Active vazifalar ko'rinmoqda");
    } else {
        mainContainer.classList.add('tab_inactive_view');
        mainContainer.classList.remove('tab_active_view');
        console.log("Hozir Inactive (bajarilgan) vazifalar ko'rinmoqda");
    }
});

// Sahifa yuklanganda birinchi marta holatni sozlash
window.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.querySelector('.earn-main');
    if (mainContainer) {
        mainContainer.classList.add('tab_active_view');
    }
});

// Sahifa yuklanganda default holat: Active
document.querySelector('.earn-main').classList.add('tab_active_view');

// initialize persisted keys when script loads / DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadKeysFromStorage);
} else {
    loadKeysFromStorage();
}
