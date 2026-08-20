import { PRAVIDLA } from '../rules';

/** Klíč kategorie = slug názvu části pravidel (např. „hraci-plocha"). */
export type KategorieKlic = string;

/** Odstraní diakritiku a převede na kebab-case ASCII slug. */
function slug(nazev: string): string {
  return nazev
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Kategorie otázek jsou sjednocené s 12 oficiálními částmi pravidel (ČÁST 01–12) a
 * odvozují se přímo z `rulebook.json` — žádný ruční seznam k udržování, appka tak vždy
 * odpovídá skutečné struktuře aktuálně nahraného rulebooku.
 */
export const KATEGORIE: { klic: KategorieKlic; nazev: string; cislo: number }[] = PRAVIDLA.map(
  (cast) => ({
    klic: slug(cast.nazev),
    nazev: cast.nazev,
    cislo: cast.cislo,
  }),
);

export const OBTIZNOSTI = [
  { klic: 'zacatecnik', nazev: 'Začátečník' },
  { klic: 'pokrocily', nazev: 'Pokročilý' },
  { klic: 'expert', nazev: 'Expert' },
] as const;
