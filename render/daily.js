export function renderDaily() {
    const content = document.getElementById('content');
    const s = loadState();
    const wallet = s.wallet || localStorage.getItem(KEY_WALLET) || "";
    let { weekStartISO, claims } = getDailyData(wallet);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!weekStartISO) {
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
        setDailyData(wallet, weekStartISO, claims);
    }
    
    let todayIndex = getDailyIndexForToday(weekStartISO);
    if (todayIndex === null) {
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
        todayIndex = 0;
        setDailyData(wallet, weekStartISO, claims);
    }
    
    showTelegramBack(() => { showNav(); window.openGame(); });

    const items = [];
    for (let i = 0; i < 7; i++) {
        const dayNum = i + 1;
        const claimed = !!claims[i];
        const reward = DAILY_REWARDS[i];
        const isToday = (i === todayIndex);
        const cls = claimed ? 'claimed' : isToday ? 'today' : '';
        const label = (i === 6) ? 'BIG DAY' : `Day ${dayNum}`;
        items.push(`
            <div class="daily-day ${cls}" data-index="${i}" style="display:flex;flex-direction:column;align-items:center;padding:12px;background:rgba(0, 0, 0, 0.43);border-radius:10px;">
                <img src="./image/daily.png" alt="${label}" style="width:62px;height:62px;object-fit:cover;border-radius:8px;margin-bottom:8px;opacity:${claimed ? 0.5 : 1}">
                <div style="font-weight:700;margin-bottom:4px;">${label}</div>
                <div style="font-size:13px;color:#ddd;margin-bottom:6px;">Reward: ${reward}💎</div>
                <div>${claimed ? '<span style="color:#8f8">Claimed</span>' : (isToday ? '<button class="claimTodayBtn">Claim</button>' : '<span style="opacity:0.6">Locked</span>')}</div>
            </div>
        `);
    }

    content.innerHTML = `
        <div style="padding: 66px 2px 18px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <button id="dailyBack" class="btn">Back</button>
                <div style="font-weight:800;font-size:18px;">Daily Rewards</div>
                <div style="width:72px"></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));gap:10px;">
                ${items.join('')}
            </div>
            <div style="margin-top:12px;color:#bbb;font-size:13px;">Collect today's reward. 7th day is BIGDAY.</div>
        </div>
    `;

    hideNav();
    showTelegramBack(() => { hideTelegramBack(); showNav(); window.openGame(); });

    document.getElementById('dailyBack').addEventListener('click', () => { hideTelegramBack(); showNav(); window.openGame(); });

    const btn = content.querySelector('.claimTodayBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            const ddata = getDailyData(wallet);
            const idx = getDailyIndexForToday(ddata.weekStartISO);
            if (idx === null) {
                const newStart = (new Date()).toISOString();
                const newClaims = [false, false, false, false, false, false, false];
                setDailyData(wallet, newStart, newClaims);
                showToast('Week reset — claim again.');
                renderDaily();
                return;
            }
            if (ddata.claims[idx]) { showToast('Today already claimed'); return; }
            ddata.claims[idx] = true;
            setDailyData(wallet, ddata.weekStartISO, ddata.claims);
            const reward = DAILY_REWARDS[idx] || 1;
            const st = loadState();
            st.diamond = (st.diamond || 0) + reward;
            saveState(st);
            animateAddPRC('+' + reward + ' 💎');
            showToast(`You received ${reward} diamonds!`);
            renderDaily();
        });
    }
}
