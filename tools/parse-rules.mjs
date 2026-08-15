// Převede textovou extrakci PDF pravidel na strukturovaný JSON pro prohlížeč a AI asistenta.
import fs from 'node:fs';

const SRC = process.argv[2];
const OUT = process.argv[3];

const raw = fs.readFileSync(SRC, 'utf-8');
const lines = raw.split(/\r?\n/);

// Řádky, které jsou jen běžícím záhlavím/zápatím stránky, do textu pravidel nepatří.
function jeSmeti(line) {
  const t = line.trim();
  if (!t) return true;
  if (/^PRAVIDLA LEDNÍHO HOKEJE 2025\/26/.test(t)) return true;
  if (/^OBSAH\s*$/.test(t)) return true;
  if (/^ČÁST \d+\s*$/.test(t)) return true;
  if (/^\d{1,3}\s*$/.test(t)) return true;
  if (/^(HRACÍ PLOCHA|TÝMY|VÝSTROJ|DRUHY TRESTŮ|ROZHODČÍ|FYZICKÉ FAULY|OMEZUJÍCÍ FAULY|FAULY HOLÍ|JINÉ PŘESTUPKY|PRŮBĚH HRY|PŘEHLED TABULEK)\s*$/.test(t)) return true;
  return false;
}

// Ze záhlaví odstraní přilepený běžící titulek ("... ČÁST 06 FYZICKÉ FAULY").
function ocisti(t) {
  return t
    // PDF používá pro navigační šipky glyfy z Private Use Area — ty do textu nepatří.
    .replace(/[-]/g, '')
    .replace(/[-]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s{2,}ČÁST \d+ .*$/, '')
    .replace(/\s{2,}PRAVIDLA LEDNÍHO HOKEJE.*$/, '')
    .replace(/\s{2,}\d{1,3}\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const casti = [];
let aktualniCast = null;
let aktualniPravidlo = null;
let aktualniSekce = null;

const reCast = /^ČÁST (\d+)\.\s+(.+?)\s*$/;
const rePravidlo = /^PRAVIDLO (\d+)\s+(.+)$/;
const reSekce = /^(\d+)\.(\d+)\.\s+(.+)$/;

function ulozSekci() {
  if (aktualniSekce && aktualniPravidlo) {
    aktualniSekce.text = aktualniSekce.radky.join(' ').replace(/\s+/g, ' ').trim();
    delete aktualniSekce.radky;
    if (aktualniSekce.text) aktualniPravidlo.sekce.push(aktualniSekce);
  }
  aktualniSekce = null;
}

function ulozPravidlo() {
  ulozSekci();
  if (aktualniPravidlo && aktualniCast) {
    if (aktualniPravidlo.sekce.length > 0 || aktualniPravidlo.uvod) {
      aktualniCast.pravidla.push(aktualniPravidlo);
    }
  }
  aktualniPravidlo = null;
}

for (const line of lines) {
  if (jeSmeti(line)) continue;
  const t = ocisti(line);
  if (!t) continue;

  const mCast = t.match(reCast);
  if (mCast) {
    ulozPravidlo();
    aktualniCast = { cislo: Number(mCast[1]), nazev: mCast[2].trim(), pravidla: [] };
    casti.push(aktualniCast);
    continue;
  }

  const mPravidlo = t.match(rePravidlo);
  // Příloha se signály rozhodčích používá tvar „PRAVIDLO 41 – VRAŽENÍ NA MANTINEL“ a často
  // dva popisky na jednom řádku; to nejsou nadpisy pravidel, jen popisky obrázků.
  const jeSignal =
    mPravidlo && (mPravidlo[2].trim().startsWith('–') || mPravidlo[2].includes('PRAVIDLO'));
  // Řádky z obsahu mají na konci číslo stránky a nejsou to nadpisy — ty už odfiltroval ocisti().
  if (mPravidlo && aktualniCast && !jeSignal && !/^\d+$/.test(mPravidlo[2].trim())) {
    ulozPravidlo();
    aktualniPravidlo = {
      cislo: Number(mPravidlo[1]),
      nazev: mPravidlo[2].trim(),
      uvod: '',
      sekce: [],
    };
    continue;
  }

  const mSekce = t.match(reSekce);
  if (mSekce && aktualniPravidlo && Number(mSekce[1]) === aktualniPravidlo.cislo) {
    ulozSekci();
    aktualniSekce = {
      cislo: `${mSekce[1]}.${mSekce[2]}.`,
      nazev: mSekce[3].trim(),
      radky: [],
    };
    continue;
  }

  if (aktualniSekce) {
    aktualniSekce.radky.push(t);
  } else if (aktualniPravidlo) {
    aktualniPravidlo.uvod = (aktualniPravidlo.uvod ? aktualniPravidlo.uvod + ' ' : '') + t;
  }
}
ulozPravidlo();

// Nadpis části se v dokumentu objeví vícekrát (obsah + vlastní text), takže části slučujeme
// podle čísla a u duplicitních pravidel si necháváme tu nejobsáhlejší verzi.
const podleCisla = new Map();
for (const c of casti) {
  if (c.pravidla.length === 0) continue;
  const nazev = c.nazev.trim();
  const stavajici = podleCisla.get(c.cislo);
  if (!stavajici) {
    podleCisla.set(c.cislo, { cislo: c.cislo, nazev, pravidla: [...c.pravidla] });
    continue;
  }
  if (nazev.length > stavajici.nazev.length) stavajici.nazev = nazev;
  stavajici.pravidla.push(...c.pravidla);
}

function objemPravidla(p) {
  return p.uvod.length + p.sekce.reduce((s, x) => s + x.text.length, 0);
}

const vysledek = [...podleCisla.values()]
  .sort((a, b) => a.cislo - b.cislo)
  .map((c) => {
    const nejlepsi = new Map();
    for (const p of c.pravidla) {
      const stav = nejlepsi.get(p.cislo);
      if (!stav || objemPravidla(p) > objemPravidla(stav)) nejlepsi.set(p.cislo, p);
    }
    return { ...c, pravidla: [...nejlepsi.values()].sort((a, b) => a.cislo - b.cislo) };
  });

const pocetPravidel = vysledek.reduce((s, c) => s + c.pravidla.length, 0);
const pocetSekci = vysledek.reduce(
  (s, c) => s + c.pravidla.reduce((s2, p) => s2 + p.sekce.length, 0),
  0,
);

fs.writeFileSync(OUT, JSON.stringify(vysledek, null, 1), 'utf-8');
console.log(`částí: ${vysledek.length}, pravidel: ${pocetPravidel}, sekcí: ${pocetSekci}`);
console.log(`velikost: ${(fs.statSync(OUT).size / 1024).toFixed(0)} kB`);
for (const c of vysledek) {
  console.log(`  ČÁST ${c.cislo} ${c.nazev}: ${c.pravidla.length} pravidel`);
}
