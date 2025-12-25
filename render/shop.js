// --- NEW: renderShop (card layout) ---
const SHOP = [
  { id: 'energyPack', name: 'Energy +1000', img: './image/boost.png', type: 'energy', amount: INCREASE_BLOCK, costWei: BigInt(INCREASE_BLOCK) * DIAMOND_TO_WEI }
];

function renderShop() {
  const s = loadState();
  content.innerHTML = `
            <div style=" margin-top: 150px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <div class="btn-group" style="margin:auto;">
                        <div id="tabShop" class="btn">Shop</div>
                        <div id="tabSkins" class="btn">Skins</div>
                    </div>
                </div>
                <button id="incomeBack" class="btn">Back</button>
                <div style="display:flex; gap:12px; margin-top:6px;">
                    <div id="shopCol" style="flex:1; display:flex; flex-direction:column; gap:12px;">
                      ${SHOP.map(it => `
                        <div class="shop-item" data-id="${it.id}" style=" margin-bottom: 20px; display: flex; background:rgba(0,0,0,0.5); border-radius:12px; padding:12px;">
                          <img src="${it.img}" alt="${it.name}" style="width:100px; object-fit:cover; border-radius:8px;">
                          <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                            <div><b>${it.name}</b><div style="color:#ccc; font-size:13px;">Cost: ${fmtPRC(it.costWei)}</div></div>
                            <button class="btn buyShopBtn" data-id="${it.id}">Buy</button>
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
                        <button class="btn buySkinBtn" data-skin="${sk.id}">Buy</button>
                      </div>
                    </div>
                  `).join('')}}
                </div>
                </div>
            </div>
        `;
  // tab handlers
  const tabShop = document.getElementById('tabShop');
  const tabSkins = document.getElementById('tabSkins');
  const shopCol = document.getElementById('shopCol');
  const skinCol = document.getElementById('skinCol');
  function activateShop() { shopCol.style.display = ''; skinCol.style.display = 'none'; tabShop.disabled = true; tabSkins.disabled = false; }
  function activateSkins() { shopCol.style.display = 'none'; skinCol.style.display = ''; tabShop.disabled = false; tabSkins.disabled = true; }
  tabShop.addEventListener('click', activateShop);
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
  showTelegramBack(() => { hideTelegramBack(); showNav(); renderGame(); });

  // back handler
  document.getElementById('incomeBack').addEventListener('click', () => { hideTelegramBack(); showNav(); showheader(); renderGame(); });

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

  function hideNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = 'none'; }
  function showNav() { const nav = document.querySelector('.nav'); if (nav) nav.style.display = ''; }
}

