
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
                const client = window.supabaseClient || window.supabase;
                if (!client) {
                    console.error('Supabase client topilmadi!');
                    return;
                }

                rankListContainer.innerHTML = '<div class="loading">Ma\'lumotlar yuklanmoqda...</div>';

                try {
                    const { data, error } = await client
                        .from('user_states')
                        .select('wallet, prc_wei')
                        .order('prc_wei', { ascending: false }) // Bazaning o'zida saralash (String bo'lsa ham)
                        .limit(100);

                    if (error) throw error;

                    let allUsers = [];
                    if (data) {
                        allUsers = data.map(u => ({
                            name: `User ${u.wallet.slice(0, 10)}`,
                            score: u.prc_wei || "0",
                            wallet: u.wallet
                        }));
                    }

                    // Foydalanuvchining o'zini qo'shish mantiqi
                    const userInList = allUsers.find(u => u.wallet === state.wallet);
                    if (!userInList && state.wallet) {
                        allUsers.push({
                            name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Siz",
                            score: String(state.prcWei || 0n),
                            wallet: state.wallet
                        });
                    }

                    // To'g'ri BigInt saralash
                    allUsers.sort((a, b) => {
                        const vA = BigInt(a.score);
                        const vB = BigInt(b.score);
                        return vB > vA ? 1 : vB < vA ? -1 : 0;
                    });

                    // Tanlangan rank (ligaga) qarab filtrlash
                    const filteredUsers = allUsers.filter(user => {
                        const userRank = getRankFromWei(BigInt(user.score));
                        return normalizeRank(userRank) === normalizeRank(rankName);
                    });

                    rankListContainer.innerHTML = ''; // Tozalash

                    if (filteredUsers.length === 0) {
                        rankListContainer.innerHTML = `<div class="empty-state">${rankName} ligasida hech kim yo'q</div>`;
                        return;
                    }

                    filteredUsers.forEach((user, index) => {
                        const pos = index + 1;
                        const isMe = String(user.wallet || '') === String(state.wallet);
                        const rankClass = pos <= 3 ? `top${pos}` : '';

                        const wrapper = document.createElement('div');
                        wrapper.className = `rank-item ${rankClass}`;
                        if (isMe) wrapper.classList.add('me'); // CSS uchun

                        wrapper.innerHTML = `
                <div class="rank-left">
                    <div class="rank-position ${rankClass}">${pos}</div>
                    <div class="rank-info">
                        <div class="rank-name">${user.name} ${isMe ? '<small>(Siz)</small>' : ''}</div>
                        <div class="rank-id">${(user.wallet || '').slice(0, 12)}</div>
                    </div>
                </div>
                <div class="rank-score">${safeFmtPRC(user.score)}</div>
            `;
                        rankListContainer.appendChild(wrapper);
                    });

                } catch (e) {
                    console.error('Aniq xatolik:', e); // F12 konsolida ko'rasiz
                    rankListContainer.innerHTML = `<div class="error">Xatolik: ${e.message || e.details || 'Noma\'lum xato'}</div>`;
                }
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
