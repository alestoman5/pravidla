import rulebookData from './data/rulebook.json';
import type { CastPravidel, Pravidlo, SekcePravidla, Uryvek } from './types';

export const PRAVIDLA = rulebookData as CastPravidel[];

export type NalezenaSekce = {
  cast: CastPravidel;
  pravidlo: Pravidlo;
  sekce: SekcePravidla | null;
  odkaz: string;
  text: string;
};

/** Všechny sekce zploštěné do jednoho seznamu — základ pro vyhledávání i RAG. */
const VSECHNY_SEKCE: NalezenaSekce[] = PRAVIDLA.flatMap((cast) =>
  cast.pravidla.flatMap((pravidlo) => {
    const zaznamy: NalezenaSekce[] = [];
    if (pravidlo.uvod) {
      zaznamy.push({
        cast,
        pravidlo,
        sekce: null,
        odkaz: `Pravidlo ${pravidlo.cislo} – ${pravidlo.nazev}`,
        text: pravidlo.uvod,
      });
    }
    for (const sekce of pravidlo.sekce) {
      zaznamy.push({
        cast,
        pravidlo,
        sekce,
        odkaz: `Pravidlo ${sekce.cislo} ${sekce.nazev}`,
        text: sekce.text,
      });
    }
    return zaznamy;
  }),
);

export const POCET_SEKCI = VSECHNY_SEKCE.length;
export const POCET_PRAVIDEL = PRAVIDLA.reduce((s, c) => s + c.pravidla.length, 0);

/** Odstraní diakritiku a sjednotí velikost písmen, aby „ofsajd“ našel i „OFSAJD“. */
function normalizuj(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Krátká česká slova nesou málo informace a jen zašumují skóre. */
const STOP_SLOVA = new Set([
  'a', 'i', 'v', 've', 'na', 'se', 'si', 'je', 'to', 'za', 'do', 'od', 'po', 'pro', 'kdyz',
  'pokud', 'ktery', 'ktera', 'ktere', 'nebo', 'ale', 'jako', 'byt', 'byl', 'bude', 'ma',
  'muze', 'musi', 'jak', 'kdy', 'kde', 'co', 'ze', 'the', 's', 'k', 'u', 'o', 'jsem', 'mi',
]);

function tokenizuj(text: string): string[] {
  return normalizuj(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP_SLOVA.has(t));
}

// Předpočítané normalizované texty — vyhledávání pak neprovádí normalizaci opakovaně.
const INDEX = VSECHNY_SEKCE.map((s) => ({
  sekce: s,
  normText: normalizuj(s.text),
  normOdkaz: normalizuj(s.odkaz),
  tokeny: new Set(tokenizuj(s.text)),
}));

/**
 * Skóruje sekce proti dotazu: shoda v nadpisu váží víc než v textu a delší slova
 * víc než krátká. Vrací nejlepší sekce sestupně.
 */
export function hledejSekce(dotaz: string, limit = 8): NalezenaSekce[] {
  const tokeny = tokenizuj(dotaz);
  // Dotaz jako „70.4“ nebo „pravidlo 81“ míří na konkrétní pravidlo. Hledá se i tehdy,
  // když dotaz neobsahuje žádné slovo — samotné číslo pravidla je platné zadání.
  const cisloPravidla = dotaz.match(/\b(\d{1,3})(?:\.(\d{1,2}))?\.?/);
  if (tokeny.length === 0 && !cisloPravidla) return [];

  const skore = INDEX.map((zaznam) => {
    let body = 0;
    for (const token of tokeny) {
      const vNadpisu = zaznam.normOdkaz.includes(token);
      const vTextu = zaznam.tokeny.has(token) || zaznam.normText.includes(token);
      if (vNadpisu) body += 3 * Math.min(token.length / 4, 2);
      if (vTextu) body += 1 * Math.min(token.length / 4, 2);
    }
    if (cisloPravidla) {
      const cele = cisloPravidla[0].replace(/\.$/, '');
      if (zaznam.sekce.sekce?.cislo.startsWith(cele)) body += 12;
      else if (String(zaznam.sekce.pravidlo.cislo) === cisloPravidla[1]) body += 6;
    }
    return { zaznam, body };
  })
    .filter((z) => z.body > 0)
    .sort((a, b) => b.body - a.body);

  return skore.slice(0, limit).map((z) => z.zaznam.sekce);
}

/**
 * Sestaví kontext pro AI asistenta. Bere víc sekcí než zobrazuje vyhledávání,
 * aby model měl k dispozici i sousedící ustanovení téhož pravidla.
 */
export function uryvkyProDotaz(dotaz: string, limit = 12): Uryvek[] {
  const nalezene = hledejSekce(dotaz, limit);
  return nalezene.map((s) => ({ odkaz: s.odkaz, text: s.text }));
}
