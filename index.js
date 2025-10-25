const tg = window.Telegram && window.Telegram.WebApp;
if (tg) tg.expand();

// BigInt birlik: 18 onlik (wei)
const DECIMALS = 18n;
const UNIT = 10n ** DECIMALS;

// Konstantalar (BigInt wei da)
const BASE_WEI = 1000n; // 0.000000000000001000 PRC -> 1e-15 / 1e-18 = 1000 wei
const DIAMOND_TO_WEI = 1n; // 1 diamond = 0.000000000000000001 PRC = 1 wei

const RANKS = ["bronze", "silver", "gold", "smart gold", "platinium", "master"];

// Local storage keys (yangi fields: tapsUsed, tapCap)
const KEY_PRC = "proguzmir_prc_wei";
const KEY_DIAMOND = "proguzmir_diamond";
const KEY_WALLET = "proguzmir_wallet";
const KEY_TAPS_USED = "proguzmir_taps_used";
const KEY_TAP_CAP = "proguzmir_tap_cap";
const KEY_SELECTED_SKIN = "proguzmir_selected_skin";
const KEY_ENERGY = "proguzmir_energy";
const KEY_MAX_ENERGY = "proguzmir_max_energy";
const DEFAULT_MAX_ENERGY = 1000;

// Default tap cap va blok o'lchami
const DEFAULT_TAP_CAP = 1000;
const INCREASE_BLOCK = 1000; // qancha tapped limitni oshiramiz har xaridda

// Skinlar ro'yxati
const SKIN_COST_WEI = 500000000000000n; // 0.0005 PRC = 5e14 wei
const SKINS = [
    { id: "bronza.png", name: "Bronza", file: "./image/bronza.png" },
    { id: "silver.png", name: "Silver", file: "./image/silver.png" },
    { id: "gold.png", name: "Gold", file: "./image/gold.png" },
    { id: "smart_gold.png", name: "Smart Gold", file: "./image/smart_gold.png" },
    { id: "platinium.png", name: "Platinium", file: "./image/platinium.png" },
    { id: "master.png", name: "Master", file: "./image/master.png" }
];

// Init state (default PRC = 0.0000000000000037 PRC -> 3700 wei)
// --- YANGI: foydalanuvchiga xos key yaratish funksiyasi ---
function makeUserKey(baseKey, wallet) {
    return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
}
// --- YANGILANGAN loadState() ---
function loadState() {
    const wallet = localStorage.getItem(KEY_WALLET) || "";
    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    const keyTaps = makeUserKey(KEY_TAPS_USED, wallet);
    const keyCap = makeUserKey(KEY_TAP_CAP, wallet);
    const keySkin = makeUserKey(KEY_SELECTED_SKIN, wallet);
    const keyEnergy = makeUserKey(KEY_ENERGY, wallet);
    const keyMaxEnergy = makeUserKey(KEY_MAX_ENERGY, wallet);

    const prc = localStorage.getItem(keyPRC) || "0";
    const diamond = parseInt(localStorage.getItem(keyDiamond) || "0", 10);
    const tapsUsed = parseInt(localStorage.getItem(keyTaps) || "0", 10);
    const tapCap = parseInt(localStorage.getItem(keyCap) || String(DEFAULT_TAP_CAP), 10);
    const selectedSkin = localStorage.getItem(keySkin) || "";
    const maxEnergy = parseInt(localStorage.getItem(keyMaxEnergy) || String(DEFAULT_MAX_ENERGY), 10);
    let energy = parseInt(localStorage.getItem(keyEnergy) || String(maxEnergy), 10);
    // clamp energy to maxEnergy to avoid >max on corrupted storage
    if (Number.isNaN(energy)) energy = maxEnergy;
    if (energy > maxEnergy) energy = maxEnergy;

    return { prcWei: BigInt(prc), diamond, wallet, tapsUsed, tapCap, selectedSkin, energy, maxEnergy };
}
// yangi helper: jami PRC (sotib olingan prcWei + diamond*conversion)
function getTotalPRCWei(state) {
    return state.prcWei + BigInt(state.diamond) * DIAMOND_TO_WEI;
}

// xaridni to'lash: avval prcWei dan, yetmasa diamondlardan (butun diamond birliklari)
function chargeCost(state, costWei) {
    const total = getTotalPRCWei(state);
    if (total < costWei) return false;
    // agar prcWei yetarli bo'lsa to'g'ridan-to'g'ri kamaytiramiz
    if (state.prcWei >= costWei) {
        state.prcWei -= costWei;
        saveState(state);
        return true;
    }
    // aks holda prcWei ni bo'shatib, qolganni diamondlardan olamiz
    let remaining = costWei - state.prcWei;
    state.prcWei = 0n;
    // qancha diamond kerak: ceil(remaining / DIAMOND_TO_WEI)
    const diamondsNeeded = Number((remaining + DIAMOND_TO_WEI - 1n) / DIAMOND_TO_WEI);
    // kamaytirish
    state.diamond = Math.max(0, state.diamond - diamondsNeeded);
    // agar overpay bo'lsa (diamond birliklari tufayli), qaytimni prcWei ga qo'shamiz
    const paidByDiamondsWei = BigInt(diamondsNeeded) * DIAMOND_TO_WEI;
    const overpay = paidByDiamondsWei - remaining;
    if (overpay > 0n) state.prcWei += overpay;
    saveState(state);
    return true;
}

// --- YANGILANGAN saveState() ---
function saveState(state) {
    const wallet = state.wallet || localStorage.getItem(KEY_WALLET) || "";
    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    const keyTaps = makeUserKey(KEY_TAPS_USED, wallet);
    const keyCap = makeUserKey(KEY_TAP_CAP, wallet);
    const keySkin = makeUserKey(KEY_SELECTED_SKIN, wallet);
    const keyEnergy = makeUserKey(KEY_ENERGY, wallet);
    const keyMaxEnergy = makeUserKey(KEY_MAX_ENERGY, wallet);

    localStorage.setItem(keyPRC, state.prcWei.toString());
    localStorage.setItem(keyDiamond, String(state.diamond));
    localStorage.setItem(keyTaps, String(state.tapsUsed));
    localStorage.setItem(keyCap, String(state.tapCap));
    // ensure energy/maxEnergy saved with sensible defaults (avoid writing "undefined")
    const maxE = (typeof state.maxEnergy === 'number' && !Number.isNaN(state.maxEnergy)) ? state.maxEnergy : DEFAULT_MAX_ENERGY;
    const en = (typeof state.energy === 'number' && !Number.isNaN(state.energy)) ? Math.min(state.energy, maxE) : maxE;
    localStorage.setItem(keyEnergy, String(en));
    localStorage.setItem(keyMaxEnergy, String(maxE));
    if (state.selectedSkin)
        localStorage.setItem(keySkin, state.selectedSkin);
    else localStorage.removeItem(keySkin);

    if (state.wallet)
        localStorage.setItem(KEY_WALLET, state.wallet);

    const total = getTotalPRCWei(state);
    const header = document.getElementById('headerBalance');
    if (header) header.innerHTML = '<img src="./image/coin.png" alt="logo" style="width:20px; margin-right: 10px; vertical-align:middle;"> ' + fmtPRC(total);
    const energyEl = document.getElementById('tapsCount');
    if (energyEl && typeof state.energy !== 'undefined') energyEl.textContent = `${state.energy} / ${state.maxEnergy}`;
}

// doim 18 onlik ko'rsatadi (full precision)
function fmtPRC(wei) {
    const negative = wei < 0n;
    if (negative) wei = -wei;
    const whole = (wei / UNIT).toString();
    // frac always padded to DECIMALS (18) digits
    let frac = (wei % UNIT).toString().padStart(Number(DECIMALS), '0');

    // remove trailing zeros (so 0.000010000... -> 0.00001)
    let lastNonZero = -1;
    for (let i = frac.length - 1; i >= 0; i--) {
        if (frac[i] !== '0') { lastNonZero = i; break; }
    }
    if (lastNonZero === -1) {
        // all zeros => show .0
        return (negative ? '-' : '') + whole + '.0 PRC';
    }
    frac = frac.slice(0, lastNonZero + 1);

    // compress runs of the same digit:
    // for any run of the same digit with length >= 3, output "d{n}" (e.g. 0{14}, 2{5})
    function compressFraction(s) {
        let out = '';
        let i = 0;
        while (i < s.length) {
            const ch = s[i];
            let j = i + 1;
            while (j < s.length && s[j] === ch) j++;
            const len = j - i;
            if (len >= 3) {
                out += ch + '{' + len + '}';
            } else {
                out += ch.repeat(len);
            }
            i = j;
        }
        return out;
    }

    const compressedFrac = compressFraction(frac);
    return (negative ? '-' : '') + whole + '.' + compressedFrac + ' PRC';
}

function getRankFromWei(wei) {
    if (wei < BASE_WEI) return "bronze";
    for (let i = 1; i < RANKS.length; i++) {
        const thr = BASE_WEI * (3n ** BigInt(i - 1));
        if (wei < thr * 3n) return RANKS[i];
    }
    return "master";
}

// rank -> image helper
function rankImage(rank) {
    const map = {
        "bronze": "./image/bronza.png",
        "silver": "./image/silver.png",
        "gold": "./image/gold.png",
        "smart gold": "./image/smart_gold.png",
        "platinium": "./image/platinium.png",
        "master": "./image/master.png"
    };
    return map[rank] || "./image/logo.png";
}
// tap handler: use energy (manual only) 
const tapBtn = document.getElementById('tapBtn');
tapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const state = loadState();
    if (state.energy <= 0) { alert('Energiya tugadi — kuting to‘ldirishni.'); return; }

    state.energy = Math.max(0, state.energy - 1);
    state.diamond += 1;
    saveState(state);

    document.getElementById('diamondTop').textContent = '💎 ' + state.diamond;
    document.getElementById('tapsCount').textContent = `${state.energy} / ${state.maxEnergy}`;
});

// quick open handlers (top-left previews) — skin preview now opens shop (skin tab inside shop)
const skinPreview = document.getElementById('skinCardPreview');
if (skinPreview) skinPreview.addEventListener('click', (ev) => { ev.stopPropagation(); renderShop(); });

const shopPreview = document.getElementById('shopCardPreview');
if (shopPreview) shopPreview.addEventListener('click', (ev) => { ev.stopPropagation(); renderShop(); });
const gamePreview = document.getElementById('gameCardPreview');
if (gamePreview) gamePreview.addEventListener('click', (ev) => { ev.stopPropagation(); renderGames(); });

// energy auto-recharge (existing)
if (window._energyInterval) { clearInterval(window._energyInterval); window._energyInterval = null; }
window._energyInterval = setInterval(() => {
    const st = loadState();
    if (st.energy < st.maxEnergy) {
        st.energy = Math.min(st.maxEnergy, st.energy + 1);
        saveState(st);
        const el = document.getElementById('tapsCount');
        if (el) el.textContent = `${st.energy} / ${st.maxEnergy}`;
    } else {
        clearInterval(window._energyInterval); window._energyInterval = null;
    }
}, 1000);

// replace modal behavior: clicking boostsBox opens Boosts "page" (renderBoosts)
const boostsBox = document.getElementById('boostsBox');
if (boostsBox) {
    boostsBox.addEventListener('click', (ev) => { ev.stopPropagation(); renderBoosts(); });
}

// helpers to hide/show bottom nav
function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }
