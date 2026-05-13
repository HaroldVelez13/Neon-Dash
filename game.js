const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('best-score');
const finalScoreEl = document.getElementById('final-score');
const bestScoreDisplayEl = document.getElementById('best-score-display');
const soundToggleBtn = document.getElementById('sound-toggle');
const musicToggleBtn = document.getElementById('music-toggle');
const gameContainer = document.getElementById('game-container');
const comboDisplay = document.getElementById('combo-display');

let width, height;
let animationId;
let lastTime = 0;

let score = 0;
let bestScore = parseInt(localStorage.getItem('neonDashBestScore')) || 0;
let gameRunning = false;
let gameSpeed = 1;
let soundEnabled = true;
let scoreMultiplier = 1;
let flashEffect = 0;
let screenShake = 0;
let powerUpActive = null;
let powerUpTimer = 0;
let bgMusic = null;
let musicPlaying = false;
let musicInterval = null;
let currentNote = 0;

bestScoreEl.textContent = `BEST: ${bestScore}`;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playScoreSound(points) {
  if (!soundEnabled) return;
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.frequency.setValueAtTime(800 + (points * 100), audioCtx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(1200 + (points * 200), audioCtx.currentTime + 0.15);
  gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.2);
}

function playSound(type) {
  if (!soundEnabled) return;

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (type === 'jump') {
    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'score') {
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'crash') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
  }
}

class Player {
  constructor() {
    this.size = 30;
    this.x = 100;
    this.y = height / 2 - this.size / 2;
    this.velocityY = 0;
    this.gravity = 0.8;
    this.jumpForce = -15;
    this.groundY = height - 100;
    this.onGround = true;
    this.color = '#0ff';
    this.trail = [];
    this.jumpCooldown = 0;
    this.jumpsLeft = 2;
    this.maxJumps = 2;
  }

  jump() {
    if (this.jumpsLeft > 0) {
      this.velocityY = this.jumpForce;
      this.onGround = false;
      this.jumpsLeft--;
      this.jumpCooldown = 5;
      playSound('jump');
      createParticles(this.x + this.size / 2, this.y + this.size, 15, '#0ff', 2);
    }
  }
  
  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;
    
    if (this.jumpCooldown > 0) this.jumpCooldown--;

    if (this.y >= this.groundY - this.size) {
      this.y = this.groundY - this.size;
      this.velocityY = 0;
      this.onGround = true;
      this.jumpsLeft = this.maxJumps;
    }

    this.trail.push({ x: this.x, y: this.y, alpha: 0.8 });
    if (this.trail.length > 5) {
      this.trail.shift();
    }
    this.trail.forEach(t => {
      t.x -= gameSpeed * 8;
      t.alpha -= 0.1;
    });
  }



  draw() {
    this.trail.forEach((t, i) => {
      ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha * 0.5})`;
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = 15;
      ctx.fillRect(t.x, t.y, this.size, this.size);
    });

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x + 5, this.y + 5, this.size - 10, this.size - 10);
  }
}

class Obstacle {
  constructor() {
    this.width = 35 + Math.random() * 25;
    this.height = 50 + Math.random() * 50;
    this.x = width;
    this.y = height - 100 - this.height;
    this.color = '#ff0066';
    this.passed = false;
    this.pulse = 0;
    this.difficulty = 1 + (this.height / 100) + (this.width / 70);
  }

  update() {
    this.x -= gameSpeed * 8;
    this.pulse += 0.1;
  }

  draw() {
    const pulseGlow = Math.sin(this.pulse) * 10 + 20;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = pulseGlow;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = 'rgba(255, 102, 153, 0.6)';
    ctx.fillRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);
    
    // Difficulty indicator stripes
    if (this.difficulty > 1.5) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(this.x + 10, this.y + 10, this.width - 20, this.height - 20);
    }
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
    this.types = ['shield', 'slowmo', 'doubleScore'];
    this.type = this.types[Math.floor(Math.random() * this.types.length)];
    this.colors = {
      shield: '#00ff00',
      slowmo: '#ffff00',
      doubleScore: '#ff00ff'
    };
    this.icons = { shield: '🛡️', slowmo: '⏱️', doubleScore: '⭐' };
    this.collected = false;
    this.pulse = 0;
  }

  update() {
    this.x -= gameSpeed * 8;
    this.pulse += 0.15;
  }

  draw() {
    if (this.collected) return;
    const glow = Math.sin(this.pulse) * 10 + 15;
    ctx.shadowColor = this.colors[this.type];
    ctx.shadowBlur = glow;
    ctx.fillStyle = this.colors[this.type];
    ctx.beginPath();
    ctx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.icons[this.type], this.x + this.size/2, this.y + this.size/2);
  }
}

class Particle {
  constructor(x, y, color, speedMult = 1) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 6 + 3;
    this.speedX = (Math.random() - 0.5) * 12 * speedMult;
    this.speedY = (Math.random() - 0.5) * 12 * speedMult;
    this.color = color;
    this.life = 1;
    this.decay = Math.random() * 0.02 + 0.015;
    this.gravity = 0.3;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity;
    this.life -= this.decay;
  }

  draw() {
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.life;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

let player;
let obstacles = [];
let particles = [];
let powerUps = [];
let obstacleTimer = 0;
let obstacleInterval = 100;
let comboCount = 0;
let comboTimer = 0;

function resize() {
  const container = document.getElementById('game-container');
  width = container.clientWidth;
  height = container.clientHeight;
  canvas.width = width;
  canvas.height = height;
  
  if (player) {
    player.groundY = height - 100;
    if (player.y > player.groundY - player.size) {
      player.y = player.groundY - player.size;
    }
  }
}

function createParticles(x, y, count, color, speedMult = 1) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color, speedMult));
  }
}

function shakeScreen(intensity = 10) {
  screenShake = intensity;
}

function activatePowerUp(type) {
  powerUpActive = type;
  powerUpTimer = 600; // 10 seconds at 60fps
  
  const messages = {
    shield: '🛡️ SHIELD - Invincible!',
    slowmo: '⏱️ SLOWMO - Time slows!',
    doubleScore: '⭐ DOUBLE SCORE!'
  };
  
  playScoreSound(3);
  createParticles(player.x + player.size/2, player.y + player.size/2, 25, player.constructor.colors?.[type] || '#fff', 1.5);
  
  if (type === 'shield') {
    // Shield logic handled in collision
  } else if (type === 'slowmo') {
    gameSpeed *= 0.7;
  } else if (type === 'doubleScore') {
    scoreMultiplier = 2;
  }
}

function gameOver() {
  gameRunning = false;
  playSound('crash');
  shakeScreen(15);
  flashEffect = 0.5;
  createParticles(player.x + player.size / 2, player.y + player.size / 2, 40, '#0ff', 2);

  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('neonDashBestScore', bestScore);
    bestScoreEl.textContent = `BEST: ${bestScore}`;
  }

  finalScoreEl.textContent = score;
  bestScoreDisplayEl.textContent = bestScore;
  setTimeout(() => {
    gameOverScreen.classList.remove('hidden');
  }, 500);
}

function resetGame() {
  player = new Player();
  obstacles = [];
  powerUps = [];
  particles = [];
  score = 0;
  gameSpeed = 1;
  obstacleTimer = 0;
  scoreMultiplier = 1;
  comboCount = 0;
  comboTimer = 0;
  flashEffect = 0;
  screenShake = 0;
  powerUpActive = null;
  powerUpTimer = 0;
  scoreEl.textContent = score;
  powerUpActive = null;
  powerUpTimer = 0;
}

function updateJumpIndicator() {
  playerEl.style.background = `linear-gradient(180deg, #0ff ${player.jumpsLeft * 50}%, transparent ${player.jumpsLeft * 50}%)`;
}

function startGame() {
  resetGame();
  gameRunning = true;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  lastTime = performance.now();
  
  // Resume audio context on user interaction
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  // Start music if enabled
  if (musicPlaying) {
    startMusic();
  }
  
  requestAnimationFrame(gameLoop);
}

function showScorePopup(points, x, y) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    color: #0ff;
    font-size: ${Math.min(24 + points * 2, 40)}px;
    font-weight: bold;
    text-shadow: 0 0 10px #0ff, 0 0 20px #0ff;
    pointer-events: none;
    z-index: 100;
    animation: scorePopup 0.8s ease-out forwards;
  `;
  popup.textContent = `+${points}`;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

function gameLoop(currentTime) {
  if (!gameRunning) return;
  
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }

  ctx.clearRect(0, 0, width, height);

  if (flashEffect > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashEffect})`;
    ctx.fillRect(0, 0, width, height);
    flashEffect *= 0.85;
    if (flashEffect < 0.01) flashEffect = 0;
  }
  
  const groundY = height - 100;
  const gradient = ctx.createLinearGradient(0, groundY - 5, 0, height);
  gradient.addColorStop(0, '#0ff');
  gradient.addColorStop(1, '#0066ff');
  ctx.shadowColor = '#0ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundY, width, 5);
  
  player.update();
  player.draw();
  
obstacleTimer++;
const currentInterval = Math.max(30, obstacleInterval / gameSpeed);
if (obstacleTimer > currentInterval) {
  obstacles.push(new Obstacle());
  obstacleTimer = 0;
  obstacleInterval = 50 + Math.random() * 50 - Math.min(score * 0.5, 20);
  
  // Spawn power-up occasionally (10% chance per obstacle)
  if (Math.random() < 0.1 && score > 5) {
    powerUps.push(new PowerUp(width, height - 150 - Math.random() * 100));
  }
}
  
  obstacles.forEach((obstacle, index) => {
    obstacle.update();
    obstacle.draw();
    
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
    }
    
if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
  obstacle.passed = true;
  comboCount++;
  comboTimer = 180;
  const points = Math.min(comboCount, 5) * Math.ceil(obstacle.difficulty);
  const multiplier = powerUpActive === 'doubleScore' ? 2 : 1;
  score += points * multiplier;
  scoreEl.textContent = score;
  playScoreSound(points);
  createParticles(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, 20, '#0ff', 1.5);
  flashEffect = 0.15;

  gameSpeed += 0.02 + (score * 0.001);
}
    
if (
  player.x < obstacle.x + obstacle.width &&
  player.x + player.size > obstacle.x &&
  player.y < obstacle.y + obstacle.height &&
  player.y + player.size > obstacle.y
) {
  if (powerUpActive === 'shield') {
    // Shield absorbs hit
    powerUpActive = null;
    powerUpTimer = 0;
    shakeScreen(5);
    createParticles(player.x + player.size/2, player.y + player.size/2, 20, '#00ff00', 2);
    obstacles.splice(obstacles.indexOf(obstacle), 1);
  } else {
    gameOver();
    return;
  }
}
  });
  
powerUps.forEach((powerUp, index) => {
  powerUp.update();
  powerUp.draw();
  
  if (powerUp.collected) {
    powerUps.splice(index, 1);
    return;
  }
  
  // Check collision with player
  if (
    player.x < powerUp.x + powerUp.size &&
    player.x + player.size > powerUp.x &&
    player.y < powerUp.y + powerUp.size &&
    player.y + player.size > powerUp.y
  ) {
    powerUp.collected = true;
    activatePowerUp(powerUp.type);
    powerUps.splice(index, 1);
  }
  
  // Remove if off screen
  if (powerUp.x + powerUp.size < 0) {
    powerUps.splice(index, 1);
  }
});

particles.forEach((particle, index) => {
  particle.update();
  particle.draw();
  if (particle.life <= 0) {
    particles.splice(index, 1);
  }
});

if (comboTimer > 0) {
  comboTimer--;
  if (comboCount > 1) {
    comboDisplay.textContent = `${comboCount}x COMBO!`;
    comboDisplay.classList.add('visible');
  }
  if (comboTimer <= 0) {
    comboCount = 0;
    comboDisplay.classList.remove('visible');
  }
} else {
  comboCount = 0;
  comboDisplay.classList.remove('visible');
}

// Power-up timer
if (powerUpTimer > 0) {
  powerUpTimer--;
  if (powerUpTimer <= 0) {
    powerUpActive = null;
    scoreMultiplier = 1;
  }
}
  
  ctx.shadowBlur = 0;
  
  if (gameRunning) {
    if (screenShake > 0) ctx.restore();
    requestAnimationFrame(gameLoop);
  } else if (screenShake > 0) {
    ctx.restore();
  }
}

resize();
window.addEventListener('resize', resize);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  gameOverScreen.classList.add('hidden');
  startGame();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameRunning) {
      player.jump();
    } else if (!startScreen.classList.contains('hidden')) {
      startGame();
    } else if (!gameOverScreen.classList.contains('hidden')) {
      startGame();
    }
  }
});

canvas.addEventListener('click', (e) => {
  if (gameRunning) {
    player.jump();
    e.preventDefault();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameRunning) {
    player.jump();
  }
}, { passive: false });

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggleBtn.classList.toggle('muted', !soundEnabled);
});

startScreen.classList.remove('hidden');

const style = document.createElement('style');
style.textContent = `
  @keyframes scorePopup {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-40px) scale(1.2);
    }
  }
`;
document.head.appendChild(style);

// Pixel Tune Lo-Fi Background Music
const melody = [
  // Melody line (high pitch, playful)
  [523.25, 0, 150], [587.33, 150, 150], [659.25, 300, 150], [783.99, 450, 150],
  [659.25, 600, 150], [587.33, 750, 150], [523.25, 900, 150], [493.88, 1050, 150],
  [523.25, 1200, 150], [587.33, 1350, 150], [659.25, 1500, 150], [698.46, 1650, 150],
  [783.99, 1800, 150], [698.46, 1950, 150], [659.25, 2100, 150], [587.33, 2250, 150],
  // Bass line (low pitch, lo-fi warmth)
  [130.81, 0, 300], [146.83, 300, 300], [164.81, 600, 300], [196.00, 900, 300],
  [164.81, 1200, 300], [146.83, 1500, 300], [130.81, 1800, 300], [123.47, 2100, 300],
  // Arpeggio (middle, adds depth)
  [261.63, 75, 100], [329.63, 225, 100], [392.00, 375, 100], [523.25, 525, 100],
  [392.00, 675, 100], [329.63, 825, 100], [261.63, 975, 100], [246.94, 1125, 100],
  [261.63, 1275, 100], [329.63, 1425, 100], [392.00, 1575, 100], [349.23, 1725, 100],
  [392.00, 1875, 100], [349.23, 2025, 100], [329.63, 2175, 100], [293.66, 2325, 100]
];

const bassLine = [
  [130.81, 0, 400], [0, 400, 200],
  [146.83, 600, 400], [0, 1000, 200],
  [164.81, 1200, 400], [0, 1600, 200],
  [196.00, 1800, 400], [0, 2200, 200]
];

function playNote(freq, startTime, duration, type = 'square', volume = 0.1) {
  if (freq === 0) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.type = type;
  osc.frequency.value = freq;
  
  // Lo-fi filter
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  
  // Envelope with soft attack and release
  const attackTime = 0.01;
  const releaseTime = 0.1;
  const holdTime = duration / 1000 - attackTime - releaseTime;
  
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + attackTime);
  gain.gain.setValueAtTime(volume, startTime + attackTime + holdTime);
  gain.gain.linearRampToValueAtTime(0, startTime + duration / 1000);
  
  osc.start(startTime);
  osc.stop(startTime + duration / 1000);
}

function playDrum(startTime, type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  if (type === 'kick') {
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    osc.start(startTime);
    osc.stop(startTime + 0.5);
  } else if (type === 'hat') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(8000, startTime);
    gain.gain.setValueAtTime(0.05, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    osc.start(startTime);
    osc.stop(startTime + 0.05);
  }
}

function initMusic() {
  if (bgMusic) return;
  bgMusic = { playing: false };
}

function startMusic() {
  if (!audioCtx) return;
  if (musicInterval) clearInterval(musicInterval);
  
  const tempo = 120;
  const beatDuration = 60000 / tempo;
  const loopLength = 2400; // ms per loop
  
  let loopStart = audioCtx.currentTime;
  let loopCount = 0;
  
  function playLoop() {
            const now = loopStart + (loopCount * loopLength / 1000);
            
            // Play melody notes
            melody.forEach((note, idx) => {
              playNote(note[0], now + note[1]/1000, note[2], 'square', 0.08);
            });
            
            // Play bass
            bassLine.forEach((note, idx) => {
              playNote(note[0], now + note[1]/1000, note[2], 'triangle', 0.15);
            });
            
            // Simple drum pattern
            playDrum(now, 'kick');
            playDrum(now + beatDuration/2000, 'hat');
            playDrum(now + beatDuration/1000, 'kick');
            playDrum(now + beatDuration*1.5/1000, 'hat');
            
            loopCount++;
          }
  
  playLoop();
  
  // Loop every 2.4 seconds
  musicInterval = setInterval(() => {
    if (musicPlaying && gameRunning) {
      playLoop();
    }
  }, loopLength);
  
  musicPlaying = true;
}

function toggleMusic() {
  if (!bgMusic) {
    initMusic();
  }
  
  if (musicPlaying) {
    if (musicInterval) clearInterval(musicInterval);
    musicInterval = null;
    musicPlaying = false;
    musicToggleBtn.textContent = '🎵';
  } else {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    startMusic();
    musicToggleBtn.textContent = '🎵';
  }
}

musicToggleBtn.addEventListener('click', toggleMusic);
