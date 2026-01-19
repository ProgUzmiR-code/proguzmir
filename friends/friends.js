// Global export
window.initInvite = initInvite;

function initInvite() {
    const sendBtn = document.querySelector('.btn-send');
    if (sendBtn) {
        // Eski onclick bo'lsa tozalaymiz va yangisini qo'shamiz
        sendBtn.onclick = (ev) => {
            ev.preventDefault();
            console.log("Invite tugmasi bosildi");
            shareReferralLink();
        };
    }

    // Do'stlar ro'yxatini pastda yuklayveradi
    loadFriendsList().catch(e => console.warn('loadFriendsList error', e));
}

// Yangi taklif qilish funksiyasi
function shareReferralLink() {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    
    // Hamyon manzilini yoki User ID ni referral ID sifatida ishlatamiz
    const refId = localStorage.getItem('proguzmir_wallet') || (user ? user.id : '');
    
    if (!refId) {
        alert("Referral link yaratish uchun hamyon ulanmagan!");
        return;
    }

    const botUsername = 'ProgUzmiRBot'; // O'zingizning botingiz username'ini yozing
    const inviteLink = `https://t.me/${botUsername}?startapp=ref_${refId}`;
    const shareText = `🚀 Men bilan PROGUZ o'yinida qatnashing va PRC tokenlariga ega bo'ling!`;
    
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(fullUrl);
    } else {
        window.open(fullUrl, '_blank');
    }
}


async function loadFriendsList() {
    const container = document.querySelector('.fs-list');
    if (!container) return;
    // loading indicator
    container.innerHTML = '<div class="box"><div>Loading...</div></div>';

    const wallet = localStorage.getItem('proguzmir_wallet') || '';
    if (!wallet) {
        renderNoData(container);
        return;
    }

    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet })
        });
        if (!res.ok) {
            renderNoData(container);
            return;
        }
        const json = await res.json();
        const friends = json?.friends || [];
        if (!friends.length) {
            renderNoData(container);
            return;
        }

        // Render list
        container.innerHTML = '';
        friends.forEach(f => {
            const item = document.createElement('div');
            item.className = 'invite-item';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '8px';
            item.style.marginBottom = '8px';
            item.style.background = 'rgba(255,255,255,0.03)';
            item.style.borderRadius = '8px';

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.gap = '10px';
            left.style.alignItems = 'center';

            const avatar = document.createElement('div');
            avatar.style.width = '44px';
            avatar.style.height = '44px';
            avatar.style.borderRadius = '8px';
            avatar.style.background = 'rgba(255,255,255,0.03)';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontWeight = '700';
            avatar.style.color = '#fff';
            avatar.textContent = (f.first_name || 'U').slice(0, 2).toUpperCase();

            const info = document.createElement('div');
            const name = document.createElement('div');
            name.style.fontWeight = '700';
            name.textContent = f.first_name || 'Unknown';
            const prc = document.createElement('div');
            prc.style.opacity = '0.8';
            try {
                prc.textContent = (typeof fmtPRC === 'function') ? fmtPRC(BigInt(f.prc_wei || '0')) : (f.prc_wei || '0');
            } catch (e) {
                prc.textContent = (f.prc_wei || '0');
            }
            info.appendChild(name);
            info.appendChild(prc);

            left.appendChild(avatar);
            left.appendChild(info);

            const right = document.createElement('div');
            const send = document.createElement('button');
            send.className = 'btn';
            send.textContent = 'Send';
            send.style.padding = '6px 10px';
            send.style.borderRadius = '8px';
            send.style.cursor = 'pointer';
            send.addEventListener('click', (ev) => {
                ev.stopPropagation();
                openSendModal(f);
            });

            right.appendChild(send);

            item.appendChild(left);
            item.appendChild(right);
            container.appendChild(item);
        });
    } catch (err) {
        console.warn('fetch friends failed', err);
        renderNoData(container);
    }
}

function renderNoData(container) {
    // keep existing "No data." block markup
    container.innerHTML = `
        <div class="box">
            <div>
                <div style="width: 140px;">
                    <div style="padding-bottom: 10%;"></div>
                    <div style="background-size: cover; background-position: 50% 50%; display: flex; justify-content: center;">
                        <img src="/image/null4.png" alt="">
                    </div>
                </div>
                <span>No data.</span>
            </div>
        </div>
    `;
}

// When main Send button clicked: ensure friends loaded then open modal that lists friends (reuse load)
async function onSendInviteClick(ev) {
    ev && ev.preventDefault && ev.preventDefault();
    const wallet = localStorage.getItem('proguzmir_wallet') || '';
    if (!wallet) {
        showToast && showToast('Wallet not set');
        return;
    }
    // Ensure list is fresh
    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet })
        });
        if (!res.ok) {
            showToast && showToast('Unable to load friends');
            return;
        }
        const json = await res.json();
        const friends = json?.friends || [];
        if (!friends.length) {
            showToast && showToast('No friends to invite');
            return;
        }
        showFriendsModal(friends);
    } catch (e) {
        console.warn('onSendInviteClick error', e);
        showToast && showToast('Error loading friends');
    }
}

function showFriendsModal(friends) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.zIndex = 20000;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const box = document.createElement('div');
    box.style.width = '90%';
    box.style.maxWidth = '420px';
    box.style.maxHeight = '80vh';
    box.style.overflow = 'auto';
    box.style.background = '#07121a';
    box.style.borderRadius = '12px';
    box.style.padding = '12px';
    box.style.color = '#fff';

    const title = document.createElement('div');
    title.textContent = 'Send invite to friend';
    title.style.fontWeight = '800';
    title.style.marginBottom = '8px';
    box.appendChild(title);

    friends.forEach(f => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.padding = '8px';
        row.style.borderBottom = '1px solid rgba(255,255,255,0.02)';

        const left = document.createElement('div');
        left.innerHTML = `<div style="font-weight:700">${f.first_name || 'Unknown'}</div><div style="opacity:0.8;font-size:12px;">${(typeof fmtPRC === 'function') ? fmtPRC(BigInt(f.prc_wei || '0')) : (f.prc_wei || '0')}</div>`;

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'Send';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            sendInviteToFriend(f);
            document.body.removeChild(overlay);
        });

        row.appendChild(left);
        row.appendChild(btn);
        box.appendChild(row);
    });

    const close = document.createElement('div');
    close.style.textAlign = 'center';
    close.style.marginTop = '8px';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => { document.body.removeChild(overlay); });
    close.appendChild(closeBtn);
    box.appendChild(close);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function openSendModal(friend) {
    showFriendsModal([friend]);
}

function sendInviteToFriend(friend) {
    // Prefer direct chat via username if available
    const inviteText = 'Join me on PROGUZ! Play and earn: https://proguzmir.vercel.app';
    if (friend.username) {
        // Try open t.me link to username
        try {
            const url = 'https://t.me/' + friend.username.replace(/^@/, '');
            // best-effort open
            window.open(url, '_blank');
            return;
        } catch (e) { /* fallback below */ }
    }

    // Fallback: use Telegram share/story helper if available (global p)
    try {
        if (typeof p === 'function') {
            p(window.Telegram || window, { link: window.location.origin || 'https://proguzmir.vercel.app', text: inviteText, btnName: 'Play PROGUZ', currentUrl: window.location.origin || 'https://proguzmir.vercel.app' }, (ok) => {
                if (!ok) showToast && showToast('Share failed');
            });
            return;
        }
    } catch (e) { console.warn('share fallback failed', e); }

    // final fallback: open t.me share url
    try {
        const shareUrl = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.origin || 'https://proguzmir.vercel.app') + '&text=' + encodeURIComponent(inviteText);
        window.open(shareUrl, '_blank');
    } catch (e) {
        console.warn('final fallback failed', e);
        showToast && showToast('Cannot open share dialog');
    }
}

// Auto-start similar to previous behavior
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