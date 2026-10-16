// Menja ekrane i sinhronizuje donju navigaciju.

const screens = document.querySelectorAll(".screen");
const navButtons = document.querySelectorAll(".nav-btn");

let current = "home";

export function showScreen(name) {
  if (!name) return;
  let target = name;
  const allowed = ["home", "levels", "daily", "collection", "profile", "settings"];
  if (!allowed.includes(name)) target = "home";

  screens.forEach(s => {
    s.classList.toggle("is-active", s.dataset.screen === target);
  });

  navButtons.forEach(b => {
    b.classList.toggle("is-active", b.dataset.nav === target);
  });

  current = target;
  window.scrollTo(0, 0);
  document.dispatchEvent(new CustomEvent("screenchange", { detail: { screen: target } }));
}

export function getCurrentScreen() { return current; }

export function initNavigation() {
  document.body.addEventListener("click", (e) => {
    const el = e.target.closest("[data-nav]");
    if (!el) return;
    const target = el.dataset.nav;
    if (!target) return;
    e.preventDefault();
    showScreen(target);
  });

  window.addEventListener("popstate", () => {
    if (current !== "home") showScreen("home");
  });
}
