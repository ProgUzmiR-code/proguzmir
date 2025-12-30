document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab_item');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Avvalgi "checked" klassini olib tashlash
            tabs.forEach(t => t.classList.remove('checked'));

            // Bosilgan elementga "checked" klassini qo'shish
            tab.classList.add('checked');

            // Bu yerda tanlangan darajaga qarab ma'lumotlarni yuklash funksiyasini chaqirish mumkin
            const rankType = tab.getAttribute('data-rank');
            console.log("Tanlangan daraja:", rankType);

            // Karusel elementini o'rtaga keltirish
            tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        });
    });
});


document.addEventListener('DOMContentLoaded', () => {
    // 1. Holatni yuklab olamiz (index.js dagi funksiyadan foydalanamiz)
    const state = loadState();
    const currentPRC = state.prcWei;

    // 2. Elementlarni tanlab olamiz
    const tabItems = document.querySelectorAll('.tab_item');
    const rankListContainer = document.getElementById('rankList');

    // 3. Joriy rankni aniqlaymiz (index.js dagi funksiya asosida)
    const currentRank = getRankFromWei(currentPRC);

    // 4. Karuselda foydalanuvchining joriy rankini belgilash
    function updateTabs(selectedRank) {
        tabItems.forEach(tab => {
            const tabRank = tab.getAttribute('data-rank');

            // "Checked" klassini boshqarish
            if (tabRank === selectedRank) {
                tab.classList.add('checked');
                // Karuselni o'sha elementga aylantirish (scroll)
                tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } else {
                tab.classList.remove('checked');
            }
        });

        // Bu yerda ro'yxatni yangilash funksiyasini chaqirish mumkin
        displayLeaderboard(selectedRank);
    }

    // 5. Leaderboard ro'yxatini chiqarish (Namuna uchun)
    function displayLeaderboard(rankName) {
        // Bu yerda odatda API orqali serverdan ma'lumot keladi. 
        // Hozircha statik namuna:
        const mockUsers = [
            { name: "Sardor", wallet: "tg_12345", score: "5000000000000000000" }, // 5 PRC
            { name: "Doston", wallet: "tg_67890", score: "1200000000000000000" }, // 1.2 PRC
            { name: "Siz", wallet: state.wallet, score: currentPRC.toString() }
        ];

        rankListContainer.innerHTML = ''; // Tozalash

        if (mockUsers.length === 0) {
            rankListContainer.innerHTML = '<div class="empty-state">Hozircha hech kim yo\'q</div>';
            return;
        }

        mockUsers.sort((a, b) => BigInt(b.score) > BigInt(a.score) ? 1 : -1);

        mockUsers.forEach((user, index) => {
            const pos = index + 1;
            const isMe = user.wallet === state.wallet;
            const rankClass = pos <= 3 ? `top${pos}` : '';

            rankListContainer.innerHTML += `
                <div class="rank-item ${rankClass}" style="${isMe ? 'border: 1px solid var(--brand-color);' : ''}">
                    <div class="rank-left">
                        <div class="rank-position ${rankClass}">${pos}</div>
                        <div class="rank-info">
                            <div class="rank-name">${user.name} ${isMe ? '(Siz)' : ''}</div>
                            <div class="rank-id">${user.wallet.slice(0, 10)}...</div>
                        </div>
                    </div>
                    <div class="rank-score">
                        ${fmtPRC(BigInt(user.score))}
                        <span class="rank-score-label">PRC</span>
                    </div>
                </div>
            `;
        });
    }

    // 6. Tablarni bosganda ishlashi
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedRank = tab.getAttribute('data-rank');
            updateTabs(selectedRank);
        });
    });

    // 7. Dastlabki yuklanishda foydalanuvchining o'z rankini ko'rsatish
    updateTabs(currentRank);
});
