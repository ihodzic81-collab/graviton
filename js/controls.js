// ============================================================
// GRAVITON — Kontrole
// Joystick (dodir) + dugmad (dodir) + tastatura (testiranje).
// ============================================================

export const input = {
  x: 0,           // -1 do 1
  jump: false,    // pritisnuto ovaj frame
  jumpHeld: false,
  gravity: false, // pritisnuto ovaj frame
  rotate: false   // pritisnuto ovaj frame (samo Nivo 3 i 4)
};

let jumpPressedThisFrame = false;
let gravityPressedThisFrame = false;
let rotatePressedThisFrame = false;

// ---------- JOYSTICK ----------
let joystickEl = null;
let knobEl = null;
let joystickActive = false;
let joystickTouchId = null;
let joystickCenter = { x: 0, y: 0 };
const JOYSTICK_MAX_DIST = 50; // px — koliko daleko knob može

export function initControls() {
  joystickEl = document.getElementById("joystick");
  knobEl = document.getElementById("joystick-knob");

  // Joystick — touch
  if (joystickEl) {
    joystickEl.addEventListener("touchstart", onJoystickStart, { passive: false });
    joystickEl.addEventListener("touchmove", onJoystickMove, { passive: false });
    joystickEl.addEventListener("touchend", onJoystickEnd, { passive: false });
    joystickEl.addEventListener("touchcancel", onJoystickEnd, { passive: false });

    // Miš (za testiranje na računaru)
    joystickEl.addEventListener("mousedown", onJoystickStart);
    window.addEventListener("mousemove", onJoystickMove);
    window.addEventListener("mouseup", onJoystickEnd);
  }

  // Dugme SKOK
  const btnJump = document.getElementById("btn-jump");
  if (btnJump) {
    btnJump.addEventListener("touchstart", (e) => { e.preventDefault(); onJumpDown(); }, { passive: false });
    btnJump.addEventListener("touchend", (e) => { e.preventDefault(); onJumpUp(); }, { passive: false });
    btnJump.addEventListener("mousedown", onJumpDown);
    btnJump.addEventListener("mouseup", onJumpUp);
  }

  // Dugme GRAVITACIJA
  const btnGravity = document.getElementById("btn-gravity");
  if (btnGravity) {
    btnGravity.addEventListener("touchstart", (e) => { e.preventDefault(); onGravityDown(); }, { passive: false });
    btnGravity.addEventListener("touchend", (e) => { e.preventDefault(); }, { passive: false });
    btnGravity.addEventListener("mousedown", onGravityDown);
  }

  // Dugme ROTACIJA (dinamički — postoji samo u Nivou 3 i 4)
  // Koristimo delegaciju na document jer se dugme može pojaviti kasnije
  document.addEventListener("touchstart", (e) => {
    if (e.target.closest("#btn-rotate")) {
      e.preventDefault();
      onRotateDown();
    }
  }, { passive: false });

  document.addEventListener("mousedown", (e) => {
    if (e.target.closest("#btn-rotate")) {
      onRotateDown();
    }
  });

  // Tastatura (testiranje)
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

function onJoystickStart(e) {
  e.preventDefault();
  const rect = joystickEl.getBoundingClientRect();
  joystickCenter.x = rect.left + rect.width / 2;
  joystickCenter.y = rect.top + rect.height / 2;
  joystickActive = true;

  if (e.touches) {
    joystickTouchId = e.touches[0].identifier;
  }
  updateJoystick(e);
}

function onJoystickMove(e) {
  if (!joystickActive) return;
  e.preventDefault();
  updateJoystick(e);
}

function onJoystickEnd(e) {
  if (!joystickActive) return;
  if (e.changedTouches && joystickTouchId !== null) {
    const found = Array.from(e.changedTouches).some(t => t.identifier === joystickTouchId);
    if (!found) return;
  }
  joystickActive = false;
  joystickTouchId = null;
  input.x = 0;
  if (knobEl) knobEl.style.transform = `translate(0px, 0px)`;
}

function updateJoystick(e) {
  let clientX, clientY;
  if (e.touches && e.touches.length) {
    const t = joystickTouchId !== null
      ? Array.from(e.touches).find(x => x.identifier === joystickTouchId) || e.touches[0]
      : e.touches[0];
    clientX = t.clientX;
    clientY = t.clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  let dx = clientX - joystickCenter.x;
  const maxDist = JOYSTICK_MAX_DIST;
  const dist = Math.hypot(dx, 0);
  if (dist > maxDist) dx = (dx / dist) * maxDist;

  if (knobEl) {
    knobEl.style.transform = `translate(${dx}px, 0px)`;
  }

  // Normalizovana vrednost -1 do 1
  input.x = dx / maxDist;
}

// ---------- SKOK ----------
function onJumpDown() {
  input.jumpHeld = true;
  jumpPressedThisFrame = true;
}
function onJumpUp() {
  input.jumpHeld = false;
}

// ---------- GRAVITACIJA ----------
function onGravityDown() {
  gravityPressedThisFrame = true;
}

// ---------- ROTACIJA ----------
function onRotateDown() {
  rotatePressedThisFrame = true;
}

// ---------- TASTATURA ----------
const keys = {};

function onKeyDown(e) {
  if (e.repeat) return;
  keys[e.key] = true;

  if (e.key === " " || e.key === "ArrowUp") {
    onJumpDown();
  }
  if (e.key === "g" || e.key === "G" || e.key === "ArrowDown") {
    onGravityDown();
  }
  if (e.key === "r" || e.key === "R") {
    onRotateDown();
  }
}

function onKeyUp(e) {
  keys[e.key] = false;

  if (e.key === " " || e.key === "ArrowUp") {
    onJumpUp();
  }
}

// ---------- AŽURIRANJE INPUTA (poziva se iz game.js pre update) ----------
export function updateControls() {
  // Ako je tastatura aktivna, koristi strelice za X
  if (keys["ArrowLeft"] || keys["a"] || keys["A"]) input.x = -1;
  else if (keys["ArrowRight"] || keys["d"] || keys["D"]) input.x = 1;
  // Ako joystick nije aktivan, a tastatura nije pritisnuta, x ostaje 0
  else if (!joystickActive) input.x = 0;

  input.jump = jumpPressedThisFrame;
  input.gravity = gravityPressedThisFrame;
  input.rotate = rotatePressedThisFrame;
}

// Resetuje "pressed this frame" flagove — poziva se na kraju frame-a
export function clearFrameInput() {
  jumpPressedThisFrame = false;
  gravityPressedThisFrame = false;
  rotatePressedThisFrame = false;
}
