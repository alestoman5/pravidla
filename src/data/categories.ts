export type KategorieKlic =
  | 'vystroj'
  | 'tymy'
  | 'tresty'
  | 'ofsajd'
  | 'vhazovani'
  | 'branky'
  | 'brankar'
  | 'ruzne';

export const KATEGORIE: { klic: KategorieKlic; nazev: string }[] = [
  { klic: 'vystroj', nazev: 'Hrací plocha a výstroj' },
  { klic: 'tymy', nazev: 'Hráči a funkcionáři' },
  { klic: 'tresty', nazev: 'Tresty' },
  { klic: 'ofsajd', nazev: 'Zakázané uvolnění a ofsajd' },
  { klic: 'vhazovani', nazev: 'Vhazování' },
  { klic: 'branky', nazev: 'Branky a asistence' },
  { klic: 'brankar', nazev: 'Brankář' },
  { klic: 'ruzne', nazev: 'Různé a procedurální situace' },
];

export const OBTIZNOSTI = [
  { klic: 'zacatecnik', nazev: 'Začátečník' },
  { klic: 'pokrocily', nazev: 'Pokročilý' },
  { klic: 'expert', nazev: 'Expert' },
] as const;
