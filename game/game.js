(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const scoreEl = document.getElementById('score');

  const GAME_W = 900, GAME_H = 1600;
  function fitCanvas(){
    const ratio = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
    
    canvas.style.transformOrigin = 'left top';
    canvas.width = GAME_W; canvas.height = GAME_H;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  const planeImg = new Image();
  planeImg.src = './image/game.png';

  let playing = false, gameOver = false;
  let lastTime = 0, fireTimer = 0, spawnTimer = 0;
  let bullets = [], enemies = [], score = 0;

  const plane = { x: GAME_W/2, y: GAME_H-300, w: 140, h: 140, angle: -Math.PI/2 };

  // input state
  let dragId = null, rotateId = null, dragging = false, dragOffset = {x:0,y:0};
  let mouseDown = false;

  function rand(min,max){ return Math.random()*(max-min)+min; }
  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

  function resetGame(){
    bullets = []; enemies = []; score = 0; scoreEl.textContent = 'Score: 0';
    plane.x = GAME_W/2; plane.y = GAME_H-300; plane.angle = -Math.PI/2;
    playing = true; gameOver = false; lastTime = performance.now(); fireTimer = 0; spawnTimer = 0;
    playBtn.classList.add('hidden');
    requestAnimationFrame(loop);
  }

  playBtn.addEventListener('click', () => {
    resetGame();
  });

  // Touch handlers
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of Array.from(e.changedTouches)){
      const px = (t.clientX - rect.left) * (canvas.width / rect.width);
      const py = (t.clientY - rect.top) * (canvas.height / rect.height);
      if (e.touches.length === 1){
        dragId = t.identifier; dragging = true;
        dragOffset.x = plane.x - px; dragOffset.y = plane.y - py;
      } else {
        if (t.identifier !== dragId) rotateId = t.identifier;
      }
    }
  }, { passive:false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of Array.from(e.touches)){
      const px = (t.clientX - rect.left) * (canvas.width / rect.width);
      const py = (t.clientY - rect.top) * (canvas.height / rect.height);
      if (t.identifier === dragId){
        plane.x = Math.max(60, Math.min(GAME_W-60, px + dragOffset.x));
        plane.y = Math.max(60, Math.min(GAME_H-60, py + dragOffset.y));
      } else if (t.identifier === rotateId){
        plane.angle = Math.atan2(py - plane.y, px - plane.x);
      }
    }
  }, { passive:false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)){
      if (t.identifier === dragId){ dragId = null; dragging = false; }
      if (t.identifier === rotateId) rotateId = null;
    }
  }, { passive:false });

  // Mouse support (drag to move, wheel rotate)
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    dragOffset.x = plane.x - px; dragOffset.y = plane.y - py;
  });
  window.addEventListener('mousemove', (e) => {
    if (!mouseDown) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    plane.x = Math.max(60, Math.min(GAME_W-60, px + dragOffset.x));
    plane.y = Math.max(60, Math.min(GAME_H-60, py + dragOffset.y));
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); plane.angle += Math.sign(e.deltaY)*0.12; });

  function spawnBullet(){
    const speed = 1200;
    const nx = plane.x + Math.cos(plane.angle) * (plane.w*0.45);
    const ny = plane.y + Math.sin(plane.angle) * (plane.h*0.45);
    bullets.push({ x:nx, y:ny, vx:Math.cos(plane.angle)*speed, vy:Math.sin(plane.angle)*speed, r:7 });
  }

  function spawnEnemy(){
    const ex = rand(60, GAME_W-60);
    const speed = rand(120, 360);
    enemies.push({ x:ex, y:-40, vy:speed, r:28, hp:1 });
  }

  function collide(a,b){ return dist(a,b) < (a.r + b.r); }

  function endGame(){
    playing = false; gameOver = true;
    playBtn.textContent = 'Play Again';
    playBtn.classList.remove('hidden');
  }

  function loop(t){
    if (!playing) return;
    const dt = Math.min(0.04, (t - lastTime)/1000 || 0.016);
    lastTime = t;

    spawnTimer += dt;
    if (spawnTimer > 0.8){ spawnTimer = 0; spawnEnemy(); }

    fireTimer += dt;
    if (fireTimer > 0.16){ fireTimer = 0; spawnBullet(); }

    // update bullets
    for (let i = bullets.length-1; i>=0; i--){
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -50 || b.x > GAME_W+50 || b.y < -50 || b.y > GAME_H+50) bullets.splice(i,1);
    }

    // update enemies
    for (let i = enemies.length-1; i>=0; i--){
      const en = enemies[i];
      en.y += en.vy * dt;
      // plane collision
      const planeBody = { x:plane.x, y:plane.y, r: Math.max(plane.w, plane.h)*0.38 };
      if (collide(en, planeBody)){ endGame(); return; }
      // bullets collision
      for (let j = bullets.length-1; j>=0; j--){
        if (collide(en, bullets[j])){
          enemies.splice(i,1); bullets.splice(j,1); score++; scoreEl.textContent = 'Score: ' + score;
          break;
        }
      }
      if (en.y > GAME_H + 80) enemies.splice(i,1);
    }

    // render
    ctx.clearRect(0,0,GAME_W,GAME_H);
    ctx.fillStyle = '#061722'; ctx.fillRect(0,0,GAME_W,GAME_H);

    // enemies
    for (const en of enemies){
      ctx.save(); ctx.translate(en.x, en.y);
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath(); ctx.ellipse(0,0,en.r,en.r*0.6,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // bullets
    ctx.fillStyle = '#fff';
    for (const b of bullets){
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    }

    // plane
    ctx.save(); ctx.translate(plane.x, plane.y); ctx.rotate(plane.angle + Math.PI/2);
    if (planeImg.complete && planeImg.naturalWidth) ctx.drawImage(planeImg, -plane.w/2, -plane.h/2, plane.w, plane.h);
    else {
      ctx.fillStyle = '#7fdfff';
      ctx.beginPath(); ctx.moveTo(0,-plane.h*0.5); ctx.lineTo(plane.w*0.4,plane.h*0.4); ctx.lineTo(-plane.w*0.4,plane.h*0.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(loop);
  }

  // prevent scroll when playing
  document.body.addEventListener('touchmove', e => { if (playing) e.preventDefault(); }, { passive:false });

  // expose for debug
  window._game = { reset: resetGame };
})();