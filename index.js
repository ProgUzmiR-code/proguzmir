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
    if (header) header.innerHTML = '<img src="./image/coin.png" alt="logo" style="width:25px; margin-right: 10px; vertical-align:middle;"> ' + fmtPRC(total);
    const energyEl = document.getElementById('tapsCount');
    if (energyEl && typeof state.energy !== 'undefined') energyEl.textContent = `${state.energy} / ${state.maxEnergy}`;

    // Safely call optional snapshot/sync functions if they exist
    try {
        if (typeof saveSnapshotToLocal === 'function') saveSnapshotToLocal(state);
        if (typeof syncToServer === 'function') syncToServer(state);
    } catch (err) {
        console.warn('saveState: snapshot/sync error', err);
    }
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

// UI rendering per tab (Game updated with taps logic)
const content = document.getElementById('content');
function renderGame() {
    hideTelegramBack();
    const s = loadState();
    // update header balance immediately on render
    document.getElementById('headerBalance') && (document.getElementById('headerBalance').innerHTML = '<img src="./image/coin.png" alt="logo" style="width:25px; margin-right: 10px; vertical-align:middle;"> ' + fmtPRC(getTotalPRCWei(s)));
    if (typeof s.maxEnergy !== 'number') s.maxEnergy = DEFAULT_MAX_ENERGY;
    if (typeof s.energy !== 'number') s.energy = s.maxEnergy;

    const rank = getRankFromWei(s.prcWei);
    const defaultTapImg = rankImage(rank);
    const selectedSkin = s.selectedSkin;
    const skinObj = SKINS.find(x => x.id === selectedSkin);
    const displayImg = skinObj ? skinObj.file : defaultTapImg;

    // top quick access: Skin (left), Shop (center), Game (right) — diamond THEN previews THEN tap
    content.innerHTML = `
      <div class="tap-area">
        <div id="diamondTop" style="font-size:25px; margin-bottom:15px;">💎 ${s.diamond} </div>
        <!-- previews row: diamond above, previews here, then tap below -->
        <div id="previewsRow" style="display:flex; justify-content: space-between; align-items: center;">
          
          <div id="shopCardPreview" style="display: flex;  flex-direction: column; cursor:pointer; align-items: center;">
            <img src="./image/shop.png" alt="shop" style="width:52px; height:52px; object-fit:cover; margin-bottom: 10px; border-radius:8px;">
            <div style="flex:1; text-align:left;">
              <div style="font-weight:700;">Shop</div>
            </div>
          </div>
          <div id="gameCardPreview" style="display: flex;  flex-direction: column; cursor:pointer; align-items: center;">
            <img src="./image/game.png" alt="game" style="width:64px; height:64px; object-fit:cover; border-radius:8px;">
            <div style="flex:1; text-align:left;">
              <div style="font-weight:800; font-size:14px;">Play Games</div>
            </div>
          </div>
        </div>
        
        <img id="tapBtn" src="${displayImg}" alt="tap" draggable="false">
      </div>

      <div style="margin-top:14px;">
        <div class="row" style="display:flex; justify-content: space-between; gap:10px; align-items:center;">
          <div id="tapsBox" style="display:flex; align-items:center; gap:8px; background: rgba(0,0,0,0.35); border-radius:10px; padding:6px 12px;">
            ⚡️<span id="tapsCount">${s.energy} / ${s.maxEnergy}</span>
          </div>
          <div  class="reklanma2">
            <img class="reklanma" width="20" src="./image/reklanma.png" alt="">
            <div class="reklanma1">
                <span>+1000PRC</span>
            </div>
          </div>
        </div>
      </div>
     `;

    // --- Share Story / reklanma2 handler: after successful share show CLAIM; claim gives BASE_WEI PRC and starts until-midnight cooldown ---
    setTimeout(() => {
        const reklanma = document.querySelector('.reklanma2');
        if (!reklanma) return;

        // replace node to ensure no duplicate listeners
        reklanma.replaceWith(reklanma.cloneNode(true));
        const rek = document.querySelector('.reklanma2');
        rek.addEventListener('click', () => {
            // if already claimed today block
            if (isClaimedToday()) { showToast('Siz allaqachon claim qildingiz. Keyinroq qayta urinib ko‘ring.'); return; }

            const currentUrl = (location.protocol === 'file:' ? 'https://YOUR_PUBLIC_DOMAIN' + '/image/background1.jpg' : window.location.origin + '/image/background1.jpg');
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
                        const todayStr = new Date().toISOString().slice(0,10);
                        setClaimDateForCurrentUser(todayStr);
                        const st = loadState();
                        st.prcWei = BigInt(st.prcWei) + BASE_WEI;
                        saveState(st);
                        animateAddPRC('+' + fmtPRC(BASE_WEI));
                        showToast('🎉 Claim qabul qilindi: 0.000000000000001000 PRC');
                        renderGame();
                    });
                }
            });
        });
    }, 300);

    // tap handler: use energy (manual only) 
    const tapBtn = document.getElementById('tapBtn');
    tapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = loadState();
        if (state.energy <= 0) { alert('Energiya tugadi — kuting to‘ldirishni.'); return; }

        // update model
        state.energy = Math.max(0, state.energy - 1);
        state.diamond += 1;

        // update UI immediately (don't rely on saveState to succeed)
        const diamondEl = document.getElementById('diamondTop');
        if (diamondEl) diamondEl.textContent = '💎 ' + state.diamond;
        const tapsEl = document.getElementById('tapsCount');
        if (tapsEl) tapsEl.textContent = `${state.energy} / ${state.maxEnergy}`;

        // persist, but guard against errors so UI remains responsive
        try {
            saveState(state);
        } catch (err) {
            console.error('Failed to save state on tap:', err);
            // As a fallback ensure localStorage has the latest values
            try {
                const wallet = state.wallet || localStorage.getItem(KEY_WALLET) || "";
                localStorage.setItem(makeUserKey(KEY_PRC, wallet), state.prcWei.toString());
                localStorage.setItem(makeUserKey(KEY_DIAMOND, wallet), String(state.diamond));
                localStorage.setItem(makeUserKey(KEY_ENERGY, wallet), String(state.energy));
            } catch (e) { /* ignore fallback errors */ }
        }
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
    // Doimiy interval: har soniyada tekshiradi va faqat kerak bo'lsa oshiradi.
    window._energyInterval = setInterval(() => {
        const st = loadState();
        if (typeof st.energy !== 'number' || typeof st.maxEnergy !== 'number') return;
        if (st.energy < st.maxEnergy) {
            st.energy = Math.min(st.maxEnergy, st.energy + 1);
            saveState(st);
            const el = document.getElementById('tapsCount');
            if (el) el.textContent = `${st.energy} / ${st.maxEnergy}`;
        }
        // Eslatma: intervalni endi avtomatik clear qilmaymiz — shu bilan energiya pasayganda qayta tiklanadi.
    }, 1000);

    // replace modal behavior: clicking boostsBox opens Boosts "page" (renderBoosts)
    const boostsBox = document.getElementById('boostsBox');
    if (boostsBox) {
        boostsBox.addEventListener('click', (ev) => { ev.stopPropagation(); renderBoosts(); });
    }

    // helpers to hide/show bottom nav
    function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
    function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }

    // --- NEW: renderBoosts shows dedicated Boosts page (like navigating to a tab) ---


    // --- NEW: renderShop (card layout) ---
    const SHOP_ITEMS = [
        { id: 'energyPack', name: 'Energy +1000', img: './image/boost.png', type: 'energy', amount: INCREASE_BLOCK, costWei: BigInt(INCREASE_BLOCK) * DIAMOND_TO_WEI }
    ];
    function renderShop() {
        hideNav();
        const s = loadState();
        // show Telegram BackButton and set it to return to main renderGame
        showTelegramBack(() => { showNav(); renderGame(); });

        // header with internal tabs (Back handled by Telegram WebApp "X")
        content.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <div class="btn-group" style="margin:auto;">
              <div id="tabShop" class="btn">Shop</div>
              <div id="tabSkins" class="btn">Skins</div>
            </div>
          </div>
          <div style="display:flex; gap:12px; margin-top:6px;">
            <div id="shopCol" style="flex:1; display:flex; flex-direction:column; gap:12px;">
              ${SHOP_ITEMS.map(it => `
                <div class="shop-item" data-id="${it.id}" style=" margin-bottom: 20px; display: flex; background:rgba(0,0,0,0.5); border-radius:12px; padding:12px;">
                  <img src="${it.img}" alt="${it.name}" style="width:100px; object-fit:cover; border-radius:8px;">
                  <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${it.name}</b><div style="color:#ccc; font-size:13px;">Cost: ${fmtPRC(it.costWei)}</div></div>
                    <button class="btn buyShopBtn" data-id="${it.id}">Buy</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div id="skinCol" style="flex:1; display:flex; flex-direction:column; gap:12px; display:none;">
              ${SKINS.map(sk => `
                <div class="skin-item" data-skin="${sk.id}" style="    margin-bottom: 20px; background:rgba(0,0,0,0.5); border-radius:12px; padding:12px;">
                  <img src="./image/${sk.id}" alt="${sk.name}" style="width:200px;  object-fit:cover; border-radius:8px;">
                  <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${sk.name}</b><div style="color:#ccc; font-size:13px;">Skin for your tap</div></div>
                    <button class="btn buySkinBtn" data-skin="${sk.id}">Buy</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        // tab handlers
        const tabShop = document.getElementById('tabShop');
        const tabSkins = document.getElementById('tabSkins');
        const shopCol = document.getElementById('shopCol');
        const skinCol = document.getElementById('skinCol');
        function activateShop() { shopCol.style.display = ''; skinCol.style.display = 'none'; tabShop.disabled = true; tabSkins.disabled = false; }
        function activateSkins() { shopCol.style.display = 'none'; skinCol.style.display = ''; tabShop.disabled = false; tabSkins.disabled = true; }
        tabShop.addEventListener('click', activateShop);
        tabSkins.addEventListener('click', activateSkins);
        // default active
        activateShop();
        // shop buys
        document.querySelectorAll('.buyShopBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const item = SHOP_ITEMS.find(x => x.id === id);
                if (!item) return;
                const state = loadState();
                if (!chargeCost(state, item.costWei)) { alert('Yetarli PRC yo‘q.'); return; }
                if (item.type === 'energy') state.maxEnergy = (state.maxEnergy || DEFAULT_MAX_ENERGY) + item.amount;
                else if (item.type === 'taps') state.tapCap = (state.tapCap || DEFAULT_TAP_CAP) + item.amount;
                saveState(state);
                alert(`${item.name} sotib olindi.`);
                renderShop();
            });
        });
        // skin buys (inside shop)
        document.querySelectorAll('.buySkinBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const skinId = btn.dataset.skin;
                const state = loadState();
                if (!chargeCost(state, SKIN_COST_WEI)) { alert('Yetarli PRC yo‘q skin sotib olish uchun.'); return; }
                state.selectedSkin = skinId;
                saveState(state);
                alert('Skin sotib olindi: ' + SKINS.find(s => s.id === skinId).name);
                renderShop();
            });
        });
    }

    // --- NEW: renderGames (list of game cards) ---
    const GAMES = [
        { id: 'game', name: 'Game One', img: './game/game.png' }
    ];
    function renderGames() {
        hideNav();
        const s = loadState();
        // show Telegram BackButton and set it to return to main renderGame
        showTelegramBack(() => { showNav(); renderGame(); });

        content.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <div style="flex:1; text-align:center; font-weight:800;">🎮 Games</div>
          </div>
          <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
            <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
              ${GAMES.map(g => `
                <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                  <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">
                  <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${g.name}</b><div style="color:#ccc; font-size:13px;">Tap to play</div></div>
                    <button class="btn playGameBtn" data-id="${g.id}">Play</button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="flex:1;"></div>
          </div>
        `;


        document.querySelectorAll('.playGameBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const gameObj = GAMES.find(x => x.id === id) || { name: id };
                // inject iframe (no full reload)
                content.innerHTML = `
                  <div style="display:flex; flex-direction:column; height:100%;">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px;">
                      <button id="backFromGame" class="btn">Back</button>
                      <div style="font-weight:800;">🎮 ${gameObj.name}</div>
                      <div style="width:64px"></div>
                    </div>
                    <iframe id="gameIframe" src="./game/${id}.html" style="border:0; width:100%; height:calc(100vh - 120px); flex:1;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
                  </div>
                `;
                // hide bottom nav while inside game iframe
                hideNav();
                // ensure Telegram BackButton returns to games list
                showTelegramBack(() => { renderGames(); showNav(); hideTelegramBack(); });
                // onscreen back button handler
                const backBtn = document.getElementById('backFromGame');
                if (backBtn) {
                    backBtn.addEventListener('click', () => { renderGames(); showNav(); hideTelegramBack(); });
                }
            });
        });
    }
} // end of function renderGame()

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

// --- Story share + claim handling for reklanma2 ---
// const reklama2 = document.querySelector('.reklanma2');
// if (reklama2) {
//     reklama2.addEventListener('click', () => {
//         // claim: 0.00001 TON (10 PRC)
//         const state = loadState();
//         const claimAmountWei = 10_000_000_000_000_000n; // 10 PRC
//         if (state.prcWei < claimAmountWei) {
//             alert('Yetarli PRC yo‘q. Iltimos, avval PRC to‘plang.');
//             return;
//         }
//         // remove reklama2 element
//         reklama2.parentElement.remove();
//         // charge cost (from PRC)
//         chargeCost(state, claimAmountWei);
//         // add diamond reward: 0.00001 TON = 10 PRC -> 10 diamond
//         state.diamond += 10;
//         saveState(state);
//         // show updated diamond balance
//         const diamondTop = document.getElementById('diamondTop');
//         if (diamondTop) diamondTop.textContent = '💎 ' + state.diamond;
//         // simple toast notification
//         showToast('🎉 10 diamond qo‘shildi!');
//     });
// }

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
    const today = new Date().toISOString().slice(0,10);
    return d === today;
}

// tiny helper: next midnight ms
function msUntilNextMidnight() {
    const now = new Date();
    const t = new Date(now);
    t.setDate(now.getDate() + 1);
    t.setHours(0,0,0,0);
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
                reklanma.innerHTML = `<div class="reklanma-count" style="color:#fff; font-weight:700;">Claim qilingan — qolgan vaqt: ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div>`;
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
                if (node) node.textContent = `Claim qilingan — qolgan vaqt: ${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
            }, 1000);
            return;
        }
    })();

    // eski reklanma setup kodini quyidagi bilan almashtiring (yangi claim saqlash mexanizmini qo'shib)
    // reklanma ustiga bosilganda ishlaydigan yangi handler (toʻgʻrilangan)
    setTimeout(() => {
        const reklanma = document.querySelector('.reklanma2');
        if (!reklanma) return;

        // eski listenerlarni olib tashlash va yangisini qo'shish
        reklanma.replaceWith(reklanma.cloneNode(true));
        const rek = document.querySelector('.reklanma2');
        rek.addEventListener('click', () => {
            if (isClaimedToday()) { showToast('1 kun kuting'); return; }

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
                        const todayStr = new Date().toISOString().slice(0,10);
                        setClaimDateForCurrentUser(todayStr);
                        const st = loadState();
                        st.prcWei = BigInt(st.prcWei) + BASE_WEI;
                        saveState(st);
                        animateAddPRC('+' + fmtPRC(BASE_WEI));
                        showToast('🎉 +1000PRC');
                        renderGame();
                    });
                }
            });
        });
    }, 300);



