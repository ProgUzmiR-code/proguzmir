// helpers to get/set daily data in localStorage

function dailyWeekStartKey(wallet) { return makeUserKey(KEY_DAILY_WEEK_START, wallet); }
function dailyClaimsKey(wallet) { return makeUserKey(KEY_DAILY_CLAIMS, wallet); }

function getDailyData(wallet) {
    // returns { weekStartISO, claims: [bool...7] }
    const ws = localStorage.getItem(dailyWeekStartKey(wallet)) || null;
    const clRaw = localStorage.getItem(dailyClaimsKey(wallet)) || null;
    let claims = null;
    try { claims = clRaw ? JSON.parse(clRaw) : null; } catch (e) { claims = null; }
    if (!claims || !Array.isArray(claims) || claims.length !== 7) {
        claims = [false, false, false, false, false, false, false];
    }
    return { weekStartISO: ws, claims };
}
function setDailyData(wallet, weekStartISO, claims) {
    localStorage.setItem(dailyWeekStartKey(wallet), weekStartISO || "");
    localStorage.setItem(dailyClaimsKey(wallet), JSON.stringify(claims));

    // YANGI: Sync to Supabase
    try {
        if (typeof saveUserState === 'function') {
            const st = loadState();
            st.dailyWeekStart = weekStartISO;
            st.dailyClaims = claims;
            saveUserState(st);
        }
    } catch (e) { console.warn('Daily sync to Supabase failed', e); }
}

// helper: get index (0..6) for today relative to weekStartISO; if weekStartISO null -> create new week start = today
function getDailyIndexForToday(weekStartISO) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!weekStartISO) return 0;
    const ws = new Date(weekStartISO);
    ws.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - ws) / 86400000);
    if (diffDays < 0 || diffDays > 6) return null; // out of current week
    return diffDays;
}

// helpers to hide/show bottom header
function hideheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = 'none'; }
function showheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = ''; }
function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }
// helpers to hide/show bottom nav
function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
// rewards: days 0..5 -> 1 diamond, day6 (7th day) -> bigday 5 diamonds

function formatReward(num) {
    if (num >= 1000) {
        return (num / 1000) + 'k';
    }
    return num;
}

// --- ADD: renderDaily UI and logic (standalone page inside content) ---
function renderDaily() {
    const s = loadState();

    const wallet = s.wallet || localStorage.getItem(KEY_WALLET) || "";
    let { weekStartISO, claims } = getDailyData(wallet);

    // if no weekStart or week expired, start new week today (weekStart = today)
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!weekStartISO) {
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
        setDailyData(wallet, weekStartISO, claims);
    }
    // compute today's index (0..6) or reset if outside range
    let todayIndex = getDailyIndexForToday(weekStartISO);

    // 🔥 NEW: Check if user missed a day (has unclaimed days before today that are now locked)
    if (todayIndex !== null && todayIndex > 0) {
        // Check if there's any unclaimed day before today
        let missedDay = false;
        for (let i = 0; i < todayIndex; i++) {
            if (!claims[i]) {
                // Found an unclaimed day before today — user missed it
                missedDay = true;
                break;
            }
        }
        if (missedDay) {
            // Reset week: start fresh from today as Day 1
            weekStartISO = today.toISOString();
            claims = [false, false, false, false, false, false, false];
            todayIndex = 0;
            setDailyData(wallet, weekStartISO, claims);
        }
    }

    // 🔥 todayIndex ni global state ga yozamiz
    const st = loadState();
    st.todayIndex = todayIndex;
    saveState(st);

    if (todayIndex === null) {
        // start new week
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
        todayIndex = 0;
        setDailyData(wallet, weekStartISO, claims);
    }

    // show Telegram BackButton and set it to return to main renderGame
    showTelegramBack(() => { showNav(); renderGame(); });

    // build calendar markup
    const items = [];
    const dailyisToday = [dayNum = 1];

    for (let i = 0; i < 7; i++) {
        const dayNum = i + 1;
        const claimed = !!claims[i];
        const reward = DAILY_REWARDS[i];
        const isToday = (i === todayIndex);
        console.log(dayNum + " day: " + "isToday: " + isToday);
        const cls = claimed ? 'claimed' : isToday ? 'today' : '';
        const label = (i === 6) ? 'BIG DAY' : `Day ${dayNum}`;
        const labelD = (i === 6) ? `💎` : `💎`;
        const labelfont = (i === 6) ? 'font-size:13px;' : ``;
        const formattedReward = formatReward(reward); // format reward for display
        items.push(`
			<div class="daily-day ${cls}" data-index="${i}" style="display:flex;flex-direction:column;align-items:center;padding:12px;background:rgba(0, 0, 0, 0.43);border-radius:10px;">
				<img src="./image/daily.png" alt="${label}" style="width:62px;height:62px;object-fit:cover;border-radius:8px;margin-bottom:8px;opacity:${claimed ? 0.5 : 1}">
				<div style="${labelfont} font-weight:700;margin-bottom:4px;position:absolute;padding: 33px 0 0 0;color: black;">${label}</div>
				<div style="font-weight:700;font-size:13px;color:#ddd;margin-bottom:6px;display: flex;"> ${formattedReward}  ${labelD}</div>
				<div>${claimed ? '<span style="color:#8f8">Claimed</span>' : (isToday ? '<button class="claimTodayBtn">Claim</button>' : '<span style="opacity:0.6">Locked</span>')}</div>
			</div>
		`);
    }

    content.innerHTML = `
		<div style="padding: 66px 2px 18px;"">
			<div style="display:flex;align-items:center;justify-content:center;margin-bottom:12px;margin-top: 90px;">
				<div style="font-weight:800;font-size:18px;position: absolute;">Daily Rewards</div>
				<button id="dailyBack" class="btn">Back</button>
				<div style="width:72px"></div>
			</div>
			<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));gap:10px;">
				${items.join('')}
			</div>
			<div style="margin-top:12px;color:#bbb;font-size:13px;">Collect today's reward. 7th day is BIGDAY. Miss a day = reset to Day 1.</div>
		</div>
	    `;
    // hide bottom nav and enable Telegram Back to return to game
    hideNav();
    showTelegramBack(() => { hideTelegramBack(); showNav(); renderGame(); });
    // hide bottom nav and enable Telegram Back to return to game
    hideheader();
    showTelegramBack(() => { hideTelegramBack(); showheader(); renderGame(); });
    // back handler
    document.getElementById('dailyBack').addEventListener('click', () => { hideTelegramBack(); showNav(); showheader(); renderGame(); });
    // claim handler (only today's button)
    const btn = content.querySelector('.claimTodayBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            // re-load to avoid race
            const ddata = getDailyData(wallet);
            let idx = getDailyIndexForToday(ddata.weekStartISO);

            // 🔥 NEW: Re-check for missed days before allowing claim
            if (idx !== null && idx > 0) {
                let missedDay = false;
                for (let i = 0; i < idx; i++) {
                    if (!ddata.claims[i]) {
                        missedDay = true;
                        break;
                    }
                }
                if (missedDay) {
                    const newStart = today.toISOString();
                    const newClaims = [false, false, false, false, false, false, false];
                    setDailyData(wallet, newStart, newClaims);
                    showToast('You missed a day — reset to Day 1');
                    renderDaily();
                    return;
                }
            }

            if (idx === null) {
                // week expired, reset
                const newStart = (new Date()).toISOString();
                const newClaims = [false, false, false, false, false, false, false];
                setDailyData(wallet, newStart, newClaims);
                showToast('Week reset — claim again.');
                renderDaily();
                return;
            }
            if (ddata.claims[idx]) { showToast('Today already claimed'); return; }

            // mark claimed
            ddata.claims[idx] = true;
            setDailyData(wallet, ddata.weekStartISO, ddata.claims);

            // reward: always give diamonds for every day (including BIG DAY)
            const st = loadState();
            const reward = DAILY_REWARDS[idx] || 1;
            st.diamond = (st.diamond || 0) + reward;
            saveState(st);
            animateAddPRC('+' + reward + ' 💎');
            showToast(`You received ${reward} diamonds!`);

            // update UI locally
            renderDaily();
            // YANGI: update the Earn page's daily login icon if the function exists
            if (window.updateDailyLoginTaskIcon && typeof window.updateDailyLoginTaskIcon === 'function') {
                window.updateDailyLoginTaskIcon();
            }
        });
    }


}
