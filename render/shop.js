// --- NEW: renderShop (card layout) ---
const SHOP = [
  { id: 'energyPack', name: 'Energy +1000', img: './image/boost.png', type: 'energy', amount: INCREASE_BLOCK, costWei: BigInt(INCREASE_BLOCK) * DIAMOND_TO_WEI }
];
const SHOP_ITEMS = [
  { id: 'gem1', name: '500', bonus: '+500', cost: '1,19 US$', img: './image/bagdiamonds.jpg' },
  { id: 'gem2', name: '2,500', bonus: '+2,500', cost: '5,99 US$', img: './image/gem1.jpg' },
  { id: 'gem3', name: '5,000', bonus: '+5,000', cost: '11,99 US$', img: './image/gem2.jpg' },
  { id: 'gem4', name: '10,000', bonus: '+10,000', cost: '23,99 US$', img: './image/gem3.jpg' },
  { id: 'gem5', name: '25,000', bonus: '+25,000', cost: '54,99 US$', img: './image/gem4.jpg' },
  { id: 'gem6', name: '50,000', bonus: '+50,000', cost: '109,99 US$', img: './image/gem5.jpg' },
];


function renderShop() {
  const s = loadState();
  content.innerHTML = `
            <div style=" margin-top: 50px;">
              <div>
                <h1 style="text-align:center; color:rgb(50, 214, 255); font-size: 24px; margin-bottom:20px;">Store</h1>
              </div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <div class="btn-group" style="margin:auto;">
                        <div id="tabShop" class="btn">Diamonds</div>
                        <div id="tabEnergy" class="btn">Energy</div>
                        <div id="tabSkins" class="btn">Skins</div>
                    </div>
                </div>
                <button id="incomeBack" class="btn">Back</button>
                <div style="display:flex; gap:12px; margin-top:6px;">
                    <div id="energyCol" style="flex:1; display:flex; flex-direction:column; gap:12px;">
                      ${SHOP.map(it => `
                        <div class="shop-item" data-id="${it.id}" style=" margin-bottom: 20px; display: flex; background:rgba(0,0,0,0.5); border-radius:12px; padding:12px;">
                          <img src="${it.img}" alt="${it.name}" style="width:100px; object-fit:cover; border-radius:8px;">
                          <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div><b>${it.name}</b><div style="color:#ccc; font-size:13px;">Cost: ${fmtPRC(it.costWei)}</div></div>
                            <button class="playGameBtn buyShopBtn" data-id="${it.id}">Buy</button>
                          </div>
                        </div>
                      `).join('')}
                </div>
                <div id="skinCol" style="flex:1; display:flex; flex-direction:column; gap:12px; display:none;">
                  ${SKINS.map(sk => `
                    <div class="skin-item" data-skin="${sk.id}" style="    margin-bottom: 20px; background:rgba(0,0,0,0.5); border-radius:12px; padding:12px;">
                      <img src="./image/${sk.id}" alt="${sk.name}" style="width:200px;  object-fit:cover; border-radius:8px;">
                      <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div><b>${sk.name}</b><div style="color:#ccc; font-size:13px;">Skin for your tap</div></div>
                        <button class="playGameBtn buySkinBtn" data-skin="${sk.id}">Buy</button>
                      </div>
                    </div>
                  `).join('')}}
                </div>
                </div>

                
                <div id="shopCol" style="display:none; padding: 10px;">
                    <div style="background: linear-gradient(180deg, #4a90e2 0%, #1a56a0 100%); border-radius: 15px; padding: 15px; margin-bottom: 20px; color: white; position: relative; overflow: hidden;">
                        <h2 style="margin: 0; font-size: 22px; font-style: italic; position: relative; z-index: 50;">2X Gem Bonus</h2>
                        <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9; line-height: 1.4; position: relative;  z-index: 50;">Any first purchase of any <br>
                         tier earns 2x Rebate rewards.</p>
                        <img src="./image/gems_pile.jpg" style="position: absolute; right: 0px; top: -10px; width: 100%; opacity: 0.8; z-index:1;">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        ${SHOP_ITEMS.map(it => `
                            <div class="shop-card" style="background: #f3c178; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; align-items: center; border: 2px solid #e2a04a; position: relative;">

                                <div style="position: absolute; top: 5px; left: 5px; background: #ff4d4d; color: white; font-size: 10px; padding: 2px 8px; border-radius: 20px; border: 1px solid white; font-weight: bold; display: flex; align-items: center; gap: 3px; z-index: 50;">
                                    <span style="font-size: 8px;">First</span> 💎 ${it.bonus}
                                </div>
                        
                                <img src="${it.img}" style="width: 100%; margin-top: 0px; margin-bottom: -60px; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.2)); z-index: 1;">

                                <div style="font-weight: 900; color: #3a7994; font-size: 18px; margin-bottom: 5px; z-index: 50;">${it.name}</div>

                                <div style="background: #e69a30; width: 100%; text-align: center; padding: 8px 0; color: white; font-weight: bold; border-top: 2px solid #d48a20; cursor: pointer; z-index: 50;">
                                    ${it.cost}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                </div>
            </div>
        `;
  // tab handlers
  const tabShop = document.getElementById('tabShop');
  const tabEnergy = document.getElementById('tabEnergy');
  const tabSkins = document.getElementById('tabSkins');
  const shopCol = document.getElementById('shopCol');
  const skinCol = document.getElementById('skinCol');
  const energyCol = document.getElementById('energyCol');

  function activateShop() { shopCol.style.display = ''; skinCol.style.display = 'none'; energyCol.style.display = 'none'; tabShop.disabled = true; tabSkins.disabled = false; tabEnergy.disabled = false; }

  function activateEnergy() { energyCol.style.display = ''; shopCol.style.display = 'none'; skinCol.style.display = 'none'; tabEnergy.disabled = true; tabShop.disabled = false; tabSkins.disabled = false; }

  function activateSkins() { shopCol.style.display = 'none'; energyCol.style.display = 'none'; skinCol.style.display = ''; tabShop.disabled = false; tabSkins.disabled = true; tabEnergy.disabled = false; }

  tabShop.addEventListener('click', activateShop);
  tabEnergy.addEventListener('click', activateEnergy);
  tabSkins.addEventListener('click', activateSkins);
  // default active
  activateShop();
  // shop buys
  document.querySelectorAll('.buyShopBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = SHOP_ITEMS.find(x => x.id === id);
      if (!item) return;
      const state = loadState();
      if (!chargeCost(state, item.costWei)) { alert('Yetarli PRC yo‘q.'); return; }
      if (item.type === 'energy') {
        // Increase both maxEnergy and energy by the purchased amount, then refill energy to max
        state.maxEnergy = (state.maxEnergy || DEFAULT_MAX_ENERGY) + item.amount;
        state.energy = state.maxEnergy;
      }
      else if (item.type === 'taps') state.tapCap = (state.tapCap || DEFAULT_TAP_CAP) + item.amount;
      saveState(state);
      alert(`${item.name} sotib olindi.`);
      renderShop();
    });
  });

  // skin buys (inside shop)
  document.querySelectorAll('.buySkinBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.skin;
      const state = loadState();
      if (!chargeCost(state, SKIN_COST_WEI)) { alert('Yetarli PRC yo‘q skin sotib olish uchun.'); return; }
      state.selectedSkin = skinId;
      saveState(state);
      alert('Skin sotib olindi: ' + SKINS.find(s => s.id === skinId).name);
      renderShop();
    });
  });
  // show Telegram BackButton and set it to return to main renderGame
  showTelegramBack(() => { showNav(); renderGame(); });
  // hide bottom nav and enable Telegram Back to return to game
  hideNav();
  hideheader();
  showTelegramBack(() => { document.body.style.background = ""; hideTelegramBack(); showNav(); showheader(); renderGame(); });

  // back handler
  document.getElementById('incomeBack').addEventListener('click', () => { document.body.style.background = ""; hideTelegramBack(); showNav(); showheader(); renderGame(); });
  // helpers to hide/show bottom header

  function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
  function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }
  function hideheader() { const header = document.querySelector('.header'); if (header) header.style.display = 'none'; }
  function showheader() { const header = document.querySelector('.header'); if (header) header.style.display = ''; }
}

