// friends/friends.js
// Global export
window.initInvite = initInvite;
let _friendsLocalCache = null;

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
const FRIENDS_CACHE_KEY = 'proguzmir_friends_cache';
const FRIENDS_CACHE_TTL = 5 * 60 * 1000; // 5 daqiqa

function getCachedFriends(wallet) {
    try {
        const cache = JSON.parse(localStorage.getItem(FRIENDS_CACHE_KEY) || "null");
        if (!cache || !cache.data || !cache.ts || !cache.wallet) return null;
        if (cache.wallet !== wallet) return null;
        if (Date.now() - cache.ts > FRIENDS_CACHE_TTL) return null;
        return cache.data;
    } catch (e) { return null; }
}

function setCachedFriends(wallet, data) {
    try {
        localStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify({
            wallet,
            data,
            ts: Date.now()
        }));
    } catch (e) { }
}

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
// --- friends.js ---

// 1. Linkni yasab, localStorage ga saqlaydigan yordamchi funksiya
function updateReferralLinkCache() {
    const tg = window.Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;

    // Wallet yoki ID ni olish
    const refRaw = localStorage.getItem('proguzmir_wallet') || (user ? String(user.id) : '');

    // Agar ID bo'lmasa, oddiy saytni qaytaradi
    if (!refRaw) return 'https://proguzmir.vercel.app';

    // Kodlash (Base62 logic)
    let encodedRef;
    try {
        if (/^\d+$/.test(refRaw)) {
            encodedRef = Base62.encode(refRaw);
        } else {
            const digits = (refRaw.match(/\d+/) || [null])[0];
            encodedRef = digits ? Base62.encode(digits) : refRaw; // Fallback
        }
    } catch (e) {
        encodedRef = refRaw;
    }

    const botUsername = 'proguzmir_bot';
    const finalLink = `https://t.me/${botUsername}?start=ref_${encodedRef}`;

    // MUHIM: Tayyor linkni xotiraga yozib qo'yamiz
    localStorage.setItem('proguzmir_my_ref_link', finalLink);

    return finalLink;
}

// 2. Sahifa yuklanganda (yoki friends.js yuklanganda) darhol hisoblab qo'yamiz
updateReferralLinkCache();

// 3. Eski shareReferralLink funksiyasini soddalashtiramiz (endi u xotiradan oladi)
function shareReferralLink() {
    // Xotiradan olamiz, agar yo'q bo'lsa yangitdan yasaymiz
    const inviteLink = localStorage.getItem('proguzmir_my_ref_link') || updateReferralLinkCache();

    if (!inviteLink || inviteLink === 'https://proguzmir.vercel.app') {
        alert("Wallet not connected!");
        return;
    }

    const shareText = `🚀 Participate in the ProgUzmiR game with me and win PRC tokens!`;
    const fullUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;

    const tg = window.Telegram?.WebApp;
    if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(fullUrl);
    } else {
        window.open(fullUrl, '_blank');
    }
}



async function loadFriendsList() {
    const container = document.querySelector('.fs-list');
    const countEl = document.getElementById('friendsCount');
    // Tepadagi labelni topamiz ("Invite Friend" yozilgan joy)
    const totalLabel = document.querySelector('.invite__label');

    if (countEl) countEl.textContent = '(...)';
    if (!container) return;

    // Loading...
    container.innerHTML = '<div class="box"><div>Loading...</div></div>';

    const wallet = localStorage.getItem('proguzmir_wallet') || '';
    if (!wallet) {
        renderNoData(container);
        if (countEl) countEl.textContent = '(0)';
        if (totalLabel) totalLabel.textContent = '0 💎';
        return;
    }

    // 1. Avval localStorage'dan o'qib ko'ramiz
    const cached = getCachedFriends(wallet);
    if (cached) {
        renderFriendsList(cached, container, countEl, totalLabel);
        return;
    }

    // 2. API'dan olib, cache'ga yozamiz
    try {
        const res = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet })
        });

        if (!res.ok) {
            renderNoData(container);
            if (countEl) countEl.textContent = '(0)';
            if (totalLabel) totalLabel.textContent = '0 💎';
            return;
        }

        const json = await res.json();
        const friends = json?.friends || [];

        setCachedFriends(wallet, friends);
        renderFriendsList(friends, container, countEl, totalLabel);

    } catch (err) {
        console.warn('fetch friends failed', err);
        renderNoData(container);
        if (countEl) countEl.textContent = '(0)';
        if (totalLabel) totalLabel.textContent = '0 💎';
    }
}

// Yangi: faqat localStorage'dan o'qish uchun yordamchi
function renderFriendsList(friends, container, countEl, totalLabel) {
    // --- HISOB-KITOB QISMI ---
    let totalBonus = 0;
    const BONUS_REGULAR = 25000;
    const BONUS_PREMIUM = 50000;

    container.innerHTML = '';

    if (!friends.length) {
        renderNoData(container);
        if (countEl) countEl.textContent = '(0)';
        if (totalLabel) totalLabel.textContent = '0 💎';
        return;
    }

    friends.forEach(f => {
        const bonus = f.is_premium ? BONUS_PREMIUM : BONUS_REGULAR;
        totalBonus += bonus;

        const item = document.createElement('div');
        item.className = 'invite-item';
        item.style.cssText = `
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px; 
            margin-bottom: 8px; 
            background: rgba(0, 0, 0, 0.5); 
            border-radius: 8px;
        `;

        const left = document.createElement('div');
        left.style.cssText = "display: flex; gap: 10px; align-items: center;";

        const avatar = document.createElement('div');
        avatar.style.cssText = "width: 44px; height: 44px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; justify-content: center; font-weight: 700; color: rgb(255, 255, 255);";
        avatar.textContent = (f.first_name || 'U').slice(0, 2).toUpperCase();

        const info = document.createElement('div');
        const name = document.createElement('div');
        name.style.fontWeight = '700';
        name.textContent = f.first_name || 'Unknown';

        const prc = document.createElement('div');
        prc.style.opacity = '0.8';
        prc.style.fontSize = '12px';
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
        right.style.cssText = "text-align: right;";

        const bonusDiv = document.createElement('div');
        bonusDiv.style.cssText = "color: #ffd700; font-weight: 700; font-size: 14px;";
        bonusDiv.textContent = `+${bonus / 1000}K 💎`;
        if (f.is_premium) {
            bonusDiv.innerHTML += ' <span style="font-size:10px">🌟</span>';
        }
        right.appendChild(bonusDiv);

        item.appendChild(left);
        item.appendChild(right);
        container.appendChild(item);
    });

    if (countEl) countEl.textContent = `(${friends.length})`;
    if (totalLabel) {
        totalLabel.innerHTML = `<span style="color: #ffd700; font-size: 18px; font-weight: bold;">${totalBonus.toLocaleString()} 💎</span>`;
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
document.addEventListener('DOMContentLoaded', () => {
    loadFriendsList();
    initInvite();
});

// Avto intervalni olib tashlaymiz
// setInterval(loadFriendsList, 30000); // OLIB TASHLANDI