// --- NEW: renderGames (list of game cards) ---
const GAMES = [
    { id: 'game', name: 'Game One', img: './game/game.png' }
];
function renderGames() {
    content.innerHTML = `
            <div style=" margin-top: 90px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                  <div style="flex:1; text-align:center; font-weight:800;">🎮 Games</div>
                </div>
                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;">
                    <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
                        ${GAMES.map(g => `
                        <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                            <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">
                            <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <b>${g.name}</b>
                                    <div style="color:#ccc; font-size:13px;">Tap to play</div>
                                </div>
                                <button class="btn playGameBtn" data-id="${g.id}">Play</button>
                            </div>
                        </div>
                        `).join('')}}
                    </div>
                    <div style="flex:1;"></div>
                </div>
            </div>   
        `;


    document.querySelectorAll('.playGameBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const gameObj = GAMES.find(x => x.id === id) || { name: id };
            // inject iframe (no full reload)
            content.innerHTML = `
                  <div style="display:flex; flex-direction:column; height:100%;">
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px;">
                      <button id="backFromGame" class="btn">Back</button>
                      <div style="font-weight:800;">🎮 ${gameObj.name}</div>
                      <div style="width:64px"></div>
                    </div>
                    <iframe id="gameIframe" src="./game/${id}.html" style="border:0; width:100%; height:calc(100vh - 120px); flex:1;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
                  </div>
                `;
        });
    });
    hideNav();
            const s = loadState();
            // show Telegram BackButton and set it to return to main renderGame
            showTelegramBack(() => { showNav(); renderGame(); });
            // show Telegram BackButton and set it to return to main renderGame
            showTelegramBack(() => { showheader(); renderGame(); });
            // hide bottom nav and enable Telegram Back to return to game
            hideheader();
            showTelegramBack(() => { hideTelegramBack(); showheader(); renderGame(); });

            showTelegramBack(() => { renderGames(); showNav(); hideTelegramBack(); });
            // onscreen back button handler
            const backBtn = document.getElementById('backFromGame');
            if (backBtn) {
                backBtn.addEventListener('click', () => { renderGames(); showNav(); hideTelegramBack(); });
            }
    // helpers to hide/show bottom header
    function hideheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = 'none'; }
    function showheader() { const nav = document.querySelector('.header'); if (nav) nav.style.display = ''; }
    // helpers to hide/show bottom nav
    function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
}
