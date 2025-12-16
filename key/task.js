import { renderDaily } from './render/daily.js';
import { renderKey } from './render/key.js';
import { renderGame } from './render/game.js';
import { renderShop } from './render/shop.js';

// --- Global constants and helpers for all modules (attach to window) ---
window.DECIMALS = 18n;
window.UNIT = 10n ** window.DECIMALS;
window.BASE_WEI = 1000n;
window.DIAMOND_TO_WEI = 1n;
window.RANKS = ["bronze", "silver", "gold", "smart gold", "platinium", "master"];
window.KEY_PRC = "proguzmir_prc_wei";
window.KEY_DIAMOND = "proguzmir_diamond";
window.KEY_WALLET = "proguzmir_wallet";
window.KEY_TAPS_USED = "proguzmir_taps_used";
window.KEY_TAP_CAP = "proguzmir_tap_cap";
window.KEY_SELECTED_SKIN = "proguzmir_selected_skin";
window.KEY_ENERGY = "proguzmir_energy";
window.KEY_MAX_ENERGY = "proguzmir_max_energy";
window.DEFAULT_MAX_ENERGY = 1000;
window.DEFAULT_TAP_CAP = 1000;
window.INCREASE_BLOCK = 1000;
window.SKIN_COST_WEI = 500000000000000n;
window.SKINS = [
    { id: "bronza.png", name: "Bronza", file: "./image/bronza.png" },
    { id: "silver.png", name: "Silver", file: "./image/silver.png" },
    { id: "gold.png", name: "Gold", file: "./image/gold.png" },
    { id: "smart_gold.png", name: "Smart Gold", file: "./image/smart_gold.png" },
    { id: "platinium.png", name: "Platinium", file: "./image/platinium.png" },
    { id: "master.png", name: "Master", file: "./image/master.png" }
];
window.DAILY_REWARDS = [1, 1, 1, 1, 1, 1, 5];

// --- Navigation functions (exposed globally for use in modules) ---
window.openGame = function () {
    showNav();
    renderGame();
};
window.openShop = function () {
    hideNav();
    renderShop();
};
window.openDaily = function () {
    hideNav();
    renderDaily();
};
window.openKey = function () {
    hideNav();
    renderKey();
};

// --- Minimal helpers for nav (exposed globally) ---
window.hideNav = function () {
    const nav = document.querySelector('.nav');
    if (nav) nav.style.display = 'none';
};
window.showNav = function () {
    const nav = document.querySelector('.nav');
    if (nav) nav.style.display = '';
};

// --- Storage helpers (exposed globally) ---
window.makeUserKey = function (baseKey, wallet) {
    return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
};
window.loadState = function () {
    let wallet = localStorage.getItem(window.KEY_WALLET) || "";
    try {
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (tgId) {
            wallet = 'tg_' + String(tgId);
            localStorage.setItem(window.KEY_WALLET, wallet);
        }
    } catch (e) { }
    const keyPRC = window.makeUserKey(window.KEY_PRC, wallet);
    const keyDiamond = window.makeUserKey(window.KEY_DIAMOND, wallet);
    const keyTaps = window.makeUserKey(window.KEY_TAPS_USED, wallet);
    const keyCap = window.makeUserKey(window.KEY_TAP_CAP, wallet);
    const keySkin = window.makeUserKey(window.KEY_SELECTED_SKIN, wallet);
    const keyEnergy = window.makeUserKey(window.KEY_ENERGY, wallet);
    const keyMaxEnergy = window.makeUserKey(window.KEY_MAX_ENERGY, wallet);

    const prc = localStorage.getItem(keyPRC) || "0";
    const diamond = parseInt(localStorage.getItem(keyDiamond) || "0", 10);
    const tapsUsed = parseInt(localStorage.getItem(keyTaps) || "0", 10);
    const tapCap = parseInt(localStorage.getItem(keyCap) || String(window.DEFAULT_TAP_CAP), 10);
    const selectedSkin = localStorage.getItem(keySkin) || "";
    const maxEnergy = parseInt(localStorage.getItem(keyMaxEnergy) || String(window.DEFAULT_MAX_ENERGY), 10);
    let energy = parseInt(localStorage.getItem(keyEnergy) || String(maxEnergy), 10);
    if (Number.isNaN(energy)) energy = maxEnergy;
    if (energy > maxEnergy) energy = maxEnergy;
    return { prcWei: BigInt(prc), diamond, wallet, tapsUsed, tapCap, selectedSkin, energy, maxEnergy };
};
window.getTotalPRCWei = function (state) {
    return state.prcWei + BigInt(state.diamond) * window.DIAMOND_TO_WEI;
};
window.chargeCost = function (state, costWei) {
    const total = window.getTotalPRCWei(state);
    if (total < costWei) return false;
    if (state.prcWei >= costWei) {
        state.prcWei -= costWei;
        window.saveState(state);
        return true;
    }
    let remaining = costWei - state.prcWei;
    state.prcWei = 0n;
    const diamondsNeeded = Number((remaining + window.DIAMOND_TO_WEI - 1n) / window.DIAMOND_TO_WEI);
    state.diamond = Math.max(0, state.diamond - diamondsNeeded);
    const paidByDiamondsWei = BigInt(diamondsNeeded) * window.DIAMOND_TO_WEI;
    const overpay = paidByDiamondsWei - remaining;
    if (overpay > 0n) state.prcWei += overpay;
    window.saveState(state);
    return true;
};
window.saveState = function (state) {
    const wallet = state.wallet || localStorage.getItem(window.KEY_WALLET) || "";
    const keyPRC = window.makeUserKey(window.KEY_PRC, wallet);
    const keyDiamond = window.makeUserKey(window.KEY_DIAMOND, wallet);
    const keyTaps = window.makeUserKey(window.KEY_TAPS_USED, wallet);
    const keyCap = window.makeUserKey(window.KEY_TAP_CAP, wallet);
    const keySkin = window.makeUserKey(window.KEY_SELECTED_SKIN, wallet);
    const keyEnergy = window.makeUserKey(window.KEY_ENERGY, wallet);
    const keyMaxEnergy = window.makeUserKey(window.KEY_MAX_ENERGY, wallet);

    if (!state.wallet && wallet) state.wallet = wallet;
    localStorage.setItem(keyPRC, state.prcWei.toString());
    localStorage.setItem(keyDiamond, String(state.diamond));
    localStorage.setItem(keyTaps, String(state.tapsUsed));
    localStorage.setItem(keyCap, String(state.tapCap));
    const maxE = (typeof state.maxEnergy === 'number' && !Number.isNaN(state.maxEnergy)) ? state.maxEnergy : window.DEFAULT_MAX_ENERGY;
    const en = (typeof state.energy === 'number' && !Number.isNaN(state.energy)) ? Math.min(state.energy, maxE) : maxE;
    localStorage.setItem(keyEnergy, String(en));
    localStorage.setItem(keyMaxEnergy, String(maxE));
    if (state.selectedSkin)
        localStorage.setItem(keySkin, state.selectedSkin);
    else localStorage.removeItem(keySkin);
    if (state.wallet)
        localStorage.setItem(window.KEY_WALLET, state.wallet);
    const total = window.getTotalPRCWei(state);
    const header = document.getElementById('headerBalance');
    if (header) header.innerHTML = '<img src="./image/coin.png" alt="logo" style="width:25px; margin-right: 10px; vertical-align:middle;"> ' + window.fmtPRC(total);
    const energyEl = document.getElementById('tapsCount');
    if (energyEl && typeof state.energy !== 'undefined') energyEl.textContent = `${state.energy} / ${state.maxEnergy}`;
};
window.fmtPRC = function (wei) {
    const negative = wei < 0n;
    if (negative) wei = -wei;
    const whole = (wei / window.UNIT).toString();
    let frac = (wei % window.UNIT).toString().padStart(Number(window.DECIMALS), '0');
    let lastNonZero = -1;
    for (let i = frac.length - 1; i >= 0; i--) {
        if (frac[i] !== '0') { lastNonZero = i; break; }
    }
    if (lastNonZero === -1) {
        return (negative ? '-' : '') + whole + '.0 PRC';
    }
    frac = frac.slice(0, lastNonZero + 1);
    const compressedFrac = frac.replace(/(.)\1{2,}/g, (match) => match[0] + '{' + match.length + '}');
    return (negative ? '-' : '') + whole + '.' + compressedFrac + ' PRC';
};
window.getRankFromWei = function (wei) {
    if (wei < window.BASE_WEI) return "bronze";
    for (let i = 1; i < window.RANKS.length; i++) {
        const thr = window.BASE_WEI * (3n ** BigInt(i - 1));
        if (wei < thr * 3n) return window.RANKS[i];
    }
    return "master";
};
window.rankImage = function (rank) {
    const map = {
        "bronze": "./image/bronza.png",
        "silver": "./image/silver.png",
        "gold": "./image/gold.png",
        "smart gold": "./image/smart_gold.png",
        "platinium": "./image/platinium.png",
        "master": "./image/master.png"
    };
    return map[rank] || "./image/logo.png";
};

// --- Daily helpers (exposed globally) ---
window.getDailyData = function (wallet) {
    const ws = localStorage.getItem(window.makeUserKey("proguzmir_daily_week_start", wallet)) || null;
    const clRaw = localStorage.getItem(window.makeUserKey("proguzmir_daily_claims", wallet)) || null;
    let claims = null;
    try { claims = clRaw ? JSON.parse(clRaw) : null; } catch (e) { claims = null; }
    if (!claims || !Array.isArray(claims) || claims.length !== 7) {
        claims = [false, false, false, false, false, false, false];
    }
    return { weekStartISO: ws, claims };
};
window.setDailyData = function (wallet, weekStartISO, claims) {
    localStorage.setItem(window.makeUserKey("proguzmir_daily_week_start", wallet), weekStartISO || "");
    localStorage.setItem(window.makeUserKey("proguzmir_daily_claims", wallet), JSON.stringify(claims));
};
window.getDailyIndexForToday = function (weekStartISO) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!weekStartISO) return 0;
    const ws = new Date(weekStartISO);
    ws.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - ws) / 86400000);
    if (diffDays < 0 || diffDays > 6) return null;
    return diffDays;
};

// Loading helpers: controlled animation loop (blur <-> sharp) until content ready.
(function () {
    let animInterval = null;
    let overlay = null;
    let img = null;
    let text = null;

    function startLoader() {
        overlay = overlay || document.getElementById('loadingOverlay');
        img = img || document.getElementById('loadingImg');
        text = text || document.getElementById('loadingText');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        // default: show image; if it errors we'll switch to text
        if (img) {
            img.style.display = '';
            text.style.display = 'none';
            img.classList.remove('sharp');
            // try to apply sharp/blurry loop
            let on = false;
            if (animInterval) clearInterval(animInterval);
            animInterval = setInterval(() => {
                if (!img) return;
                if (on) img.classList.add('sharp');
                else img.classList.remove('sharp');
                on = !on;
            }, 700);
        } else {
            // fallback: show text only
            if (text) { text.style.display = ''; }
        }
        // listen for image load/error: if error -> show text instead
        if (img) {
            img.addEventListener('error', onImgError);
            img.addEventListener('load', onImgLoad);
            // if image already loaded but failed to render (naturalWidth==0), treat as error
            if (img.complete && img.naturalWidth === 0) onImgError();
        }
    }
    function onImgError() {
        if (!img || !overlay) return;
        // hide image, show text
        img.style.display = 'none';
        const txt = document.getElementById('loadingText');
        if (txt) txt.style.display = '';
        // stop image animation if any
        if (animInterval) { clearInterval(animInterval); animInterval = null; }
    }
    function onImgLoad() {
        // ensure animation uses sharp state shortly after load
        if (img) {
            img.classList.add('sharp');
        }
    }
    function stopLoader() {
        overlay = overlay || document.getElementById('loadingOverlay');
        img = img || document.getElementById('loadingImg');
        text = text || document.getElementById('loadingText');
        if (!overlay) return;
        if (animInterval) { clearInterval(animInterval); animInterval = null; }
        // graceful fade: add hidden class after short delay so CSS transition applies
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        // cleanup listeners
        if (img) {
            img.removeEventListener('error', onImgError);
            img.removeEventListener('load', onImgLoad);
        }
    }

    // expose to global for lifecycle usage
    window.startLoader = startLoader;
    window.stopLoader = stopLoader;
})();

// Helper: render UI then wait for content images to load (or timeout) before hiding loader
function renderAndWait() {
    // render synchronously
    renderGame();
    // collect images inside content and wait for them
    const imgs = Array.from(document.getElementById('content').querySelectorAll('img'));
    const promises = imgs.map(im => {
        return new Promise(res => {
            if (im.complete) {
                // if it failed to load, naturalWidth==0 => consider as loaded to avoid stalling
                return res();
            }
            const ondone = () => { im.removeEventListener('load', ondone); im.removeEventListener('error', ondone); res(); };
            im.addEventListener('load', ondone);
            im.addEventListener('error', ondone);
        });
    });
    // wait all or timeout (2s)
    Promise.race([
        Promise.all(promises),
        new Promise(r => setTimeout(r, 2000))
    ]).then(() => {
        // give a small delay for final visual
        setTimeout(() => { window.stopLoader && window.stopLoader(); }, 120);
    });
}

// Tab switching (nav fixed at bottom visually)
document.querySelectorAll('.nav .tab').forEach(el => {
    el.addEventListener('click', () => {
        document.querySelectorAll('.nav .tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        const tab = el.dataset.tab;
        if (tab === 'game') renderGame();
        if (tab === 'rank') renderRank();
        if (tab === 'wallet') renderWallet();
        if (tab === 'market') renderMarket();
        if (tab === 'earn') renderEarn();
    });
});

// default: start loader then render UI and stop loader after content settles
window.startLoader && window.startLoader();
// call renderAndWait to render and hide loader when ready
setTimeout(renderAndWait, 250); // small delay so loader visuals start

document.querySelectorAll('img').forEach(img => {
    img.addEventListener('contextmenu', e => e.preventDefault()); // O‘ng bosish menyusini o‘chiradi
});
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('selectstart', event => event.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());
document.addEventListener('touchstart', e => e.preventDefault());


// helper functions to control Telegram BackButton


// --- Telegram BackButton boshqaruv funksiyalari ---
function showTelegramBack(handler) {
    if (window.Telegram?.WebApp?.BackButton) {
        try {
            window.Telegram.WebApp.BackButton.show();
            window.Telegram.WebApp.BackButton.onClick(handler);
        } catch (e) { /* ignore */ }
    }
}

function hideTelegramBack() {
    if (window.Telegram?.WebApp?.BackButton) {
        try {
            window.Telegram.WebApp.BackButton.hide();
            // handlerni bekor qilamiz
            window.Telegram.WebApp.BackButton.onClick(() => { });
        } catch (e) { /* ignore */ }
    }
}

// simple toast notification function
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Yangi: Telegram shareToStory wrapper (p)
function p(e, t, n) {
    try {
        const isPremium = !!(e?.WebApp?.initDataUnsafe?.user && e.WebApp.initDataUnsafe.user.is_premium);
        const payload = { text: `${t.text} ${t.currentUrl}` };
        if (isPremium) payload.widget_link = { name: t.btnName, url: t.currentUrl };

        // 1) prefer shareToStory if available
        if (e?.WebApp && typeof e.WebApp.shareToStory === 'function') {
            try {
                e.WebApp.shareToStory(t.link, payload);
                if (n) n(true);
            } catch (err) {
                console.warn('shareToStory error', err);
                if (n) n(false);
            }
            return;
        }

        // 2) fallback to shareStory (older API)
        if (e?.WebApp && typeof e.WebApp.shareStory === 'function') {
            try {
                e.WebApp.shareStory({ media_url: t.link, caption: payload.text });
                if (n) n(true);
            } catch (err) {
                console.warn('shareStory error', err);
                if (n) n(false);
            }
            return;
        }

        // 3) Web Share API (browser)
        if (navigator.share) {
            navigator.share({ title: t.btnName || 'PROGUZ', text: payload.text, url: t.currentUrl })
                .then(() => { if (n) n(true); })
                .catch((err) => { console.warn('navigator.share error', err); if (n) n(false); });
            return;
        }

        // 4) final fallback: open t.me share link
        try {
            const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(t.currentUrl) + '&text=' + encodeURIComponent(payload.text);
            const w = window.open(shareUrl, '_blank');
            if (n) n(!!w);
        } catch (err) {
            console.warn('t.me fallback error:', err);
            if (n) n(false);
        }
    } catch (err) {
        console.warn('p() share error', err);
        if (n) n(false);
    }
}

// yangi key: reklanma claim sanasi (YYYY-MM-DD)
const KEY_REKLAM_CLAIM = "proguzmir_reklanma_claim_date";

// helper: claim key per user
function claimKeyForWallet(wallet) {
    return makeUserKey(KEY_REKLAM_CLAIM, wallet);
}
function getClaimDateForCurrentUser() {
    const wallet = localStorage.getItem(KEY_WALLET) || "";
    return localStorage.getItem(claimKeyForWallet(wallet)) || null;
}
function setClaimDateForCurrentUser(dateStr) {
    const wallet = localStorage.getItem(KEY_WALLET) || "";
    localStorage.setItem(claimKeyForWallet(wallet), dateStr);
}
function clearClaimDateForCurrentUser() {
    const wallet = localStorage.getItem(KEY_WALLET) || "";
    localStorage.removeItem(claimKeyForWallet(wallet));
}
function isClaimedToday() {
    const d = getClaimDateForCurrentUser();
    if (!d) return false;
    const today = new Date().toISOString().slice(0, 10);
    return d === today;
}

// tiny helper: next midnight ms
function msUntilNextMidnight() {
    const now = new Date();
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t - now;
}

// show floating animation when PRC added
function animateAddPRC(text) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.position = 'fixed';
    el.style.left = '50%';
    el.style.bottom = '20%';
    el.style.transform = 'translateX(-50%)';
    el.style.padding = '8px 12px';
    el.style.background = 'rgba(255,255,255,0.06)';
    el.style.borderRadius = '8px';
    el.style.color = '#ffd700';
    el.style.fontWeight = '700';
    el.style.zIndex = '9999';
    el.style.transition = 'transform 1s ease, opacity 1s ease';
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) translateY(-120px) scale(1.05)';
        el.style.opacity = '0';
    });
    setTimeout(() => { if (el.parentElement) el.parentElement.removeChild(el); }, 1100);
}

// yangi kod: renderGame ichida reklanma uchun dastlabki sozlamalar
// After content.innerHTML is set — ensure reklanma reflects current claim state
(function setupReklanmaInitial() {
    const reklanma = document.querySelector('.reklanma2');
    if (!reklanma) return;

    // if already claimed today -> show countdown (no claim button)
    if (isClaimedToday()) {
        // show countdown UI
        const showCountdown = () => {
            const msLeft = msUntilNextMidnight();
            if (msLeft <= 0) {
                // midnight reached -> clear claim and re-render
                clearClaimDateForCurrentUser();
                renderGame();
                return;
            }
            const hrs = Math.floor(msLeft / 3600000);
            const mins = Math.floor((msLeft % 3600000) / 60000);
            const secs = Math.floor((msLeft % 60000) / 1000);
            reklanma.innerHTML = `<div class="reklanma-count" style="color:#fff; font-weight:700;">Claim qilingan — qolgan vaqt: ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>`;
        };
        showCountdown();
        // update har soniya
        const intervalId = setInterval(() => {
            if (!document.body.contains(reklanma)) { clearInterval(intervalId); return; }
            const msLeft = msUntilNextMidnight();
            if (msLeft <= 0) { clearInterval(intervalId); clearClaimDateForCurrentUser(); renderGame(); return; }
            const hrs = Math.floor(msLeft / 3600000);
            const mins = Math.floor((msLeft % 3600000) / 60000);
            const secs = Math.floor((msLeft % 60000) / 1000);
            const node = document.querySelector('.reklanma-count');
            if (node) node.textContent = `Claim qilingan — qolgan vaqt: ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }, 1000);
        return;
    }
})();

// eski reklanma setup kodini quyidagi bilan almashtiring (yangi claim saqlash mexanizmini qo'shib)
// reklanma ustiga bosilganda ishlaydigan yangi handler (toʻgʻrilangan)
setTimeout(() => {
    const reklanma = document.querySelector('.reklanma2');
    if (!reklanma) return;

    // replace node to ensure no duplicate listeners
    reklanma.replaceWith(reklanma.cloneNode(true));
    const rek = document.querySelector('.reklanma2');
    rek.addEventListener('click', () => {
        // if already claimed today block
        if (isClaimedToday()) { showToast('1 kundan keyin'); return; }

        const currentUrl = (location.protocol === 'file:' ? 'https://YOUR_PUBLIC_DOMAIN/image/background1.jpg' : window.location.origin + '/image/background1.jpg');
        const args = {
            link: currentUrl,
            text: 'I have successfully withdrawn 0.01 TON from PROGUZ, you can also play!',
            btnName: 'Play PROGUZ',
            currentUrl: currentUrl
        };

        p(window.Telegram || window, args, (success) => {
            if (!success) {
                showToast('Share bajarilmadi.');
                return;
            }
            // share muvaffaqiyatli bo'ldi — CLAIM UI chiqarish
            rek.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="font-weight:700; color:#fff;">Story jo'natildi!</div>
                      <button id="claimBtn" class="btn" style="margin-left:6px;">CLAIM</button>
                    </div>
                `;
            const claimBtn = document.getElementById('claimBtn');
            if (claimBtn) {
                claimBtn.addEventListener('click', () => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    setClaimDateForCurrentUser(todayStr);
                    const st = loadState();
                    st.prcWei = BigInt(st.prcWei) + BASE_WEI;
                    saveState(st);
                    animateAddPRC('+' + fmtPRC(BASE_WEI));
                    showToast('🎉🎉🎉🎉🎉🎉');
                    // faqat reklanma elementini countdown ga o'tkazamiz, sahifani qayta render qilmaymiz
                    showReklanmaCountdown(rek);
                });
            }
        });
    });
}, 300);

// Saqlash: lokal snapshot (offline fallback)
function saveSnapshotToLocal(state) {
    try {
        const wallet = state.wallet || localStorage.getItem(KEY_WALLET) || "";
        const key = makeUserKey('proguzmir_snapshot', wallet);
        const snap = {
            prcWei: state.prcWei.toString(),
            diamond: state.diamond,
            tapsUsed: state.tapsUsed,
            tapCap: state.tapCap,
            selectedSkin: state.selectedSkin,
            energy: state.energy,
            maxEnergy: state.maxEnergy,
            ts: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(snap));
    } catch (err) { console.warn('saveSnapshotToLocal error', err); }
}

// --- NEW: profile modal + Telegram-based wallet assignment + local-only startup ---
(function clientOnlyStartup() {
    // prefer Telegram WebApp id when available (store as tg_{id})
    try {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (tgUser && tgUser.id) {
            localStorage.setItem(KEY_WALLET, 'tg_' + String(tgUser.id));
            // also populate header username if present
            const nameNode = document.querySelector('.profile .username');
            if (nameNode) {
                const display = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
                nameNode.textContent = display || (tgUser.username ? '@' + tgUser.username : 'Telegram user');
            }
        }
    } catch (err) { /* ignore */ }

    // simple local-only bootstrap: load state and render
    try {
        // render UI after small delay to allow loader visuals
        setTimeout(() => {
            renderAndWait();
        }, 250);
    } catch (err) {
        console.warn('clientOnlyStartup error', err);
    }
})();

// Profile modal: open when .profile clicked, show info from Telegram WebApp initDataUnsafe.user or localStorage
(function setupProfileClick() {
    document.addEventListener('DOMContentLoaded', () => {
        const profile = document.querySelector('.profile');
        if (!profile) return;
        profile.style.cursor = 'pointer';
        profile.addEventListener('click', (e) => {
            e.preventDefault();
            // gather info
            let info = { id: null, first_name: null, last_name: null, username: null };
            try {
                const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
                if (u) {
                    info.id = u.id;
                    info.first_name = u.first_name || '';
                    info.last_name = u.last_name || '';
                    info.username = u.username || '';
                }
            } catch (err) { /* ignore */ }

            // build modal
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.inset = '0';
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '20000';

            const box = document.createElement('div');
            box.style.background = '#07121a';
            box.style.color = '#fff';
            box.style.borderRadius = '12px';
            box.style.padding = '18px';
            box.style.minWidth = '260px';
            box.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)';
            box.style.textAlign = 'center';

            // avatar: initials or default
            const avatar = document.createElement('div');
            avatar.style.width = '80px';
            avatar.style.height = '80px';
            avatar.style.margin = '0 auto 12px';
            avatar.style.borderRadius = '50%';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '28px';
            avatar.style.fontWeight = '700';
            avatar.style.background = '#0b2230';
            const initials = ((info.first_name || '').charAt(0) + (info.last_name || '').charAt(0)).toUpperCase() || (info.username ? info.username.slice(0, 2).toUpperCase() : 'TG');
            avatar.textContent = initials;
            box.appendChild(avatar);

            const title = document.createElement('div');
            title.style.fontWeight = '800';
            title.style.marginBottom = '6px';
            title.textContent = ((info.first_name || '') + (info.last_name ? ' ' + info.last_name : '')).trim() || (info.username ? '@' + info.username : 'Telegram user');
            box.appendChild(title);

            const sub = document.createElement('div');
            sub.style.opacity = '0.85';
            sub.style.fontSize = '13px';
            sub.style.marginBottom = '12px';
            sub.textContent = info.username ? '@' + info.username : `ID: ${info.id || 'unknown'}`;
            box.appendChild(sub);

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.className = 'btn';
            closeBtn.style.marginTop = '8px';
            closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
            box.appendChild(closeBtn);

            overlay.appendChild(box);
            document.body.appendChild(overlay);
        });
    });
})();

// add helper to load HTML fragment and execute scripts
async function loadHtmlIntoContent(url) {
    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            content.innerHTML = `<div style="padding:20px;color:#fff;">Xato: ${res.status} ${res.statusText}</div>`;
            return;
        }
        const html = await res.text();
        // set content
        content.innerHTML = html;
        // execute <script> tags found in html
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const scripts = tmp.querySelectorAll('script');
        scripts.forEach(s => {
            const ns = document.createElement('script');
            if (s.src) {
                // preserve relative src
                ns.src = s.getAttribute('src');
                ns.async = false;
            } else {
                ns.textContent = s.textContent;
            }
            document.body.appendChild(ns);
            // optional: remove after load (keeps DOM clean)
            // ns.parentNode && ns.parentNode.removeChild(ns);
        });
    } catch (err) {
        console.error('loadHtmlIntoContent error', err);
        content.innerHTML = `<div style="padding:20px;color:#fff;">Yuklashda xato: ${String(err)}</div>`;
    }
}

// Replace previous tab click handler block with enhanced loader
document.querySelectorAll('.nav .tab').forEach(el => {
    el.addEventListener('click', async () => {
        document.querySelectorAll('.nav .tab').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        const tab = el.dataset.tab;
        if (tab === 'game') renderGame();
        else if (tab === 'rank') {
            // load rank page smoothly without refresh (no history.pushState)
            await loadHtmlIntoContent('./rank/rank.html');
        }
        else if (tab === 'wallet') {
            await loadHtmlIntoContent('./wallet/wallet.html');
        }
        else if (tab === 'market') {
            await loadHtmlIntoContent('./friends/friends.html');
        }
        else if (tab === 'earn') {
            await loadHtmlIntoContent('./earn/earn.html');
        }
    });
});



