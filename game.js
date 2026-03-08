const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* RESPONSIVE SIZE */

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.addEventListener("resize", resize);

/* AUDIO FIX */

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(freq) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.frequency.value = freq;
  osc.type = "square";

  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

/* GAME STATE */

let running = false;
let paused = false;

let bird;
let pipes = [];
let clouds = [];
let particles = [];

let groundOffset = 0;

let score = 0;
let difficulty = 0;

let best = localStorage.getItem("flappyBest") || 0;
let leaderboard = JSON.parse(localStorage.getItem("flappyBoard") || "[]");

/* PHYSICS */

const gravity = 0.32;
const jumpPower = -6;
const maxFall = 7;

function reset() {
  bird = {
    x: canvas.width * 0.25,
    y: canvas.height * 0.5,
    vel: 0,
    size: 20,
    frame: 0,
  };

  pipes = [];
  particles = [];
  score = 0;
  difficulty = 0;

  document.getElementById("score").innerText = 0;
}

function start() {
  initAudio();

  document.getElementById("menu").classList.add("hidden");
  document.getElementById("gameOver").classList.add("hidden");

  reset();
  running = true;
  paused = false;
}

document.getElementById("startBtn").onclick = start;

function restart() {
  start();
}

/* CONTROLS */

function jump() {
  if (!running || paused) return;

  bird.vel = jumpPower;
  playSound(700);
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (!running) {
      start();
    } else {
      jump();
    }
  }

  if (e.key === "p") paused = !paused;
});

canvas.addEventListener("click", jump);
canvas.addEventListener("touchstart", jump);

/* PIPES */

function spawnPipe() {
  let gap = 170 - difficulty * 5;
  if (gap < 110) gap = 110;

  let top = Math.random() * (canvas.height * 0.5) + 40;

  pipes.push({
    x: canvas.width,
    width: 70,
    top: top,
    bottom: top + gap,
    passed: false,
  });
}

setInterval(() => {
  if (running && !paused) {
    spawnPipe();
    difficulty += 0.1;
  }
}, 1800);

/* UPDATE */

function update() {
  if (!running || paused) return;

  bird.vel += gravity;
  if (bird.vel > maxFall) bird.vel = maxFall;

  bird.y += bird.vel;
  bird.frame += 0.25;

  if (bird.y > canvas.height - 80 || bird.y < 0) {
    gameOver();
  }

  pipes.forEach((pipe) => {
    pipe.x -= 3 + difficulty * 0.3;

    if (
      bird.x < pipe.x + pipe.width &&
      bird.x + bird.size > pipe.x &&
      (bird.y - bird.size < pipe.top || bird.y + bird.size > pipe.bottom)
    ) {
      explode();
      gameOver();
    }

    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      score++;

      document.getElementById("score").innerText = score;
      playSound(900);
    }
  });

  pipes = pipes.filter((p) => p.x + p.width > 0);

  groundOffset -= 3;

  updateParticles();
}

/* PARTICLES */

function explode() {
  for (let i = 0; i < 20; i++) {
    particles.push({
      x: bird.x,
      y: bird.y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 40,
    });
  }
}

function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });

  particles = particles.filter((p) => p.life > 0);
}

/* SKY TRANSITION */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return `rgb(${lerp(c1[0], c2[0], t)},${lerp(c1[1], c2[1], t)},${lerp(
    c1[2],
    c2[2],
    t
  )})`;
}

function skyColor() {
  const day = [112, 197, 206];
  const sunset = [245, 158, 11];
  const night = [30, 41, 59];

  let t = (Date.now() / 1000) % 30;

  if (t < 10) return lerpColor(day, sunset, t / 10);
  if (t < 20) return lerpColor(sunset, night, (t - 10) / 10);

  return lerpColor(night, day, (t - 20) / 10);
}

function drawBackground() {
  ctx.fillStyle = skyColor();
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  clouds.forEach((c) => {
    c.x -= 0.3;

    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
    ctx.arc(c.x + 20, c.y + 5, 20, 0, Math.PI * 2);
    ctx.fill();

    if (c.x < -50) c.x = canvas.width + 50;
  });
}

/* BIRD */

function drawBird() {
  let wing = Math.sin(bird.frame) * 5;

  ctx.save();

  let angle = bird.vel * 0.05;
  if (angle > 0.6) angle = 0.6;
  if (angle < -0.6) angle = -0.6;

  ctx.translate(bird.x, bird.y);
  ctx.rotate(angle);

  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(0, 0, bird.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "orange";
  ctx.beginPath();
  ctx.ellipse(-5, wing, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(8, -5, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(10, -5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* PIPES */

function drawPipes() {
  pipes.forEach((pipe) => {
    ctx.fillStyle = "#22c55e";

    ctx.fillRect(pipe.x, 0, pipe.width, pipe.top);
    ctx.fillRect(
      pipe.x,
      pipe.bottom,
      pipe.width,
      canvas.height - pipe.bottom - 60
    );

    ctx.fillStyle = "#16a34a";

    ctx.fillRect(pipe.x - 5, pipe.top - 20, pipe.width + 10, 20);
    ctx.fillRect(pipe.x - 5, pipe.bottom, pipe.width + 10, 20);
  });
}

/* GROUND */

function drawGround() {
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

  ctx.fillStyle = "#c9b458";

  for (let i = 0; i < canvas.width / 40; i++) {
    ctx.fillRect(i * 40 + (groundOffset % 40), canvas.height - 60, 20, 60);
  }
}

/* PARTICLES */

function drawParticles() {
  particles.forEach((p) => {
    ctx.fillStyle = "orange";
    ctx.fillRect(p.x, p.y, 4, 4);
  });
}

/* DRAW */

function draw() {
  drawBackground();
  drawPipes();
  drawBird();
  drawParticles();
  drawGround();
}

/* LEADERBOARD */

function renderLeaderboard() {
  let html = "<div class='font-bold mb-2'>Top Scores</div>";

  leaderboard.forEach((s, i) => {
    let highlight = i === 0 ? "text-yellow-400 font-bold" : "";

    html += `<div class="flex justify-between ${highlight}">
<span>#${i + 1}</span>
<span>${s}</span>
</div>`;
  });

  document.getElementById("leaderboard").innerHTML = html;
}

/* GAME OVER */

function gameOver() {
  running = false;

  if (score > best) {
    best = score;
    localStorage.setItem("flappyBest", best);
  }

  leaderboard.push(score);
  leaderboard.sort((a, b) => b - a);
  leaderboard = leaderboard.slice(0, 5);

  localStorage.setItem("flappyBoard", JSON.stringify(leaderboard));

  document.getElementById("scoreText").innerText = "Score: " + score;
  document.getElementById("bestText").innerText = "Best: " + best;

  renderLeaderboard();

  document.getElementById("gameOver").classList.remove("hidden");

  playSound(200);
}

/* LOOP */

function loop() {
  update();
  draw();

  requestAnimationFrame(loop);
}

/* CLOUDS */

function initClouds() {
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: Math.random() * 200 + 40,
    });
  }
}

initClouds();
reset();
loop();
