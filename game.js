// TODO: add more game modes (dark mode, more obstacles, changing platforms/actions, etc)

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameOver = false;
let gameStarted = false;
let score = 0;
let highScore = 0;
let showHelp = false;
let hasPlayedOnce = false;


// jump sound effects
function playJumpSound() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(800, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.2);

  gain.gain.setValueAtTime(0.2, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 0.2);
}


// bg music
const bgMusic = new Audio("assets/background.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;

function startBgMusic() {
  bgMusic.play().catch(() => {
    console.log("Autoplay blocked, will play after first user interaction");
  });
}

function fadeOutBgMusic(duration = 2000) {
  const initialVolume = bgMusic.volume;
  const stepTime = 50;
  let elapsed = 0;

  const fadeInterval = setInterval(() => {
    elapsed += stepTime;
    const fraction = elapsed / duration;
    if (fraction >= 1) {
      bgMusic.volume = 0;
      bgMusic.pause();
      bgMusic.currentTime = 0;
      clearInterval(fadeInterval);
    } else {
      bgMusic.volume = initialVolume * (1 - fraction);
    }
  }, stepTime);
}


// canvas resizing
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  // Update dependent variables on resize
  updateSizes();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


// relative sizing
let SKY_OFFSET, PLATFORM_HEIGHT, BASE_SPEED;
let dino, platforms;

function updateSizes() {
  SKY_OFFSET = canvas.height * 0.2;
  PLATFORM_HEIGHT = canvas.height * 0.02;
  BASE_SPEED = Math.max(5, canvas.width / 400);

  if (!dino) return;

  dino.width = canvas.width * 0.08;
  dino.height = canvas.height * 0.08;
  dino.x = canvas.width * 0.1;
  if (!gameStarted) {
    dino.y = canvas.height - SKY_OFFSET - dino.height;
  }
}


// dino object
dino = {
  x: canvas.width * 0.1,
  y: canvas.height * 0.8,
  width: canvas.width * 0.08,
  height: canvas.height * 0.08,
  velocityY: 0,
  gravity: canvas.height * 0.006,
  jumpStrength: -canvas.height * 0.03,
  onGround: true,
  doubleJumpUsed: false
};

// dino sprites
const dinoLeft = new Image();
dinoLeft.src = "assets/dino_left.webp";
const dinoRight = new Image();
dinoRight.src = "assets/dino_right.webp";

let legToggle = true;
let legFrameCounter = 0;
const legSwitchRate = 6;


// platforms
function initPlatforms() {
  platforms = [
    { x: 0, y: canvas.height - SKY_OFFSET, width: canvas.width, height: PLATFORM_HEIGHT }
  ];
}

initPlatforms();


// input
document.addEventListener("keydown", (e) => {
  if (!gameStarted && e.code === "Space") {
    gameStarted = true;
    if (!hasPlayedOnce) startBgMusic();
    return;
  }

  if (!gameOver && gameStarted && e.code === "Space") {
    if (dino.onGround) {
      dino.velocityY = dino.jumpStrength;
      dino.onGround = false;
      dino.doubleJumpUsed = false;
      playJumpSound();
    } else if (!dino.doubleJumpUsed) {
      dino.velocityY = dino.jumpStrength;
      dino.doubleJumpUsed = true;
      playJumpSound();
    }
  }

  if (gameOver && e.key.toLowerCase() === "r") {
    resetGame(true);
  }
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const dx = mouseX - 40;
  const dy = mouseY - 40;
  if (dx * dx + dy * dy <= 25 * 25) {
    showHelp = !showHelp;
  }
});


// reset game
function resetGame(skipHome = false) {
  gameOver = false;
  gameStarted = skipHome || hasPlayedOnce;
  hasPlayedOnce = true;

  dino.y = canvas.height - SKY_OFFSET - dino.height;
  dino.velocityY = 0;
  dino.onGround = true;
  dino.doubleJumpUsed = false;

  score = 0;
  initPlatforms();
  legToggle = true;
  legFrameCounter = 0;

  if (!bgMusic.paused) {
    bgMusic.currentTime = 0;
    bgMusic.volume = 0.3;
  } else {
    startBgMusic();
  }
}


// update
function update() {
  if (!gameStarted) return;

  const PLATFORM_SPEED = BASE_SPEED + score / 500;
  score += 1;

  dino.velocityY += dino.gravity;
  dino.y += dino.velocityY;

  // Prevent dino from going too high
  if (dino.y < canvas.height * 0.05) {
    dino.y = canvas.height * 0.05;
    dino.velocityY = 0;
  }

  platforms.forEach(p => { p.x -= PLATFORM_SPEED; });

  const lastPlatform = platforms[platforms.length - 1];
  if (lastPlatform.x + lastPlatform.width < canvas.width) {
    platforms.push({
      x: canvas.width + canvas.width * 0.2 + Math.random() * canvas.width * 0.2,
      y: canvas.height - (SKY_OFFSET + canvas.height * 0.05 + Math.random() * canvas.height * 0.1),
      width: canvas.width * 0.15 + Math.random() * canvas.width * 0.05,
      height: PLATFORM_HEIGHT
    });
  }

  dino.onGround = false;
  platforms.forEach(p => {
    if (
      dino.x < p.x + p.width &&
      dino.x + dino.width > p.x &&
      dino.y + dino.height <= p.y + dino.height * 0.1 &&
      dino.y + dino.height + dino.velocityY >= p.y
    ) {
      dino.y = p.y - dino.height;
      dino.velocityY = 0;
      dino.onGround = true;
      dino.doubleJumpUsed = false;
    }
  });

  if (dino.y > canvas.height + dino.height && !gameOver) {
    gameOver = true;
    if (score > highScore) highScore = score;
    fadeOutBgMusic();
  }

  if (dino.onGround && gameStarted && !gameOver) {
    legFrameCounter++;
    if (legFrameCounter >= legSwitchRate) {
      legToggle = !legToggle;
      legFrameCounter = 0;
    }
  } else {
    legToggle = true;
    legFrameCounter = 0;
  }
}


//draw
function draw() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // score
  ctx.fillStyle = "black";
  ctx.textAlign = "right";
  ctx.font = `${Math.floor(canvas.height * 0.03)}px 'Coral Pixels', serif`;
  ctx.fillText("SCORE: " + Math.floor(score), canvas.width - 40, 40);
  ctx.fillText("HIGH SCORE: " + Math.floor(highScore), canvas.width - 40, 80);

  // help button
  const helpX = 40, helpY = 40;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", helpX, helpY);

  // instructions popup
  if (showHelp) {
    const popupWidth = canvas.width * 0.35;
    const popupHeight = canvas.height * 0.35;
    const popupX = helpX + 10;
    const popupY = helpY + 40;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(popupX, popupY, popupWidth, popupHeight);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(popupX, popupY, popupWidth, popupHeight);

    ctx.fillStyle = "black";
    ctx.textAlign = "left";
    ctx.font = `${Math.floor(canvas.height * 0.02)}px 'Coral Pixels', serif`;

    const instructions = [
      "Inspired by the Chrome Dino Game!",
      " ",
      "INSTRUCTIONS:",
      "- Press SPACEBAR to jump.",
      "- You can double-jump once per jump.",
      "- Avoid falling off the platforms.",
      "- Speed increases over time.",
      "- Press R to restart after game over."
    ];
    instructions.forEach((line, i) => {
      ctx.fillText(line, popupX + 10, popupY + 30 + i * canvas.height * 0.03);
    });
  }

  // draw dino
  const dinoSprite = (dino.onGround) ? (legToggle ? dinoLeft : dinoRight) : dinoLeft;
  if (dinoSprite.complete && dinoSprite.naturalWidth !== 0) {
    ctx.drawImage(dinoSprite, dino.x, dino.y, dino.width, dino.height);
  } else {
    ctx.fillStyle = "green";
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
  }

  // draw platforms
  platforms.forEach(p => {
    ctx.fillStyle = "white";
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.width, p.height);
  });

  // start screen
  if (!gameStarted && !hasPlayedOnce) {
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.font = `${Math.floor(canvas.height * 0.08)}px 'Coral Pixels', serif`;
    ctx.fillText("SKY DINO", canvas.width / 2, canvas.height / 2 - 60);
    ctx.font = `${Math.floor(canvas.height * 0.04)}px 'Coral Pixels', serif`;
    ctx.fillText("Press SPACEBAR to start", canvas.width / 2, canvas.height / 2 + 20);
  }

  // game over screen
  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = `${Math.floor(canvas.height * 0.07)}px 'Coral Pixels', serif`;
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = `${Math.floor(canvas.height * 0.035)}px 'Coral Pixels', serif`;
    ctx.fillText("Press R to replay", canvas.width / 2, canvas.height / 2 + 20);
  }
}


// game loop
function gameLoop() {
  if (!gameOver) update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
