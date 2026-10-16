// ============================================================
// GRAVITON — Igrač (kugla)
// ============================================================

import {
  applyGravity,
  applyHorizontalInput,
  resolveCollisions,
  jump,
  JUMP_VELOCITY
} from "./physics.js";
import { spawnTrail } from "./effects.js";

export function createPlayer(x, y) {
  const size = 22;
  return {
    x: x - size / 2,
    y: y - size / 2,
    w: size,
    h: size,
    vx: 0,
    vy: 0,
    gravityDir: 1,           // 1 = dole, -1 = gore
    canJump: true,
    coyoteTime: 0,           // milostivi period posle napuštanja platforme
    jumpBuffer: 0,           // buffered skok pre nego što sleti
    alive: true,
    spawnAnim: 0,            // 0 = normalno, >0 = respawn animacija
    trailHue: 275,           // ljubičasta
    onGround: false,
    hitCeiling: false,
    hitWall: false
  };
}

export function updatePlayer(player, input, level, dt) {
  if (!player.alive) return;

  // Respawn animacija — kugla se ne pomera
  if (player.spawnAnim > 0) {
    player.spawnAnim -= dt;
    player.vx = 0;
    player.vy = 0;
    return;
  }

  // Horizontalni input
  applyHorizontalInput(player, input.x, dt);

  // Gravitacija
  applyGravity(player, player.gravityDir, dt);

  // Skok — coyote time i jump buffer
  if (player.onGround) player.coyoteTime = 0.12;
  else player.coyoteTime = Math.max(0, player.coyoteTime - dt);

  if (input.jump) player.jumpBuffer = 0.12;
  else player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);

  if (player.jumpBuffer > 0 && (player.onGround || player.coyoteTime > 0) && player.canJump) {
    player.vy = JUMP_VELOCITY * player.gravityDir;
    player.jumpBuffer = 0;
    player.coyoteTime = 0;
    player.canJump = false;
    player.onGround = false;
  }

  // Sudari
  const collisions = resolveCollisions(player, level.platforms, dt);
  player.onGround = collisions.onGround;
  player.hitCeiling = collisions.hitCeiling;
  player.hitWall = collisions.hitLeft || collisions.hitRight;

  if (player.onGround) player.canJump = true;
  if (player.hitCeiling) player.canJump = true;

  // Trag
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > 60) {
    spawnTrail(player.x + player.w / 2, player.y + player.h / 2, player.trailHue);
  }
}

export function flipGravity(player) {
  player.gravityDir *= -1;
  player.vy = 0;
  player.canJump = true;
}

export function respawnPlayer(player, spawnPoint) {
  player.x = spawnPoint.x - player.w / 2;
  player.y = spawnPoint.y - player.h / 2;
  player.vx = 0;
  player.vy = 0;
  player.alive = true;
  player.spawnAnim = 0.3;
  player.canJump = true;
  player.gravityDir = 1;
}

export function drawPlayer(ctx, player, camera, time) {
  const cx = player.x + player.w / 2 - camera.x;
  const cy = player.y + player.h / 2 - camera.y;
  const r = player.w / 2;

  // Respawn animacija — kugla izlazi iz portala
  let scale = 1;
  let alpha = 1;
  if (player.spawnAnim > 0) {
    const k = 1 - player.spawnAnim / 0.3;
    scale = 0.3 + k * 0.7;
    alpha = 0.4 + k * 0.6;
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // Spoljni sjaj
  const glow = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 3);
  glow.addColorStop(0, `hsla(${player.trailHue}, 100%, 75%, 0.5)`);
  glow.addColorStop(1, `hsla(${player.trailHue}, 100%, 75%, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Telo kugle
  const body = ctx.createRadialGradient(
    cx - r * 0.3, cy - r * 0.3, r * 0.1,
    cx, cy, r
  );
  body.addColorStop(0, "#ffffff");
  body.addColorStop(0.5, "#c7a4ff");
  body.addColorStop(1, "#6b2cf5");
  ctx.fillStyle = body;
  ctx.shadowColor = `hsl(${player.trailHue}, 100%, 70%)`;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
  ctx.fill();

  // Unutrašnji odsjaj
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.25 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Pulsirajući prsten (suptilan)
  const pulse = 1 + Math.sin(time * 3) * 0.06;
  ctx.strokeStyle = `hsla(${player.trailHue}, 100%, 85%, 0.4)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.6 * pulse * scale, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
