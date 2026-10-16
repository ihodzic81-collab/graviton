// ============================================================
// GRAVITON — HUD
// Prikaz nivoa, pauza, pobeda sa zvezdicama, rotacija.
// ============================================================

let rotationBtn = null;

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

// Konfiguriše vidljivost dugmadi (SKOK, GRAV, ROTACIJA)
export function configureButtons(level) {
  const gravBtn = document.getElementById("btn-gravity");
  const jumpBtn = document.getElementById("btn-jump");

  // Rotacija dugme — dinamički dodajemo ako ne postoji
  let rotBtn = document.getElementById("btn-rotate");

  if (!rotBtn && jumpBtn && jumpBtn.parentElement) {
    rotBtn = document.createElement("button");
    rotBtn.id = "btn-rotate";
    rotBtn.className = "action-btn btn-rotate";
    rotBtn.setAttribute("aria-label", "Rotacija");
    rotBtn.innerHTML = '<span class="btn-label">ROT</span>';
    jumpBtn.parentElement.insertBefore(rotBtn, gravBtn);
  }

  if (gravBtn) {
    gravBtn.style.display = level.showGravity ? "grid" : "none";
  }
  if (rotBtn) {
    rotBtn.style.display = level.showRotate ? "grid" : "none";
  }
}

// Fragments prikaz u HUD-u
export function updateFragmentsHud(collected, required) {
  let fragEl = document.getElementById("hud-fragments");
  if (!fragEl) {
    fragEl = document.createElement("div");
    fragEl.id = "hud-fragments";
    fragEl.className = "hud-fragments";
    const hudLeft = document.querySelector(".hud-left");
    if (hudLeft) hudLeft.appendChild(fragEl);
  }
  if (required > 0) {
    fragEl.style.display = "block";
    fragEl.textContent = `◆ ${collected} / ${required}`;
  } else {
    fragEl.style.display = "none";
  }
}

// ---------- PAUZA ----------
export function openPause() {
  document.getElementById("pause-overlay")?.classList.add("is-active");
}
export function closePause() {
  document.getElementById("pause-overlay")?.classList.remove("is-active");
}

// ---------- POBEDA ----------
export function openWin(stats) {
  const el = document.getElementById("win-overlay");
  if (!el) return;

  // Ispuni vrednosti
  const timeEl = document.getElementById("win-time");
  const pulsEl = document.getElementById("win-puls");
  const subEl = document.getElementById("win-subtitle");
  if (timeEl) timeEl.textContent = `${stats.time.toFixed(1)}s`;
  if (pulsEl) pulsEl.textContent = `+${stats.puls}`;
  if (subEl) subEl.textContent = stats.levelName || "";

  // Zvezdice — animirano
  const starsContainer = document.getElementById("win-stars");
  if (starsContainer) {
    starsContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const star = document.createElement("span");
      star.className = "win-star";
      star.textContent = "★";
      star.style.opacity = "0.15";
      star.style.transform = "scale(0.6)";
      starsContainer.appendChild(star);
    }
    // Animiraj zvezdice jednu po jednu
    const earned = stats.stars || 0;
    for (let i = 0; i < earned; i++) {
      setTimeout(() => {
        const star = starsContainer.children[i];
        if (star) {
          star.style.opacity = "1";
          star.style.transform = "scale(1)";
          star.classList.add("earned");
        }
      }, 200 + i * 350);
    }
  }

  el.classList.add("is-active");
}

export function closeWin() {
  document.getElementById("win-overlay")?.classList.remove("is-active");
}
