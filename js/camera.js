// ============================================================
// GRAVITON — Kamera
// Glatko prati igrača sa blagim "lead" efektom.
// ============================================================

export function createCamera(viewportW, viewportH) {
  return {
    x: 0,
    y: 0,
    w: viewportW,
    h: viewportH,
    targetX: 0,
    targetY: 0,
    smoothing: 6 // veće = brže praćenje
  };
}

export function updateCamera(camera, player, level, dt) {
  const playerCx = player.x + player.w / 2;
  const playerCy = player.y + player.h / 2;

  // Lead — gleda malo napred u smeru kretanja
  const leadX = player.vx * 0.35;
  const leadY = player.vy * 0.15;

  // Ciljna pozicija: igrač u centru, ali sa ograničenjem (clamp na ivice nivoa)
  let tx = playerCx + leadX - camera.w / 2;
  let ty = playerCy + leadY - camera.h / 2;

  // Ograniči kameru unutar nivoa
  tx = Math.max(0, Math.min(level.width - camera.w, tx));
  ty = Math.max(0, Math.min(level.height - camera.h, ty));

  camera.targetX = tx;
  camera.targetY = ty;

  // Glatko interpoliranje
  const k = 1 - Math.pow(0.001, dt * camera.smoothing / 10);
  camera.x += (camera.targetX - camera.x) * k;
  camera.y += (camera.targetY - camera.y) * k;
}

export function resizeCamera(camera, w, h) {
  camera.w = w;
  camera.h = h;
}
