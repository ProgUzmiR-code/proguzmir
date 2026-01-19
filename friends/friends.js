// friends.js
// Global export
window.initInvite = initInvite;

const Base62 = {
    chars: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    encode(num) {
        let str = "";
        let n = BigInt(num);
        if (n === 0n) return this.chars[0];
        while (n > 0n) {
            str = this.chars[Number(n % 62n)] + str;
            n /= 62n;
        }
        return str;
    },
    decode(str) {
        let num = 0n;
        for (let i = 0; i < str.length; i++) {
            num = num * 62n + BigInt(this.chars.indexOf(str[i]));
        }
        return num.toString();
    }
};

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

    // raw ref id (wallet or telegram id)
    const refRaw = localStorage.getItem('proguzmir_wallet') || (user ? String(user.id) : '');

    if (!refRaw) {
        alert("Referral link yaratish uchun hamyon ulanmagan!");
        return;
    }

    // Encode ref for privacy: prefer Base62 for numeric ids, fallback to URL-safe base64-like string
    let encodedRef;
    try {
        if (/^\d+$/.test(refRaw)) {
            encodedRef = Base62.encode(refRaw);
        } else {
            const digits = (refRaw.match(/\d+/) || [null])[0];
            if (digits) {
                encodedRef = Base62.encode(digits);
            } else {
                // compact base64 fallback (URL-safe, no padding)
                encodedRef = btoa(unescape(encodeURIComponent(refRaw))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
            }
        }
    } catch (e) {
        console.warn('ref encode failed, using raw', e);
        encodedRef = refRaw;
    }

    const botUsername = 'prouztestbot'; // O'zingizning botingiz username'ini yozing
    const inviteLink = `https://t.me/${botUsername}?startapp=ref_${encodedRef}`;
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

            

            item.appendChild(left);
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