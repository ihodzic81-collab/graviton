// Upravljanje profilom igrača.

import { loadState, saveState } from "./storage.js";

let state = loadState();

export function getState() { return state; }

export function setNickname(name) {
  const clean = String(name || "").trim().slice(0, 16) || "Igrač";
  state.profile.nickname = clean;
  saveState(state);
  return clean;
}

export function addPuls(amount) {
  const n = Number(amount) || 0;
  if (n <= 0) return state.wallet.puls;
  state.wallet.puls += n;
  saveState(state);
  return state.wallet.puls;
}

export function markLevelCompleted(levelNumber, score) {
  const n = Number(levelNumber);
  if (!Number.isFinite(n) || n < 1) return;
  if (!state.progress.completedLevels.includes(n)) {
    state.progress.completedLevels.push(n);
  }
  state.progress.bestScores[String(n)] = score || state.progress.bestScores[String(n)] || {};
  if (state.progress.unlockedLevels < n + 1) {
    state.progress.unlockedLevels = n + 1;
  }
  saveState(state);
}

export function reload() { state = loadState(); }
export { state };
