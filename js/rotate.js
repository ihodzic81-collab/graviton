// ============================================================
// GRAVITON — Rotacija prostora
// Rotira grupu platformi oko centra sa glatkom animacijom.
// ============================================================

export function createRotationState(level) {
  if (!level.rotatingPlatforms || level.rotatingPlatforms.length === 0) {
    return null;
  }
  return {
    active: false,
    angle: 0,                 // trenutni ugao rotacije
    startAngle: 0,
    targetAngle: 0,
    duration: level.rotationDuration || 0.5,
    elapsed: 0,
    center: level.rotationCenter,
    step: level.rotationStep || Math.PI / 2
  };
}

// Pokreće novu rotaciju za 90°
export function startRotation(rotState) {
  if (!rotState || rotState.active) return false;
  rotState.active = true;
  rotState.startAngle = rotState.angle;
  rotState.targetAngle = rotState.angle + rotState.step;
  rotState.elapsed = 0;
  return true;
}

// Ažurira rotaciju — poziva se u tick
export function updateRotation(rotState, dt) {
  if (!rotState || !rotState.active) return;
  rotState.elapsed += dt;
  const k = Math.min(1, rotState.elapsed / rotState.duration);
  // Ease in-out
  const eased = k < 0.5
    ? 2 * k * k
    : 1 - Math.pow(-2 * k + 2, 2) / 2;
  rotState.angle = rotState.startAngle + (rotState.targetAngle - rotState.startAngle) * eased;
  if (k >= 1) {
    rotState.active = false;
    rotState.angle = rotState.targetAngle;
  }
}

// Vraća rotiranu poziciju tačke oko centra
export function rotatePoint(px, py, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

// Vraća AABB rotirane platforme — aproksimacija bounding box-om
export function getRotatedAABB(platform, center, angle) {
  // Uzimamo 4 ćoška platforme i rotiramo ih
  const corners = [
    { x: platform.x, y: platform.y },
    { x: platform.x + platform.w, y: platform.y },
    { x: platform.x + platform.w, y: platform.y + platform.h },
    { x: platform.x, y: platform.y + platform.h }
  ].map(p => rotatePoint(p.x, p.y, center.x, center.y, angle));

  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    // Originalna platforma i ugao za crtanje
    original: platform,
    angle
  };
}

// Vraća sve rotirane platforme kao AABB (za sudare i crtanje)
export function getRotatedPlatforms(level, rotState) {
  if (!rotState || !level.rotatingPlatforms) return [];
  const center = rotState.center;
  const angle = rotState.angle;
  return level.rotatingPlatforms.map(p => ({
    ...getRotatedAABB(p, center, angle),
    type: "platform"
  }));
}
