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

            // Telegram ismini aniqlaymiz
            const tgFirstName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Siz";

            // Mock ma'lumotlar (haqiqiy ma'lumotlar serverdan olinishi kerak)

            const mockUsers = [
                { name: "Sardor", score: "5000000000000000000" },
                { name: "Doston", score: "120000000000000000" },
                { name: tgFirstName, score: String(state.prcWei || 0n) } // Ismingiz bu yerga tushadi
            ];

            mockUsers.sort((a, b) => (BigInt(b.score) > BigInt(a.score) ? 1 : -1));

            mockUsers.forEach((user, index) => {
                const pos = index + 1;
                const isMe = String(user.wallet) === String(state.wallet);
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
                ${safeFmtPRC(user.score)}
            </div>
        `;
                rankListContainer.appendChild(wrapper);
            });
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
