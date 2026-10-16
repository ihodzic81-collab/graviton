// ============================================================
// GRAVITON — Tranzicije između nivoa
// Fade-out, fade-in, zoom, itd.
// ============================================================

let overlayEl = null;

function ensureOverlay() {
  if (overlayEl) return overlayEl;
  overlayEl = document.createElement("div");
  overlayEl.id = "transition-overlay";
  overlayEl.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 200;
    background: #05020c;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(overlayEl);
  return overlayEl;
}

export function fadeOut(duration = 300) {
  return new Promise(resolve => {
    const el = ensureOverlay();
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = "1";
    setTimeout(resolve, duration);
  });
}

export function fadeIn(duration = 300) {
  return new Promise(resolve => {
    const el = ensureOverlay();
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = "0";
    setTimeout(resolve, duration);
  });
}

// Sekvenca: fade out → pozovi callback → fade in
export async function transitionTo(callback, options = {}) {
  const outMs = options.outMs ?? 300;
  const inMs = options.inMs ?? 300;
  const waitMs = options.waitMs ?? 300;

  await fadeOut(outMs);
  if (callback) callback();
  await new Promise(r => setTimeout(r, waitMs));
  await fadeIn(inMs);
}
