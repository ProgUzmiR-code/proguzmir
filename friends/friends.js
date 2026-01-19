/* ================= INVITE ================= */

// move invite logic into a delegated handler so we don't depend on querying the button at init-time
async function handleInviteClick(e) {
    // find closest .btn-send (works if clicked element or child is clicked)
    const btn = e.target.closest?.('.btn-send');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    try {
        // Telegram WebApp mavjudligini tekshirish
        if (!window.Telegram || !window.Telegram.WebApp) {
            console.error('Telegram WebApp mavjud emas');
            alert('Iltimos, Telegram ilovasi orqali kiriting');
            return;
        }

        const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
        if (!tgUser || !tgUser.id) {
            console.error('Telegram user ma\\'lumoti topilmadi: ', tgUser);
			alert('Foydalanuvchi ma\\'lumoti topilmadi.Iltimos, qayta kiriting.');
			return;
        }

        console.log('Taklif yuborilmoqda, user ID:', tgUser.id);

        // Taklif havolasini shakllantirish
        const botUsername = 'ProgUzmiRBot';
        const inviteLink = `https://t.me/${botUsername}?startapp=ref_tg_${tgUser.id}`;

        const shareText = `https://t.me/${botUsername}?startapp=ref_tg_${tgUser.id}
Menga qo'shil va bonuslarga ega bo'! 💎 
Har do'st uchun +500 olmoslar 🎮 
O'yin o'yna va pul yutib ol!`;

        // Telegram orqali share: chat tanlash oynasi chiqadi
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

        console.log('Share URL:', shareUrl);
        window.Telegram.WebApp.openTelegramLink(shareUrl);

    } catch (error) {
        console.error('Invite xatosi:', error);
        alert('Xato: ' + (error.message || 'Noma\\'lum xato'));
	}
}

function initInvite() {
    // Register handler idempotently
    document.removeEventListener('click', handleInviteClick);
    document.addEventListener('click', handleInviteClick);
}

/* ================= FRIENDS LIST ================= */

async function loadFriendsList() {
    const wallet = localStorage.getItem('proguzmir_wallet');
    if (!wallet) return;

    const userId = wallet.replace(/^tg_/, ''); // safer replace
    const referrerParam = `ref_tg_${userId}`;
    const listContainer = document.querySelector('.fs-list');

    try {
        const response = await fetch(`/api/friends?referrer=${encodeURIComponent(referrerParam)}`);
        const { friends } = await response.json();

        const box = document.querySelector('.box');

        if (friends && friends.length > 0) {
            if (box) box.style.display = 'none';

            let html = friends.map((f, i) => `
				<div class="fs-item">
					<div class="item-icon">${i + 1}</div>
					<div class="item-info">
						<div class="item__label">${f.first_name || 'Foydalanuvchi'}</div>
						<div class="item__num">${f.prc_wei || '0'} PRC</div>
					</div>
				</div>
			`).join('');

            if (listContainer) {
                listContainer.innerHTML = html;
            }

            const friendCount = document.querySelector('.fs__title span');
            if (friendCount) {
                friendCount.textContent = `(${friends.length})`;
            }
        } else {
            if (box) box.style.display = 'flex';
        }
    } catch (e) {
        console.error("Do'stlarni yuklashda xato:", e);
    }
}


// Global eksport 
window.initInvite = initInvite;

// Avto-start
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initInvite();
        loadFriendsList();
    });
} else {
    initInvite();
    loadFriendsList();
}
setInterval(loadFriendsList, 30000);