// --- NEW: renderGames (list of game cards) ---
const GAMES = [
    { id: 'game', name: 'Game One', img: '/image/airIcon.png' }
];

function renderGames() {
    const s = loadState(); // Assuming loadState is defined elsewhere
    
    gamelistcontent.innerHTML = `
        <div style="margin-top: 53px; height: 100vh; overflow-y: auto;" id="gameListContainer">
            
            <!-- Floating Back Button (Hidden by default) -->
            <button id="backFromGame" class="btn" style="
                position: fixed; 
                top: 95px; 
                z-index: 1000; 
                opacity: 0; 
                visibility: hidden; 
                transition: opacity 0.3s ease, visibility 0.3s ease;
                
            ">Back</button>

            <div style="display:flex; align-items:center; justify-content: center; gap:8px; margin-bottom:24px;">
                <img src="/image/gameName.png" alt="Games Icon" style="width: 120px; height: auto;">
            </div>
            
            <!-- Chiroyli Banner Dizayni -->
            <div style="margin: 0 8px 24px 8px; border-radius: 16px; box-shadow: 0 8px 16px rgba(0,0,0,0.5), 0 0 20px rgba(138, 43, 226, 0.25); overflow: hidden; position: relative; border: 1px solid rgba(255,255,255,0.1);">
                <img src="/image/gameBanner.png" alt="Games Banner" style="width: 100%; height: 180px; object-fit: cover; object-position: center; display: block;">
                <!-- Rasmning pastki qismida qorayib boruvchi chiroyli effekt (gradient) -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); pointer-events: none;"></div>
            </div>

            <div style=" margin-top:6px; margin-left:6px; margin-right: 6px; padding-bottom: 100px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    ${GAMES.map(g => `
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(4px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px; z-index: 1;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; z-index: 100;">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white;">${g.name}</b>
                            </div>
                            <button class="playGameBtn" data-id="${g.id}"  >Play</button>
                        </div>
                    </div>
                    <!-- Added extra placeholder items for scroll testing if needed -->
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
                        </div>
                    </div>
                    <div style="background:rgba(255,255,255,0.03); backdrop-filter: blur(7px); border: 1px #ffffff1f solid; border-radius:12px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; height:160px;">
                        <img src="${g.img}" alt="${g.name}" style="width:100%; height:90px; object-fit:cover; border-radius:8px; filter: blur(6px) grayscale(40%); transform: scale(1.1);">
                        <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <b style="color: white; filter: blur(2.5px);">${g.name}</b>
                            </div>
                            <button class="playGameBtn" style="filter: blur(2.5px);" data-id="${g.id}"  >Play</button>
                        </div>
                        <!-- Markazda "Tez kunda" yozuvi -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 10;">
                            <span style="background: rgba(0,0,0,0.7); color: #ffe600; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,230,0,0.3); backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">Coming soon</span>
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
            // NOTE: You might need to handle the 'backFromGame' behavior from inside the iframe 
            // or add a persistent back button for the iframe view if needed.
        });
    });

    const scrollContainer = document.getElementById('gameListContainer');
    const backButton = document.getElementById('backFromGame');
    
    let inactivityTimer;

    function resetInactivityTimer() {
        if (!backButton) return;
        
        // Harakat sezilganda tugmani ko'rsatish
        backButton.style.opacity = '1';
        backButton.style.visibility = 'visible';

        // Avvalgi taymerni to'xtatish
        clearTimeout(inactivityTimer);

        // 2 soniyadan so'ng (2000 ms) tugmani yana yashirish uchun yangi taymer
        inactivityTimer = setTimeout(() => {
            backButton.style.opacity = '0';
            backButton.style.visibility = 'hidden';
        }, 2000);
    }

    if (scrollContainer && backButton) {
        // Har qanday harakat (scroll, sichqoncha qimirlashi yoki ekranga teginish) kuzatiladi
        scrollContainer.addEventListener('scroll', resetInactivityTimer);
        scrollContainer.addEventListener('mousemove', resetInactivityTimer);
        scrollContainer.addEventListener('touchstart', resetInactivityTimer);
        scrollContainer.addEventListener('touchmove', resetInactivityTimer);

        // Sahifa birinchi ochilganda ham taymerni ishga tushirib qo'yish
        resetInactivityTimer();

        // Add actual functionality to the back button
        backButton.addEventListener('click', () => {
            console.log("Back button clicked!");
            // Implement your back logic here, e.g., closing the view, going to home, etc.
            // Example:
            // window.location.href = 'index.html'; 
        });
    } else {
        // Fallback to window events
        window.addEventListener('scroll', resetInactivityTimer);
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('touchstart', resetInactivityTimer);
        window.addEventListener('touchmove', resetInactivityTimer);
        
        resetInactivityTimer();
    }
}