(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const playBtn = document.getElementById('playBtn');
  const scoreEl = document.getElementById('score');

  const GAME_W = 900, GAME_H = 1600;
  function fitCanvas() {
    const ratio = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);

    canvas.style.transformOrigin = 'left top';
    canvas.width = GAME_W; canvas.height = GAME_H;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  const planeImg = new Image();
  planeImg.src = '/image/prcsamalyud.png';

  const strongEnemyImg = new Image(); // New image for the stronger enemy
  strongEnemyImg.src = '/image/atack.gif';

  // Suggested asset paths (place images at these paths or update paths below) - PRC
  // Player sprites (different for each power level): /image/plane_lvl1.png, /image/plane_lvl2.png, /image/plane_lvl3.png  // PRC
  // Player bullet image: /image/bullet_player.png  // PRC
  // Enemy bullet image: /image/bullet_enemy.png    // PRC
  // Rock (weak enemy) image: /image/rock.png       // PRC

  // New image objects for visuals
  const planeImgs = [

    (() => { const i = new Image(); i.src = '/image/airattack.gif'; return i; })(),
    (() => { const i = new Image(); i.src = '/image/airattack2.gif'; return i; })(),
    (() => { const i = new Image(); i.src = '/image/airattack3.gif'; return i; })()
  ];
  const playerBulletImg = new Image(); playerBulletImg.src = '/image/preview1.png';
  const enemyBulletImg = new Image(); enemyBulletImg.src = '/image/preview.png';
  const rockImg = new Image(); rockImg.src = '/image/metyor.gif';

  // Big boss image (added)
  const bigBossImg = new Image(); bigBossImg.src = '/image/bigBossImg.gif';

  // Explosion sprite-sheet (horizontal frames). PRC: /image/air.png — sprite sheet (e.g., 8 frames)
  const explosionImg = new Image(); explosionImg.src = '/image/air.png'; // PRC
  const EXPLOSION_FRAMES = 7;              // o'zgartiring agar air.png da boshqa frame soni bo'lsa  // PRC
  const EXPLOSION_FRAME_DURATION = 0.09;   // har bir ramka qancha sekund davom etadi

  // Big boss constants
  const BIG_BOSS_HP = 50;        // boss can take 50 hits
  const BIG_BOSS_R = 100;        // visual radius
  const BIG_BOSS_FIRE_RATE = 0.5; // seconds between volleys
  const BIG_BOSS_SPEED = 210;    // horizontal patrol speed

  let playing = false, gameOver = false;
  let lastBossSpawnScore = -1; // Prevent multiple spawns for the same milestone
  let lastTime = 0, fireTimer = 0, spawnTimer = 0;
  let bullets = [], enemies = [], enemyBullets = [], score = 0; // Added enemyBullets array
  let killsForBullet = 0; // Tracks kills for bullet power-ups
  let killsForShield = 0; // Tracks kills for shield power-ups
  const KILLS_NEEDED_FOR_BULLET_POWERUP = 3; // Number of kills needed for bullet upgrade
  const KILLS_NEEDED_FOR_SHIELD_POWERUP = 2; // Number of kills needed for shield upgrade // Changed to 2 as per user's earlier clarification

  const MAX_PLAYER_BULLET_COUNT = 3; // Maximum bullets player can fire
  const MAX_PLAYER_SHIELD_HITS = 4;   // Maximum hits player can endure

  // New variables for strong enemy dynamic behavior and spawning
  let strongEnemyCurrentSpawnTimer = 0; // Tracks time for strong enemy spawns
  const STRONG_ENEMY_BASE_HORIZONTAL_SPEED = 90; // Base horizontal patrol speed for strong enemies
  const STRONG_ENEMY_BASE_EVASION_FORCE = 300; // Base evasion speed, scales with score
  const BULLET_EVASION_DETECTION_DISTANCE_Y = 200; // Vertical distance to detect an incoming bullet
  const STRONG_ENEMY_HOVER_Y_MIN = GAME_H * 0.5; // Minimum hover height for strong enemies
  const STRONG_ENEMY_HOVER_Y_MAX = GAME_H * 0.10; // Maximum hover height for strong enemies

  // New constants for enemy speed scaling
  const ENEMY_SPEED_SCALE_START_SCORE = 30; // Score at which enemy speed starts to increase

  const WEAK_ENEMY_INITIAL_SPEED_MIN = 120;
  const WEAK_ENEMY_INITIAL_SPEED_MAX = 360;
  const WEAK_ENEMY_SPEED_PER_SCORE_POINT = 5; // Increased from 3
  const WEAK_ENEMY_MAX_ADDITIONAL_SPEED = 600; // Increased from 400

  const STRONG_ENEMY_INITIAL_VERTICAL_SPEED_BASE = 100; // Base speed for strong enemy descent
  const STRONG_ENEMY_VERTICAL_SPEED_PER_SCORE_POINT = 3; // Increased from 1.5
  const STRONG_ENEMY_MAX_ADDITIONAL_VERTICAL_SPEED = 500; // Increased from 300

  // New constants for homing bullets
  const ENEMY_HOMING_START_SCORE = 100; // Score at which enemy bullets become homing
  const ENEMY_BULLET_TURN_RATE = Math.PI * 1.5; // Radians per second, controls how fast homing bullets turn

  const plane = {
    x: GAME_W / 2, y: GAME_H - 300, w: 140, h: 140, angle: -Math.PI / 2,
    bulletCount: 1, // Number of bullets fired by player
    shieldHits: 0,   // Number of hits player can take
    prevX: GAME_W / 2 // Add previous X position to calculate velocity
  };

  // input state
  let dragId = null, rotateId = null, dragging = false, dragOffset = { x: 0, y: 0 };
  let mouseDown = false;

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function dist(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }

  // Difficulty scaling functions for strong enemies
  function getStrongEnemyHp(currentScore) {
    if (currentScore >= 40) {
      // Base HP is 4 at score 40, plus 1 HP for every 10 points above 40
      return 4 + Math.floor((currentScore - 40) / 10);
    }
    if (currentScore >= 20) return 2;
    return 1; // Default, though strong enemies only spawn at score >= 20
  }

  function getStrongEnemyFireRate(currentScore) {
    if (currentScore >= 120) return 0.6; // Faster fire rate
    if (currentScore >= 60) return 0.8;
    if (currentScore >= 20) return 1.0;
    return 2.0; // Default
  }

  function getStrongEnemyVerticalSpeed(currentScore) {
    let baseSpeed = STRONG_ENEMY_INITIAL_VERTICAL_SPEED_BASE;
    if (currentScore >= ENEMY_SPEED_SCALE_START_SCORE) {
      const scoreDiff = currentScore - ENEMY_SPEED_SCALE_START_SCORE;
      const speedIncrease = Math.min(scoreDiff * STRONG_ENEMY_VERTICAL_SPEED_PER_SCORE_POINT, STRONG_ENEMY_MAX_ADDITIONAL_VERTICAL_SPEED);
      baseSpeed += speedIncrease;
    }
    return baseSpeed;
  }

  function resetGame() {
    bullets = []; enemies = []; enemyBullets = []; score = 0; scoreEl.textContent = 'Score: 0';
    plane.x = GAME_W / 2; plane.y = GAME_H - 300; plane.angle = -Math.PI / 2;
    plane.prevX = plane.x; // Initialize prevX on reset
    playing = true; gameOver = false; lastTime = performance.now(); fireTimer = 0; spawnTimer = 0;

    // Reset strong enemy specific timers
    strongEnemyCurrentSpawnTimer = 0;

    // Reset player power-ups and their kill counters
    plane.bulletCount = 1;      // Start with 1 bullet
    plane.shieldHits = 0;       // Start with 0 shield hits
    killsForBullet = 0;
    killsForShield = 0;

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
    for (const t of Array.from(e.changedTouches)) {
      const px = (t.clientX - rect.left) * (canvas.width / rect.width);
      const py = (t.clientY - rect.top) * (canvas.height / rect.height);
      if (e.touches.length === 1) {
        dragId = t.identifier; dragging = true;
        dragOffset.x = plane.x - px; dragOffset.y = plane.y - py;
      } else {
        if (t.identifier !== dragId) rotateId = t.identifier;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    for (const t of Array.from(e.touches)) {
      const px = (t.clientX - rect.left) * (canvas.width / rect.width);
      const py = (t.clientY - rect.top) * (canvas.height / rect.height);
      if (t.identifier === dragId) {
        plane.x = Math.max(60, Math.min(GAME_W - 60, px + dragOffset.x));
        plane.y = Math.max(60, Math.min(GAME_H - 60, py + dragOffset.y));
      } else if (t.identifier === rotateId) {
        plane.angle = Math.atan2(py - plane.y, px - plane.x);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === dragId) { dragId = null; dragging = false; }
      if (t.identifier === rotateId) rotateId = null;
    }
  }, { passive: false });

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
    plane.x = Math.max(60, Math.min(GAME_W - 60, px + dragOffset.x));
    plane.y = Math.max(60, Math.min(GAME_H - 60, py + dragOffset.y));
  });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); plane.angle += Math.sign(e.deltaY) * 0.12; });

  function spawnBullet() {
    const speed = 1200;
    const bulletSpreadOffset = plane.w * 0.15; // Increased offset for better visual separation (adjusted from 0.1)
    const baseAngle = plane.angle;
    const bulletsToFire = [];

    // Calculate the base starting point (nose of the plane)
    const noseX = plane.x + Math.cos(baseAngle) * (plane.w * 0.45);
    const noseY = plane.y + Math.sin(baseAngle) * (plane.h * 0.45);

    // Common velocity components for all bullets (straight forward)
    const vx_common = Math.cos(baseAngle) * speed;
    const vy_common = Math.sin(baseAngle) * speed;

    if (plane.bulletCount === 1) {
      bulletsToFire.push({ x: noseX, y: noseY, vx: vx_common, vy: vy_common, r: 7 });
    } else if (plane.bulletCount === 2) {
      // Bullet 1 (left offset)
      let nx1 = noseX - Math.sin(baseAngle) * bulletSpreadOffset;
      let ny1 = noseY + Math.cos(baseAngle) * bulletSpreadOffset;
      bulletsToFire.push({ x: nx1, y: ny1, vx: vx_common, vy: vy_common, r: 7 });

      // Bullet 2 (right offset)
      let nx2 = noseX + Math.sin(baseAngle) * bulletSpreadOffset;
      let ny2 = noseY - Math.cos(baseAngle) * bulletSpreadOffset;
      bulletsToFire.push({ x: nx2, y: ny2, vx: vx_common, vy: vy_common, r: 7 });
    } else if (plane.bulletCount >= 3) {
      // Bullet 1 (center)
      bulletsToFire.push({ x: noseX, y: noseY, vx: vx_common, vy: vy_common, r: 7 });

      // Bullet 2 (left offset)
      let nx1 = noseX - Math.sin(baseAngle) * bulletSpreadOffset;
      let ny1 = noseY + Math.cos(baseAngle) * bulletSpreadOffset;
      bulletsToFire.push({ x: nx1, y: ny1, vx: vx_common, vy: vy_common, r: 7 });

      // Bullet 3 (right offset)
      let nx2 = noseX + Math.sin(baseAngle) * bulletSpreadOffset;
      let ny2 = noseY - Math.cos(baseAngle) * bulletSpreadOffset;
      bulletsToFire.push({ x: nx2, y: ny2, vx: vx_common, vy: vy_common, r: 7 });
    }
    bullets.push(...bulletsToFire);
  }

  function spawnEnemy() { // This is for the 'weak' enemies (red ellipses)
    const ex = rand(60, GAME_W - 60);
    let speedMin = WEAK_ENEMY_INITIAL_SPEED_MIN;
    let speedMax = WEAK_ENEMY_INITIAL_SPEED_MAX;

    if (score >= ENEMY_SPEED_SCALE_START_SCORE) {
      const scoreDiff = score - ENEMY_SPEED_SCALE_START_SCORE;
      const speedIncrease = Math.min(scoreDiff * WEAK_ENEMY_SPEED_PER_SCORE_POINT, WEAK_ENEMY_MAX_ADDITIONAL_SPEED);
      speedMin += speedIncrease;
      speedMax += speedIncrease;
    }

    const speed = rand(speedMin, speedMax);
    enemies.push({ x: ex, y: -40, vy: speed, r: 28, hp: 1, type: 'weak' });
  }

  function spawnStrongEnemy() { // This is for the new 'strong' enemies
    const ex = rand(60, GAME_W - 60);
    const strongEnemyHp = getStrongEnemyHp(score);
    const strongEnemyFireRate = getStrongEnemyFireRate(score);
    const strongEnemyVerticalSpeed = getStrongEnemyVerticalSpeed(score);

    enemies.push({
      x: ex, y: -40,
      vx: 0, // Initialize horizontal velocity
      vy: strongEnemyVerticalSpeed, // Use dynamically scaled vertical speed
      r: 40, hp: strongEnemyHp, type: 'strong',
      fireTimer: rand(0, strongEnemyFireRate), // randomize initial fire
      fireRate: strongEnemyFireRate,
      hovered: false, // Flag to check if it reached hover position
      targetHoverY: rand(STRONG_ENEMY_HOVER_Y_MIN, STRONG_ENEMY_HOVER_Y_MAX), // Random hover height
      patrolDir: (Math.random() < 0.5 ? 1 : -1) // Initial horizontal patrol direction
    });
  }

  function spawnEnemyBullet(enemy) {
    const bulletSpeed = 400; // Speed of enemy bullets
    const isHoming = score >= ENEMY_HOMING_START_SCORE; // Determine if this bullet should be homing

    // Initial direction towards player (even for homing, it's a good starting point)
    const angleToPlayer = Math.atan2(plane.y - enemy.y, plane.x - enemy.x);

    enemyBullets.push({
      x: enemy.x + Math.cos(angleToPlayer) * (enemy.r + 5),
      y: enemy.y + Math.sin(angleToPlayer) * (enemy.r + 5),
      vx: Math.cos(angleToPlayer) * bulletSpeed,
      vy: Math.sin(angleToPlayer) * bulletSpeed,
      r: 10,
      isHoming: isHoming, // Add homing property
      speed: bulletSpeed // Store bullet speed for homing updates
    });
  }
  // Boss spawn + bullet volley (4 bullets spread)
  function spawnBigBoss() {
    // Start centered at top and patrol horizontally
    enemies.push({
      x: GAME_W / 2, y: 60,
      vx: BIG_BOSS_SPEED, vy: 0,
      r: BIG_BOSS_R, hp: BIG_BOSS_HP, type: 'boss',
      fireTimer: rand(0, BIG_BOSS_FIRE_RATE), fireRate: BIG_BOSS_FIRE_RATE,
      direction: Math.random() < 0.5 ? -1 : 1, // left/right patrolling
      exploding: false
    });
  }

  function spawnBossBullets(boss) {
    // Create 4 bullets in downward spread
    const baseSpeed = 820;
    const spreadAngles = [-0.26, -0.1, 0.1, 0.26]; // relative to downward direction (PI/2)
    const baseAngle = Math.PI / 2;
    for (const offset of spreadAngles) {
      const a = baseAngle + offset;
      enemyBullets.push({
        x: boss.x + Math.cos(a) * (boss.r + 10),
        y: boss.y + Math.sin(a) * (boss.r + 10),
        vx: Math.cos(a) * baseSpeed, vy: Math.sin(a) * baseSpeed,
        r: 12, isHoming: false, speed: baseSpeed
      });
    }
  }
  function collide(a, b) { return dist(a, b) < (a.r + b.r); }

  function endGame() {
    playing = false; gameOver = true;
    playBtn.textContent = 'Play Again';
    playBtn.classList.remove('hidden');
  }

  function loop(t) {
    if (!playing) return;
    const dt = Math.min(0.04, (t - lastTime) / 1000 || 0.016);
    lastTime = t;

    // Big boss spawn: every 100 score milestone (100, 200, 300 ...)
    if (score >= 50 && score % 50 === 0 && lastBossSpawnScore !== score) {
      // ensure there's no live boss already
      const bossExists = enemies.some(e => e.type === 'boss');
      if (!bossExists) {
        spawnBigBoss();
        lastBossSpawnScore = score;
      }
    }

    // Store plane's X position for velocity calculation in the next frame
    const currentPlaneX = plane.x;

    // Weak enemy spawning (fixed rate)
    spawnTimer += dt;
    if (spawnTimer > 0.8) {
      spawnTimer = 0;
      spawnEnemy();
    }

    // Strong enemy spawning (dynamic rate based on score)
    if (score >= 20) { // Strong enemies only start spawning after score 20
      strongEnemyCurrentSpawnTimer += dt;

      let strongEnemySpawnInterval = 0;
      if (score >= 120) {
        strongEnemySpawnInterval = 4.0; // 4 seconds interval for high scores
      } else if (score >= 60) {
        strongEnemySpawnInterval = 2.0; // 2 seconds interval
      } else { // score >= 20 and < 60
        strongEnemySpawnInterval = 1.0; // 1 second interval
      }

      if (strongEnemyCurrentSpawnTimer > strongEnemySpawnInterval) {
        spawnStrongEnemy();
        strongEnemyCurrentSpawnTimer = 0; // Reset strong enemy spawn timer
      }
    }

    fireTimer += dt;
    if (fireTimer > 0.16) { fireTimer = 0; spawnBullet(); }

    // update bullets (player's)
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -50 || b.x > GAME_W + 50 || b.y < -50 || b.y > GAME_H + 50) {
        bullets.splice(i, 1);
        continue;
      }

      // Check for collision with enemy bullets
      for (let j = enemyBullets.length - 1; j >= 0; j--) {
        const eb = enemyBullets[j];
        if (collide(b, eb)) {
          bullets.splice(i, 1);    // Remove player bullet
          enemyBullets.splice(j, 1); // Remove enemy bullet
          i--; // Adjust index as an element was removed from bullets
          break; // Player bullet collided, move to next player bullet
        }
      }
    }

    // update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];

      if (eb.isHoming) {
        // Calculate angle to player
        const dx = plane.x - eb.x;
        const dy = plane.y - eb.y;
        const targetAngle = Math.atan2(dy, dx);

        // Calculate current angle of the bullet
        let currentAngle = Math.atan2(eb.vy, eb.vx);

        // Calculate angle difference
        let angleDiff = targetAngle - currentAngle;

        // Normalize angleDiff to be between -PI and PI
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Limit the turning rate
        const maxTurn = ENEMY_BULLET_TURN_RATE * dt;
        if (angleDiff > maxTurn) angleDiff = maxTurn;
        if (angleDiff < -maxTurn) angleDiff = -maxTurn;

        // Apply turn to current angle
        currentAngle += angleDiff;

        // Update velocity components based on new angle and bullet speed
        eb.vx = Math.cos(currentAngle) * eb.speed;
        eb.vy = Math.sin(currentAngle) * eb.speed;
      }

      eb.x += eb.vx * dt; eb.y += eb.vy * dt;
      if (eb.x < -50 || eb.x > GAME_W + 50 || eb.y < -50 || eb.y > GAME_H + 50) {
        enemyBullets.splice(i, 1);
        continue; // Move to next bullet after splicing
      }

      // Check collision with player for enemy bullets
      const planeBody = { x: plane.x, y: plane.y, r: Math.max(plane.w, plane.h) * 0.38 };
      if (collide(eb, planeBody)) {
        enemyBullets.splice(i, 1); // Remove enemy bullet
        plane.shieldHits--; // Player takes damage
        if (plane.shieldHits < 0) { // If shield is gone, it's game over
          endGame();
          return; // Enemy bullet hit player, game over
        }
        continue; // Move to next enemy bullet
      }
    }

    // Calculate player's horizontal velocity for enemy AI
    const playerVx = (currentPlaneX - plane.prevX) / dt;
    plane.prevX = currentPlaneX; // Update prevX for the next frame

    // update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const en = enemies[i];

      // Boss specific logic
      if (en.type === 'boss') {
        // Keep at top Y (fixed), horizontal patrol
        en.y = Math.max(240, Math.min(120, en.y)); // keep near top
        en.x += en.vx * en.direction * dt;
        // reverse on bounds
        if (en.x - en.r <= 0 && en.direction < 0) en.direction = 1;
        if (en.x + en.r >= GAME_W && en.direction > 0) en.direction = -1;

        // Firing volley
        en.fireTimer -= dt;
        if (en.fireTimer <= 0) {
          spawnBossBullets(en);
          en.fireTimer = en.fireRate;
        }
      } else if (en.type === 'strong') {
        // 1. Hovering logic: stop descending when reaching targetHoverY
        if (!en.hovered) {
          if (en.y >= en.targetHoverY) {
            en.y = en.targetHoverY; // Snap to hover position
            en.vy = 0;             // Stop vertical movement
            en.hovered = true;
          }
        }

        let desiredVx = 0; // The horizontal velocity we want to achieve
        let bulletThreatActive = false;

        // 2. Bullet Evasion (highest priority)
        let closestBulletDist = Infinity;
        let threateningBullet = null;

        for (const b of bullets) {
          // Only consider bullets moving towards the enemy and above it
          if (b.vy > 0 && b.y < en.y) {
            // Predict bullet's X position when it reaches enemy's Y
            const timeToReachEnemyY = (en.y - b.y) / b.vy;
            if (timeToReachEnemyY > 0) { // Ensure bullet is moving towards enemy's Y
              const predictedX = b.x + b.vx * timeToReachEnemyY;

              // Check if predicted X is within an evasion range horizontally and bullet is close enough vertically
              const evasionRange = en.r * 1.5 + b.r; // Evasion range around enemy + bullet radius
              if (Math.abs(predictedX - en.x) < evasionRange && (en.y - b.y) < BULLET_EVASION_DETECTION_DISTANCE_Y) {
                const distance = dist(en, b); // Actual distance for prioritization
                if (distance < closestBulletDist) {
                  closestBulletDist = distance;
                  threateningBullet = { predictedX, b };
                  bulletThreatActive = true;
                }
              }
            }
          }
        }

        if (bulletThreatActive) {
          // Evasion force scales with score for "perfection"
          // Evasion becomes more precise/faster with higher scores
          const evasionForce = STRONG_ENEMY_BASE_EVASION_FORCE * (1 + score / 150); // Adjusted scaling factor
          if (threateningBullet.predictedX < en.x) { // Bullet predicted to hit left, move right
            desiredVx = evasionForce;
          } else { // Bullet predicted to hit right, move left
            desiredVx = -evasionForce;
          }
        } else if (score >= 40 && score < 80) {
          // New: Score 40-59, reverse player's horizontal movement
          desiredVx = -playerVx; // Move opposite to player's horizontal velocity

          // Simple edge avoidance for this specific behavior:
          // If moving left and near left edge, stop or move right.
          if (desiredVx < 0 && en.x - en.r + desiredVx * dt < 0) {
            desiredVx = 0; // Stop, or could set to +STRONG_ENEMY_BASE_HORIZONTAL_SPEED for a push away
          }
          // If moving right and near right edge, stop or move left.
          if (desiredVx > 0 && en.x + en.r + desiredVx * dt > GAME_W) {
            desiredVx = 0; // Stop, or could set to -STRONG_ENEMY_BASE_HORIZONTAL_SPEED
          }

        } else {
          // 3. Patrol Logic (default if no bullet threat or player evasion)
          // Reverse direction if hitting horizontal boundaries
          if (en.x - en.r <= 0 && en.patrolDir < 0) { // Hit left edge
            en.patrolDir = 1;
          } else if (en.x + en.r >= GAME_W && en.patrolDir > 0) { // Hit right edge
            en.patrolDir = -1;
          }
          desiredVx = en.patrolDir * STRONG_ENEMY_BASE_HORIZONTAL_SPEED;
        }

        en.vx = desiredVx; // Apply the determined horizontal velocity

        // Update horizontal position
        en.x += en.vx * dt;
        en.y += en.vy * dt; // Apply vertical movement for all enemies

        // Strong enemy-to-strong enemy collision avoidance (post-movement correction)
        for (let k = 0; k < enemies.length; k++) { // Iterate through all enemies
          const otherEn = enemies[k];
          // Only check against *other* strong enemies
          if (en !== otherEn && otherEn.type === 'strong') {
            const minDistance = en.r + otherEn.r + 5; // Add a small buffer to prevent exact overlap
            const currentDistance = dist(en, otherEn);

            if (currentDistance < minDistance) {
              // Overlapping, push them apart
              const overlap = minDistance - currentDistance;
              const angle = Math.atan2(en.y - otherEn.y, en.x - otherEn.x); // Angle from otherEn to en

              // Push 'en' away from 'otherEn'
              en.x += Math.cos(angle) * overlap * 0.5; // Apply half of the overlap correction
              en.y += Math.sin(angle) * overlap * 0.5;

              // Push 'otherEn' away from 'en'
              otherEn.x -= Math.cos(angle) * overlap * 0.5; // Apply half of the overlap correction
              otherEn.y -= Math.sin(angle) * overlap * 0.5;
            }
          }
        }

        // Clamp x position within bounds AFTER all movement and collision
        en.x = Math.max(en.r, Math.min(GAME_W - en.r, en.x));

        // Firing logic (already implemented)
        en.fireTimer -= dt;
        if (en.fireTimer <= 0) {
          spawnEnemyBullet(en);
          en.fireTimer = en.fireRate; // Reset fire timer
        }
      } else { // For weak enemies (red ellipses)
        en.y += en.vy * dt; // Apply vertical movement for weak enemies
      }

      // Explosion animation update (happens for both weak/strong if exploding)
      if (en.exploding) {
        en.explosionTimer += dt;
        en.explosionFrame = Math.floor(en.explosionTimer / EXPLOSION_FRAME_DURATION);
        if (en.explosionFrame >= EXPLOSION_FRAMES) {
          // Explosion finished: remove enemy and award score/powerups
          enemies.splice(i, 1);
          if (en.type === 'boss') {
            score += 10; // Boss gives extra points
          } else {
            score++;
          }
          scoreEl.textContent = 'Score: ' + score;

          // Treat boss kills similar to strong for powerups (larger increments)
          if (en.type === 'strong' || en.type === 'boss') {
            killsForBullet += (en.type === 'boss' ? 3 : 1);
            killsForShield += (en.type === 'boss' ? 3 : 1);
          }

          if (en.type === 'strong') {
            killsForBullet++;
            killsForShield++;

            // Apply bullet power-up logic based on score tiers (same as before)
            if (killsForBullet >= KILLS_NEEDED_FOR_BULLET_POWERUP) {
              if (score >= 60) plane.bulletCount = MAX_PLAYER_BULLET_COUNT;
              else if (score >= 20) plane.bulletCount = 2;
              else plane.bulletCount = 1;
              killsForBullet = 0;
            }

            // Apply shield power-up logic based on score tiers
            if (killsForShield >= KILLS_NEEDED_FOR_SHIELD_POWERUP) {
              if (score >= 60) plane.shieldHits = MAX_PLAYER_SHIELD_HITS;
              else if (score >= 40) plane.shieldHits = 3;
              else if (score >= 20) plane.shieldHits = 1;
              else plane.shieldHits = 0;
              killsForShield = 0;
            }
          }
        }
        continue; // skip rest of per-enemy logic after updating explosion state
      }

      // plane collision (enemy vs player)
      const planeBody = { x: plane.x, y: plane.y, r: Math.max(plane.w, plane.h) * 0.38 };
      if (collide(en, planeBody)) { endGame(); return; }

      // player bullets collision with enemies
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (en.exploding) continue; // agar portlash boshlangan bo'lsa collisionlarni e'tiborsiz qiling
        if (collide(en, bullets[j])) {
          bullets.splice(j, 1); // Remove player bullet
          en.hp--; // Decrease enemy HP
          if (en.hp <= 0 && !en.exploding) {
            // Boshlang'ich explosion holati
            en.exploding = true;
            en.explosionTimer = 0;
            en.explosionFrame = 0;
            en.vx = 0; en.vy = 0; // to'xtatish
          }
          break; // Only one bullet can hit an enemy at a time
        }
      }
      // Only weak enemies should disappear if they go off screen
      if (en.type === 'weak' && en.y > GAME_H + 80) enemies.splice(i, 1);
    }

    // render
    ctx.clearRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = '#061722'; ctx.fillRect(0, 0, GAME_W, GAME_H);

    // enemies
    for (const en of enemies) {
      ctx.save();
      ctx.translate(en.x, en.y); // Portlash dushman turgan koordinatadan boshlanadi

      if (en.exploding) {
        if (explosionImg.complete && explosionImg.naturalWidth) {
          // 1. Kadrlarni hisoblash
          const fw = explosionImg.naturalWidth / EXPLOSION_FRAMES; // Bitta kadr kengligi
          const fh = explosionImg.naturalHeight;                  // Kadr balandligi
          const f = Math.min(en.explosionFrame, EXPLOSION_FRAMES - 1);

          // 2. Portlash hajmini sozlash 
          // Agar portlash juda kichik bo'lsa, 'en.r * 4' qilib ko'ring
          const displaySize = en.r * 2;

          // 3. Chizish (Markazlashtirilgan holda)
          // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
          ctx.drawImage(
            explosionImg,
            fw * f, 0, fw, fh,       // Sprite sheet-dan kadrni kesib olish
            -displaySize / 2,        // Markazga surish (chapga)
            -displaySize / 2,        // Markazga surish (tepaga)
            displaySize,             // Canvas-dagi kengligi
            displaySize              // Canvas-dagi balandligi
          );
        } else {
          // Fallback (Agar rasm yuklanmasa)
          const scale = 1 + (en.explosionFrame / EXPLOSION_FRAMES);
          ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
          ctx.beginPath();
          ctx.arc(0, 0, en.r * scale * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Draw boss first if present
        if (en.type === 'boss' && bigBossImg.complete && bigBossImg.naturalWidth) {
          ctx.drawImage(bigBossImg, -en.r, -en.r, en.r * 2, en.r * 2);
        } else if (en.type === 'strong' && strongEnemyImg.complete) {
          ctx.drawImage(strongEnemyImg, -en.r, -en.r, en.r * 2, en.r * 2);
        } else {
          const img = (rockImg.complete && rockImg.naturalWidth) ? rockImg : null;
          if (img) {
            ctx.drawImage(img, -en.r, -en.r, en.r * 2, en.r * 2);
          } else {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath(); ctx.ellipse(0, 0, en.r, en.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    }


    // bullets (player's)
    /// player bullets
    for (const b of bullets) {
      if (playerBulletImg.complete && playerBulletImg.naturalWidth) {
        const diameter = b.r * 2.4; // vizual kattalik (avvalgi s)
        const scale = Math.max(diameter / playerBulletImg.naturalWidth, diameter / playerBulletImg.naturalHeight);
        const iw = playerBulletImg.naturalWidth * scale;
        const ih = playerBulletImg.naturalHeight * scale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, diameter / 0.8, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(playerBulletImg, b.x - iw / 2, b.y - ih / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // enemy bullets
    ctx.fillStyle = '#ff0000'; // Red color for enemy bullets
    // enemy bullets
    for (const eb of enemyBullets) {
      if (enemyBulletImg.complete && enemyBulletImg.naturalWidth) {
        const diameter = eb.r * 1.7;
        const scale = Math.max(diameter / enemyBulletImg.naturalWidth, diameter / enemyBulletImg.naturalHeight);
        const iw = enemyBulletImg.naturalWidth * scale;
        const ih = enemyBulletImg.naturalHeight * scale;

        ctx.save();
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, diameter / 1, 0, Math.PI * 4);
        ctx.clip();
        ctx.drawImage(enemyBulletImg, eb.x - iw / 2, eb.y - ih / 2, iw, ih);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // plane
    // Select sprite index by bulletCount (power level) clamped to available sprites
    const spriteIndex = Math.min(Math.max(plane.bulletCount - 1, 0), planeImgs.length - 1);
    const sprite = planeImgs[spriteIndex];
    ctx.save(); ctx.translate(plane.x, plane.y); ctx.rotate(plane.angle + Math.PI / 2);
    if (sprite && sprite.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, -plane.w / 2, -plane.h / 2, plane.w, plane.h);
    } else if (planeImg.complete && planeImg.naturalWidth) {
      ctx.drawImage(planeImg, -plane.w / 2, -plane.h / 2, plane.w, plane.h);
    } else {
      ctx.fillStyle = '#7fdfff';
      ctx.beginPath(); ctx.moveTo(0, -plane.h * 0.5); ctx.lineTo(plane.w * 0.4, plane.h * 0.4); ctx.lineTo(-plane.w * 0.4, plane.h * 0.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(loop);
  }

  // prevent scroll when playing
  document.body.addEventListener('touchmove', e => { if (playing) e.preventDefault(); }, { passive: false });

  // expose for debug
  window._game = { reset: resetGame };
})();