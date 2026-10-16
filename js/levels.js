// Definicija nivoa.
// U Fazi 1 samo opisujemo nivoe koji postoje u planu.
// Prava mehanika i geometrija dolaze u Fazi 2 i 3.

export const CHAPTERS = [
  {
    id: 1,
    title: "POREMEĆAJ GRAVITACIJE",
    levels: [
      { n: 1, name: "KOSMIČKA PADINA", mechanic: "Osnovno kretanje" },
      { n: 2, name: "OBRNUTA GRAVITACIJA", mechanic: "Promena gravitacije" },
      { n: 3, name: "DVA SVETA", mechanic: "Rotacija prostora" },
      { n: 4, name: "SPIRALNA ZAGONETKA", mechanic: "Kombinacija" }
    ]
  }
];

export function getLevelByNumber(n) {
  for (const ch of CHAPTERS) {
    const found = ch.levels.find(l => l.n === n);
    if (found) return { ...found, chapter: ch };
  }
  return null;
}

export function getTotalLevels() {
  return CHAPTERS.reduce((sum, ch) => sum + ch.levels.length, 0);
}
