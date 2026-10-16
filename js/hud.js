// ============================================================
// GRAVITON — HUD
// Prikaz broja nivoa, imena, pauza.
// ============================================================

export function setHudLevel(n, name) {
  const numEl = document.getElementById("hud-level-num");
  const nameEl = document.getElementById("hud-level-name");
  if (numEl) numEl.textContent = `NIVO ${n}`;
  if (nameEl) nameEl.textContent = name;
}

export function showGameToast(text, ms = 1500) {
  const el = document.getElementById("game-toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("is-show");
  clearTimeout(showGameToast._t);
  showGameToast._t = setTimeout(() => el.classList.remove("is-show"), ms);
}

// ---------- PAUZA ----------
export function openPause() {
  const el = document.getElementById("pause-overlay");
  if (el) el.classList.add("is-active");
}

export function closePause() {
  const el = document.getElementById("pause-overlay");
  if (el) el.classList.remove("is-active");
}

// ---------- POBEDA ----------
export function openWin(stats) {
  const el = document.getElementById("win-overlay");
  if (!el) return;
  const timeEl = document.getElementById("win-time");
  const pulsEl = document.getElementById("win-puls");
  const subEl = document.getElementById("win-subtitle");
  if (timeEl) timeEl.textContent = `${stats.time.toFixed(1)}s`;
  if (pulsEl) pulsEl.textContent = `+${stats.puls}`;
  if (subEl) subEl.textContent = stats.levelName || "";
  el.classList.add("is-active");
}

export function closeWin() {
  const el = document.getElementById("win-overlay");
  if (el) el.classList.remove("is-active");
}
