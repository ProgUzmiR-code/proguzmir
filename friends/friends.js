// Supabase global client (index.html'dan CDN orqali yuklandi)
// const supabaseClient = window.supabase;

function initInvite() {
    const inviteBtn = document.querySelector('.btn-send');

    if (!inviteBtn) return;

    inviteBtn.onclick = () => {
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser || !tgUser.id) {
            alert('Telegram ma\'lumotlari topilmadi');
            return;
        }

        const userId = `tg_${tgUser.id}`;
        const firstName = tgUser.first_name || 'Friend';

        const botUsername = 'ProgUzmiRBot';
        const inviteLink = `https://t.me/${botUsername}?startapp=ref_${userId}`;

        const shareText = `🚀 ${firstName} meni ProgUzmiR o'yiniga taklif qildi! Menga qo'shil va bonuslarga ega bo'!\n\n💎 Har do'st uchun +500 almonds\n🎮 O'yin o'yna va pul yutib ol!`;

        if (window.Telegram?.WebApp?.shareToStory) {
            try {
                window.Telegram.WebApp.shareToStory(inviteLink, {
                    text: shareText
                });
            } catch (e) {
                shareViaLink(inviteLink, shareText);
            }
        } else {
            shareViaLink(inviteLink, shareText);
        }
    };
}

function shareViaLink(inviteLink, shareText) {
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(fullUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', initInvite);

function processInviteCode() {
    const params = new URLSearchParams(window.location.search);
    const referrerId = params.get('startapp');

    if (referrerId && referrerId.startsWith('ref_')) {
        const myWallet = localStorage.getItem('proguzmir_wallet');
        if (myWallet) {
            saveReferrerToSupabase(myWallet, referrerId);
        }
    }
}

async function saveReferrerToSupabase(myWallet, referrerId) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        const { error } = await supabaseClient
            .from('user_states')
            .update({ referrer_id: referrerId })
            .eq('wallet', myWallet);

        if (!error) {
            console.log('Referrer ID saqlandi:', referrerId);
            giveReferralBonus(myWallet);
        }
    } catch (e) {
        console.warn('Referrer saqlashda xato:', e);
    }
}

async function giveReferralBonus(myWallet) {
    try {
        const state = loadState();
        if (state && state.wallet === myWallet) {
            state.diamond = (state.diamond || 0) + 500;
            saveState(state);
            showToast('🎉 Taklif bonusi: +500 almonds!');
        }
    } catch (e) {
        console.warn('Bonus berish xatosi:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processInviteCode);
} else {
    processInviteCode();
}

async function loadFriendsList() {
    const wallet = localStorage.getItem('proguzmir_wallet');
    if (!wallet) return;

    const userId = wallet.replace('tg_', '');
    const listContainer = document.querySelector('.fs-list');

    try {
        const response = await fetch(`/api/friends?referrer=${userId}`);
        const { friends, count } = await response.json();

        const box = document.querySelector('.box');
        
        if (friends && friends.length > 0) {
            if (box) box.style.display = 'none';

            let html = friends.map((f, i) => `
                <div class="fs-item">
                    <div class="item-icon">${i + 1}</div>
                    <div class="item-info">
                        <div class="item__label">${f.first_name || 'Foydalanuvchi'} ${f.last_name || ''}</div>
                        <div class="item__num">${f.prc_wei || '0'} PRC</div>
                    </div>
                </div>
            `).join('');

            const container = document.querySelector('.fs');
            let listDiv = document.querySelector('.fs-list');
            
            if (!listDiv) {
                listDiv = document.createElement('div');
                listDiv.className = 'fs-list';
                container.appendChild(listDiv);
            }
            
            listDiv.innerHTML = html;

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

async function loadInviteStats() {
    const wallet = localStorage.getItem('proguzmir_wallet');
    if (!wallet) return;

    const userId = wallet.replace('tg_', '');

    try {
        const response = await fetch(`/api/friends?referrer=${userId}`);
        const { count } = await response.json();

        const totalDiv = document.querySelector('.total');
        if (totalDiv) {
            const statsHTML = `
                <div class="total__title">Do'stlar Statistikasi</div>
                <div class="total__stats" style="display:flex;gap:20px;justify-content:center;margin-top:10px;">
                    <div>
                        <div style="font-size:24px;font-weight:700;color:#ffe600;">${count}</div>
                        <div style="font-size:12px;color:#aaa;">Taklif qilingan</div>
                    </div>
                </div>
            `;
            totalDiv.innerHTML = statsHTML;
        }
    } catch (e) {
        console.error("Statistika yuklashda xato:", e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadInviteStats();
    await loadFriendsList();
    initInvite();
    processInviteCode();
});

setInterval(loadFriendsList, 30000);
setInterval(loadInviteStats, 60000);
