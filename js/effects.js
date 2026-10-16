// ============================================================
// GRAVITON — Efekti
// Čestice, trag kugle, eksplozija, respawn portal.
// ============================================================

export const particles = [];
export const respawnPortals = [];

let reducedMotion = false;
export function setReducedMotion(v) { reducedMotion = v; }

// ---------- ČESTICE ----------
export function spawnParticle(x, y, opts = {}) {
  if (reducedMotion) return;
  particles.push({
    x, y,
    vx: opts.vx ?? (Math.random() - 0.5) * 80,
    vy: opts.vy ?? (Math.random() - 0.5) * 80,
    life: opts.life ?? 0.6,
    maxLife: opts.life ?? 0.6,
    size: opts.size ?? 3,
    color: opts.color ?? "#9b4dff",
    glow: opts.glow ?? 12
  });
}

export function spawnTrail(x, y, hue) {
  if (reducedMotion) return;
  if (Math.random() > 0.4) return; // ne svaki frame
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 30,
    vy: (Math.random() - 0.5) * 30 - 20,
    life: 0.5,
    maxLife: 0.5,
    size: 2 + Math.random() * 2,
    color: `hsl(${hue}, 100%, 75%)`,
    glow: 10
  });
}

export function spawnExplosion(x, y, color = "#9b4dff") {
  const count = reducedMotion ? 6 : 26;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 120 + Math.random() * 220;
    spawnParticle(x, y, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      color,
      glow: 16
    });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;   // blaga gravitacija na čestice
    p.vx *= 0.98;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx, camera) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.glow;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- RESPAWN PORTAL ----------
// Igra se u dve faze:
//   1. "open"  — portal se otvara (0.4s)
//   2. "eject" — kugla izlazi iz portala (0.3s)
export function spawnRespawnPortal(x, y) {
  respawnPortals.push({
    x, y,
    t: 0,
    phase: "open",
    openDuration: 0.4,
    ejectDuration: 0.3,
    ringRadius: 0,
    maxRadius: 26
  });
}

export function updateRespawnPortals(dt) {
  for (let i = respawnPortals.length - 1; i >= 0; i--) {
    const rp = respawnPortals[i];
    rp.t += dt;
    if (rp.phase === "open") {
      const k = Math.min(1, rp.t / rp.openDuration);
      rp.ringRadius = rp.maxRadius * easeOutCubic(k);
      if (k >= 1) {
        rp.phase = "eject";
        rp.t = 0;
      }
    } else if (rp.phase === "eject") {
      const k = Math.min(1, rp.t / rp.ejectDuration);
      rp.ringRadius = rp.maxRadius * (1 + k * 0.6);
      if (k >= 1) {
        respawnPortals.splice(i, 1);
      }
    }
  }
}

export function drawRespawnPortals(ctx, camera) {
  for (const rp of respawnPortals) {
    const sx = rp.x - camera.x;
    const sy = rp.y - camera.y;

    ctx.save();
    // Spoljni prsten
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, rp.ringRadius * 1.5);
    glow.addColorStop(0, "rgba(255,255,255,0.9)");
    glow.addColorStop(0.4, "rgba(155,77,255,0.7)");
    glow.addColorStop(1, "rgba(155,77,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx, sy, rp.ringRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Prsten
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#9b4dff";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(sx, sy, rp.ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Unutrašnji sjaj
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(sx, sy, rp.ringRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

export function clearEffects() {
  particles.length = 0;
  respawnPortals.length = 0;
}
