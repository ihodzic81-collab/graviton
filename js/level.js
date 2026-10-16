// ============================================================
// GRAVITON — Definicija nivoa
// Mapa se piše kao tekst. Svaki znak je jedna ćelija.
//
//   .  = prazno
//   #  = čvrsto tlo
//   P  = platforma (lebdeća)
//   @  = start kugle
//   O  = portal (cilj)
//   C  = kontrolna tačka (checkpoint)
// ============================================================

export const TILE = 40; // veličina jedne ćelije u px

const LEVEL_1 = {
  n: 1,
  name: "KOSMIČKA PADINA",
  map: [
    "................................................................",
    "................................................................",
    "................................................................",
    "................................................................",
    "..........................PPPP..................................",
    "................................................................",
    "...............PPPP......................PPPP...................",
    "................................................................",
    "......PPPP........................................PPPP..........",
    "................................................................",
    "..@...........C.................................O...............",
    "################################################################",
    "################################################################",
  ]
};

export const LEVELS = [LEVEL_1];

export function loadLevel(n) {
  const raw = LEVELS.find(l => l.n === n);
  if (!raw) return null;

  const platforms = [];
  const start = { x: 0, y: 0 };
  const portal = { x: 0, y: 0 };
  const checkpoint = { x: 0, y: 0 };
  let hasCheckpoint = false;
  let maxX = 0;

  for (let row = 0; row < raw.map.length; row++) {
    const line = raw.map[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      const x = col * TILE;
      const y = row * TILE;
      maxX = Math.max(maxX, x);

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
      }
    }
  }

  const width = maxX + TILE;
  const height = raw.map.length * TILE;

  // Spajamo susedne platforme istog tipa u šire blokove (optimizacija crtanja i sudara)
  const merged = mergePlatforms(platforms);

  return {
    n: raw.n,
    name: raw.name,
    width,
    height,
    platforms: merged,
    start,
    portal,
    checkpoint: hasCheckpoint ? checkpoint : null
  };
}

function mergePlatforms(platforms) {
  // Grupisanje po tipu i po y koordinati, pa spajanje horizontalno
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
