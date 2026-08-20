export type Obtiznost = 'zacatecnik' | 'pokrocily' | 'expert';

export type TypOtazky = 'jedna' | 'vice';

/** Zdroj otázky — přímé pravidlo, herní situace, nebo strukturovaná tabulka/časová osa. */
export type ZdrojOtazky = 'pravidlo' | 'situace' | 'tabulka';

export type SituaceTrest = { tym: 'A' | 'B'; hrac: string; trest: string };
export type SituaceUdalost = { cas: string; tym?: 'A' | 'B'; popis: string; zvyrazneni?: 'gol' };

/** Strukturovaný kontext zobrazený nad textem otázky (jen u otázek zdroj: 'tabulka'). */
export type Situace =
  | { typ: 'tabulka-trestu'; tymA: string; tymB: string; tresty: SituaceTrest[] }
  | { typ: 'casova-osa'; udalosti: SituaceUdalost[] };

export type Otazka = {
  id: string;
  kategorie: string;
  obtiznost: Obtiznost;
  zdroj: ZdrojOtazky;
  text: string;
  moznosti: string[];
  spravne: number[];
  vysvetleni: string;
  pravidlo: string;
  situace?: Situace;
};

export type OdpovedNaOtazku = {
  otazkaId: string;
  vybrano: number[];
  spravne: boolean;
};

export type Pokus = {
  id: string;
  datum: string;
  kategorie: string | 'vse';
  obtiznost: Obtiznost | 'vse';
  pocetOtazek: number;
  pocetSpravnych: number;
  odpovedi: OdpovedNaOtazku[];
};

/** Preference výběru otázek — nahrazuje dřívější striktní filtr „jen chybné". */
export type PreferenceOtazek = 'zadna' | 'malo-videne' | 'chybovane';

export type NastaveniTestu = {
  /** Klíče aktivních okruhů (částí pravidel); prázdné pole = žádný okruh nevybrán. */
  okruhy: string[];
  obtiznost: Obtiznost | 'vse';
  typOtazky: TypOtazky | 'vse';
  pocetOtazek: number;
  /** Procentuální rozložení zdrojů v testu; součet by měl dát 100. */
  zdrojeMix: Record<ZdrojOtazky, number>;
  preference: PreferenceOtazek;
  casovyLimitMin: number | null;
};

/** Jedna číslovaná podsekce pravidla, např. „81.3. ZAKÁZANÉ UVOLNĚNÍ – BRANKÁŘ“. */
export type SekcePravidla = {
  cislo: string;
  nazev: string;
  text: string;
};

export type Pravidlo = {
  cislo: number;
  nazev: string;
  uvod: string;
  sekce: SekcePravidla[];
};

export type CastPravidel = {
  cislo: number;
  nazev: string;
  pravidla: Pravidlo[];
};

/** Úryvek pravidel předávaný AI asistentovi jako kontext. */
export type Uryvek = {
  odkaz: string;
  text: string;
};

export type ZpravaChatu = {
  role: 'user' | 'assistant';
  text: string;
  /** Pravidla, ze kterých asistent čerpal — zobrazují se pod odpovědí. */
  zdroje?: string[];
};

export type Nastaveni = {
  maApiKlic: boolean;
};

declare global {
  interface Window {
    historie: {
      nacti: () => Promise<Pokus[]>;
      pridej: (pokus: Pokus) => Promise<Pokus[]>;
      vymaz: () => Promise<Pokus[]>;
    };
    nastaveni: {
      nacti: () => Promise<Nastaveni>;
      ulozKlic: (klic: string) => Promise<Nastaveni>;
      smazKlic: () => Promise<Nastaveni>;
    };
    asistent: {
      zeptejSe: (
        dotaz: string,
        uryvky: Uryvek[],
        historie: { role: 'user' | 'assistant'; text: string }[],
      ) => Promise<{ ok: true; odpoved: string } | { ok: false; chyba: string }>;
    };
  }
}
