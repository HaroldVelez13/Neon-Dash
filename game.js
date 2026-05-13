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
  gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
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
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.1);
  } else if (type === 'score') {
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.15);
  } else if (type === 'crash') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
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
  }

  jump() {
    if (this.onGround || this.jumpCooldown <= 0) {
      this.velocityY = this.jumpForce;
      this.onGround = false;
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
  particles = [];
  score = 0;
  gameSpeed = 1;
  obstacleTimer = 0;
  scoreMultiplier = 1;
  comboCount = 0;
  comboTimer = 0;
  flashEffect = 0;
  screenShake = 0;
  scoreEl.textContent = score;
}

function startGame() {
  resetGame();
  gameRunning = true;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  lastTime = performance.now();
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
  const points = Math.min(comboCount, 5);
  score += points;
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
      gameOver();
      return;
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
