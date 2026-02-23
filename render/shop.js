// ==========================================
// RENDER SHOP - OWNED SKINS & SUPABASE SYNC
// ==========================================

const SHOP_ITEMS = [
  { id: 'gem1', name: '1000', bonus: '+1000', cost: '1.19 US$', img: './image/bagdiamonds.jpg' },
  { id: 'gem2', name: '5,000', bonus: '+5000', cost: '4.99 US$', img: './image/gem1.jpg' },
  { id: 'gem3', name: '10,000', bonus: '+10,000', cost: '9.98 US$', img: './image/gem2.jpg' },
  { id: 'gem4', name: '20,000', bonus: '+20,000', cost: '19.96 US$', img: './image/gem3.jpg' },
  { id: 'gem5', name: '50,000', bonus: '+50,000', cost: '49.99 US$', img: './image/gem4.jpg' },
  { id: 'gem6', name: '100,000', bonus: '+100,000', cost: '99.98 US$', img: './image/gem5.jpg' },
];

const SKIN_COST_DIAMOND = 3; // Har bir skin uchun narx (diamondsda)
const SKINS = [
    { id: "bronza.png", name: "Bronza", file: "./image/bronza.png" },
    { id: "silver.png", name: "Silver", file: "./image/silver.png" },
    { id: "gold.png", name: "Gold", file: "./image/gold.png" },
    { id: "smart_gold.png", name: "Smart Gold", file: "./image/smart_gold.png" },
    { id: "platinium.png", name: "Platinium", file: "./image/platinium.png" },
    { id: "master.png", name: "Master", file: "./image/master.png" }
];

// Dinamik narxni hisoblash funksiyasi
function getDynamicEnergyCost(currentMax) {
    if (currentMax < 2000) {
        return 5; // 1-xarid uchun 500k
    } else {
        // 2000 da 1M, 3000 da 2M, 4000 da 3M qilib hisoblaydi
        const level = Math.floor((currentMax - 1000) / 1000); 
        return level * 10;
    }
}

function renderShop() {
  const shopcontent = document.getElementById('shopcontent');
  if (!shopcontent) return;

  if (!state) return;

  if (!state.ownedSkins || !Array.isArray(state.ownedSkins)) {
      state.ownedSkins = ["bronza.png"]; 
  }

  const currentSkin = state.selectedSkin;
  const currentMaxEnergy = state.maxEnergy || 1000;
  const isEnergyMaxed = currentMaxEnergy >= 50000;
  const currentEnergyCost = getDynamicEnergyCost(currentMaxEnergy);

  shopcontent.innerHTML = `
    <div style="margin-top: 50px;">
      <div><h1 style="text-align:center; color:rgb(50, 214, 255); font-size: 24px; margin-bottom:20px;">Store</h1></div>

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <div class="btn-group" style="margin:auto;">
              <div id="tabShop" class="btn active-tab">Diamonds</div>
              <div id="tabEnergy" class="btn">Energy</div>
              <div id="tabSkins" class="btn">Skins</div>
          </div>
      </div>

      <button id="shopBack" class="btn">Back</button>

      <div style="margin-top:6px;">
          
          <div id="energyCol" style="display:none; flex-direction:column; gap:12px;">
              <div class="shop-item" style="background:rgba(0,0,0,0.5); border-radius:12px; padding:12px; display: flex; align-items: center;">
                <img src="./image/boost.png" alt="Energy Boost" style="width:80px; object-fit:cover; border-radius:8px;">
                <div style="margin-left:12px; flex:1;">
                  <b style="color: #4ade80;">+1000 Max Energy</b>
                  <div style="color:#ccc; font-size:13px; margin-top: 4px;">Current Max: ${currentMaxEnergy.toLocaleString()} ⚡</div>
                  <div style="color:#ffd700; font-size:14px; font-weight: bold; margin-top: 2px;">
                    ${isEnergyMaxed ? 'Max Limit Reached' : `Cost: 💎 ${currentEnergyCost.toLocaleString()}`}
                  </div>
                </div>
                ${isEnergyMaxed 
                    ? `<button class="btn" style="cursor:not-allowed; background:#555;" disabled>Maxed</button>`
                    : `<button class="playGameBtn" id="buyDynamicEnergyBtn">Buy</button>`
                }
              </div>
          </div>

          <div id="skinCol" style="display:none; flex-direction:column; gap:12px;">
            ${SKINS.map(sk => {
                const isSelected = (currentSkin === sk.id);
                const isOwned = state.ownedSkins.includes(sk.id); // Bizda bormi?

                let btnHtml = '';
                if (isSelected) {
                    btnHtml = `<button class="playGameBtn" style="cursor:default; background:#555;" disabled>Active</button>`;
                } else if (isOwned) {
                    // Agar bor bo'lsa, lekin tanlanmagan bo'lsa -> SELECT tugmasi
                    btnHtml = `<button class="playGameBtn equipSkinBtn" data-skin="${sk.id}">Select</button>`;
                } else {
                    // Agar yo'q bo'lsa -> BUY tugmasi
                    btnHtml = `<button class="playGameBtn buySkinBtn" data-skin="${sk.id}">Buy</button>`;
                }

                return `
              <div class="skin-item" style="background:rgba(0,0,0,0.5); border-radius:12px; padding:12px; border: ${isSelected ? '2px solid gold' : 'none'};">
                <img src="./image/${sk.id}" alt="${sk.name}" style="height:200px; object-fit:contain; border-radius:8px;">
                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <b style="color:${isSelected ? '#ffd700' : '#fff'};">${sk.name}</b>
                    <div style="color:#ccc; font-size:13px;">${isOwned ? 'Owned' : 'Skin price: 💎 ' + SKIN_COST_DIAMOND.toLocaleString()}</div>
                  </div>
                  <div style="text-align:right;">
                    ${btnHtml}
                  </div>
                </div>
              </div>
            `}).join('')}
          </div>
      
          <div id="shopCol1" style="display:block; padding: 10px;">
              <div style="background: linear-gradient(180deg, #4a90e2 0%, #1a56a0 100%); border-radius: 15px; padding: 15px; margin-bottom: 20px; color: white; position: relative; overflow: hidden;">
                  <h2 style="margin: 0; font-size: 22px; font-style: italic; position: relative; z-index: 50;">2X Diamond Bonus</h2>
                  <p style="margin: 8px 0 0; font-size: 13px; opacity: 0.9; line-height: 1.4; position: relative; z-index: 50;">First purchase bonus.</p>
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
                          <div class="buy-btn" onclick="if(window.buyItem) window.buyItem('${it.id}')" 
                               style="background: #e69a30; width: 100%; text-align: center; padding: 8px 0; color: white; font-weight: bold; border-top: 2px solid #d48a20; cursor: pointer; z-index: 50;">
                              ${it.cost}
                          </div>
                      </div>
                  `).join('')}
              </div>
          </div>
      </div>
    </div>
  `;

  // --- TABLAR BOSHQARUVI ---
  const tabShop = document.getElementById('tabShop');
  const tabEnergy = document.getElementById('tabEnergy');
  const tabSkins = document.getElementById('tabSkins');
  const shopCol1 = document.getElementById('shopCol1');
  const skinCol = document.getElementById('skinCol');
  const energyCol = document.getElementById('energyCol');

  function resetTabs() {
      shopCol1.style.display = 'none';
      skinCol.style.display = 'none';
      energyCol.style.display = 'none';
      tabShop.classList.remove('active-tab');
      tabEnergy.classList.remove('active-tab');
      tabSkins.classList.remove('active-tab');
      tabShop.style.color = '';
      tabEnergy.style.color = '';
      tabSkins.style.color = '';
  }

  tabShop.addEventListener('click', () => { resetTabs(); shopCol1.style.display = 'block'; tabShop.style.color = '#ffd700'; });
  tabEnergy.addEventListener('click', () => { resetTabs(); energyCol.style.display = 'flex'; tabEnergy.style.color = '#ffd700'; });
  tabSkins.addEventListener('click', () => { resetTabs(); skinCol.style.display = 'flex'; tabSkins.style.color = '#ffd700'; });
  // Default: Shop tabini aktiv qilish
  tabShop.click();

  // --- DINAMIK ENERGY BUY LOGIKASI ---
  const buyEnergyBtn = document.getElementById('buyDynamicEnergyBtn');
  if (buyEnergyBtn) {
      buyEnergyBtn.addEventListener('click', () => {
          if (!state) return;

          const currentMax = state.maxEnergy || 1000;
          const cost = getDynamicEnergyCost(currentMax);

          if (currentMax >= 50000) {
              alert("You have reached the maximum energy limit of 50,000!");
              return;
          }

          if ((state.diamond || 0) < cost) {
              alert(`Not enough Diamonds! Need ${cost.toLocaleString()} 💎`);
              return;
          }

          // Pulni yechish
          state.diamond -= cost;
          
          // Energiyani hisoblash (50k dan oshib ketmasligi kerak)
          let newMax = currentMax + 1000;
          if (newMax > 50000) newMax = 50000;
          
          state.maxEnergy = newMax;
          state.energy = newMax; // Olganda energiyani darhol to'ldirib beramiz

          // Saqlash
          saveState(state);
          if (typeof saveUserState === 'function') saveUserState(state, 'full');
          if (typeof updateHeaderDiamond === 'function') updateHeaderDiamond();
          
          alert(`Success! +1000 Energy. New Max: ${newMax.toLocaleString()} ⚡`);
          renderShop(); // Interfeysni darhol qayta chizib, yangi narxni ko'rsatamiz
      });
  }

  // --- SKIN BUY ---
  document.querySelectorAll('.buySkinBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.skin;
      const currentDiamond = state.diamond || 0;
      
      if (currentDiamond < SKIN_COST_DIAMOND) {
        alert(`Not enough Diamonds! Need ${SKIN_COST_DIAMOND.toLocaleString()} 💎`);
        return;
      }

      state.diamond -= SKIN_COST_DIAMOND;
      
      if (!state.ownedSkins.includes(skinId)) {
          state.ownedSkins.push(skinId);
      }
      state.selectedSkin = skinId;

      saveState(state);
      if (typeof saveUserState === 'function') saveUserState(state, 'full');
      if (typeof updateHeaderDiamond === 'function') updateHeaderDiamond();
      
      alert(`Skin purchased and equipped!`);
      renderShop(); 
    });
  });

  // --- SKIN SELECT ---
  document.querySelectorAll('.equipSkinBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.skin;
      state.selectedSkin = skinId;
      
      saveState(state);
      if (typeof saveUserState === 'function') saveUserState(state, 'full');

      alert(`Skin equipped!`);
      renderShop();
    });
  });
}
