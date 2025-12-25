const KEY_WALLET = "proguzmir_wallet";
const KEY_PRC = "proguzmir_prc_wei";
const KEY_DIAMOND = "proguzmir_diamond";

function makeUserKey(baseKey, wallet) {
    return wallet ? baseKey + "_" + wallet.toLowerCase() : baseKey + "_guest";
}

function getCurrentUserData() {
    const wallet = localStorage.getItem(KEY_WALLET) || "";
    const keyPRC = makeUserKey(KEY_PRC, wallet);
    const keyDiamond = makeUserKey(KEY_DIAMOND, wallet);

    const prcWei = BigInt(localStorage.getItem(keyPRC) || "0");
    const diamond = parseInt(localStorage.getItem(keyDiamond) || "0", 10);

    // Get user info from Telegram if available
    let userName = "Player";
    let userId = wallet || "unknown";
    try {
        const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (u) {
            userName = (u.first_name || '') + (u.last_name ? ' ' + u.last_name : '');
            userId = u.id || userId;
        }
    } catch (e) { /* ignore */ }

    return {
        name: userName || "Player",
        id: userId,
        score: Number(prcWei),
        diamond: diamond
    };
}

// Sample leaderboard data
const leaderboardData = {
    'bronze': [
        { position: 1, name: 'Player One', id: '@player1', score: '1000 PRC' },
        { position: 2, name: 'Player Two', id: '@player2', score: '950 PRC' },
        { position: 3, name: 'Player Three', id: '@player3', score: '900 PRC' }
    ],
    'silver': [
        { position: 1, name: 'Elite User', id: '@elite1', score: '5000 PRC' },
        { position: 2, name: 'Silver Star', id: '@silver1', score: '4800 PRC' },
        { position: 3, name: 'Silver Pro', id: '@silver2', score: '4600 PRC' }
    ],
    'gold': [
        { position: 1, name: 'Gold Master', id: '@gold1', score: '10000 PRC' },
        { position: 2, name: 'Gold Pro', id: '@gold2', score: '9500 PRC' },
        { position: 3, name: 'Gold Elite', id: '@gold3', score: '9000 PRC' }
    ],
    'smart gold': [
        { position: 1, name: 'Smart Master', id: '@smartgold1', score: '25000 PRC' },
        { position: 2, name: 'Smart Pro', id: '@smartgold2', score: '24000 PRC' },
        { position: 3, name: 'Smart Elite', id: '@smartgold3', score: '23000 PRC' }
    ],
    'platinium': [
        { position: 1, name: 'Plat Legend', id: '@plat1', score: '50000 PRC' },
        { position: 2, name: 'Plat King', id: '@plat2', score: '48000 PRC' },
        { position: 3, name: 'Plat Master', id: '@plat3', score: '46000 PRC' }
    ],
    'master': [
        { position: 1, name: 'Master Lord', id: '@master1', score: '100000 PRC' },
        { position: 2, name: 'Master King', id: '@master2', score: '95000 PRC' },
        { position: 3, name: 'Master Pro', id: '@master3', score: '90000 PRC' }
    ]
};

// Render leaderboard for selected rank
function renderRankList(rank) {
    const rankList = document.getElementById('rankList');
    const data = leaderboardData[rank] || [];

    if (data.length === 0) {
        rankList.innerHTML = '<div class="empty-state">No players in this rank yet</div>';
        return;
    }

    rankList.innerHTML = data.map((player, idx) => {
        const topClass = idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : '';
        const posClass = idx === 0 ? 'top1' : idx === 1 ? 'top2' : idx === 2 ? 'top3' : '';

        return `
            <div class="rank-item ${topClass}">
                <div class="rank-left">
                    <div class="rank-position ${posClass}">${player.position}</div>
                    <div class="rank-info">
                        <div class="rank-name">${player.name}</div>
                        <div class="rank-id">${player.id}</div>
                    </div>
                </div>
                <div class="rank-score">
                    <span class="rank-score-label">Score</span>
                    ${player.score}
                </div>
            </div>
        `;
    }).join('');
}

// Update button states
function updateScrollButtons() {
    const tabMain = document.querySelector('.tab_main');
    const scrollLeft = document.getElementById('scrollLeft');
    const scrollRight = document.getElementById('scrollRight');

    if (!tabMain || !scrollLeft || !scrollRight) return;

    const canScrollLeft = tabMain.scrollLeft > 0;
    const canScrollRight = tabMain.scrollLeft < (tabMain.scrollWidth - tabMain.clientWidth - 10);

    scrollLeft.disabled = !canScrollLeft;
    scrollRight.disabled = !canScrollRight;
}

// Initialize carousel
document.addEventListener('DOMContentLoaded', () => {
    const tabMain = document.querySelector('.tab_main');
    const tabItems = document.querySelectorAll('.tab_item');
    const scrollLeft = document.getElementById('scrollLeft');
    const scrollRight = document.getElementById('scrollRight');

    // Render initial rank
    renderRankList('smart gold');

    // Carousel button handlers
    if (scrollLeft && scrollRight) {
        scrollLeft.addEventListener('click', () => {
            tabMain.scrollBy({ left: -120, behavior: 'smooth' });
            setTimeout(updateScrollButtons, 300);
        });

        scrollRight.addEventListener('click', () => {
            tabMain.scrollBy({ left: 120, behavior: 'smooth' });
            setTimeout(updateScrollButtons, 300);
        });

        // Update buttons on scroll
        tabMain.addEventListener('scroll', updateScrollButtons);
        window.addEventListener('resize', updateScrollButtons);

        // Initial button state
        setTimeout(updateScrollButtons, 100);
    }

    // Tab click handlers
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove checked class from all tabs
            tabItems.forEach(t => t.classList.remove('checked'));

            // Add checked class to clicked tab
            tab.classList.add('checked');

            // Get rank from data attribute
            const rank = tab.getAttribute('data-rank');

            // Render new leaderboard
            renderRankList(rank);

            // Smooth scroll active tab into center
            const tabRect = tab.getBoundingClientRect();
            const containerRect = tabMain.getBoundingClientRect();
            const scrollLeft = tabMain.scrollLeft;
            const targetScroll = scrollLeft + (tabRect.left - containerRect.left) - (containerRect.width / 2) + (tabRect.width / 2);

            tabMain.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });

            setTimeout(updateScrollButtons, 300);
        });
    });
});
