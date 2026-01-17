// friends.js

const API_BASE = window.location.origin;

/* ================= INVITE ================= */

function initInvite() {
    const btn = document.querySelector('.btn-send');
    if (!btn) return;

    btn.onclick = () => {
        const tg = window.Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;

        if (!user) {
            alert('Telegram user topilmadi');
            return;
        }

        const refCode = `tg_${user.id}`;
        const botUsername = 'ProgUzmiRBot';

        const inviteLink = `https://t.me/${botUsername}?startapp=ref_${refCode}`;

        const text =
`Menga qo‘shil va bonuslarga ega bo‘l! 💎
Har do‘st uchun +500 olmoslar 🎮
O‘yinni o‘yna va pul yutib ol! 🚀`;

        // Telegram native share (chat tanlash chiqadi)
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(
                `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`
            );
        } else {
            window.open(
                `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`,
                '_blank'
            );
        }
    };
}

/* ================= FRIENDS LIST ================= */

async function loadFriends() {
    const wallet = localStorage.getItem('proguzmir_wallet');
    if (!wallet) return;

    const userId = wallet.replace('tg_', '');

    try {
        const res = await fetch(`${API_BASE}/api/friends?referrer=${userId}`);
        if (!res.ok) throw new Error('API error');

        const { friends, count } = await res.json();

        const list = document.querySelector('.fs-list');
        const titleCount = document.querySelector('.fs__title span');

        titleCount.textContent = `(${count})`;

        if (!friends.length) return;

        list.innerHTML = friends.map((f, i) => `
            <div class="fs-item">
                <div class="item-icon">${i + 1}</div>
                <div class="item-info">
                    <div class="item__label">${f.first_name || 'User'}</div>
                    <div class="item__num">${f.prc_wei || 0} PRC</div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Friends load error:', e);
    }
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', () => {
    initInvite();
    loadFriends();
});

setInterval(loadFriends, 30000);