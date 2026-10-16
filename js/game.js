// ============================================================
// GRAVITON — Motor igre (Faza 3)
// Glavna petlja, rotacija, gravitacija, zvezdice, tranzicije.
// ============================================================

import { loadLevel } from "./level.js";
import { createPlayer, updatePlayer, drawPlayer, flipGravity } from "./player.js";
import { createCamera, updateCamera, resizeCamera } from "./camera.js";
import {
  createRotationState, startRotation, updateRotation,
  getRotatedPlatforms, rotatePoint
} from "./rotate.js";
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
  setHudLevel, showGameToast, configureButtons,
  updateFragmentsHud,
  openPause, closePause,
  openWin, closeWin
} from "./hud.js";
import {
  initAudio, setAudioSettings, resumeAudio,
  startAmbientMusic, stopAmbientMusic,
  updateMusicDynamics,
  sfxJump, sfxGravity, sfxFall, sfxRespawn, sfxPortal, sfxWin, sfxLand
} from "./audio.js";
import { transitionTo } from "./transitions.js";

const state = {
  running: false,
  paused: false,
  level: null,
  player: null,
  camera: null,
  rotState: null,
  canvas: null,
  ctx: null,
  lastTime: 0,
  accumulator: 0,
  fixedStep: 1 / 60,
  maxSubSteps: 5,
  time: 0,
  levelTime: 0,
  levelNumber: 1,
  onExit: null,
  onComplete: null,
  reducedMotion: false,
  settings: { music: true, sfx: true },
  fragmentsCollected: 0,
  fellOnce: false,
  portalUnlocked: false,
  gravityFlipFlash: 0
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

  resizeHandler = () => resize();
  window.addEventListener("resize", resizeHandler);
  window.addEventListener("orientationchange", resizeHandler);

  // HUD dugmad
  document.getElementById("btn-pause")?.addEventListener("click", () => pauseGame());
  document.getElementById("btn-resume")?.addEventListener("click", () => resumeGame());
  document.getElementById("btn-restart")?.addEventListener("click", () => restartLevel());
  document.getElementById("btn-exit")?.addEventListener("click", () => exitGame());
  document.getElementById("btn-next")?.addEventListener("click", () => nextLevel());
  document.getElementById("btn-retry")?.addEventListener("click", () => restartLevel());
  document.getElementById("btn-win-exit")?.addEventListener("click", () => exitGame());

  // Tastatura
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
  state.fragmentsCollected = 0;
  state.fellOnce = false;
  state.portalUnlocked = state.level.fragmentsRequired === 0;
  state.gravityFlipFlash = 0;

  state.rotState = createRotationState(state.level);

  clearEffects();
  setHudLevel(n, state.level.name);
  configureButtons(state.level);
  updateFragmentsHud(0, state.level.fragmentsRequired);
  closePause();
  closeWin();

  state.running = true;
  state.paused = false;

  document.getElementById("game-layer")?.classList.add("is-active");
  document.getElementById("game-layer")?.setAttribute("aria-hidden", "false");

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

// ---------- AŽURIRANJE ----------
function tick(dt) {
  if (!state.player || !state.level) return;
  state.time += dt;
  state.levelTime += dt;

  if (state.gravityFlipFlash > 0) {
    state.gravityFlipFlash = Math.max(0, state.gravityFlipFlash - dt);
  }

  updateControls();

  // Skupljanje svih platformi (fiksne + rotirane)
  const rotatedPlatforms = getRotatedPlatforms(state.level, state.rotState);
  const allPlatforms = [...state.level.platforms, ...rotatedPlatforms];

  // Gravitacija — dugme
  if (input.gravity && state.level.showGravity) {
    flipGravity(state.player);
    sfxGravity();
    state.gravityFlipFlash = 0.25;
    if (!state.reducedMotion) {
      spawnExplosion(
        state.player.x + state.player.w / 2,
        state.player.y + state.player.h / 2,
        "#2ad1ff"
      );
    }
  }

  // Rotacija — dugme
  if (input.rotate && state.rotState) {
    if (startRotation(state.rotState)) {
      // Zvučni efekat
      sfxGravity();
    }
  }

  // Ažuriraj rotaciju
  if (state.rotState) updateRotation(state.rotState, dt);

  // Ažuriraj igrača
  if (state.player.alive) {
    const wasOnGround = state.player.onGround;
    updatePlayer(state.player, input, allPlatforms, dt);

    if (!wasOnGround && state.player.onGround) {
      sfxLand();
    }

    if (input.jump && (state.player.onGround || state.player.coyoteTime > 0) && state.player.canJump) {
      sfxJump();
    }

    // Pad van ekrana
    const maxY = state.level.height + 400;
    const minY = -600;
    if (state.player.y > maxY || state.player.y < minY) {
      triggerFall();
    }

    // Fragmenti
    if (state.level.fragments.length > 0) {
      const px = state.player.x + state.player.w / 2;
      const py = state.player.y + state.player.h / 2;
      for (const f of state.level.fragments) {
        if (f.collected) continue;
        if (Math.hypot(px - f.x, py - f.y) < f.r + 14) {
          f.collected = true;
          state.fragmentsCollected++;
          updateFragmentsHud(state.fragmentsCollected, state.level.fragmentsRequired);
          sfxPortal();
          if (!state.reducedMotion) {
            spawnExplosion(f.x, f.y, "#ffb35c");
          }
          if (state.fragmentsCollected >= state.level.fragmentsRequired) {
            state.portalUnlocked = true;
            showGameToast("PORTAL OTVOREN!", 1800);
          }
        }
      }
    }

    // Portal
    const portal = state.level.portal;
    const ppx = state.player.x + state.player.w / 2;
    const ppy = state.player.y + state.player.h / 2;
    if (state.portalUnlocked &&
        portal && Math.hypot(ppx - portal.x, ppy - portal.y) < portal.r + 6) {
      triggerWin();
    }
  } else {
    state.player.spawnAnim -= dt;
    if (state.player.spawnAnim <= 0) {
      state.player.alive = true;
      state.player.spawnAnim = 0;
    }
  }

  updateParticles(dt);
  updateRespawnPortals(dt);

  if (state.camera) updateCamera(state.camera, state.player, state.level, dt);

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

  spawnExplosion(cx, cy, "#9b4dff");
  sfxFall();

  p.alive = false;
  p.spawnAnim = 0.7;
  state.fellOnce = true;

  const spawn = state.level.checkpoint || state.level.start;
  spawnRespawnPortal(spawn.x, spawn.y);
  sfxRespawn();

  p.x = spawn.x - p.w / 2;
  p.y = spawn.y - p.h / 2;
  p.vx = 0;
  p.vy = 0;
  p.gravityDir = 1;
  p.canJump = true;

  updateMusicDynamics("falling");
}

// ---------- POBEDA ----------
async function triggerWin() {
  if (!state.running) return;
  state.running = false;

  const p = state.player;
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#2ad1ff");
  spawnExplosion(p.x + p.w / 2, p.y + p.h / 2, "#ff3ec8");
  sfxPortal();
  sfxWin();
  updateMusicDynamics("win");

  const time = state.levelTime;
  const puls = Math.max(10, Math.round(100 - time * 2));

  // Izračunaj zvezdice
  const times = state.level.starTimes || { two: 30, three: 20 };
  let stars = 1;
  if (time <= times.two) stars = 2;
  if (time <= times.three && !state.fellOnce) stars = 3;

  if (state.onComplete) {
    state.onComplete({
      levelNumber: state.levelNumber,
      levelName: state.level.name,
      time,
      puls,
      stars
    });
  }

  setTimeout(() => {
    openWin({ time, puls, levelName: state.level.name, stars });
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

  drawParallaxStars(ctx, cam, W, H);

  // Fiksne platforme
  for (const p of state.level.platforms) {
    drawPlatform(ctx, p, cam);
  }

  // Rotirajuće platforme — sa transformacijom
  if (state.rotState && state.level.rotatingPlatforms) {
    const center = state.rotState.center;
    const angle = state.rotState.angle;
    for (const p of state.level.rotatingPlatforms) {
      ctx.save();
      ctx.translate(center.x - cam.x, center.y - cam.y);
      ctx.rotate(angle);
      ctx.translate(-(center.x - cam.x), -(center.y - cam.y));
      drawPlatform(ctx, { ...p, type: "rotating" }, cam);
      ctx.restore();
    }
  }

  // Checkpoint
  if (state.level.checkpoint) {
    drawCheckpoint(ctx, state.level.checkpoint, cam, state.time);
  }

  // Fragmenti
  for (const f of state.level.fragments) {
    if (!f.collected) drawFragment(ctx, f, cam, state.time);
  }

  // Portal
  if (state.level.portal && state.level.portal.r) {
    drawPortal(ctx, state.level.portal, cam, state.time, state.portalUnlocked);
  }

  // Respawn portali
  drawRespawnPortals(ctx, cam);

  // Čestice
  drawParticles(ctx, cam);

  // Igrač
  if (state.player && state.player.alive) {
    drawPlayer(ctx, state.player, cam, state.time);
  }

  // Flash pri promeni gravitacije
  if (state.gravityFlipFlash > 0) {
    ctx.save();
    ctx.globalAlpha = state.gravityFlipFlash * 1.2;
    ctx.fillStyle = "#2ad1ff";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function drawParallaxStars(ctx, cam, W, H) {
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
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "rgba(107, 44, 245, 0.35)");
    grad.addColorStop(0.3, "rgba(30, 12, 60, 0.95)");
    grad.addColorStop(1, "rgba(10, 4, 25, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

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
    const pulse = 1 + Math.sin(state.time * 2 + p.x * 0.01) * 0.05;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(155, 77, 255, ${0.55 * pulse})`);
    grad.addColorStop(0.5, `rgba(107, 44, 245, ${0.4 * pulse})`);
    grad.addColorStop(1, `rgba(60, 20, 140, ${0.5 * pulse})`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = `rgba(200, 150, 255, ${0.85 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#9b4dff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 1.5);
    ctx.lineTo(x + w - 2, y + 1.5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const inner = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    inner.addColorStop(0, "rgba(255,255,255,0.15)");
    inner.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
  }
}

function drawPortal(ctx, portal, cam, time, unlocked) {
  const cx = portal.x - cam.x;
  const cy = portal.y - cam.y;
  const r = portal.r;

  if (cx < -100 || cx > cam.w + 100) return;

  const pulse = 1 + Math.sin(time * 3) * 0.08;
  const rot = time * 1.5;

  const alpha = unlocked ? 1 : 0.35;

  ctx.save();
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.5);
  glow.addColorStop(0, "rgba(255,255,255,0.55)");
  glow.addColorStop(0.3, "rgba(155,77,255,0.5)");
  glow.addColorStop(0.7, "rgba(42,209,255,0.25)");
  glow.addColorStop(1, "rgba(42,209,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = unlocked ? "rgba(255, 255, 255, 0.85)" : "rgba(150, 150, 180, 0.6)";
  ctx.lineWidth = 2;
  ctx.shadowColor = unlocked ? "#9b4dff" : "#666";
  ctx.shadowBlur = 16;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, r * pulse * (0.9 + i * 0.15), i * (Math.PI * 2 / 3), i * (Math.PI * 2 / 3) + Math.PI * 0.6);
    ctx.stroke();
  }
  ctx.restore();

  const inner = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9);
  inner.addColorStop(0, "#ffffff");
  inner.addColorStop(0.5, unlocked ? "#c7a4ff" : "#666");
  inner.addColorStop(1, unlocked ? "#6b2cf5" : "#333");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85 * pulse, 0, Math.PI * 2);
  ctx.fill();

  if (unlocked) {
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawCheckpoint(ctx, cp, cam, time) {
  const cx = cp.x - cam.x;
  const cy = cp.y - cam.y;
  const pulse = 1 + Math.sin(time * 4) * 0.2;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse);
  glow.addColorStop(0, "rgba(42, 209, 255, 0.55)");
  glow.addColorStop(1, "rgba(42, 209, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(42, 209, 255, 0.9)";
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#2ad1ff";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawFragment(ctx, f, cam, time) {
  const cx = f.x - cam.x;
  const cy = f.y - cam.y + Math.sin(time * 2 + f.phase) * 4;
  const r = f.r;
  const pulse = 1 + Math.sin(time * 3 + f.phase) * 0.15;

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
  glow.addColorStop(0, "rgba(255, 179, 92, 0.7)");
  glow.addColorStop(1, "rgba(255, 179, 92, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time);
  ctx.fillStyle = "#ffb35c";
  ctx.shadowColor = "#ffb35c";
  ctx.shadowBlur = 16;
  // Dijamant
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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

export async function restartLevel() {
  const n = state.levelNumber;
  closePause();
  closeWin();
  await transitionTo(() => {
    startLevel(n);
  });
}

export async function nextLevel() {
  const n = state.levelNumber + 1;
  closeWin();
  if (n > 4) {
    exitGame();
    return;
  }
  await transitionTo(() => {
    startLevel(n);
  });
}

export function exitGame() {
  closePause();
  closeWin();
  stopGame();
  if (state.onExit) state.onExit();
}
