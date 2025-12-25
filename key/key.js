// show Telegram BackButton and set it to return to main renderGame
showTelegramBack(() => { showheader(); renderGame(); });
// hide bottom nav and enable Telegram Back to return to game
hideheader();
showTelegramBack(() => { hideTelegramBack(); showheader(); renderGame(); });

// show Telegram BackButton and set it to return to main renderGame
showTelegramBack(() => { showNav(); renderGame(); });
// hide bottom nav and enable Telegram Back to return to game
hideNav();
showTelegramBack(() => { hideTelegramBack(); showNav(); renderGame(); });

// back handler
document.getElementById('keyBack').addEventListener('click', () => { hideTelegramBack(); showNav(); showheader(); renderGame(); });

// --- Telegram BackButton boshqaruv funksiyalari ---
function showTelegramBack(handler) {
    if (window.Telegram?.WebApp?.BackButton) {
        try {
            window.Telegram.WebApp.BackButton.show();
            window.Telegram.WebApp.BackButton.onClick(handler);
        } catch (e) { /* ignore */ }
    }
}

function hideTelegramBack() {
    if (window.Telegram?.WebApp?.BackButton) {
        try {
            window.Telegram.WebApp.BackButton.hide();
            // handlerni bekor qilamiz
            window.Telegram.WebApp.BackButton.onClick(() => { });
        } catch (e) { /* ignore */ }
    }
}
// helpers to hide/show bottom header
function hideheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = 'none'; }
function showheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = ''; }
function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }