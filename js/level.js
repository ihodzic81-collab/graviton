// ============================================================
// GRAVITON — Učitavanje nivoa
// Podržava rotirajuće platforme, fragmente, checkpoint.
// ============================================================

import { getLevelRaw, TILE } from "./levels-data.js";

export { TILE };

export function loadLevel(n) {
  const raw = getLevelRaw(n);
  if (!raw) return null;

  const platforms = [];
  const start = { x: 0, y: 0 };
  const portal = { x: 0, y: 0 };
  const checkpoint = { x: 0, y: 0 };
  const fragments = [];
  let hasCheckpoint = false;
  let maxX = 0;
  let maxY = 0;

  // Parsiraj mapu (samo osnovni tile-ovi)
  for (let row = 0; row < raw.map.length; row++) {
    const line = raw.map[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const x = col * TILE;
      const y = row * TILE;
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      if (ch === "#") {
        platforms.push({ x, y, w: TILE, h: TILE, type: "ground" });
      } else if (ch === "P") {
        platforms.push({ x, y, w: TILE, h: TILE, type: "platform" });
      } else if (ch === "@") {
        start.x = x + TILE / 2;
        start.y = y + TILE / 2;
      } else if (ch === "O") {
        portal.x = x + TILE / 2;
        portal.y = y + TILE / 2;
        portal.r = 22;
      } else if (ch === "C") {
        checkpoint.x = x + TILE / 2;
        checkpoint.y = y + TILE / 2;
        hasCheckpoint = true;
      } else if (ch === "F") {
        fragments.push({
          x: x + TILE / 2,
          y: y + TILE / 2,
          r: 12,
          collected: false,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  // Dodaj fiksne platforme (Sloj A)
  if (raw.fixedPlatforms) {
    for (const p of raw.fixedPlatforms) {
      platforms.push({ ...p, type: "platform" });
      maxX = Math.max(maxX, p.x + p.w);
      maxY = Math.max(maxY, p.y + p.h);
    }
  }

  const width = maxX + TILE;
  const height = maxY + TILE;

  const merged = mergePlatforms(platforms);

  return {
    n: raw.n,
    name: raw.name,
    mechanic: raw.mechanic,
    showGravity: !!raw.showGravity,
    showRotate: !!raw.showRotate,
    fragmentsRequired: raw.fragmentsRequired || 0,
    starTimes: raw.starTimes || { two: 30, three: 20 },
    width,
    height,
    platforms: merged,
    start,
    portal,
    checkpoint: hasCheckpoint ? checkpoint : null,
    fragments,
    rotatingPlatforms: raw.rotatingPlatforms || [],
    rotationCenter: raw.rotationCenter || null,
    rotationStep: raw.rotationStep || Math.PI / 2,
    rotationDuration: raw.rotationDuration || 0.5
  };
}

function mergePlatforms(platforms) {
  const byTypeY = new Map();
  for (const p of platforms) {
    const key = `${p.type}_${p.y}`;
    if (!byTypeY.has(key)) byTypeY.set(key, []);
    byTypeY.get(key).push(p);
  }

  const merged = [];
  for (const group of byTypeY.values()) {
    group.sort((a, b) => a.x - b.x);
    let current = { ...group[0] };
    for (let i = 1; i < group.length; i++) {
      const p = group[i];
      if (current.x + current.w === p.x) {
        current.w += p.w;
      } else {
        merged.push(current);
        current = { ...p };
      }
    }
    merged.push(current);
  }
  return merged;
}
