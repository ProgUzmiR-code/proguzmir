// invite.js
function initInvite() {
    const inviteBtn = document.querySelector('.btn-send');

    if (!inviteBtn) return;

    inviteBtn.onclick = () => {
        // 1. Joriy foydalanuvchining Telegram ID sini olish
        const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        if (!tgUser || !tgUser.id) {
            alert('Telegram ma\'lumotlari topilmadi');
            return;
        }

        const userId = `tg_${tgUser.id}`;
        const firstName = tgUser.first_name || 'Friend';

        // 2. Taklif havolasini shakllantirish
        // Bot foydalanuvchiga startapp parametri orqali referrer ID'ni o'tkazamiz
        const botUsername = 'ProgUzmiRBot'; // O'zingizning bot nomini kiriting
        const inviteLink = `https://t.me/${botUsername}?startapp=ref_${userId}`;

        // 3. Share matnini tayyorlash
        const shareText = `🚀 ${firstName} meni ProgUzmiR o'yiniga taklif qildi! Menga qo'shil va bonuslarga ega bo'!\n\n💎 Har do'st uchun +500 almonds\n🎮 O'yin o'yna va pul yutib ol!`;

        // 4. Telegram Share API orqali jo'natish
        if (window.Telegram?.WebApp?.shareToStory) {
            // Stories'ga jo'natish (agar premium bo'lsa)
            try {
                window.Telegram.WebApp.shareToStory(inviteLink, {
                    text: shareText
                });
            } catch (e) {
                // Fallback: Odiy share
                shareViaLink(inviteLink, shareText);
            }
        } else {
            // Fallback: t.me share URL
            shareViaLink(inviteLink, shareText);
        }
    };
}

function shareViaLink(inviteLink, shareText) {
    // t.me/share/url orqali jo'natish
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(fullUrl, '_blank');
}

document.addEventListener('DOMContentLoaded', initInvite);

// YANGI: Taklif linkidagi referrer ID'ni qayta ishlash
function processInviteCode() {
    const params = new URLSearchParams(window.location.search);
    const referrerId = params.get('startapp'); // ref_tg_123456 formatida

    if (referrerId && referrerId.startsWith('ref_')) {
        // Supabase'ga saqla: bu foydalanuvchi kim tomonidan taklif qilingani
        const myWallet = localStorage.getItem('proguzmir_wallet');
        if (myWallet) {
            saveReferrerToSupabase(myWallet, referrerId);
        }
    }
}

async function saveReferrerToSupabase(myWallet, referrerId) {
    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        // user_states jadvalidagi referrer_id ni yangilash
        const { error } = await supabaseClient
            .from('user_states')
            .update({ referrer_id: referrerId })
            .eq('wallet', myWallet);

        if (!error) {
            console.log('Referrer ID saqlandi:', referrerId);
            // Optional: Bonusni berish
            giveReferralBonus(myWallet);
        }
    } catch (e) {
        console.warn('Referrer saqlashda xato:', e);
    }
}

async function giveReferralBonus(myWallet) {
    // 500 almonds bonus berish (optional)
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

// Page load da taklif kodni qayta ishlash
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processInviteCode);
} else {
    processInviteCode();
}

async function loadFriendsList() {
    const wallet = localStorage.getItem('proguzmir_wallet');
    if (!wallet) return;

    const listContainer = document.querySelector('.fs-list');

    try {
        const response = await fetch(`/api/friends?referrer=${wallet}`);
        const { friends } = await response.json();

        if (friends && friends.length > 0) {
            document.querySelector('.box').style.display = 'none'; // "No data" ni yashirish
            let html = '';
            friends.forEach((f, i) => {
                html += `
                    <div class="fs-item">
                        <div class="item-icon">${i + 1}</div>
                        <div class="item-info">
                            <div class="item__label">${f.first_name || 'Foydalanuvchi'} ${f.last_name || ''}</div>
                            <div class="item__num">${f.prc_wei || '0'} PRC</div>
                        </div>
                    </div>`;
            });
            // Ro'yxatni joylash
            if (listContainer) {
                listContainer.innerHTML = html;
            } else {
                // Agar container yo'q bo'lsa, yaratamiz
                const newList = document.createElement('div');
                newList.className = 'fs-list';
                newList.innerHTML = html;
                document.querySelector('.fs').appendChild(newList);
            }

            // Do'stlar sonini yangilash
            const friendCount = document.querySelector('.fs__title span');
            if (friendCount) {
                friendCount.textContent = `(${friends.length})`;
            }
        }
    } catch (e) {
        console.error("Do'stlarni yuklashda xato:", e);
    }
}

// Page load da do'stlar ro'yxatini yuklash
document.addEventListener('DOMContentLoaded', loadFriendsList);

// Har 30 sekundda ro'yxatni yangilash
setInterval(loadFriendsList, 30000);
