// Ulazna tačka igre.
// Povezuje navigaciju, pozadinu, profil, podešavanja i prikaz podataka.

import { initNavigation, showScreen } from "./navigation.js";
import { initBackground } from "./background.js";
import { getState, setNickname } from "./profile.js";
import { applyReducedMotion, getSettings, setSetting } from "./settings.js";
import { CHAPTERS, getTotalLevels } from "./levels.js";
import { resetState } from "./storage.js";

function toast(msg, ms = 1800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("is-show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-show"), ms);
}

function refreshHeader() {
  const state = getState();
  const pulsEl = document.getElementById("puls-value");
  if (pulsEl) pulsEl.textContent = state.wallet.puls;
}

function refreshHome() {
  const state = getState();
  const label = document.getElementById("btn-play-label");
  const btn = document.getElementById("btn-play");
  if (!label || !btn) return;

  const completed = state.progress.completedLevels.length;
  const total = getTotalLevels();

  if (completed === 0) {
    label.textContent = "ZAPOČNI IGRU";
  } else if (completed >= total) {
    label.textContent = "PONOVI AVANTURU";
  } else {
    label.textContent = "NASTAVI AVANTURU";
  }
}

function refreshLevels() {
  const grid = document.getElementById("levels-grid");
  if (!grid) return;
  const state = getState();
  const unlocked = state.progress.unlockedLevels;
  const completed = state.progress.completedLevels;

  grid.innerHTML = "";
  for (const ch of CHAPTERS) {
    for (const lvl of ch.levels) {
      const card = document.createElement("button");
      card.className = "level-card";
      if (lvl.n > unlocked) card.classList.add("is-locked");
      if (completed.includes(lvl.n)) card.classList.add("is-done");

      const num = document.createElement("div");
      num.className = "level-num";
      num.textContent = lvl.n;

      const name = document.createElement("div");
      name.className = "level-name";
      name.textContent = lvl.name;

      const status = document.createElement("div");
      status.className = "level-status";
      status.textContent = completed.includes(lvl.n)
        ? "✓"
        : (lvl.n > unlocked ? "🔒" : "▶");

      card.append(num, name, status);
      card.addEventListener("click", () => {
        if (lvl.n > unlocked) {
          toast("Nivo je još zaključan.");
          return;
        }
        toast("Igra počinje u Fazi 2. Za sada je dostupan samo temelj.");
      });

      grid.appendChild(card);
    }
  }
}

function refreshProfile() {
  const state = getState();
  const nick = document.getElementById("nickname");
  if (nick && document.activeElement !== nick) {
    nick.value = state.profile.nickname;
  }
  const s1 = document.getElementById("stat-levels");
  const s2 = document.getElementById("stat-puls");
  const s3 = document.getElementById("stat-badges");
  if (s1) s1.textContent = state.progress.completedLevels.length;
  if (s2) s2.textContent = state.wallet.puls;
  if (s3) s3.textContent = state.achievements.unlocked.length;
}

function refreshSettings() {
  const s = getSettings();
  const m = document.getElementById("opt-music");
  const sfx = document.getElementById("opt-sfx");
  const rm = document.getElementById("opt-reduced");
  const lang = document.getElementById("opt-lang");
  if (m) m.checked = s.music;
  if (sfx) sfx.checked = s.sfx;
  if (rm) rm.checked = s.reducedMotion;
  if (lang) lang.value = s.lang;
}

function bindEvents() {
  document.getElementById("btn-play")?.addEventListener("click", () => {
    const state = getState();
    if (state.progress.completedLevels.length === 0) {
      toast("Dobrodošao! Prvi nivo stiže u Fazi 2.");
    } else {
      toast("Nastavljaš avanturu. Nivoi stižu u Fazi 2.");
    }
  });

  document.getElementById("btn-profile")?.addEventListener("click", () => showScreen("profile"));
  document.getElementById("btn-settings")?.addEventListener("click", () => showScreen("settings"));

  const nick = document.getElementById("nickname");
  if (nick) {
    nick.addEventListener("change", () => {
      const v = setNickname(nick.value);
      nick.value = v;
      toast("Nadimak sačuvan.");
    });
  }

  document.getElementById("opt-music")?.addEventListener("change", e => setSetting("music", e.target.checked));
  document.getElementById("opt-sfx")?.addEventListener("change", e => setSetting("sfx", e.target.checked));
  document.getElementById("opt-reduced")?.addEventListener("change", e => setSetting("reducedMotion", e.target.checked));
  document.getElementById("opt-lang")?.addEventListener("change", e => setSetting("lang", e.target.value));

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    if (confirm("Obrisati sav napredak? Ova radnja se ne može poništiti.")) {
      resetState();
      location.reload();
    }
  });

  document.addEventListener("screenchange", () => {
    refreshHeader();
    refreshHome();
    refreshLevels();
    refreshProfile();
    refreshSettings();
  });
}

function boot() {
  applyReducedMotion();
  initNavigation();
  initBackground();
  bindEvents();
  refreshHeader();
  refreshHome();
  refreshLevels();
  refreshProfile();
  refreshSettings();
  showScreen("home");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
