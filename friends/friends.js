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

// --- NEW helpers: per-user key and persistent cache ---
function makeUserKey(baseKey, wallet) {
    return wallet ? baseKey + "_" + String(wallet).toLowerCase() : baseKey + "_guest";
}
const FRIENDS_CACHE_KEY = 'proguzmir_friends';

// Single delegated listener so .btn-send works after page switches
if (!window._proguzmir_friends_delegate_installed) {
    document.addEventListener('click', (ev) => {
        const btn = ev.target.closest && ev.target.closest('.btn-send');
        if (btn) {
            ev.preventDefault && ev.preventDefault();
            try { shareReferralLink(); } catch (e) { console.warn('shareReferralLink error', e); }
        }
    });
    window._proguzmir_friends_delegate_installed = true;
}

function initInvite() {
    // keep existing per-page init (now safe because main click handler is delegated)
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

// --- NEW: render helper to avoid duplication and to render cached data ---
function renderFriends(friends, container) {
    if (!container) return;
    container.innerHTML = '';
    
    friends.forEach(f => {
        const item = document.createElement('div');
        item.className = 'invite-item';
        // Dizayn: orasini ochish va siqilmaslik uchun style
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '12px'; 
        item.style.marginBottom = '10px';
        item.style.background = 'rgba(255,255,255,0.05)';
        item.style.borderRadius = '12px';
        item.style.width = '100%';
        item.style.boxSizing = 'border-box';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.gap = '15px'; // Avatar va matn orasi
        left.style.alignItems = 'center';
        left.style.flex = '1';
        left.style.minWidth = '0'; // Matn qisilib qolmasligi uchun

        const avatar = document.createElement('div');
        avatar.style.width = '42px';
        avatar.style.height = '42px';
        avatar.style.flexShrink = '0'; // Avatar shakli o'zgarmasligi uchun
        avatar.style.borderRadius = '50%';
        avatar.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.color = '#fff';
        avatar.style.fontWeight = 'bold';
        avatar.textContent = (f.first_name || 'U').slice(0, 1).toUpperCase();

        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column'; // Ism va pul ustma-ust
        info.style.overflow = 'hidden';

        const name = document.createElement('div');
        name.style.fontWeight = '600';
        name.style.whiteSpace = 'nowrap';
        name.style.overflow = 'hidden';
        name.style.textOverflow = 'ellipsis'; // Uzun ismlar uchun ...
        name.textContent = f.first_name || 'Unknown';

        const prc = document.createElement('div');
        prc.style.fontSize = '12px';
        prc.style.opacity = '0.7';
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
}

// Operativ xotirada ham saqlab turamiz (RAM Cache)
let friendsMemoryCache = null;

async function loadFriendsList() {
    // 1. Konteynerni qidiramiz
    const container = document.querySelector('.fs-list');
    const countEl = document.getElementById('friendsCount');
    
    // Agar konteyner bo'lmasa, demak foydalanuvchi hali Friends bo'limiga o'tmagan
    if (!container) return;

    const wallet = localStorage.getItem('proguzmir_wallet') || '';
    const cacheKey = makeUserKey(FRIENDS_CACHE_KEY, wallet);

    // 2. Birinchi navbatda RAM keshni tekshiramiz
    if (friendsMemoryCache) {
        renderFriends(friendsMemoryCache, container);
        if (countEl) countEl.textContent = `(${friendsMemoryCache.length})`;
    } 
    // 3. Ikkinchi navbatda LocalStorage keshni tekshiramiz
    else {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    friendsMemoryCache = parsed; // RAM-ga yozish
                    renderFriends(parsed, container);
                    if (countEl) countEl.textContent = `(${parsed.length})`;
                }
            } catch (e) {
                console.error("Cache parse error", e);
            }
        } else {
            // Agar kesh mutlaqo bo'sh bo'lsa, Loading ko'rsatamiz
            container.innerHTML = '<div class="box"><div>Loading...</div></div>';
        }
    }

    if (!wallet) return;

    // 4. Fondagi yangilash (API so'rovi)
    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet })
        });

        if (res.ok) {
            const json = await res.json();
            const friends = json?.friends || [];
            
            // Ma'lumotlarni saqlash va chizish
            friendsMemoryCache = friends;
            localStorage.setItem(cacheKey, JSON.stringify(friends));
            
            // Konteyner hali ham ko'rinib turganini tekshirib keyin chizamiz
            const currentContainer = document.querySelector('.fs-list');
            if (currentContainer) {
                renderFriends(friends, currentContainer);
                if (countEl) countEl.textContent = `(${friends.length})`;
            }
        }
    } catch (err) {
        console.warn('Sync failed', err);
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
    const countEl = document.getElementById('friendsCount');
    if (countEl) countEl.textContent = '(0)';
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