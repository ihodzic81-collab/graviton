// ============================================================
// GRAVITON — Audio sistem
// Mistični ambijent + efekti generisani kroz Web Audio API.
// Bez audio fajlova.
// ============================================================

let ctx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicNodes = [];
let musicTimer = null;
let ambientStarted = false;
let currentSettings = { music: true, sfx: true };

// ---------- INICIJALIZACIJA ----------
export function initAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.12; // tiša muzika — manje "hum"
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  } catch (e) {
    console.warn("Audio nije dostupan.", e);
  }
}

export function setAudioSettings(settings) {
  currentSettings = { ...currentSettings, ...settings };
  if (musicGain) musicGain.gain.value = currentSettings.music ? 0.12 : 0;
  if (sfxGain) sfxGain.gain.value = currentSettings.sfx ? 0.6 : 0;
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
}

// ---------- POMOĆNE ----------
function now() { return ctx.currentTime; }

function playTone({ freq, dur, type = "sine", gain = 0.3, attack = 0.01, release = 0.2, dest = null }) {
  if (!ctx || !currentSettings.sfx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now());
  g.gain.setValueAtTime(0, now());
  g.gain.linearRampToValueAtTime(gain, now() + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + attack + release);
  osc.connect(g);
  g.connect(dest || sfxGain);
  osc.start();
  osc.stop(now() + attack + release + 0.05);
}

function playNoise({ dur = 0.3, gain = 0.2, lowpass = 1200 }) {
  if (!ctx || !currentSettings.sfx) return;
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, now());
  g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start();
  src.stop(now() + dur + 0.05);
}

// ---------- SFX ----------
export function sfxJump() {
  playTone({ freq: 420, dur: 0.05, type: "triangle", gain: 0.25, release: 0.15 });
  playTone({ freq: 640, dur: 0.05, type: "sine", gain: 0.15, release: 0.18 });
}

export function sfxGravity() {
  if (!ctx || !currentSettings.sfx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, now());
  osc.frequency.exponentialRampToValueAtTime(660, now() + 0.25);
  g.gain.setValueAtTime(0.0001, now());
  g.gain.linearRampToValueAtTime(0.2, now() + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.4);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1600;
  osc.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  osc.start();
  osc.stop(now() + 0.45);
}

export function sfxLand() {
  playNoise({ dur: 0.15, gain: 0.12, lowpass: 800 });
}

export function sfxFall() {
  if (!ctx || !currentSettings.sfx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, now());
  osc.frequency.exponentialRampToValueAtTime(80, now() + 0.6);
  g.gain.setValueAtTime(0.25, now());
  g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.6);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start();
  osc.stop(now() + 0.65);
}

export function sfxRespawn() {
  if (!ctx || !currentSettings.sfx) return;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g = ctx.createGain();
  osc1.type = "sine";
  osc2.type = "triangle";
  osc1.frequency.setValueAtTime(180, now());
  osc1.frequency.exponentialRampToValueAtTime(880, now() + 0.4);
  osc2.frequency.setValueAtTime(270, now());
  osc2.frequency.exponentialRampToValueAtTime(1320, now() + 0.4);
  g.gain.setValueAtTime(0.0001, now());
  g.gain.linearRampToValueAtTime(0.22, now() + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.5);
  osc1.connect(g);
  osc2.connect(g);
  g.connect(sfxGain);
  osc1.start(); osc2.start();
  osc1.stop(now() + 0.55);
  osc2.stop(now() + 0.55);
}

export function sfxPortal() {
  if (!ctx || !currentSettings.sfx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => {
    setTimeout(() => {
      playTone({ freq: f, dur: 0.15, type: "sine", gain: 0.22, release: 0.5 });
    }, i * 80);
  });
}

export function sfxWin() {
  if (!ctx || !currentSettings.sfx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) => {
    setTimeout(() => {
      playTone({ freq: f, dur: 0.2, type: "triangle", gain: 0.25, release: 0.6 });
    }, i * 110);
  });
}

// ---------- MUZIKA (ambijent) ----------
// Mistični, opuštajući pad — bez prekida.
// Bazni drone je sada mnogo tiši i filtriran, da ne bude nametljiv.

export function startAmbientMusic() {
  if (!ctx || ambientStarted) return;
  ambientStarted = true;

  // Niski filter za ceo ambijent — uklanja oštre tonove
  const ambientFilter = ctx.createBiquadFilter();
  ambientFilter.type = "lowpass";
  ambientFilter.frequency.value = 500;
  ambientFilter.Q.value = 0.5;
  ambientFilter.connect(musicGain);

  // Bazni drone — sada sa mnogo tišim gain-om
  const droneFreqs = [82.41]; // E2 — dublji, topliji ton
  droneFreqs.forEach((f) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.value = 0.025; // veoma tiho
    osc.connect(g);
    g.connect(ambientFilter);
    osc.start();
    musicNodes.push({ osc, g });
  });

  // Blagi "padajući" LFO za mističan efekat — diskretan
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.05;
  lfoGain.gain.value = 1.5;
  lfo.connect(lfoGain);
  musicNodes.forEach(n => {
    if (n.osc && n.osc.frequency) lfoGain.connect(n.osc.frequency);
  });
  lfo.start();
  musicNodes.push({ osc: lfo, g: lfoGain });

  // Melodija — povremeni tonovi, ređi i tiši
  const scale = [523.25, 587.33, 659.25, 783.99, 880];
  function scheduleNote() {
    if (!ctx) return;
    if (currentSettings.music) {
      const freq = scale[Math.floor(Math.random() * scale.length)];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const noteFilter = ctx.createBiquadFilter();
      noteFilter.type = "lowpass";
      noteFilter.frequency.value = 1200;

      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now());
      g.gain.linearRampToValueAtTime(0.04, now() + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + 4.5);
      osc.connect(noteFilter);
      noteFilter.connect(g);
      g.connect(musicGain);
      osc.start();
      osc.stop(now() + 5);
    }
    musicTimer = setTimeout(scheduleNote, 4000 + Math.random() * 4000);
  }
  setTimeout(scheduleNote, 2500);
}

export function stopAmbientMusic() {
  musicNodes.forEach(n => {
    try { n.osc.stop(); } catch (e) {}
  });
  musicNodes = [];
  if (musicTimer) clearTimeout(musicTimer);
  ambientStarted = false;
}

// ---------- DINAMIKA ----------
export function updateMusicDynamics(state) {
  if (!ctx || !musicGain) return;
  let target = 0.12;
  if (state === "moving") target = 0.16;
  else if (state === "falling") target = 0.10;
  else if (state === "win") target = 0.22;

  const t = now();
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.linearRampToValueAtTime(target, t + 0.8);
}
