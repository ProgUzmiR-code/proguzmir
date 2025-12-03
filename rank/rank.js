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

function loadLeaderboard() {
    const rankList = document.getElementById('rankList');
    
    // Get current user
    const currentUser = getCurrentUserData();
    
    // Test leaderboard (demo data + current user)
    const leaderboard = [
        { name: "Top Player", id: "123456", score: 5000n, diamond: 500, isCurrentUser: false },
        { name: "Strong Gamer", id: "789012", score: 4500n, diamond: 450, isCurrentUser: false },
        { name: "Skilled Player", id: "345678", score: 4000n, diamond: 400, isCurrentUser: false },
        currentUser, // Add current user to list
        { name: "Beginner", id: "999999", score: 1000n, diamond: 100, isCurrentUser: false },
    ];
    
    // Sort by score (descending) and convert to array
    const sorted = leaderboard
        .map(u => ({
            ...u,
            score: typeof u.score === 'bigint' ? u.score : BigInt(u.score || 0)
        }))
        .sort((a, b) => {
            if (a.score > b.score) return -1;
            if (a.score < b.score) return 1;
            return 0;
        });
    
    if (sorted.length === 0) {
        rankList.innerHTML = '<div class="empty-state">Leaderboard ma\'lumoti yo\'q</div>';
        return;
    }
    
    // Render leaderboard
    rankList.innerHTML = sorted.map((user, index) => {
        const position = index + 1;
        const positionClass = position === 1 ? 'top1' : position === 2 ? 'top2' : position === 3 ? 'top3' : '';
        const isCurrent = user.id === currentUser.id || user.name === currentUser.name;
        const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : `${position}`;
        
        return `
            <div class="rank-item ${positionClass}${isCurrent ? ' current-user' : ''}" style="${isCurrent ? 'border-color: #00ff00; background: rgba(0, 255, 0, 0.08);' : ''}">
                <div class="rank-left">
                    <div class="rank-position ${positionClass ? positionClass : ''}">${medal}</div>
                    <div class="rank-info">
                        <div class="rank-name">${user.name}${isCurrent ? ' (siz)' : ''}</div>
                        <div class="rank-id">ID: ${user.id}</div>
                    </div>
                </div>
                <div class="rank-score">
                    <span class="rank-score-label">PRC</span>
                    ${formatScore(user.score)}
                </div>
            </div>
        `;
    }).join('');
}

function formatScore(wei) {
    if (typeof wei === 'bigint') {
        const DECIMALS = 18n;
        const UNIT = 10n ** DECIMALS;
        const whole = (wei / UNIT).toString();
        return whole;
    }
    return String(wei);
}

// Load leaderboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadLeaderboard();
});

// Refresh every 5 seconds (to show live updates)
setInterval(() => {
    loadLeaderboard();
}, 5000);
