// --- NEW: renderGames (list of game cards) ---
const GAMES = [
    { id: 'game', name: 'Game One', img: './game/game.png' }
];

function renderGames() {
    const s = loadState();
    gamelistcontent.innerHTML = `
            <div style=" margin-top: 53px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:42px;">
                  <div style="flex:1; color:#ffe600; text-align:center; font-weight:800;">🎮 GAMES</div>
                </div>
                <div>
                    <button style="" id="backFromGame" class="btn">Back</button>
                </div>
                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:6px;margin-left:6px;">
                    <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
                        ${GAMES.map(g => `
                        <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                            <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px;">
                            <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <b>${g.name}</b>
                                    <div style="color:#ccc; font-size:13px;">Tap to play</div>
                                </div>
                                <button class="playGameBtn" data-id="${g.id}">Play</button>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                    <div style="flex:1;"></div>
                </div>
            </div>   
        `;


    document.querySelectorAll('.playGameBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            // inject iframe (no full reload)
            gamelistcontent.innerHTML = `
                  <div style="display:flex; flex-direction:column; height:100%;">
                    <iframe id="gameIframe" src="./game/${id}.html" style="border:0; width:100%; height:calc(100vh);" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
                  </div>
                `;
        });
    });

}
