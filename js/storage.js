// Centralno mesto za čuvanje i čitanje podataka.
// Koristi localStorage i bezbedno se oporavlja od neispravnih podataka.

const KEY = "graviton.save.v1";
const VERSION = 1;

const DEFAULT_STATE = {
  version: VERSION,
  profile: {
    nickname: "Igrač",
    skin: "ametist"
  },
  progress: {
    unlockedLevels: 1,
    completedLevels: [],
    bestScores: {}
  },
  wallet: {
    puls: 0
  },
  achievements: {
    unlocked: []
  },
  daily: {
    lastCompletedDate: null,
    history: []
  },
  collection: {
    ownedSkins: ["ametist"],
    equippedSkin: "ametist"
  },
  settings: {
    music: true,
    sfx: true,
    reducedMotion: false,
    lang: "sr"
  }
};

function deepMerge(base, extra) {
  const out = Array.isArray(base) ? base.slice() : { ...base };
  if (!extra || typeof extra !== "object") return out;
  for (const k of Object.keys(extra)) {
    const bv = base[k];
    const ev = extra[k];
    if (bv && ev && typeof bv === "object" && typeof ev === "object" && !Array.isArray(bv)) {
      out[k] = deepMerge(bv, ev);
    } else if (ev !== undefined) {
      out[k] = ev;
    }
  }
  return out;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return structuredClone(DEFAULT_STATE);
    return deepMerge(DEFAULT_STATE, parsed);
  } catch (e) {
    console.warn("Neispravni sačuvani podaci, vraćam podrazumevano.", e);
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  try {
    state.version = VERSION;
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Ne mogu da sačuvam stanje.", e);
  }
}

export function resetState() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return structuredClone(DEFAULT_STATE);
}

export { DEFAULT_STATE };
