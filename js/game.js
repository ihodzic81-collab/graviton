// ============================================================
// GRAVITON — Motor igre
// Glavna petlja, stanje igre, povezivanje svih modula.
// ============================================================

import { loadLevel } from "./level.js";
import { createPlayer, updatePlayer, drawPlayer, flipGravity, respawnPlayer } from "./player.js";
import { createCamera, updateCamera, resizeCamera } from "./camera.js";
import {
  spawnExplosion, spawnRespawnPortal,
  updateParticles, drawParticles,
  updateRespawnPortals, drawRespawnPortals,
  clearEffects, setReducedMotion
} from "./effects.js";
import {
  initControls, updateControls, clearFrameInput, input
} from "./controls.js";
import {
  setHudLevel, showGameToast,
  openPause, closePause,
  openWin, closeWin
} from "./hud.js";
import {
  initAudio, setAudioSettings, resumeAudio,
  startAmbientMusic, stopAmbientMusic,
  updateMusicDynamics,
  sfxJump, sfxGravity, sfxFall, sfxRespawn, sfxPortal, sfxWin, sfxLand
} from "./audio.js";

// ---------- STANJE ----------
const state = {
  running: false,
  paused: false,
  level: null,
  player: null,
  camera: null,
  canvas: null,
  ctx: null,
  lastTime: 0,
  accumulator: 0,
  fixedStep: 1 / 60,          // fiksni korak fizike
  maxSubSteps: 5,
  time: 0,                    // ukupno vreme u sekundama
  levelTime: 0,               // vreme u trenutnom nivou
  previousGravity: 1,
  levelNumber: 1,
  onExit: null,
  onComplete: null,           // callback za app.js
  reducedMotion: false,
  settings: { music: true, sfx: true }
};

let resizeHandler = null;

// ---------- INICIJALIZACIJA ----------
export function initGame(options = {}) {
  state.canvas = document.getElementById("game-canvas");
  if (!state.canvas) return;
  state.ctx = state.canvas.getContext("2d");

  state.onExit = options.onExit || null;
  state.onComplete = options.onComplete || null;

  initControls();

  // Resize
  resizeHandler = () => resize();
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("orientationchange", resizeHandler);

  // Poveži HUD dugmad
  document.getElementById("btn-pause")?.addEventListener("click", () => pauseGame());
  document.getElementById("btn-resume")?.addEventListener("click", () => resumeGame());
  document.getElementById("btn-restart")?.addEventListener("click", () => restartLevel());
  document.getElementById("btn-exit")?.addEventListener("click", () => exitGame());
  document.getElementById("btn-next")?.addEventListener("click", () => nextLevel());
  document.getElementById("btn-retry")?.addEventListener("click", () => restartLevel());
  document.getElementById("btn-win-exit")?.addEventListener("click", () => exitGame());

  // Tastatura za pauzu
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (state.running && !state.paused) pauseGame();
      else if (state.paused) resumeGame();
    }
  });

  resize();
}

export function setGameSettings(settings) {
  state.settings = { ...state.settings, ...settings };
  setAudioSettings(state.settings);
  setReducedMotion(!!settings.reducedMotion);
  state.reducedMotion = !!settings.reducedMotion;
}

function resize() {
  if (!state.canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.canvas.width = Math.floor(w * dpr);
  state.canvas.height = Math.floor(h * dpr);
  state.canvas.style.width = w + "px";
  state.canvas.style.height = h + "px";
  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.camera) resizeCamera(state.camera, w, h);
}

// ---------- POKRETANJE ----------
export function startLevel(n, options = {}) {
  state.levelNumber = n;
  state.level = loadLevel(n);
  if (!state.level) {
    console.warn("Nivo nije pronađen:", n);
    return;
  }

  state.player = createPlayer(state.level.start.x, state.level.start.y);
  state.camera = createCamera(window.innerWidth, window.innerHeight);
  state.camera.x = Math.max(0, state.player.x - state.camera.w / 2);
  state.camera.y = Math.max(0, state.player.y - state.camera.h / 2);
  state.levelTime = 0;
  state.time = 0;
  state.previousGravity = 1;
  clearEffects();

  setHudLevel(n, state.level.name);
  closePause();
  closeWin();

  state.running = true;
  state.paused = false;

  state.canvas?.parentElement?.classList.add("is-active");
  document.getElementById("game-layer")?.setAttribute("aria-hidden", "false");

  // Audio
  initAudio();
  resumeAudio();
  setAudioSettings(state.settings);
  startAmbientMusic();
  updateMusicDynamics("idle");

  showGameToast(`NIVO ${n} — ${state.level.name}`, 2000);

  state.lastTime = performance.now();
  state.accumulator = 0;
  requestAnimationFrame(loop);
}

export function stopGame() {
  state.running = false;
  state.paused = false;
  stopAmbientMusic();
  document.getElementById("game-layer")?.setAttribute("aria-hidden", "true");
  document.getElementById("game-layer")?.classList.remove("is-active");
}

// ---------- PETLJA ----------
function loop(now) {
  if (!state.running) return;

  const dt = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;

  if (!state.paused) {
    state.accumulator += dt;
    let steps = 0;
    while (state.accumulator >= state.fixedStep && steps < state.maxSubSteps) {
      tick(state.fixedStep);
      state.accumulator -= state.fixedStep;
      steps++;
    }
    if (steps === state.maxSubSteps) state.accumulator = 0;
  }

  render();
  requestAnimationFrame(loop);
}

// ---------- AŽURIRANJE (fiksni korak) ----------
function tick(dt) {
  if (!state.player || !state.level) return;
  state.time += dt;
  state.levelTime += dt;

  updateControls();

  // Gravitacija — dugme
  if (input.gravity) {
    flipGravity(state.player);
    sfxGravity();
    if (!state.reducedMotion) {
      spawnExplosion(
        state.player.x + state.player.w / 2,
        state.player.y + state.player.h / 2,
        "#2ad1ff"
      );
    }
  }

  // Ako je kugla živa
  if (state.player.alive) {
    const wasOnGround = state.player.onGround;
    updatePlayer(state.player, input, state.level, dt);

    // Sletanje
    if (!wasOnGround && state.player.onGround) {
      sfxLand();
    }

    // Skok (zvučni efekat se okida kada je jump input aktivan i kugla je na zemlji)
    if (input.jump && (state.player.onGround || state.player.coyoteTime > 0) && state.player.canJump) {
      sfxJump();
    }

    // Provera pada van ekrana
    const maxY = state.level.height + 400;
    const minY = -600;
    if (state.player.y > maxY || state.player.y < minY) {
      triggerFall();
    }

    // Provera portala
    const px = state.player.x + state.player.w / 2;
    const py = state.player.y + state.player.h / 2;
    const portal = state.level.portal;
    if (portal && Math.hypot(px - portal.x, py - portal.y) < portal.r + 6) {
      triggerWin();
    }
  } else {
    // Respawn animacija
    state.player.spawnAnim -= dt;
    if (state.player.spawnAnim <= 0) {
      state.player.alive = true;
      state.player.spawnAnim = 0;
    }
  }

  updateParticles(dt);
  updateRespawnPortals(dt);

  if (state.camera) updateCamera(state.camera, state.player, state.level, dt);

  // Dinamika muzike
  if (state.player.alive) {
    const speed = Math.hypot(state.player.vx, state.player.vy);
    if (speed > 80) updateMusicDynamics("moving");
    else updateMusicDynamics("idle");
  }

  clearFrameInput();
}

// ---------- PAD ----------
function triggerFall() {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;

  // Eksplozija
  spawnExplosion(cx, cy, "#9b4dff");
  sfxFall();

  // Kugla "umire" — privremeno
  p.alive = false;
  p.spawnAnim = 0.7; // ukupno trajanje respawn-a

  // Izaberi spawn tačku — checkpoint ili start
  const spawn = state.level.checkpoint || state.level.start;

  // Mistični respawn portal
  spawnRespawnPortal(spawn.x, spawn.y);
  sfxRespawn();

  // Kugla se postavlja na spawn odmah (ali nevidljiva dok ne prođe animacija)
  p.x = spawn.x - p.w / 2;
  p.y = spawn.y - p.h / 2;
  p.vx = 0;
  p.vy = 0;
  p.gravityDir = 1;
  p.canJump = true;

  updateMusicDynamics("falling");
}

// ---------- POBEDA ----------
function triggerWin() {
  if (!state.running) return;
  state.running = false;

  const p = state.player;
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#2ad1ff");
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff3ec8");
  sfxPortal();
  sfxWin();
  updateMusicDynamics("win");

  const time = state.levelTime;
  const puls = Math.max(10, Math.round(100 - time * 2)); // brže = više PULS-a

  // Callback ka app.js
  if (state.onComplete) {
    state.onComplete({
      levelNumber: state.levelNumber,
      levelName: state.level.name,
      time,
      puls
    });
  }

  setTimeout(() => {
    openWin({
      time,
      puls,
      levelName: state.level.name
    });
  }, 700);
}

// ---------- RENDER ----------
function render() {
  if (!state.ctx || !state.canvas || !state.level || !state.camera) return;
  const ctx = state.ctx;
  const cam = state.camera;
  const W = cam.w;
  const H = cam.h;

  // Pozadina
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0a0420");
  sky.addColorStop(0.6, "#120635");
  sky.addColorStop(1, "#05020c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Zvezdice (paralaksa)
  drawParallaxStars(ctx, cam, W, H);

  // Platforme
  for (const p of state.level.platforms) {
    drawPlatform(ctx, p, cam);
  }

  // Kontrolna tačka
  if (state.level.checkpoint) {
    drawCheckpoint(ctx, state.level.checkpoint, cam, state.time);
  }

  // Portal
  if (state.level.portal && state.level.portal.r) {
    drawPortal(ctx, state.level.portal, cam, state.time);
  }

  // Respawn portali (ispod igrača)
  drawRespawnPortals(ctx, cam);

  // Čestice
  drawParticles(ctx, cam);

  // Igrač
  if (state.player) {
    if (state.player.alive) {
      drawPlayer(ctx, state.player, cam, state.time);
    }
  }
}

function drawParallaxStars(ctx, cam, W, H) {
  // Zvezdice koje se pomeraju sporije od kamere (paralaksa)
  const seed = 12345;
  const count = state.reducedMotion ? 20 : 60;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const sx = (i * 137.5) % W;
    const sy = (i * 91.7) % H;
    const px = sx - (cam.x * 0.2) % W;
    const py = sy - (cam.y * 0.2) % H;
    const wrapX = ((px % W) + W) % W;
    const wrapY = ((py % H) + H) % H;
    const twinkle = 0.5 + 0.5 * Math.sin(state.time * 2 + i);
    ctx.globalAlpha = 0.3 + twinkle * 0.4;
    ctx.fillStyle = i % 3 === 0 ? "#2ad1ff" : "#eae6ff";
    ctx.beginPath();
    ctx.arc(wrapX, wrapY, 0.6 + (i % 3) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatform(ctx, p, cam) {
  const x = p.x - cam.x;
  const y = p.y - cam.y;
  const w = p.w;
  const h = p.h;

  if (x + w < -20 || x > cam.w + 20) return;

  if (p.type === "ground") {
    // Čvrsto tlo — tamno, sa suptilnim sjajem
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "rgba(107, 44, 245, 0.35)");
    grad.addColorStop(0.3, "rgba(30, 12, 60, 0.95)");
    grad.addColorStop(1, "rgba(10, 4, 25, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Neon ivica
    ctx.strokeStyle = "rgba(155, 77, 255, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#9b4dff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + w, y + 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    // Platforma — sa gradijentom i neon ivicama
    const pulse = 1 + Math.sin(state.time * 2 + p.x * 0.01) * 0.05;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(155, 77, 255, ${0.55 * pulse})`);
    grad.addColorStop(0.5, `rgba(107, 44, 245, ${0.4 * pulse})`);
    grad.addColorStop(1, `rgba(60, 20, 140, ${0.5 * pulse})`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    // Gornja ivica — svetlija
    ctx.strokeStyle = `rgba(200, 150, 255, ${0.85 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#9b4dff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 1.5);
    ctx.lineTo(x + w - 2, y + 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Unutrašnji sjaj
    const inner = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    inner.addColorStop(0, "rgba(255,255,255,0.15)");
    inner.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
  }
}

function drawPortal(ctx, portal, cam, time) {
  const cx = portal.x - cam.x;
  const cy = portal.y - cam.y;
  const r = portal.r;

  if (cx < -100 || cx > cam.w + 100) return;

  const pulse = 1 + Math.sin(time * 3) * 0.08;
  const rot = time * 1.5;

  // Spoljni sjaj
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.5);
  glow.addColorStop(0, "rgba(255,255,255,0.55)");
  glow.addColorStop(0.3, "rgba(155,77,255,0.5)");
  glow.addColorStop(0.7, "rgba(42,209,255,0.25)");
  glow.addColorStop(1, "rgba(42,209,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Rotirajući prsten
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#9b4dff";
  ctx.shadowBlur = 16;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse * (0.9 + i * 0.15), i * (Math.PI * 2 / 3), i * (Math.PI * 2 / 3) + Math.PI * 0.6);
    ctx.stroke();
  }
  ctx.restore();

  // Unutrašnji vrtlog
  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9);
  inner.addColorStop(0, "#ffffff");
  inner.addColorStop(0.5, "#c7a4ff");
  inner.addColorStop(1, "#6b2cf5");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Centralna točka
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCheckpoint(ctx, cp, cam, time) {
  const cx = cp.x - cam.x;
  const cy = cp.y - cam.y;
  const pulse = 1 + Math.sin(time * 4) * 0.2;

  // Suptilni sjaj
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse);
  glow.addColorStop(0, "rgba(42, 209, 255, 0.55)");
  glow.addColorStop(1, "rgba(42, 209, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Prsten
  ctx.strokeStyle = "rgba(42, 209, 255, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#2ad1ff";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ---------- KONTROLA ----------
export function pauseGame() {
  if (!state.running || state.paused) return;
  state.paused = true;
  openPause();
}

export function resumeGame() {
  if (!state.paused) return;
  state.paused = false;
  closePause();
  state.lastTime = performance.now();
}

export function restartLevel() {
  const n = state.levelNumber;
  closePause();
  closeWin();
  startLevel(n);
}

export function nextLevel() {
  const n = state.levelNumber + 1;
  closeWin();
  // Za sada imamo samo nivo 1
  if (n > 1) {
    exitGame();
    return;
  }
  startLevel(n);
}

export function exitGame() {
  closePause();
  closeWin();
  stopGame();
  if (state.onExit) state.onExit();
}
