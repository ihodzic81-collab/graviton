// Čita i čuva podešavanja igrača.

import { loadState, saveState } from "./storage.js";

const state = loadState();
const listeners = new Set();

export function getSettings() { return { ...state.settings }; }

export function setSetting(key, value) {
  if (!(key in state.settings)) return;
  state.settings[key] = value;
  saveState(state);
  applyReducedMotion();
  listeners.forEach(fn => fn(getSettings()));
}

export function onSettingsChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applyReducedMotion() {
  const reduced = state.settings.reducedMotion ||
    (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.body.classList.toggle("reduced-motion", !!reduced);
}
