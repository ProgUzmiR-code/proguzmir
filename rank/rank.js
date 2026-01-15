(function () {
    // 1. Yordamchi normalizatsiya funksiyasi
    function normalizeRank(name) {
        return String(name || '').toLowerCase().replace(/_/g, ' ').trim();
    }

    // 2. Xavfsiz yuklash funksiyalari
    const safeLoadState = () => {
        try { return typeof loadState === 'function' ? loadState() : { prcWei: 0n, wallet: 'guest' }; }
        catch (e) { return { prcWei: 0n, wallet: 'guest' }; }
    };

    const safeFmtPRC = (wei) => {
        try { return typeof fmtPRC === 'function' ? fmtPRC(BigInt(wei)) : String(wei); }
        catch (e) { return String(wei); }
    };

    function initRankPage() {
        const rankListContainer = document.getElementById('rankList');
        const tabs = document.querySelectorAll('.tab_item');
        if (!rankListContainer) return;

        const state = safeLoadState();

        // Foydalanuvchining haqiqiy rankini aniqlash
        let currentRankRaw = 'bronze';
        if (typeof getRankFromWei === 'function') {
            currentRankRaw = getRankFromWei(BigInt(state.prcWei || 0n));
        }
        const currentRank = normalizeRank(currentRankRaw);

        // Reyting ro'yxatini chiqarish
        function displayLeaderboard(rankName) {
            rankListContainer.innerHTML = '';

            const tgFirstName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Siz";
            const state = safeLoadState();

            // YANGI: Haqiqiy ma'lumotlarni Supabase'dan olish
            async function loadLeaderboard() {
                let allUsers = [
                    { name: "Sardor", score: "5000000000000000000" }, // Master (mock)
                    { name: "Doston", score: "120000000000000" },    // Smart Gold (mock)
                    { name: "Ali", score: "5000000" },               // Bronze (mock)
                    { name: "Vali", score: "15000000" },             // Silver (mock)
                    { name: tgFirstName, score: String(state.prcWei || 0n) }
                ];

                // YANGI: Supabase'dan hamma foydalanuvchilarni olish
                try {
                    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                        const { data, error } = await supabaseClient
                            .from('user_states')
                            .select('wallet, prc_wei')
                            .order('prc_wei', { ascending: false })
                            .limit(100); // Top 100 foydalanuvchini olish

                        if (!error && data && data.length > 0) {
                            // Supabase'dan olingan ma'lumotlarni formatting
                            allUsers = data.map(u => ({
                                name: `User ${u.wallet.slice(0, 12)}`,
                                score: u.prc_wei ? String(u.prc_wei) : "0",
                                wallet: u.wallet
                            }));

                            // Joriy foydalanuvchini qo'shish (agar ro'yxatda bo'lmasa)
                            const userInList = allUsers.find(u => u.wallet === state.wallet);
                            if (!userInList && state.wallet) {
                                allUsers.push({
                                    name: tgFirstName,
                                    score: String(state.prcWei || 0n),
                                    wallet: state.wallet
                                });
                            }

                            // Qayta saralash (Supabase allaqachon saralagan bo'lsa ham)
                            allUsers.sort((a, b) => (BigInt(b.score) > BigInt(a.score) ? 1 : -1));
                        }
                    } else {
                        // Fallback: agar Supabase mavjud bo'lmasa, mock ma'lumotlardan foydalanish
                        console.warn('Supabase client not available, using mock data');
                    }
                } catch (e) {
                    console.warn('Supabase leaderboard load failed:', e);
                    // Mock ma'lumotlardan foydalanish davom etadi
                }

                // YANGI: Filtrlash va Display
                const filteredUsers = allUsers.filter(user => {
                    const userRank = getRankFromWei(BigInt(user.score || '0'));
                    return normalizeRank(userRank) === normalizeRank(rankName);
                });

                // YANGI: SARALASH: Ballar bo'yicha
                filteredUsers.sort((a, b) => (BigInt(b.score) > BigInt(a.score) ? 1 : -1));

                // YANGI: EKRANGA CHIQARISH
                if (filteredUsers.length === 0) {
                    rankListContainer.innerHTML = `<div class="empty-state">${rankName} ligasida hozircha hech kim yo'q</div>`;
                    return;
                }

                filteredUsers.forEach((user, index) => {
                    const pos = index + 1;
                    const isMe = String(user.wallet || '') === String(state.wallet);
                    const rankClass = pos <= 3 ? `top${pos}` : '';

                    const wrapper = document.createElement('div');
                    wrapper.className = `rank-item ${rankClass}`;
                    if (isMe) wrapper.style.border = '1.5px solid var(--brand-color)';

                    wrapper.innerHTML = `
                        <div class="rank-left">
                            <div class="rank-position ${rankClass}">${pos}</div>
                            <div class="rank-info">
                                <div class="rank-name">${user.name} ${isMe ? '<small>(Siz)</small>' : ''}</div>
                                <div class="rank-id">${(user.wallet || '').slice(0, 12)}</div>
                            </div>
                        </div>
                        <div class="rank-score">
                            ${safeFmtPRC(user.score || '0')}
                        </div>
                    `;
                    rankListContainer.appendChild(wrapper);
                });
            }

            // Async funksiyani chaqirish
            loadLeaderboard().catch(e => console.error('Leaderboard load error:', e));
        }



        // Tablarni yangilash
        function updateTabs(selectedRankRaw) {
            const selected = normalizeRank(selectedRankRaw);

            tabs.forEach(tab => {
                const tabRank = normalizeRank(tab.getAttribute('data-rank'));
                if (tabRank === selected) {
                    tab.classList.add('checked');
                    // Markazga silliq scroll qilish
                    tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                } else {
                    tab.classList.remove('checked');
                }
            });

            displayLeaderboard(selected);
        }

        // Tablarga event qo'shish
        tabs.forEach(tab => {
            // Oldingi eventlarni tozalash (agar kerak bo'lsa) va yangisini qo'shish
            tab.onclick = (e) => {
                const sel = tab.getAttribute('data-rank');
                updateTabs(sel);
            };
        });

        // Boshlang'ich yuklanishda foydalanuvchi rankini tanlash
        updateTabs(currentRank);
    }

    // Global eksport
    window.initRankPage = initRankPage;

    // Avto-start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRankPage);
    } else {
        initRankPage();
    }
})();
