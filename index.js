// Hozir qaysi sahifada turganimiz
let currentPage = 'game';

// Oxirgi marta qaysi ASOSIY TAB (Earn, Rank..) ochiq bo'lganini eslab qolish uchun
let lastMainTab = 'game';

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
const KEY_TODAY_INDEX = "proguzmir_today_index";
const KEY_RANK = "proguzmir_rank";  // YANGI: Rank uchun key
const DEFAULT_MAX_ENERGY = 1000;
// --- ADD: daily keys & helpers (place near other KEY_* declarations) ---

const KEY_DAILY_WEEK_START = "proguzmir_daily_week_start";
const KEY_DAILY_CLAIMS = "proguzmir_daily_claims"; // JSON array of 7 booleans
const DAILY_REWARDS = [1000, 2000, 3000, 6000, 7000, 9000, 30000]; // diamonds for days 1..6, 10 PRC for day 7


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


const KEY_KEYS_TOTAL = 'proguzmir_keys_total';
const KEY_KEYS_USED = 'proguzmir_keys_used';

// Init state (default PRC = 0.0000000000000037 PRC -> 3700 wei)
// --- YANGI: foydalanuvchiga xos key yaratish funksiyasi ---
function makeUserKey(baseKey, wallet) {
    return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
}
// --- YANGILANGAN loadState() ---
function loadState() {
    // prefer Telegram WebApp id when available (we store it as "tg_{id}" in KEY_WALLET)
    let wallet = localStorage.getItem(KEY_WALLET) || "";
    try {
        const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (tgId) {
            // ensure the KEY_WALLET contains tg_{id} while in Telegram
            wallet = String(tgId);
            localStorage.setItem(KEY_WALLET, wallet);
        }
    } catch (e) { /* ignore */ }

    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    const keyTaps = makeUserKey(KEY_TAPS_USED, wallet);
    const keyCap = makeUserKey(KEY_TAP_CAP, wallet);
    const keySkin = makeUserKey(KEY_SELECTED_SKIN, wallet);
    const keyEnergy = makeUserKey(KEY_ENERGY, wallet);
    const keyMaxEnergy = makeUserKey(KEY_MAX_ENERGY, wallet);
    const keyTodayIndex = makeUserKey(KEY_TODAY_INDEX, wallet);
    const keyRank = makeUserKey(KEY_RANK, wallet);  // YANGI: Rank key

    const prc = localStorage.getItem(keyPRC) || "0";
    const diamond = parseInt(localStorage.getItem(keyDiamond) || "0", 10);
    const tapsUsed = parseInt(localStorage.getItem(keyTaps) || "0", 10);
    const tapCap = parseInt(localStorage.getItem(keyCap) || String(DEFAULT_TAP_CAP), 10);
    const selectedSkin = localStorage.getItem(keySkin) || "";
    const maxEnergy = parseInt(localStorage.getItem(keyMaxEnergy) || String(DEFAULT_MAX_ENERGY), 10);
    const todayIndex = parseInt(localStorage.getItem(keyTodayIndex) || "0", 10);
    const rank = localStorage.getItem(keyRank) || "bronze";  // YANGI: Rank

    let energy = parseInt(localStorage.getItem(keyEnergy) || String(maxEnergy), 10);
    // clamp energy to maxEnergy to avoid >max on corrupted storage
    if (Number.isNaN(energy)) energy = maxEnergy;
    if (energy > maxEnergy) energy = maxEnergy;

    return { prcWei: BigInt(prc), diamond, wallet, tapsUsed, tapCap, selectedSkin, energy, maxEnergy, todayIndex, rank }; // YANGI: rank qo'shdi
}
// yangi helper: jami PRC (sotib olingan prcWei + diamond*conversion)
function getTotalPRCWei(state) {
    return state.prcWei;
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

// --- YANGILANGAN saveState(): remove server sync, keep local snapshot only ---
function saveState(state) {
    // prefer explicit state.wallet but fallback to persisted KEY_WALLET
    const wallet = state.wallet || localStorage.getItem(KEY_WALLET) || "";
    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    const keyTaps = makeUserKey(KEY_TAPS_USED, wallet);
    const keyCap = makeUserKey(KEY_TAP_CAP, wallet);
    const keySkin = makeUserKey(KEY_SELECTED_SKIN, wallet);
    const keyEnergy = makeUserKey(KEY_ENERGY, wallet);
    const keyMaxEnergy = makeUserKey(KEY_MAX_ENERGY, wallet);
    const keyTodayIndex = makeUserKey(KEY_TODAY_INDEX, wallet);
    const keyRank = makeUserKey(KEY_RANK, wallet);  // YANGI: Rank key
    const keyKeysTotal = makeUserKey(KEY_KEYS_TOTAL, wallet);
    const keyKeysUsed = makeUserKey(KEY_KEYS_USED, wallet);

    // ensure state.wallet stored so subsequent loads use same identifier
    if (!state.wallet && wallet) state.wallet = wallet;

    localStorage.setItem(keyPRC, state.prcWei.toString());
    localStorage.setItem(keyDiamond, String(state.diamond));
    localStorage.setItem(keyTaps, String(state.tapsUsed));
    localStorage.setItem(keyCap, String(state.tapCap));
    // ensure energy/maxEnergy saved with sensible defaults (avoid writing "undefined")
    const maxE = (typeof state.maxEnergy === 'number' && !Number.isNaN(state.maxEnergy)) ? state.maxEnergy : DEFAULT_MAX_ENERGY;
    const en = (typeof state.energy === 'number' && !Number.isNaN(state.energy)) ? Math.min(state.energy, maxE) : maxE;
    localStorage.setItem(keyEnergy, String(en));
    localStorage.setItem(keyMaxEnergy, String(maxE));
    if (typeof state.todayIndex === 'number') localStorage.setItem(keyTodayIndex, String(state.todayIndex));
    if (state.rank) localStorage.setItem(keyRank, state.rank);  // YANGI: Rank saqlash

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

    // Local-only snapshot (no server sync)
    try {
        if (typeof saveSnapshotToLocal === 'function') saveSnapshotToLocal(state);
    } catch (err) {
        console.warn('saveState: snapshot error', err);
    }

    // Non-blocking Supabase sync (best-effort) — guarded to avoid ReferenceError
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof syncSnapshotToSupabase === 'function') {
            // call existing helper if present
            syncSnapshotToSupabase(state).catch(e => console.warn('Supabase sync failed', e));
        } else {
            // if no helper, optionally perform a minimal best-effort upsert when publishable client exists
            if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof supabaseClient.from === 'function') {
                // best-effort, non-blocking write (don't await)
                (async () => {
                    try {
                        await supabaseClient.from('user_states').upsert({
                            wallet: state.wallet || localStorage.getItem(KEY_WALLET) || 'guest',
                            prc_wei: String(state.prcWei || '0'),
                            diamond: state.diamond || 0,
                            taps_used: state.tapsUsed || 0,
                            tap_cap: state.tapCap || 0,
                            selected_skin: state.selectedSkin || null,
                            energy: state.energy || 0,
                            max_energy: state.maxEnergy || 0,
                            today_index: state.todayIndex || 0,
                            updated_at: new Date().toISOString()
                        });
                    } catch (e) {
                        // swallow errors — sync is best-effort
                        console.warn('Supabase best-effort upsert failed', e);
                    }
                })();
            }
        }
    } catch (e) {
        console.warn('Supabase sync invocation error', e);
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
    // Exact thresholds in Wei (18 decimals)
    const SILVER_THRESHOLD = BigInt('10000000');              // 0.000000000010000000 PRC -> 1e7 wei
    const GOLD_THRESHOLD = BigInt('1000000000');             // 0.000000001000000000 PRC -> 1e9 wei
    const SMART_GOLD_THRESHOLD = BigInt('1000000000000');    // 0.000001000000000000 PRC -> 1e12 wei
    const PLATINIUM_THRESHOLD = BigInt('1000000000000000');  // 0.001000000000000000 PRC -> 1e15 wei
    const MASTER_THRESHOLD = BigInt('100000000000000000');   // 0.100000000000000000 PRC -> 1e17 wei

    if (wei >= MASTER_THRESHOLD) return 'master';
    if (wei >= PLATINIUM_THRESHOLD) return 'platinium';     // match rank.html spelling
    if (wei >= SMART_GOLD_THRESHOLD) return 'smart gold';    // match tab data-rank
    if (wei >= GOLD_THRESHOLD) return 'gold';
    if (wei >= SILVER_THRESHOLD) return 'silver';
    return 'bronze';
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
const gamecontent = document.getElementById('gamecontent');
function renderGame() {
    const s = loadState();
    console.log({
        prcWei: s.prcWei.toString(),
        diamond: s.diamond,
        totalWei: getTotalPRCWei(s).toString(),
        ui: fmtPRC(getTotalPRCWei(s))
    });

    // YANGI: todayIndex dan label yaratish
    const todayIndex = (typeof s.todayIndex === 'number' && s.todayIndex >= 0) ? s.todayIndex : 0;
    const dayNum = todayIndex + 1;
    const label = (todayIndex === 6) ? 'BIG DAY' : `Day ${dayNum}`;

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
    gamecontent.innerHTML = `
        
      <div class="tap-area">
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:10px;">
          <div style="display:flex;gap:30px;align-items:center;margin-top: 10px;">
            <div id="dailyBtn" class="btn bton" style="border-radius:8px;display: flex;flex-direction: column;align-items: center;cursor: pointer;">
              <img class="dailyImg" src="./image/daily.png" alt="Daily">
              <span  style="font-size:15px; font-weight:700;margin-bottom:4px;position:absolute;padding: 33px 0 0 0;color: black;">${label}</span>
              <span class="text_daily">Daily Login</span>
            </div>

            <!-- Lucky Code key next to Daily -->
            <div id="luckyKeyBtn" class=" bton" title="Lucky Code" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <img src="./image/lukcy.png" alt="Lucky" class="luckyImg">
              <span style="">Lucky Code</span>
            </div>

            <!-- daily income -->
            <div id="incomeBtn" class=" bton" title="Daily Income" style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <img src="./image/lukcy.png" alt="Lucky" class="luckyImg">
              <span style="">Daily Income</span>
            </div>

          </div>

          <div id="diamondTop" class="diamond" >💎 <span data-diamond-display>${s.diamond}</span> </div>
        </div>
        <!-- previews row: diamond above, previews here, then tap below -->
        <div id="previewsRow" style="display:flex; justify-content: space-between; align-items: center;">
          
          <div id="shopCardPreview" class=" bton" style="display: flex;  flex-direction: column; cursor:pointer; align-items: center;">
            <img src="./image/shop.png" alt="shop" class="shopImg">
            <div style="flex:1; text-align:left;">
              <div style="font-weight:700;">Store</div>
            </div>
          </div>
          <div id="gameCardPreview" class=" bton" style="display: flex;  flex-direction: column; cursor:pointer; align-items: center;">
            <img src="./image/game.png" alt="game" class="gameImg">
            <div style="flex:1; text-align:left;">
              <div style="font-weight:800; font-size:14px;">Play Games</div>
            </div>
          </div>
        </div>
        
        <img id="tapBtn" src="${displayImg}" alt="tap" draggable="false">
      </div>

      <div style="margin-top:14px; margin-bottom:100px;">
        <div class="row" style="display:flex; justify-content: space-between; gap:10px; align-items:center;">
          <div id="tapsBox" style="display:flex; align-items:center; gap:8px; background: rgba(0,0,0,0.35); border-radius:10px; padding:6px 12px;">
            ⚡️<span id="tapsCount">${s.energy} / ${s.maxEnergy}</span>
          </div>
          <div  class="reklanma2 bton">
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

        // agar bugun allaqachon claim qilingan bo'lsa, bevosita countdown chiqaramiz
        if (isClaimedToday()) {
            showReklanmaCountdown(rek);
            return;
        }

        // oddiy click handler: share -> show claim button (do NOT re-render whole page)
        rek.addEventListener('click', () => {
            if (isClaimedToday()) { showToast('Wait for the time to expire.'); return; }

            const currentUrl = (location.protocol === 'file:' ? 'https://proguzmir.vercel.app/image/background1.jpg' : window.location.origin + '/image/background1.jpg');
            const args = {
                link: currentUrl,
                text: 'I have successfully withdrawn 0.01 TON from ProgUzmiR, you can also play!',
                btnName: 'Play ProgUzmiR',
                currentUrl: currentUrl
            };

            p(window.Telegram || window, args, (success) => {
                if (!success) {
                    showToast('Share failed.');
                    return;
                }
                // show CLAIM button inside reklanma only
                rek.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                      <div style="font-weight:700; color:#fff;">Story sent!</div>
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

                        // YANGI: Also save the claim date to Supabase via saveUserState
                        saveState(st);

                        // YANGI: Ensure claim date is synced to Supabase
                        try {
                            if (typeof saveUserState === 'function') {
                                saveUserState(st);
                            }
                        } catch (e) {
                            console.warn('Failed to sync claim date to Supabase:', e);
                        }

                        animateAddPRC('+' + fmtPRC(BASE_WEI));
                        showToast('🎉 +1000PRC');
                        // faqat reklanma elementini countdown ga o'tkazamiz, sahifani qayta render qilmaymiz
                        showReklanmaCountdown(rek);
                    });
                }
            });
        });
    }, 300);

    // --- Helper: show countdown on reklanma element ---
    function showReklanmaCountdown(rek) {
        if (!rek) return;

        const updateCountdown = () => {
            const msLeft = msUntilNextMidnight();
            if (msLeft <= 0) {
                clearClaimDateForCurrentUser();
                renderGame();
                return;
            }
            const hrs = Math.floor(msLeft / 3600000);
            const mins = Math.floor((msLeft % 3600000) / 60000);
            const secs = Math.floor((msLeft % 60000) / 1000);
            rek.innerHTML = `<div class="reklanma-count" style="color:#fff; font-weight:700;">${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>`;
        };

        // Darhol yangilash
        updateCountdown();

        // Har soniyada yangilash
        const intervalId = setInterval(() => {
            if (!document.body.contains(rek)) {
                clearInterval(intervalId);
                return;
            }
            updateCountdown();
        }, 1000);
    }


    // tap handler: use energy (manual only) 
    const tapBtn = document.getElementById('tapBtn');
    tapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const state = loadState();
        if (state.energy <= 0) { alert('Energy is running out - wait for it to be replenished.'); return; }

        // update model
        state.energy = Math.max(0, state.energy - 1);
        state.diamond += 1;
        // --- YANGI: har bir tap uchun PRC ham oshadi ---
        state.prcWei = (state.prcWei || 0n) + BASE_WEI;

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

    // --- Shop Preview handler ---





    // Har qanday joydagi Daily tugmasini tutib olish uchun global listener



    // energy auto-recharge

    if (window._energyInterval) { clearInterval(window._energyInterval); window._energyInterval = null; }

    // Doimiy interval: har soniyada tekshiradi
    window._energyInterval = setInterval(async () => {

        const st = loadState();


        // Agar birdaniga maxEnergy 0 yoki noto'g'ri bo'lib qolsa:
        if (!st.maxEnergy || st.maxEnergy <= 0) {
            console.warn("⚠️ Diqqat! Energiya 0 ga tushib qoldi. Avtomatik tuzatilmoqda...");

            st.maxEnergy = 1000;

            if (st.energy <= 0) st.energy = 1000;

            saveState(st);

            // 3. Ekranni darhol yangilaymiz (foydalanuvchi kutib qolmasligi uchun)
            const el = document.getElementById('tapsCount');
            if (el) el.textContent = `${st.energy} / ${st.maxEnergy}`;

        }

        // Asosiy mantiq (Sizning kodingiz)
        if (typeof st.energy !== 'number' || typeof st.maxEnergy !== 'number') return;

        if (st.energy < st.maxEnergy) {
            // Kichik o'zgarish: 1 ga oshirganda maxEnergy dan oshib ketmasligini ta'minlash
            st.energy = Math.min(st.maxEnergy, st.energy + 1);

            saveState(st);

            const el = document.getElementById('tapsCount');
            if (el) el.textContent = `${st.energy} / ${st.maxEnergy}`;
        }

    }, 1000);

    // replace modal behavior: clicking boostsBox opens Boosts "page" (renderBoosts)
    const boostsBox = document.getElementById('boostsBox');
    if (boostsBox) {
        boostsBox.addEventListener('click', (ev) => { ev.stopPropagation(); renderBoosts(); });
    }



} // end of function renderGame()

// --- YANGI: Header PRC ni real vaqitda yangilash (global) ---
function updateHeaderPRC() {
    const headerBalance = document.getElementById('headerBalance');
    if (headerBalance) {
        const KEY_PRC = "proguzmir_prc_wei";
        const KEY_WALLET = "proguzmir_wallet";

        function makeUserKey(baseKey, wallet) {
            return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
        }

        const wallet = localStorage.getItem(KEY_WALLET) || "";
        const keyPRC = makeUserKey(KEY_PRC, wallet);
        try {
            const prcWei = BigInt(localStorage.getItem(keyPRC) || "0");
            headerBalance.innerHTML = '<img src="./image/coin.png" alt="logo" style="width:25px; margin-right: 10px; vertical-align:middle;"> ' + fmtPRC(prcWei);
        } catch (e) {
            console.log("Header PRC update error:", e);
        }
    }
}

// --- YANGI: Header Diamond ni real vaqitda yangilash (global) ---
function updateHeaderDiamond() {
    // Header ichidagi diamond ni yangilash (agar mavjud bo'lsa)
    // Bu function header.html yoki panel componentida diamond display qilish uchun
    const diamondElements = document.querySelectorAll('[data-diamond-display]');
    if (diamondElements.length === 0) return; // Agar diamond display element yo'q bo'lsa chiq

    const KEY_DIAMOND = "proguzmir_diamond";
    const KEY_WALLET = "proguzmir_wallet";

    function makeUserKey(baseKey, wallet) {
        return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
    }

    const wallet = localStorage.getItem(KEY_WALLET) || "";
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    try {
        const diamond = parseInt(localStorage.getItem(keyDiamond) || "0", 10);
        diamondElements.forEach(el => {
            el.textContent = String(diamond);
        });
    } catch (e) {
        console.log("Header Diamond update error:", e);
    }
}

// Update on load and every second
updateHeaderPRC();
updateHeaderDiamond();
setInterval(() => {
    updateHeaderPRC();
    updateHeaderDiamond();
}, 1000);



// default: start loader then render UI and stop loader after content settles
window.startLoader && window.startLoader();
// call renderAndWait to render and hide loader when ready
setTimeout(renderAndWait, 250); // small delay so loader visuals start

document.querySelectorAll('img').forEach(img => {
    img.addEventListener('contextmenu', e => e.preventDefault()); // O'ng bosish menyusini o'chiradi
});
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('selectstart', event => event.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('dragstart', e => e.preventDefault());

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
        // --- LOCALSTORAGE DAN OLISH ---
        // 'proguzmir_my_ref_link' kaliti friends.js da saqlangan edi
        const myRefLink = localStorage.getItem('proguzmir_my_ref_link') || 'https://proguzmir.vercel.app';
        const isPremium = !!(e?.WebApp?.initDataUnsafe?.user && e.WebApp.initDataUnsafe.user.is_premium);
        const payload = { text: `${t.text} ${myRefLink}` };
        if (isPremium) payload.widget_link = { name: t.btnName, url: myRefLink };

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
            navigator.share({ title: t.btnName || 'ProgUzmiR', text: payload.text, url: t.currentUrl })
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
(async function clientOnlyStartup() {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser && tgUser.id) {
        const walletId = String(tgUser.id);
        localStorage.setItem(KEY_WALLET, walletId);

        // YANGI: Load ALL data from Supabase using helper
        try {
            const supabaseState = await loadAllStateFromSupabase(walletId);
            if (supabaseState) {
                // Save to localStorage and sync state
                localStorage.setItem(makeUserKey(KEY_PRC, walletId), supabaseState.prcWei.toString());
                localStorage.setItem(makeUserKey(KEY_DIAMOND, walletId), String(supabaseState.diamond));
                localStorage.setItem(makeUserKey(KEY_TAPS_USED, walletId), String(supabaseState.tapsUsed));
                localStorage.setItem(makeUserKey(KEY_TAP_CAP, walletId), String(supabaseState.tapCap));
                localStorage.setItem(makeUserKey(KEY_SELECTED_SKIN, walletId), supabaseState.selectedSkin);
                localStorage.setItem(makeUserKey(KEY_ENERGY, walletId), String(supabaseState.energy));
                localStorage.setItem(makeUserKey(KEY_MAX_ENERGY, walletId), String(supabaseState.maxEnergy));
                localStorage.setItem(makeUserKey(KEY_TODAY_INDEX, walletId), String(supabaseState.todayIndex));

                // YANGI: Save additional fields
                if (supabaseState.dailyWeekStart) {
                    localStorage.setItem(makeUserKey(KEY_DAILY_WEEK_START, walletId), supabaseState.dailyWeekStart);
                }
                if (supabaseState.dailyClaims) {
                    localStorage.setItem(makeUserKey(KEY_DAILY_CLAIMS, walletId), JSON.stringify(supabaseState.dailyClaims));
                }
                if (supabaseState.cardsLvl) {
                    localStorage.setItem(makeUserKey('proguzmir_cards_lvl', walletId), JSON.stringify(supabaseState.cardsLvl));
                }
                if (supabaseState.boosts) {
                    localStorage.setItem(makeUserKey('proguzmir_boosts', walletId), JSON.stringify(supabaseState.boosts));
                }
                // YANGI: Save keys
                localStorage.setItem(makeUserKey(KEY_KEYS_TOTAL, walletId), String(supabaseState.keysTotal));
                localStorage.setItem(makeUserKey(KEY_KEYS_USED, walletId), String(supabaseState.keysUsed));

                updateHeaderPRC();
                const diamondEl = document.getElementById('diamondTop');
                if (diamondEl) diamondEl.textContent = '💎 ' + supabaseState.diamond;
            }
        } catch (e) {
            console.warn('clientOnlyStartup: supabase load skipped or failed', e);
        }
    }

    renderAndWait();
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

async function loadHtmlIntoContent(url, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // OPTIMIZATSIYA: Agar quti ichida narsa bo'lsa, qayta yuklamasin!
    if (container.innerHTML.trim().length > 0) {
        console.log(`${containerId} allaqachon yuklangan, internet sarflamaymiz.`);
        return;
    }

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
            container.innerHTML = `<div style="padding:20px;color:red;">Xato: ${res.status}</div>`;
            return;
        }

        const html = await res.text();
        container.innerHTML = html;

        // Scriptlarni ishga tushirish (Sizdagi eski kod logikasi)
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const scripts = tmp.querySelectorAll('script');

        scripts.forEach(s => {
            const ns = document.createElement('script');
            if (s.src) {
                ns.src = s.getAttribute('src');
                ns.async = false;
            } else {
                ns.textContent = s.textContent;
            }
            document.body.appendChild(ns);
        });

    } catch (err) {
        console.error('Yuklashda xato:', err);
        container.innerHTML = `<div style="padding:20px;color:red;">Internet xatosi!</div>`;
    }
}
// --- NEW: header visibility control per page ---

// A) Qutilarni almashtirish (ID larni to'g'ri yozish shart!)
function switchSection(targetPage) {
    // HTML dagi ID lar ro'yxati (Sizning HTML ga moslab yozdim)
    const sections = {
        'game': 'gamecontent',       // HTMLda id="gamecontent"
        'rank': 'rankcontent',
        'wallet': 'walletcontent',
        'invite': 'invitecontent',
        'earn': 'earncontent',
        'shop': 'shopcontent',
        'daily': 'dailycontent',
        'gamelist': 'gamelistcontent',
        'income': 'incomecontent',
        'key': 'keycontent'
    };

    // 1. Hammasini yopamiz
    Object.values(sections).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 2. Keraklisini ochamiz
    const activeId = sections[targetPage];
    const activeEl = document.getElementById(activeId);
    if (activeEl) activeEl.style.display = 'block';
}

// B) Interfeys va Tugmalarni boshqarish
function updateInterface(pageName) {
    const header = document.querySelector('.header');
    const nav = document.querySelector('.nav');

    // Yashirinishi kerak bo'lgan sahifalar
    const hideNavPages = ['shop', 'key', 'daily', 'income', 'gamelist'];
    const hideHeaderPages = ['shop', 'key', 'daily', 'gamelist', 'rank', 'wallet', 'invite', 'earn'];

    // Header va Nav holati
    if (header) header.style.display = hideHeaderPages.includes(pageName) ? 'none' : 'flex';
    if (nav) nav.style.display = hideNavPages.includes(pageName) ? 'none' : 'flex';

    // O'yin effekti (faqat gamelist uchun)
    if (pageName !== 'gamelist') {
        document.body.classList.remove('is-gaming');
        const panel = document.querySelector('.panel');
        if (panel) panel.classList.remove('is-gaming');
    }

    // Fon rangini boshqarish
    const darkPages = ['rank', 'wallet', 'income'];
    if (darkPages.includes(pageName)) {
        document.body.style.background = "#06121a";
        document.body.style.backgroundImage = "none";
    } else {
        document.body.style.background = "";
        document.body.style.backgroundImage = "url('./image/background1.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
    }

    // TELEGRAM BACK BUTTON
    if (pageName === 'game') {
        Telegram.WebApp.BackButton.hide();
    } else {
        Telegram.WebApp.BackButton.show();
        Telegram.WebApp.BackButton.offClick(goBackSmart); // Eski eventni o'chiramiz
        Telegram.WebApp.BackButton.onClick(goBackSmart);  // Yangisini ulaymiz
    }
}


// ==================================================
// 3. NAVIGATSIYA MANTIQI (ROUTER)
// ==================================================

// A) Aqlli Orqaga Qaytish
function goBackSmart() {
    // Asosiy Tablar (Bular GAME ga qaytadi)
    const mainTabs = ['rank', 'wallet', 'invite', 'earn'];

    // Ichki Sahifalar (Bular lastMainTab ga qaytadi)
    const subPages = ['shop', 'key', 'daily', 'income', 'gamelist'];

    if (mainTabs.includes(currentPage)) {
        // Rank, Wallet, Earn -> GAME
        handleGlobalNavigation('game');
    }
    else if (subPages.includes(currentPage)) {
        // Shop, Daily -> Qayerdan kelgan bo'lsa o'sha yerga (Earn yoki Game)
        handleGlobalNavigation(lastMainTab);
    }
    else {
        // Xavfsizlik uchun
        handleGlobalNavigation('game');
    }
}

// B) Asosiy O'tish Funksiyasi (Router)
async function handleGlobalNavigation(targetPage) {
    console.log("O'tilmoqda:", targetPage);

    // 1. Hozirgi sahifani yangilaymiz
    currentPage = targetPage;

    // 2. Agar bu ASOSIY TAB bo'lsa, eslab qolamiz
    const allMainTabs = ['game', 'rank', 'wallet', 'invite', 'earn'];
    if (allMainTabs.includes(targetPage)) {
        lastMainTab = targetPage;
    }

    // 3. Interfeysni yangilash
    updateInterface(targetPage);

    // 4. Qutini almashtirish
    switchSection(targetPage);

    // ============================================================
    // 5. PASTKI MENYU VA INDIKATORNI BOSHQARISH (YANGILANGAN QISM)
    // ============================================================

    // Faqat Asosiy Tablar uchun ishlaydi
    if (allMainTabs.includes(targetPage)) {
        const nav = document.querySelector('.nav');
        const indicator = nav?.querySelector('.nav-indicator');
        const allTabs = nav?.querySelectorAll('.tab');

        if (nav && allTabs) {
            allTabs.forEach((tab, index) => {
                // 1. Aktiv klassni o'chirish/yoqish
                if (tab.dataset.tab === targetPage) {
                    tab.classList.add('active');

                    // 2. Indikatorni shu tabga surish (Sizning kodingiz)
                    if (indicator) {
                        indicator.style.left = `calc(${index * 20 + 10}% - 45px)`;
                    }
                } else {
                    tab.classList.remove('active');
                }
            });
        }
    }

    // ============================================================

    // 6. Kontentni yuklash (Render)
    if (targetPage === 'earn') await loadHtmlIntoContent('./earn/earn.html', 'earncontent');
    else if (targetPage === 'rank') {
        await loadHtmlIntoContent('./rank/rank.html', 'rankcontent');
        if (typeof initRankPage === 'function') initRankPage();
    }
    else if (targetPage === 'wallet') {
        await loadHtmlIntoContent('./wallet/wallet.html', 'walletcontent');
        if (window.initTonWallet) window.initTonWallet();
    }
    else if (targetPage === 'invite') {
        await loadHtmlIntoContent('./friends/friends.html', 'invitecontent');
        if (typeof initInvite === 'function') initInvite();
    }
    else if (targetPage === 'shop' && typeof renderShop === 'function') renderShop();
    else if (targetPage === 'daily' && typeof renderDaily === 'function') renderDaily();
    else if (targetPage === 'income') await loadHtmlIntoContent('./income/income.html', 'incomecontent');
    else if (targetPage === 'key') await loadHtmlIntoContent('./key/key.html', 'keycontent');
    else if (targetPage === 'gamelist') {
        document.body.classList.add('is-gaming');
        const panel = document.querySelector('.panel');
        if (panel) panel.classList.add('is-gaming');
        if (typeof renderGames === 'function') renderGames();
    }
}


// ==================================================
// 4. EVENT LISTENERS (CLICK)
// ==================================================

document.addEventListener('click', (ev) => {
    const target = ev.target;

    // 1. ORQAGA TUGMALARI (Manual bosilganda)
    const backIds = ['incomeBack', 'keyBack', 'shopBack', 'dailyBack', 'backFromGame'];
    if (backIds.includes(target.id) || target.closest('#backFromGame')) {
        ev.preventDefault();
        goBackSmart(); // <-- Bu funksiyani chaqiramiz
        return;
    }

    // 2. TABLAR (Pastki menyu)
    const tabEl = target.closest('.nav .tab');
    if (tabEl) {
        handleGlobalNavigation(tabEl.dataset.tab);
        return;
    }

    // 3. BOSHQA MENYU TUGMALARI
    if (target.closest('#shopCardPreview')) return handleGlobalNavigation('shop');
    if (target.closest('#dailyBtn')) return handleGlobalNavigation('daily');
    if (target.closest('#gameCardPreview')) return handleGlobalNavigation('gamelist');

    if (target.closest('#incomeCardPreview') || target.closest('#incomeBtn')) {
        ev.preventDefault();
        return handleGlobalNavigation('income');
    }
    if (target.closest('#luckyKeyBtn')) return handleGlobalNavigation('key');
});



// Replace the Supabase sync invocation in saveState with a guarded version
function saveState(state) {
    // prefer explicit state.wallet but fallback to persisted KEY_WALLET
    const wallet = state.wallet || localStorage.getItem(KEY_WALLET) || "";
    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);
    const keyTaps = makeUserKey(KEY_TAPS_USED, wallet);
    const keyCap = makeUserKey(KEY_TAP_CAP, wallet);
    const keySkin = makeUserKey(KEY_SELECTED_SKIN, wallet);
    const keyEnergy = makeUserKey(KEY_ENERGY, wallet);
    const keyMaxEnergy = makeUserKey(KEY_MAX_ENERGY, wallet);
    const keyTodayIndex = makeUserKey(KEY_TODAY_INDEX, wallet);
    const keyRank = makeUserKey(KEY_RANK, wallet);  // YANGI: Rank key
    const keyKeysTotal = makeUserKey(KEY_KEYS_TOTAL, wallet);
    const keyKeysUsed = makeUserKey(KEY_KEYS_USED, wallet);

    // ensure state.wallet stored so subsequent loads use same identifier
    if (!state.wallet && wallet) state.wallet = wallet;

    localStorage.setItem(keyPRC, state.prcWei.toString());
    localStorage.setItem(keyDiamond, String(state.diamond));
    localStorage.setItem(keyTaps, String(state.tapsUsed));
    localStorage.setItem(keyCap, String(state.tapCap));
    // ensure energy/maxEnergy saved with sensible defaults (avoid writing "undefined")
    const maxE = (typeof state.maxEnergy === 'number' && !Number.isNaN(state.maxEnergy)) ? state.maxEnergy : DEFAULT_MAX_ENERGY;
    const en = (typeof state.energy === 'number' && !Number.isNaN(state.energy)) ? Math.min(state.energy, maxE) : maxE;
    localStorage.setItem(keyEnergy, String(en));
    localStorage.setItem(keyMaxEnergy, String(maxE));
    if (typeof state.todayIndex === 'number') localStorage.setItem(keyTodayIndex, String(state.todayIndex));
    if (state.rank) localStorage.setItem(keyRank, state.rank);  // YANGI: Rank saqlash

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

    // Local-only snapshot (no server sync)
    try {
        if (typeof saveSnapshotToLocal === 'function') saveSnapshotToLocal(state);
    } catch (err) {
        console.warn('saveState: snapshot error', err);
    }

    // Non-blocking Supabase sync (best-effort) — guarded to avoid ReferenceError
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof syncSnapshotToSupabase === 'function') {
            // call existing helper if present
            syncSnapshotToSupabase(state).catch(e => console.warn('Supabase sync failed', e));
        } else {
            // if no helper, optionally perform a minimal best-effort upsert when publishable client exists
            if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof supabaseClient.from === 'function') {
                // best-effort, non-blocking write (don't await)
                (async () => {
                    try {
                        await supabaseClient.from('user_states').upsert({
                            wallet: state.wallet || localStorage.getItem(KEY_WALLET) || 'guest',
                            prc_wei: String(state.prcWei || '0'),
                            diamond: state.diamond || 0,
                            taps_used: state.tapsUsed || 0,
                            tap_cap: state.tapCap || 0,
                            selected_skin: state.selectedSkin || null,
                            energy: state.energy || 0,
                            max_energy: state.maxEnergy || 0,
                            today_index: state.todayIndex || 0,
                            updated_at: new Date().toISOString()
                        });
                    } catch (e) {
                        // swallow errors — sync is best-effort
                        console.warn('Supabase best-effort upsert failed', e);
                    }
                })();
            }
        }
    } catch (e) {
        console.warn('Supabase sync invocation error', e);
    }
}



// YANGI: Helper function to load all state from Supabase
async function loadAllStateFromSupabase(walletId) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return null;

        const { data, error } = await supabaseClient
            .from('user_states')
            .select('*')
            .eq('wallet', walletId)
            .single();

        if (error || !data) return null;

        // Parse JSON fields
        const dailyClaims = data.daily_claims ? JSON.parse(data.daily_claims) : null;
        const cardsLvl = data.cards_lvl ? JSON.parse(data.cards_lvl) : null;
        const boosts = data.boosts ? JSON.parse(data.boosts) : null;

        return {
            prcWei: BigInt(data.prc_wei || '0'),
            diamond: data.diamond || 0,
            wallet: data.wallet,
            tapsUsed: data.taps_used || 0,
            tapCap: data.tap_cap || DEFAULT_TAP_CAP,
            selectedSkin: data.selected_skin || "",
            energy: data.energy || DEFAULT_MAX_ENERGY,
            maxEnergy: data.max_energy || DEFAULT_MAX_ENERGY,
            todayIndex: data.today_index || 0,
            dailyWeekStart: data.daily_week_start || null,
            dailyClaims: dailyClaims,
            cardsLvl: cardsLvl,
            boosts: boosts,
            // YANGI: keys fields
            keysTotal: data.keys_total || 0,
            keysUsed: data.keys_used || 0
        };
    } catch (e) {
        console.warn('loadAllStateFromSupabase error:', e);
        return null;
    }
}

// --- UPDATED: clientOnlyStartup() ---
(async function clientOnlyStartup() {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser && tgUser.id) {
        const walletId = String(tgUser.id);
        localStorage.setItem(KEY_WALLET, walletId);

        // YANGI: Load ALL data from Supabase using helper
        try {
            const supabaseState = await loadAllStateFromSupabase(walletId);
            if (supabaseState) {
                // Save to localStorage and sync state
                localStorage.setItem(makeUserKey(KEY_PRC, walletId), supabaseState.prcWei.toString());
                localStorage.setItem(makeUserKey(KEY_DIAMOND, walletId), String(supabaseState.diamond));
                localStorage.setItem(makeUserKey(KEY_TAPS_USED, walletId), String(supabaseState.tapsUsed));
                localStorage.setItem(makeUserKey(KEY_TAP_CAP, walletId), String(supabaseState.tapCap));
                localStorage.setItem(makeUserKey(KEY_SELECTED_SKIN, walletId), supabaseState.selectedSkin);
                localStorage.setItem(makeUserKey(KEY_ENERGY, walletId), String(supabaseState.energy));
                localStorage.setItem(makeUserKey(KEY_MAX_ENERGY, walletId), String(supabaseState.maxEnergy));
                localStorage.setItem(makeUserKey(KEY_TODAY_INDEX, walletId), String(supabaseState.todayIndex));

                // YANGI: Save additional fields
                if (supabaseState.dailyWeekStart) {
                    localStorage.setItem(makeUserKey(KEY_DAILY_WEEK_START, walletId), supabaseState.dailyWeekStart);
                }
                if (supabaseState.dailyClaims) {
                    localStorage.setItem(makeUserKey(KEY_DAILY_CLAIMS, walletId), JSON.stringify(supabaseState.dailyClaims));
                }
                if (supabaseState.cardsLvl) {
                    localStorage.setItem(makeUserKey('proguzmir_cards_lvl', walletId), JSON.stringify(supabaseState.cardsLvl));
                }
                if (supabaseState.boosts) {
                    localStorage.setItem(makeUserKey('proguzmir_boosts', walletId), JSON.stringify(supabaseState.boosts));
                }
                // YANGI: Save keys
                localStorage.setItem(makeUserKey(KEY_KEYS_TOTAL, walletId), String(supabaseState.keysTotal));
                localStorage.setItem(makeUserKey(KEY_KEYS_USED, walletId), String(supabaseState.keysUsed));

                updateHeaderPRC();
                const diamondEl = document.getElementById('diamondTop');
                if (diamondEl) diamondEl.textContent = '💎 ' + supabaseState.diamond;
            }
        } catch (e) {
            console.warn('clientOnlyStartup: supabase load skipped or failed', e);
        }
    }

    renderAndWait();
})();
// index.js ichidagi saveUserState funksiyasi

async function saveUserState(state) {
    let st = state;
    try { if (!st) st = loadState(); } catch (e) { st = null; }
    if (!st) return;

    if (!window.Telegram?.WebApp?.initData) return;

    const wallet = st.wallet || localStorage.getItem(KEY_WALLET) || "";
    // ... boshqa kalitlar ...
    const keyKeysTotal = makeUserKey(KEY_KEYS_TOTAL, wallet);
    const keyKeysUsed = makeUserKey(KEY_KEYS_USED, wallet);

    // LocalStorage dan hamyon manzillarini olamiz (ton.js va cripto.js yozgan joydan)
    // Kalitlar ton.js va cripto.js dagi bilan bir xil bo'lishi kerak!
    const localTonWallet = localStorage.getItem("proguzmir_ton_wallet");
    const localCryptoWallet = localStorage.getItem("proguzmir_crypto_wallet");

    // ... boshqa o'qishlar ...
    const keysTotal = parseInt(localStorage.getItem(keyKeysTotal) || '0', 10);
    const keysUsed = parseInt(localStorage.getItem(keyKeysUsed) || '0', 10);

    const payload = {
        initData: Telegram.WebApp.initData,
        state: {
            prcWei: String(st.prcWei),
            diamond: st.diamond,
            energy: st.energy,
            maxEnergy: st.maxEnergy,
            tapsUsed: st.tapsUsed,
            selectedSkin: st.selectedSkin,
            todayIndex: st.todayIndex,
            dailyWeekStart: localStorage.getItem(makeUserKey(KEY_DAILY_WEEK_START, wallet)),
            dailyClaims: JSON.parse(localStorage.getItem(makeUserKey(KEY_DAILY_CLAIMS, wallet)) || 'null'),
            cardsLvl: JSON.parse(localStorage.getItem(makeUserKey('proguzmir_cards_lvl', wallet)) || 'null'),
            boosts: JSON.parse(localStorage.getItem(makeUserKey('proguzmir_boosts', wallet)) || 'null'),
            claimDate: localStorage.getItem(makeUserKey(KEY_REKLAM_CLAIM, wallet)),
            keysTotal: keysTotal,
            keysUsed: keysUsed,

            // ❗ YANGI: Hamyonlarni payloadga qo'shamiz
            tonWallet: localTonWallet,
            cryptoWallet: localCryptoWallet
        }
    };

    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        });
    } catch (err) {
        console.warn('saveUserState error', err);
    }
}
// index.js ichidagi setupAutoSave funksiyasi

function setupAutoSave() {
    setInterval(() => {
        try { saveUserState(); } catch (e) { console.warn('autosave failed', e); }
    }, 30000);

    window.addEventListener('beforeunload', () => {
        try {
            const st = loadState();
            if (!st || !window.Telegram?.WebApp?.initData) return;

            const wallet = st.wallet || localStorage.getItem(KEY_WALLET) || "";
            // ... boshqa o'zgaruvchilar ...

            // ❗ Hamyonlarni o'qish
            const localTonWallet = localStorage.getItem("proguzmir_ton_wallet");
            const localCryptoWallet = localStorage.getItem("proguzmir_crypto_wallet");

            const payload = {
                initData: Telegram.WebApp.initData,
                state: {
                    prcWei: String(st.prcWei),
                    diamond: st.diamond,
                    // ... boshqa state maydonlari ...
                    keysTotal: parseInt(localStorage.getItem(makeUserKey(KEY_KEYS_TOTAL, wallet)) || '0', 10),
                    keysUsed: parseInt(localStorage.getItem(makeUserKey(KEY_KEYS_USED, wallet)) || '0', 10),

                    // ❗ YANGI: Payloadga qo'shish
                    tonWallet: localTonWallet,
                    cryptoWallet: localCryptoWallet
                }
            };

            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon('/api/save', blob);
            } else {
                fetch('/api/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true
                }).catch(() => { });
            }
        } catch (e) { }
    });

    // Telegram viewport changes: save snapshot (if API available)
    try {
        if (window.Telegram?.WebApp?.onEvent && typeof Telegram.WebApp.onEvent === 'function') {
            Telegram.WebApp.onEvent('viewportChanged', () => { try { saveUserState(); } catch (e) { /* ignore */ } });
        }
    } catch (e) { /* ignore */ }
}


async function loadUserState() {
    if (!window.Telegram?.WebApp?.initData) return null;
    try {
        const res = await fetch('/api/load', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: Telegram.WebApp.initData }),
            keepalive: true
        });
        if (!res.ok) return null;
        const result = await res.json();
        if (!result?.user) return null;

        // JSON maydonlarni xavfsiz o'qish
        const safeParse = (val) => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'string') return JSON.parse(val);
            return val;
        };

        return {
            prcWei: BigInt(result.user.prc_wei || '0'),
            diamond: Number(result.user.diamond || 0),
            energy: Number(result.user.energy || 0),
            maxEnergy: Number(result.user.max_energy || 0),
            tapsUsed: Number(result.user.taps_used || 0),
            selectedSkin: result.user.selected_skin || '',
            todayIndex: Number(result.user.today_index || 0),

            dailyWeekStart: result.user.daily_week_start || null,
            dailyClaims: safeParse(result.user.daily_claims),
            cardsLvl: safeParse(result.user.cards_lvl),
            boosts: safeParse(result.user.boosts),
            claimDate: result.user.claim_date || null,
            wallet: result.user.wallet || "", // Bu tg_id

            keysTotal: Number(result.user.keys_total || 0),
            keysUsed: Number(result.user.keys_used || 0),

            // ❗ YANGI: Hamyon manzillarini qabul qilish
            tonWallet: result.user.ton_wallet || null,
            cryptoWallet: result.user.crypto_wallet || null
        };
    } catch (err) {
        console.warn('loadUserState error', err);
        return null;
    }
}
// index.js oxiridagi DOMContentLoaded qismi

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const saved = await loadUserState();
        if (saved) {
            if (typeof restoreState === 'function') {
                restoreState(saved);
            } else {
                // Fallback: State ni tiklash
                const st = {
                    prcWei: saved.prcWei,
                    diamond: saved.diamond,
                    energy: saved.energy,
                    maxEnergy: saved.maxEnergy,
                    tapsUsed: saved.tapsUsed,
                    selectedSkin: saved.selectedSkin,
                    todayIndex: saved.todayIndex,
                    wallet: saved.wallet, // tg_id

                    dailyWeekStart: saved.dailyWeekStart,
                    dailyClaims: saved.dailyClaims,
                    cardsLvl: saved.cardsLvl,
                    boosts: saved.boosts,
                    keysTotal: saved.keysTotal,
                    keysUsed: saved.keysUsed,

                    // ❗ YANGI: Hamyonlar
                    tonWallet: saved.tonWallet,
                    cryptoWallet: saved.cryptoWallet
                };

                // LocalStorage ga qo'shimcha maydonlarni saqlash
                if (st.wallet) {
                    if (st.dailyWeekStart) localStorage.setItem(makeUserKey(KEY_DAILY_WEEK_START, st.wallet), st.dailyWeekStart);
                    if (st.dailyClaims) localStorage.setItem(makeUserKey(KEY_DAILY_CLAIMS, st.wallet), JSON.stringify(st.dailyClaims));
                    if (st.cardsLvl) localStorage.setItem(makeUserKey('proguzmir_cards_lvl', st.wallet), JSON.stringify(st.cardsLvl));
                    if (st.boosts) localStorage.setItem(makeUserKey('proguzmir_boosts', st.wallet), JSON.stringify(st.boosts));
                    if (st.keysTotal) localStorage.setItem(makeUserKey(KEY_KEYS_TOTAL, st.wallet), String(st.keysTotal));
                    if (st.keysUsed) localStorage.setItem(makeUserKey(KEY_KEYS_USED, st.wallet), String(st.keysUsed));

                    // ❗ YANGI: Agar bazada hamyon bo'lsa, uni LocalStorage ga tiklaymiz
                    // Shunda ton.js va cripto.js buni ko'rib, UI ni yangilaydi
                    if (st.tonWallet) {
                        localStorage.setItem("proguzmir_ton_wallet", st.tonWallet); // ton.js dagi kalit bilan bir xil bo'lsin
                        localStorage.setItem("proguzmir_ton_type", "ton");
                    }
                    if (st.cryptoWallet) {
                        localStorage.setItem("proguzmir_crypto_wallet", st.cryptoWallet); // cripto.js dagi kalit bilan bir xil bo'lsin
                        localStorage.setItem("proguzmir_crypto_type", "evm");
                    }
                }

                saveState(st);
            }
        } else {
            if (typeof initNewUser === 'function') initNewUser();
        }
    } catch (e) { console.warn('startup load error', e); }

    setupAutoSave();
});

// --- REFERALNI ALOHIDA SAQLASH ---
async function processReferral() {
    const urlParams = new URLSearchParams(window.location.search);
    let startParam = urlParams.get('start_param') || window.Telegram?.WebApp?.initDataUnsafe?.start_param;

    if (!startParam) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const userId = localStorage.getItem('proguzmir_wallet') || (tgUser ? String(tgUser.id) : null);

    // --- YANGI: Premium ekanligini aniqlash ---
    const isPremium = tgUser?.is_premium || false;

    if (!userId) return;

    try {
        const res = await fetch('/api/referral_save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                startParam: startParam,
                isPremium: isPremium // <-- Serverga yuboramiz
            })
        });

        const json = await res.json();
        if (json.success) {
            showToast("You were invited by a friend!");
        }
    } catch (e) {
        console.warn("Referral API call failed:", e);
    }
}

// Ilova ochilganda 1 marta ishlaydi
setTimeout(processReferral, 1000);
