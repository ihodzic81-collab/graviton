// ============================================================
// GRAVITON — Fizika
// Podržava i rotirane platforme (AABB aproksimacija).
// ============================================================

export const GRAVITY = 1800;
export const MAX_FALL = 1400;
export const MOVE_ACCEL = 2400;
export const MOVE_MAX = 320;
export const FRICTION = 0.86;
export const JUMP_VELOCITY = -720;

function overlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw &&
         ax + aw > bx &&
         ay < by + bh &&
         ay + ah > by;
}

export function resolveCollisions(player, platforms, dt) {
  const result = { onGround: false, hitCeiling: false, hitLeft: false, hitRight: false };

  // Pomeramo igrača po X
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (overlap(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
      if (player.vx > 0) {
        player.x = p.x - player.w;
        result.hitRight = true;
      } else if (player.vx < 0) {
        player.x = p.x + p.w;
        result.hitLeft = true;
      }
      player.vx = 0;
    }
  }

  // Pomeramo igrača po Y
  player.y += player.vy * dt;
  for (const p of platforms) {
    if (overlap(player.x, player.y, player.w, player.h, p.x, p.y, p.w, p.h)) {
      if (player.vy > 0) {
        player.y = p.y - player.h;
        player.vy = 0;
        result.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.h;
        player.vy = 0;
        result.hitCeiling = true;
      }
    }
  }

  return result;
}

export function applyGravity(player, gravityDir, dt) {
  player.vy += GRAVITY * gravityDir * dt;
  if (gravityDir > 0) {
    player.vy = Math.min(player.vy, MAX_FALL);
  } else {
    player.vy = Math.max(player.vy, -MAX_FALL);
  }
}

export function applyHorizontalInput(player, inputX, dt) {
  if (Math.abs(inputX) > 0.15) {
    player.vx += inputX * MOVE_ACCEL * dt;
    player.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, player.vx));
  } else {
    player.vx *= Math.pow(FRICTION, dt * 60);
    if (Math.abs(player.vx) < 5) player.vx = 0;
  }
}

export function jump(player, gravityDir) {
  if (!player.canJump) return false;
  player.vy = JUMP_VELOCITY * gravityDir;
  player.canJump = false;
  return true;
}
