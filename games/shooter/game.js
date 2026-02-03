// ========================================
// NEON GALAXY BLASTER - Game Engine
// ========================================

// Game Configuration
const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  MAX_LEVELS: 10,
  LIVES: 3,
  PLAYER_SPEED: 6,
  LASER_SPEED: 12,
  LASER_COOLDOWN: 150, // milliseconds
  BASE_ENEMY_SPEED: 1.5,
  ENEMY_SPEED_INCREMENT: 0.3, // per level
  BASE_POINTS_PER_KILL: 100,
  KILLS_TO_ADVANCE: 10, // enemies to kill per level
  SPAWN_INTERVAL_BASE: 1500, // milliseconds
  SPAWN_INTERVAL_MIN: 500
};

// Colors matching website theme
const COLORS = {
  NEON_CYAN: "#00ffff",
  NEON_MAGENTA: "#ff00ff",
  NEON_GREEN: "#39ff14",
  NEON_PINK: "#ff1493",
  NEON_YELLOW: "#ffff00",
  BG_DARK: "#0a0a0f"
};

// Game State
let game = {
  running: false,
  paused: false,
  level: 1,
  score: 0,
  lives: CONFIG.LIVES,
  kills: 0,
  levelKills: 0,
  lastLaserTime: 0,
  lastSpawnTime: 0,
  keys: {},
  player: null,
  lasers: [],
  enemies: [],
  particles: [],
  stars: [],
  leaderboard: []
};

// Canvas and Context
let canvas, ctx;

// Assets
let assets = {
  background: null,
  spaceship: null,
  alien: null,
  loaded: false
};

// DOM Elements
let elements = {};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  initCanvas();
  initElements();
  initEventListeners();
  loadAssets();
  initStars();
  initLeaderboard();
  gameLoop();
});

function initCanvas() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");

  // Responsive canvas size
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const container = document.getElementById("game-container");
  const maxWidth = Math.min(window.innerWidth - 40, CONFIG.CANVAS_WIDTH);
  const maxHeight = Math.min(window.innerHeight - 40, CONFIG.CANVAS_HEIGHT);

  const ratio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;
  let width = maxWidth;
  let height = width / ratio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;
}

function initElements() {
  elements = {
    startScreen: document.getElementById("start-screen"),
    gameOverScreen: document.getElementById("game-over-screen"),
    levelUpScreen: document.getElementById("level-up-screen"),
    winScreen: document.getElementById("win-screen"),
    pauseIndicator: document.getElementById("pause-indicator"),
    scoreDisplay: document.getElementById("score"),
    levelDisplay: document.getElementById("level"),
    killsDisplay: document.getElementById("kills"),
    finalScore: document.getElementById("final-score"),
    finalLevel: document.getElementById("final-level"),
    winScore: document.getElementById("win-score"),
    newLevel: document.getElementById("new-level"),
    lives: [
      document.getElementById("life1"),
      document.getElementById("life2"),
      document.getElementById("life3")
    ],
    mobileControls: document.getElementById("mobile-controls"),
    // Leaderboard elements
    highScoreList: document.getElementById("high-score-list"),
    highScoreListGameover: document.getElementById("high-score-list-gameover"),
    newHighScoreEntry: document.getElementById("new-high-score-entry"),
    initialsInput: document.getElementById("initials-input"),
    saveScoreBtn: document.getElementById("save-score-btn"),
    leaderboardGameover: document.getElementById("leaderboard-gameover")
  };
}

function initEventListeners() {
  // Keyboard controls
  document.addEventListener("keydown", (e) => {
    game.keys[e.key.toLowerCase()] = true;
    game.keys[e.code] = true;

    // Pause toggle
    if (e.key.toLowerCase() === "p" || e.key === "Escape") {
      togglePause();
    }

    // Prevent default for game keys
    if (
      ["ArrowLeft", "ArrowRight", "Space", " "].includes(e.key) ||
      ["a", "d", " "].includes(e.key.toLowerCase())
    ) {
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    game.keys[e.key.toLowerCase()] = false;
    game.keys[e.code] = false;
  });

  // Button handlers
  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("retry-btn").addEventListener("click", startGame);
  document
    .getElementById("play-again-btn")
    .addEventListener("click", startGame);

  document.getElementById("back-btn").addEventListener("click", goBack);
  document.getElementById("back-btn-gameover").addEventListener("click", goBack);
  document.getElementById("back-btn-win").addEventListener("click", goBack);

  // Mobile controls
  const leftBtn = document.getElementById("left-btn");
  const rightBtn = document.getElementById("right-btn");
  const fireBtn = document.getElementById("fire-btn");

  // Touch events for mobile
  leftBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys["arrowleft"] = true;
  });
  leftBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys["arrowleft"] = false;
  });

  rightBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys["arrowright"] = true;
  });
  rightBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys["arrowright"] = false;
  });

  fireBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    game.keys[" "] = true;
  });
  fireBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    game.keys[" "] = false;
  });

  // Leaderboard input
  elements.saveScoreBtn.addEventListener("click", saveHighScore);
}

function loadAssets() {
  let loaded = 0;
  const total = 3;

  const checkLoaded = () => {
    loaded++;
    if (loaded >= total) {
      assets.loaded = true;
    }
  };

  // Load background
  assets.background = new Image();
  assets.background.onload = checkLoaded;
  assets.background.onerror = () => {
    console.log("Background not loaded, using procedural");
    checkLoaded();
  };
  assets.background.src = "assets/background.png";

  // Load spaceship
  assets.spaceship = new Image();
  assets.spaceship.onload = checkLoaded;
  assets.spaceship.onerror = () => {
    console.log("Spaceship not loaded, using procedural");
    checkLoaded();
  };
  assets.spaceship.src = "assets/spaceship.png";

  // Load alien
  assets.alien = new Image();
  assets.alien.onload = checkLoaded;
  assets.alien.onerror = () => {
    console.log("Alien not loaded, using procedural");
    checkLoaded();
  };
  assets.alien.src = "assets/alien.png";
}

function initStars() {
  game.stars = [];
  for (let i = 0; i < 100; i++) {
    game.stars.push({
      x: Math.random() * CONFIG.CANVAS_WIDTH,
      y: Math.random() * CONFIG.CANVAS_HEIGHT,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1 + 0.5,
      brightness: Math.random()
    });
  }
}

// ========================================
// GAME CONTROL
// ========================================

function startGame() {
  game = {
    ...game,
    running: true,
    paused: false,
    level: 1,
    score: 0,
    lives: CONFIG.LIVES,
    kills: 0,
    levelKills: 0,
    lastLaserTime: 0,
    lastSpawnTime: 0,
    lasers: [],
    enemies: [],
    particles: []
  };

  // Initialize player
  game.player = {
    x: CONFIG.CANVAS_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT - 80,
    width: 40,
    height: 50,
    invincible: false,
    invincibleTimer: 0
  };

  // Update UI
  updateHUD();
  updateLives();

  // Hide screens
  elements.startScreen.classList.add("hidden");
  elements.gameOverScreen.classList.add("hidden");
  elements.winScreen.classList.add("hidden");
  elements.levelUpScreen.classList.add("hidden");
  elements.pauseIndicator.classList.add("hidden");
}

function togglePause() {
  if (!game.running) return;

  game.paused = !game.paused;

  if (game.paused) {
    elements.pauseIndicator.classList.remove("hidden");
  } else {
    elements.pauseIndicator.classList.add("hidden");
  }
}

function goBack() {
  window.location.href = "../../index.html";
}

function gameOver() {
  game.running = false;
  elements.finalScore.textContent = game.score.toLocaleString();
  elements.finalLevel.textContent = game.level;
  elements.finalLevel.textContent = game.level;
  elements.gameOverScreen.classList.remove("hidden");
  
  checkHighScores();
}

function winGame() {
  game.running = false;
  elements.winScore.textContent = game.score.toLocaleString();
  elements.winScreen.classList.remove("hidden");
}

function levelUp() {
  game.level++;
  game.levelKills = 0;

  // if (game.level > CONFIG.MAX_LEVELS) {
  //   winGame();
  //   return;
  // }

  // Show level up screen
  elements.newLevel.textContent = game.level;
  elements.levelUpScreen.classList.remove("hidden");

  // Clear enemies
  game.enemies = [];

  // Hide after animation
  setTimeout(() => {
    elements.levelUpScreen.classList.add("hidden");
  }, 2000);

  updateHUD();
}

// ========================================
// GAME LOOP
// ========================================

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  const now = Date.now();

  // Always update stars for background effect
  updateStars();

  if (!game.running || game.paused) return;

  // Update player
  updatePlayer();

  // Handle shooting
  if (
    (game.keys[" "] || game.keys["Space"]) &&
    now - game.lastLaserTime > CONFIG.LASER_COOLDOWN
  ) {
    shootLaser();
    game.lastLaserTime = now;
  }

  // Spawn enemies
  const spawnInterval = Math.max(
    CONFIG.SPAWN_INTERVAL_MIN,
    CONFIG.SPAWN_INTERVAL_BASE - game.level * 100
  );

  if (now - game.lastSpawnTime > spawnInterval) {
    spawnEnemy();
    game.lastSpawnTime = now;
  }

  // Update game objects
  updateLasers();
  updateEnemies();
  updateParticles();

  // Check collisions
  checkCollisions();

  // Update invincibility
  if (game.player.invincible) {
    game.player.invincibleTimer--;
    if (game.player.invincibleTimer <= 0) {
      game.player.invincible = false;
    }
  }
}

function updateStars() {
  game.stars.forEach((star) => {
    star.y += star.speed;
    if (star.y > CONFIG.CANVAS_HEIGHT) {
      star.y = 0;
      star.x = Math.random() * CONFIG.CANVAS_WIDTH;
    }
    star.brightness = 0.5 + Math.sin(Date.now() / 500 + star.x) * 0.3;
  });
}

function updatePlayer() {
  const moveLeft =
    game.keys["arrowleft"] || game.keys["ArrowLeft"] || game.keys["a"];
  const moveRight =
    game.keys["arrowright"] || game.keys["ArrowRight"] || game.keys["d"];

  if (moveLeft) {
    game.player.x -= CONFIG.PLAYER_SPEED;
  }
  if (moveRight) {
    game.player.x += CONFIG.PLAYER_SPEED;
  }

  // Keep player in bounds
  game.player.x = Math.max(
    game.player.width / 2,
    Math.min(CONFIG.CANVAS_WIDTH - game.player.width / 2, game.player.x)
  );
}

function shootLaser() {
  // Shoot two lasers from each side of the ship
  const laserOffset = 15;

  game.lasers.push({
    x: game.player.x - laserOffset,
    y: game.player.y - game.player.height / 2,
    width: 4,
    height: 20,
    speed: CONFIG.LASER_SPEED
  });

  game.lasers.push({
    x: game.player.x + laserOffset,
    y: game.player.y - game.player.height / 2,
    width: 4,
    height: 20,
    speed: CONFIG.LASER_SPEED
  });
}

function updateLasers() {
  game.lasers = game.lasers.filter((laser) => {
    laser.y -= laser.speed;
    return laser.y > -laser.height;
  });
}

function spawnEnemy() {
  const size = 60 + Math.random() * 30;
  const x = size / 2 + Math.random() * (CONFIG.CANVAS_WIDTH - size);
  const speed =
    CONFIG.BASE_ENEMY_SPEED + (Math.min(game.level, 5) - 1) * CONFIG.ENEMY_SPEED_INCREMENT;

  game.enemies.push({
    x: x,
    y: -size,
    width: size,
    height: size,
    speed: speed + (Math.random() - 0.5) * 0.5,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.05
  });
}

function updateEnemies() {
  game.enemies = game.enemies.filter((enemy) => {
    enemy.y += enemy.speed;
    enemy.rotation += enemy.rotationSpeed;

    // Enemy reached bottom
    if (enemy.y > CONFIG.CANVAS_HEIGHT + enemy.height) {
      return false;
    }

    return true;
  });
}

function updateParticles() {
  game.particles = game.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= particle.decay;
    particle.size *= 0.95;
    return particle.life > 0 && particle.size > 0.5;
  });
}

function checkCollisions() {
  // Laser vs Enemy collisions
  game.lasers.forEach((laser, laserIndex) => {
    game.enemies.forEach((enemy, enemyIndex) => {
      if (
        laser.x > enemy.x - enemy.width / 2 &&
        laser.x < enemy.x + enemy.width / 2 &&
        laser.y > enemy.y - enemy.height / 2 &&
        laser.y < enemy.y + enemy.height / 2
      ) {
        // Remove laser and enemy
        game.lasers.splice(laserIndex, 1);
        game.enemies.splice(enemyIndex, 1);

        // Create explosion particles
        createExplosion(enemy.x, enemy.y);

        // Update score and kills
        const points = CONFIG.BASE_POINTS_PER_KILL * game.level;
        game.score += points;
        game.kills++;
        game.levelKills++;

        updateHUD();

        // Check level up
        if (game.levelKills >= CONFIG.KILLS_TO_ADVANCE) {
          levelUp();
        }
      }
    });
  });

  // Enemy vs Player collisions
  if (!game.player.invincible) {
    game.enemies.forEach((enemy, index) => {
      const dx = game.player.x - enemy.x;
      const dy = game.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const collisionDist =
        (game.player.width + enemy.width) / 2 - 10;

      if (distance < collisionDist) {
        // Remove enemy
        game.enemies.splice(index, 1);

        // Lose a life
        game.lives--;
        updateLives();

        // Create small explosion
        createExplosion(game.player.x, game.player.y, true);

        if (game.lives <= 0) {
          gameOver();
        } else {
          // Brief invincibility
          game.player.invincible = true;
          game.player.invincibleTimer = 120; // 2 seconds at 60fps
        }
      }
    });
  }
}

function createExplosion(x, y, small = false) {
  const particleCount = small ? 15 : 30;
  const baseSpeed = small ? 2 : 4;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
    const speed = baseSpeed + Math.random() * 2;

    game.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      life: 1,
      decay: 0.02 + Math.random() * 0.02,
      color:
        Math.random() > 0.5
          ? COLORS.NEON_CYAN
          : Math.random() > 0.5
          ? COLORS.NEON_MAGENTA
          : COLORS.NEON_GREEN
    });
  }
}

// ========================================
// RENDERING
// ========================================

function render() {
  // Clear canvas
  ctx.fillStyle = COLORS.BG_DARK;
  ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Draw background
  drawBackground();

  // Draw stars
  drawStars();

  if (!game.running && !game.paused) {
    // Just draw background for menu
    return;
  }

  // Draw game objects
  drawLasers();
  drawEnemies();
  drawPlayer();
  drawParticles();
}

function drawBackground() {
  if (assets.background && assets.background.complete) {
    // Tile the background
    const pattern = ctx.createPattern(assets.background, "repeat");
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Add dark overlay
    ctx.fillStyle = "rgba(10, 10, 15, 0.6)";
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  }
}

function drawStars() {
  game.stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fill();

    // Random colored stars
    if (Math.random() > 0.95) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 255, ${star.brightness * 0.3})`;
      ctx.fill();
    }
  });
}

function drawPlayer() {
  if (!game.player) return;

  ctx.save();
  ctx.translate(game.player.x, game.player.y);
  ctx.globalCompositeOperation = "screen";

  // Invincibility flash
  if (game.player.invincible && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  if (assets.spaceship && assets.spaceship.complete) {
    // Draw spaceship image
    ctx.drawImage(
      assets.spaceship,
      -game.player.width / 2 - 10,
      -game.player.height / 2 - 10,
      game.player.width + 20,
      game.player.height + 20
    );
  } else {
    // Draw procedural spaceship
    drawProceduralSpaceship();
  }

  // Draw engine glow
  drawEngineGlow();

  ctx.restore();
}

function drawProceduralSpaceship() {
  // Main body - blocky shuttle shape
  ctx.fillStyle = COLORS.NEON_CYAN;
  ctx.shadowColor = COLORS.NEON_CYAN;
  ctx.shadowBlur = 15;

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -25); // Top point
  ctx.lineTo(10, -10); // Right upper
  ctx.lineTo(10, 20); // Right lower
  ctx.lineTo(-10, 20); // Left lower
  ctx.lineTo(-10, -10); // Left upper
  ctx.closePath();
  ctx.fill();

  // Wings
  ctx.fillStyle = COLORS.NEON_MAGENTA;
  ctx.shadowColor = COLORS.NEON_MAGENTA;

  // Left wing
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-25, 20);
  ctx.lineTo(-15, 20);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(25, 20);
  ctx.lineTo(15, 20);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawEngineGlow() {
  ctx.shadowBlur = 0;

  // Engine flames
  const flameOffset = Math.sin(Date.now() / 50) * 3;

  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 10;

  // Left engine
  ctx.beginPath();
  ctx.moveTo(-8, 20);
  ctx.lineTo(-5, 30 + flameOffset);
  ctx.lineTo(-2, 20);
  ctx.fill();

  // Right engine
  ctx.beginPath();
  ctx.moveTo(2, 20);
  ctx.lineTo(5, 30 + flameOffset);
  ctx.lineTo(8, 20);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawLasers() {
  game.lasers.forEach((laser) => {
    ctx.fillStyle = COLORS.NEON_GREEN;
    ctx.shadowColor = COLORS.NEON_GREEN;
    ctx.shadowBlur = 15;

    ctx.fillRect(
      laser.x - laser.width / 2,
      laser.y - laser.height / 2,
      laser.width,
      laser.height
    );

    // Glow trail
    ctx.fillStyle = "rgba(57, 255, 20, 0.3)";
    ctx.fillRect(
      laser.x - laser.width / 2 - 2,
      laser.y,
      laser.width + 4,
      laser.height
    );
  });

  ctx.shadowBlur = 0;
}

function drawEnemies() {
  game.enemies.forEach((enemy) => {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);
    ctx.globalCompositeOperation = "screen";

    if (assets.alien && assets.alien.complete) {
      // Draw only a portion of the sprite sheet (first alien)
        ctx.drawImage(
          assets.alien,
          -enemy.width / 2,
          -enemy.height / 2,
          enemy.width,
          enemy.height
        );
    } else {
      // Draw procedural alien
      drawProceduralAlien(enemy);
    }

    ctx.restore();
  });
}

function drawProceduralAlien(enemy) {
  const size = enemy.width;
  const halfSize = size / 2;
  const time = Date.now() / 200;

  // Main Body (Dome shape)
  ctx.fillStyle = COLORS.NEON_MAGENTA;
  ctx.shadowColor = COLORS.NEON_MAGENTA;
  ctx.shadowBlur = 15;

  ctx.beginPath();
  // Dome top
  ctx.arc(0, -size * 0.1, size * 0.4, Math.PI, 0); 
  // Base
  ctx.lineTo(size * 0.4, size * 0.2);
  ctx.lineTo(-size * 0.4, size * 0.2);
  ctx.closePath();
  ctx.fill();

  // Glowing Core/Brain
  ctx.fillStyle = "#ff55ff";
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.arc(0, -size * 0.1, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (Menacing)
  ctx.fillStyle = COLORS.NEON_CYAN;
  ctx.shadowColor = COLORS.NEON_CYAN;
  ctx.shadowBlur = 10;

  // Left Eye
  ctx.beginPath();
  ctx.ellipse(-size * 0.2, 0, size * 0.12, size * 0.08, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Right Eye
  ctx.beginPath();
  ctx.ellipse(size * 0.2, 0, size * 0.12, size * 0.08, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Tentacles/Legs
  ctx.strokeStyle = COLORS.NEON_MAGENTA;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 5;
  ctx.lineCap = "round";

  const legCount = 4;
  for (let i = 0; i < legCount; i++) {
    const xOffset = (i - 1.5) * (size * 0.25);
    const wave = Math.sin(time + i) * 5;
    
    ctx.beginPath();
    ctx.moveTo(xOffset, size * 0.2);
    ctx.quadraticCurveTo(
      xOffset + wave, 
      size * 0.5, 
      xOffset * 1.5, 
      size * 0.7 + Math.abs(wave)
    );
    ctx.stroke();
  }

  // Engine/Thruster glow at bottom
  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 8;
  const thrusterFlicker = Math.random() * 0.4 + 0.8;
  
  ctx.beginPath();
  ctx.ellipse(0, size * 0.25, size * 0.3 * thrusterFlicker, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawParticles() {
  game.particles.forEach((particle) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 5;

    ctx.beginPath();
    ctx.rect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

// ========================================
// LEADERBOARD
// ========================================

function initLeaderboard() {
  const storedScores = localStorage.getItem("neonShooter_highScores");
  
  if (storedScores) {
    game.leaderboard = JSON.parse(storedScores);
  } else {
    // Initialize with 0s as requested
    game.leaderboard = Array(5).fill().map(() => ({ name: "---", score: 0 }));
    localStorage.setItem("neonShooter_highScores", JSON.stringify(game.leaderboard));
  }
  
  updateLeaderboardUI();
}

function updateLeaderboardUI() {
  const createListItems = (listElement) => {
    listElement.innerHTML = "";
    game.leaderboard.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "score-entry";
      li.innerHTML = `
        <span class="name">${entry.name}</span>
        <span class="score">${entry.score.toLocaleString()}</span>
      `;
      listElement.appendChild(li);
    });
  };

  if (elements.highScoreList) createListItems(elements.highScoreList);
  if (elements.highScoreListGameover) createListItems(elements.highScoreListGameover);
}

function checkHighScores() {
  // Check if current score is higher than the lowest score on the leaderboard
  const lowestScore = game.leaderboard[game.leaderboard.length - 1].score;
  
  // Hide normal leaderboard on game over initially
  elements.leaderboardGameover.classList.add("hidden");
  elements.newHighScoreEntry.classList.add("hidden");

  if (game.score > lowestScore) {
    // New High Score!
    elements.newHighScoreEntry.classList.remove("hidden");
    elements.initialsInput.value = "";
    setTimeout(() => elements.initialsInput.focus(), 100);
  } else {
    // Just show the leaderboard
    elements.leaderboardGameover.classList.remove("hidden");
  }
}

function saveHighScore() {
  const name = elements.initialsInput.value.toUpperCase() || "UNK";
  const newEntry = { name: name, score: game.score };
  
  // Add new score
  game.leaderboard.push(newEntry);
  
  // Sort descending
  game.leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep top 5
  game.leaderboard = game.leaderboard.slice(0, 5);
  
  // Save to local storage
  localStorage.setItem("neonShooter_highScores", JSON.stringify(game.leaderboard));
  
  // Update UI
  updateLeaderboardUI();
  
  // Hide input, show leaderboard
  elements.newHighScoreEntry.classList.add("hidden");
  elements.leaderboardGameover.classList.remove("hidden");
}

// ========================================
// HUD
// ========================================

function updateHUD() {
  elements.scoreDisplay.textContent = game.score.toLocaleString();
  elements.levelDisplay.textContent = game.level;
  elements.killsDisplay.textContent = `${game.levelKills}/${CONFIG.KILLS_TO_ADVANCE}`;
}

function updateLives() {
  elements.lives.forEach((life, index) => {
    if (index < game.lives) {
      life.classList.remove("lost");
    } else {
      life.classList.add("lost");
    }
  });
}
