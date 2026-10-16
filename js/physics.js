// ============================================================
// GRAVITON — Fizika
// Gravitacija, sudari, kretanje.
// ============================================================

export const GRAVITY = 1800;      // px/s² — koliko brzo kugla pada
export const MAX_FALL = 1400;      // px/s — maksimalna brzina pada
export const MOVE_ACCEL = 2400;    // px/s² — ubrzanje kretanja
export const MOVE_MAX = 320;       // px/s — maksimalna brzina kretanja
export const FRICTION = 0.86;      // trenje (0–1) — koliko brzo se zaustavlja
export const JUMP_VELOCITY = -720; // px/s — početna brzina skoka

// AABB sudar (axis-aligned bounding box)
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// Rešavanje sudara igrača sa platformama.
// Vraća { onGround, hitCeiling, hitLeft, hitRight }
export function resolveCollisions(player, platforms, dt) {
  const result = { onGround: false, hitCeiling: false, hitLeft: false, hitRight: false };

  // Pomeramo igrača po X, pa po Y (odvojeno) — standardna tehnika
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (rectsOverlap(player.aabb, p)) {
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

  player.y += player.vy * dt;
  for (const p of platforms) {
    if (rectsOverlap(player.aabb, p)) {
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

// Ažuriranje brzine kroz gravitaciju
export function applyGravity(player, gravityDir, dt) {
  player.vy += GRAVITY * gravityDir * dt;
  if (gravityDir > 0) {
    player.vy = Math.min(player.vy, MAX_FALL);
  } else {
    player.vy = Math.max(player.vy, -MAX_FALL);
  }
}

// Ažuriranje horizontalne brzine iz inputa
export function applyHorizontalInput(player, inputX, dt) {
  if (Math.abs(inputX) > 0.15) {
    player.vx += inputX * MOVE_ACCEL * dt;
    player.vx = Math.max(-MOVE_MAX, Math.min(MOVE_MAX, player.vx));
  } else {
    // Trenje
    player.vx *= Math.pow(FRICTION, dt * 60);
    if (Math.abs(player.vx) < 5) player.vx = 0;
  }
}

// Skok (ili skok u suprotnom smeru gravitacije)
export function jump(player, gravityDir) {
  if (!player.canJump) return false;
  player.vy = JUMP_VELOCITY * gravityDir;
  player.canJump = false;
  return true;
}
