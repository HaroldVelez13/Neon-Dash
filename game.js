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

let width, height;
let animationId;
let lastTime = 0;

let score = 0;
let bestScore = parseInt(localStorage.getItem('neonDashBestScore')) || 0;
let gameRunning = false;
let gameSpeed = 1;
let soundEnabled = true;

bestScoreEl.textContent = `BEST: ${bestScore}`;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

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
  }

  jump() {
    if (this.onGround) {
      this.velocityY = this.jumpForce;
      this.onGround = false;
      playSound('jump');
      createParticles(this.x + this.size / 2, this.y + this.size, 10, '#0ff');
    }
  }

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;

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
    this.width = 40 + Math.random() * 30;
    this.height = 60 + Math.random() * 40;
    this.x = width;
    this.y = height - 100 - this.height;
    this.color = '#ff0066';
    this.passed = false;
  }

  update() {
    this.x -= gameSpeed * 8;
  }

  draw() {
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.fillStyle = '#ff6699';
    ctx.fillRect(this.x + 5, this.y + 5, this.width - 10, this.height - 10);
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 5 + 2;
    this.speedX = (Math.random() - 0.5) * 10;
    this.speedY = (Math.random() - 0.5) * 10;
    this.color = color;
    this.life = 1;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= this.decay;
  }

  draw() {
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
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

function createParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, color));
  }
}

function shakeScreen() {
  gameContainer.classList.add('shake');
  setTimeout(() => {
    gameContainer.classList.remove('shake');
  }, 500);
}

function gameOver() {
  gameRunning = false;
  playSound('crash');
  shakeScreen();
  createParticles(player.x + player.size / 2, player.y + player.size / 2, 30, '#0ff');
  
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('neonDashBestScore', bestScore);
    bestScoreEl.textContent = `BEST: ${bestScore}`;
  }
  
  finalScoreEl.textContent = score;
  bestScoreDisplayEl.textContent = bestScore;
  gameOverScreen.classList.remove('hidden');
}

function resetGame() {
  player = new Player();
  obstacles = [];
  particles = [];
  score = 0;
  gameSpeed = 1;
  obstacleTimer = 0;
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

function gameLoop(currentTime) {
  if (!gameRunning) return;
  
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  
  ctx.clearRect(0, 0, width, height);
  
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
  if (obstacleTimer > obstacleInterval / gameSpeed) {
    obstacles.push(new Obstacle());
    obstacleTimer = 0;
    obstacleInterval = 60 + Math.random() * 60;
  }
  
  obstacles.forEach((obstacle, index) => {
    obstacle.update();
    obstacle.draw();
    
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(index, 1);
    }
    
    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
      score++;
      scoreEl.textContent = score;
      playSound('score');
      createParticles(obstacle.x, obstacle.y + obstacle.height / 2, 15, '#0ff');
      
      gameSpeed += 0.03;
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
  
  ctx.shadowBlur = 0;
  
  if (gameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

resize();
window.addEventListener('resize', resize);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameRunning) {
      player.jump();
    } else if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) {
      startGame();
    }
  }
});

canvas.addEventListener('click', () => {
  if (gameRunning) {
    player.jump();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (gameRunning) {
    player.jump();
  }
});

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggleBtn.classList.toggle('muted', !soundEnabled);
});

startScreen.classList.remove('hidden');
