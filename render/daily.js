
function formatReward(num) {
    if (num >= 1000) {
        return (num / 1000) + 'k';
    }
    return num;
}

// helper: get index (0..6) for today relative to weekStartISO
function getDailyIndexForToday(weekStartISO) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (!weekStartISO) return 0;
    const ws = new Date(weekStartISO);
    ws.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - ws) / 86400000);
    if (diffDays < 0 || diffDays > 6) return null; // out of current week
    return diffDays;
}

// --- ADD: renderDaily UI and logic ---
function renderDaily() {
    const dailycontent = document.getElementById('dailycontent');
    if (!dailycontent) return;

    // ❌ XATO EDI: const s = loadState(); 
    // ✅ TO'G'RI: Global 'state' dan foydalanamiz!
    if (!state) return; 

    // Bugungi sana (faqat yil-oy-kunni olish)
    const today = new Date(); 
    today.setHours(0, 0, 0, 0);

    // Xotiradan kelgan eski ma'lumotlarni o'qiymiz
    let weekStartISO = state.dailyWeekStart;
    let claims = state.dailyClaims;

    // Agar ma'lumot umuman yo'q bo'lsa (yangi foydalanuvchi)
    if (!weekStartISO || !claims || claims.length !== 7) {
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
    }

    let todayIndex = getDailyIndexForToday(weekStartISO);

    // 🔥 NEW: Foydalanuvchi qaysidir kunni o'tkazib yuborganligini tekshiramiz
    if (todayIndex !== null && todayIndex > 0) {
        let missedDay = false;
        for (let i = 0; i < todayIndex; i++) {
            if (!claims[i]) {
                missedDay = true;
                break;
            }
        }
        if (missedDay) {
            // Kunni o'tkazib yuborgan, Noldan boshlanadi
            weekStartISO = today.toISOString();
            claims = [false, false, false, false, false, false, false];
            todayIndex = 0;
        }
    }

    // Agar hafta tugagan bo'lsa
    if (todayIndex === null) {
        weekStartISO = today.toISOString();
        claims = [false, false, false, false, false, false, false];
        todayIndex = 0;
    }

    // 🔄 Ma'lumotlarni global state'ga yozib qo'yamiz (Serverga ketishi uchun)
    state.dailyWeekStart = weekStartISO;
    state.dailyClaims = claims;
    state.todayIndex = todayIndex;

    // Kalendar HTML yasaymiz
    const items = [];
    for (let i = 0; i < 7; i++) {
        const dayNum = i + 1;
        const claimed = !!claims[i];
        const reward = DAILY_REWARDS[i];
        const isToday = (i === todayIndex);
        
        const cls = claimed ? 'claimed' : isToday ? 'today' : '';
        const label = (i === 6) ? 'BIG DAY' : `Day ${dayNum}`;
        const labelD = `💎`;
        const labelfont = (i === 6) ? 'font-size:13px;' : ``;
        const formattedReward = formatReward(reward); 

        items.push(`
            <div class="daily-day ${cls}" data-index="${i}" style="display:flex;flex-direction:column;align-items:center;padding:12px;background:rgba(0, 0, 0, 0.43);border-radius:10px;">
                <img src="./image/daily.png" alt="${label}" style="width:62px;height:62px;object-fit:cover;border-radius:8px;margin-bottom:8px;opacity:${claimed ? 0.5 : 1}">
                <div style="${labelfont} font-weight:700;margin-bottom:4px;position:absolute;padding: 33px 0 0 0;color: black;">${label}</div>
                <div style="font-weight:700;font-size:13px;color:#ddd;margin-bottom:6px;display: flex;"> ${formattedReward}  ${labelD}</div>
                <div>${claimed ? '<span style="color:#8f8">Claimed</span>' : (isToday ? '<button class="claimTodayBtn">Claim</button>' : '<span style="opacity:0.6">Locked</span>')}</div>
            </div>
        `);
    }

    dailycontent.innerHTML = `
        <div style="padding: 66px 2px 18px;">
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

    // Tugma bosilganda ishlash logikasi
    const btn = dailycontent.querySelector('.claimTodayBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            // Ehtiyot chorasi sifatida qayta tekshiramiz
            let idx = getDailyIndexForToday(state.dailyWeekStart);
            
            if (idx === null || state.dailyClaims[idx]) { 
                showToast('Already claimed or week reset.'); 
                return; 
            }

            // Olinganlik belgisini qo'yamiz
            state.dailyClaims[idx] = true;

            // Mukofotni qo'shamiz
            const reward = DAILY_REWARDS[idx] || 1;
            state.diamond = (state.diamond || 0) + reward;

            // 💾 Serverga ma'lumotlarni yuboramiz!
            if (typeof saveUserState === 'function') {
                saveUserState(state); 
            }

            animateAddPRC('+' + formatReward(reward) + ' 💎');
            showToast(`You received ${formatReward(reward)} diamonds!`);

            // Ekranni yangilaymiz
            renderDaily();
            if (typeof updateHeaderDiamond === 'function') updateHeaderDiamond();

            // Earn tabdagi ikonni yangilash
            if (window.updateDailyLoginTaskIcon && typeof window.updateDailyLoginTaskIcon === 'function') {
                window.updateDailyLoginTaskIcon();
            }
        });
    }
}
