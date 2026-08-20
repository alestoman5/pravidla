import { useEffect, useMemo, useState } from 'react';
import { KATEGORIE, OBTIZNOSTI } from '../data/categories';
import otazkyData from '../data/questions.json';
import { progressStore } from '../store/progress';
import type {
  NastaveniTestu,
  Obtiznost,
  Otazka,
  PreferenceOtazek,
  TypOtazky,
  ZdrojOtazky,
} from '../types';
import { vazenyVyber, zamichej } from '../utils';

const VSECHNY_OTAZKY = otazkyData as Otazka[];
const ZDROJE: { klic: ZdrojOtazky; nazev: string }[] = [
  { klic: 'pravidlo', nazev: 'Pravidla' },
  { klic: 'situace', nazev: 'Situace' },
  { klic: 'tabulka', nazev: 'Krácení' },
];

const RYCHLE_POCTY = [10, 15, 20, 25, 30, 50];
const CASOVE_LIMITY: { klic: number | null; nazev: string }[] = [
  { klic: null, nazev: 'Bez limitu' },
  { klic: 5, nazev: '5 minut' },
  { klic: 10, nazev: '10 minut' },
  { klic: 20, nazev: '20 minut' },
  { klic: 30, nazev: '30 minut' },
];

type Profil = { nazev: string; popis: string; mix: Record<ZdrojOtazky, number> };
const PROFILY: Profil[] = [
  { nazev: 'Vyvážený výběr', popis: 'Mix pravidel, situací a krácení', mix: { pravidlo: 45, situace: 45, tabulka: 10 } },
  { nazev: 'Více pravidlových otázek', popis: 'Důraz na znění pravidel', mix: { pravidlo: 70, situace: 25, tabulka: 5 } },
  { nazev: 'Pouze pravidlové otázky', popis: 'Jen otázky z pravidel', mix: { pravidlo: 100, situace: 0, tabulka: 0 } },
  { nazev: 'Více otázek ze situací', popis: 'Důraz na herní situace', mix: { pravidlo: 25, situace: 70, tabulka: 5 } },
  { nazev: 'Pouze otázky ze situací', popis: 'Jen otázky ze situací', mix: { pravidlo: 0, situace: 100, tabulka: 0 } },
  { nazev: 'Více otázek na krácení', popis: 'Důraz na souběžné tresty', mix: { pravidlo: 35, situace: 35, tabulka: 30 } },
  { nazev: 'Pouze krácení', popis: 'Jen tabulky souběžných trestů', mix: { pravidlo: 0, situace: 0, tabulka: 100 } },
];

const PREFERENCE_VOLBY: { klic: PreferenceOtazek; nazev: string; popis: string }[] = [
  { klic: 'zadna', nazev: 'Bez preference', popis: 'Otázky napříč celým výběrem' },
  { klic: 'malo-videne', nazev: 'Preferovat dosud málo viděné otázky', popis: 'Doplní mezery ve znalostech' },
  { klic: 'chybovane', nazev: 'Preferovat otázky zodpovězené chybně', popis: 'Zaměří se na tvé dřívější chyby' },
];

function stejnyMix(a: Record<ZdrojOtazky, number>, b: Record<ZdrojOtazky, number>): boolean {
  return a.pravidlo === b.pravidlo && a.situace === b.situace && a.tabulka === b.tabulka;
}

type Props = {
  onSpustit: (otazky: Otazka[], nastaveni: NastaveniTestu) => void;
};

export function QuizSetup({ onSpustit }: Props) {
  const [okruhy, setOkruhy] = useState<Set<string>>(new Set(KATEGORIE.map((k) => k.klic)));
  const [obtiznost, setObtiznost] = useState<Obtiznost | 'vse'>('vse');
  const [typOtazky, setTypOtazky] = useState<TypOtazky | 'vse'>('vse');
  const [casovyLimitMin, setCasovyLimitMin] = useState<number | null>(null);
  const [pocetOtazek, setPocetOtazek] = useState(15);
  const [zdrojeMix, setZdrojeMix] = useState<Record<ZdrojOtazky, number>>(PROFILY[0].mix);
  const [preference, setPreference] = useState<PreferenceOtazek>('zadna');
  const [rozbaleneOkruhy, setRozbaleneOkruhy] = useState(true);
  const [videnoPocet, setVidenoPocet] = useState<Map<string, number>>(new Map());
  const [chybneId, setChybneId] = useState<Set<string>>(new Set());

  // Historie pokusů je podklad pro preference „málo viděné" a „chybované".
  useEffect(() => {
    progressStore.nacti().then((pokusy) => {
      const videno = new Map<string, number>();
      const spravneNaposledy = new Map<string, boolean>();
      for (const pokus of pokusy) {
        for (const odp of pokus.odpovedi) {
          videno.set(odp.otazkaId, (videno.get(odp.otazkaId) ?? 0) + 1);
          spravneNaposledy.set(odp.otazkaId, odp.spravne);
        }
      }
      const chybne = new Set<string>();
      for (const [id, bylaSpravne] of spravneNaposledy) if (!bylaSpravne) chybne.add(id);
      setVidenoPocet(videno);
      setChybneId(chybne);
    });
  }, []);

  const dostupneOtazky = useMemo(() => {
    return VSECHNY_OTAZKY.filter((o) => {
      if (!okruhy.has(o.kategorie)) return false;
      if (obtiznost !== 'vse' && o.obtiznost !== obtiznost) return false;
      if (typOtazky === 'jedna' && o.spravne.length !== 1) return false;
      if (typOtazky === 'vice' && o.spravne.length < 2) return false;
      return true;
    });
  }, [okruhy, obtiznost, typOtazky]);

  const podleZdroje = useMemo(() => {
    const mapa: Record<ZdrojOtazky, Otazka[]> = { pravidlo: [], situace: [], tabulka: [] };
    for (const o of dostupneOtazky) mapa[o.zdroj].push(o);
    return mapa;
  }, [dostupneOtazky]);

  const maxOtazek = Math.max(1, dostupneOtazky.length);
  const skutecnyPocet = Math.min(pocetOtazek, maxOtazek);
  const nelzeSpustit = dostupneOtazky.length === 0;
  const aktivniProfil = PROFILY.find((p) => stejnyMix(p.mix, zdrojeMix));

  function prepnoutOkruh(klic: string) {
    setOkruhy((prev) => {
      const dalsi = new Set(prev);
      if (dalsi.has(klic)) dalsi.delete(klic);
      else dalsi.add(klic);
      return dalsi;
    });
  }

  function vahaOtazky(o: Otazka): number {
    if (preference === 'malo-videne') return 1 / (1 + (videnoPocet.get(o.id) ?? 0));
    if (preference === 'chybovane') return chybneId.has(o.id) ? 6 : 1;
    return 1;
  }

  /** Rozdělí `pocet` na tři kbelíky podle `zdrojeMix`, zaokrouhlené tak, aby dala součet přesně `pocet`. */
  function rozvrhCilu(pocet: number): Record<ZdrojOtazky, number> {
    const klice: ZdrojOtazky[] = ['pravidlo', 'situace', 'tabulka'];
    const syrove = klice.map((k) => (pocet * zdrojeMix[k]) / 100);
    const cile = syrove.map(Math.floor);
    let zbyva = pocet - cile.reduce((s, c) => s + c, 0);
    const poradi = klice
      .map((_, i) => i)
      .sort((a, b) => syrove[b] - Math.floor(syrove[b]) - (syrove[a] - Math.floor(syrove[a])));
    for (let i = 0; i < poradi.length && zbyva > 0; i++, zbyva--) cile[poradi[i]] += 1;
    return { pravidlo: cile[0], situace: cile[1], tabulka: cile[2] };
  }

  function vybratOtazky(): Otazka[] {
    const cile = rozvrhCilu(skutecnyPocet);
    const vybrane: Otazka[] = [];
    const zbytek: Otazka[] = [];
    (['pravidlo', 'situace', 'tabulka'] as ZdrojOtazky[]).forEach((zdroj) => {
      const pool = podleZdroje[zdroj];
      const vzati = vazenyVyber(pool, vahaOtazky, cile[zdroj]);
      vybrane.push(...vzati);
      const vzataId = new Set(vzati.map((o) => o.id));
      zbytek.push(...pool.filter((o) => !vzataId.has(o.id)));
    });
    if (vybrane.length < skutecnyPocet) {
      vybrane.push(...vazenyVyber(zbytek, vahaOtazky, skutecnyPocet - vybrane.length));
    }
    return zamichej(vybrane);
  }

  function spustitTest() {
    const vybrane = vybratOtazky();
    onSpustit(vybrane, {
      okruhy: [...okruhy],
      obtiznost,
      typOtazky,
      pocetOtazek: vybrane.length,
      zdrojeMix,
      preference,
      casovyLimitMin,
    });
  }

  function obnovitVychozi() {
    setOkruhy(new Set(KATEGORIE.map((k) => k.klic)));
    setObtiznost('vse');
    setTypOtazky('vse');
    setCasovyLimitMin(null);
    setPocetOtazek(15);
    setZdrojeMix(PROFILY[0].mix);
    setPreference('zadna');
  }

  const odhadMinut = Math.max(1, Math.round((skutecnyPocet * 55) / 60));
  const barvyZdroje: Record<ZdrojOtazky, string> = {
    pravidlo: 'var(--barva-primarni)',
    situace: 'var(--barva-uspech)',
    tabulka: 'var(--barva-varovani)',
  };

  return (
    <div className="karta karta-siroka">
      <div className="nastaveni-hlavicka">
        <span className="stitek-vlastni">Konfigurace testu</span>
        <h2>Nový test</h2>
        <p className="podnadpis">
          Slož si test na míru — nastav rozsah, zaměření otázek a okruhy, ze kterých chceš
          být zkoušen(a). Pravidla ledního hokeje 2026/27.
        </p>
      </div>

      <div className="nastaveni-grid">
        <div className="nastaveni-hlavni">
          <div className="panel pole-karta">
            <div className="pole-hlavicka">
              <h3>Počet otázek</h3>
              <span className="pole-hodnota">{nelzeSpustit ? 0 : skutecnyPocet} otázek</span>
            </div>
            <input
              className="posuvnik"
              type="range"
              min={Math.min(5, maxOtazek)}
              max={maxOtazek}
              value={skutecnyPocet}
              onChange={(e) => setPocetOtazek(Number(e.target.value))}
              disabled={nelzeSpustit}
            />
            <div className="volby volby-cisla">
              {RYCHLE_POCTY.map((n) => (
                <button
                  key={n}
                  className={`volba-tlacitko ${pocetOtazek === n ? 'vybrano' : ''}`}
                  onClick={() => setPocetOtazek(n)}
                  disabled={nelzeSpustit}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="poznamka">Odhadovaný čas přibližně {odhadMinut} min</p>
          </div>

          <div className="panel pole-karta">
            <div className="pole-hlavicka">
              <h3>Zaměření otázek</h3>
              <span className="stitek stitek-iihf">IIHF</span>
            </div>
            <p className="podnadpis podnadpis-male">
              Z jakých zdrojů se otázky vyberou a v jakém poměru.
            </p>
            <div className="zamereni-pruh">
              {(['pravidlo', 'situace', 'tabulka'] as ZdrojOtazky[]).map((zdroj) => (
                <div
                  key={zdroj}
                  className="zamereni-segment"
                  style={{ width: `${zdrojeMix[zdroj]}%`, background: barvyZdroje[zdroj] }}
                />
              ))}
            </div>
            <div className="zamereni-legenda">
              {(['pravidlo', 'situace', 'tabulka'] as ZdrojOtazky[]).map((zdroj) => (
                <div className="zamereni-polozka" key={zdroj}>
                  <span className="zamereni-tecka" style={{ background: barvyZdroje[zdroj] }} />
                  <span className="zamereni-nazev">
                    {ZDROJE.find((z) => z.klic === zdroj)?.nazev}
                  </span>
                  <span className="zamereni-procenta">
                    {zdrojeMix[zdroj]} % ({podleZdroje[zdroj].length})
                  </span>
                </div>
              ))}
            </div>
            <label className="podnadpis-nadpis">Rozložení</label>
            <div className="profily-mrizka">
              {PROFILY.map((profil) => (
                <button
                  key={profil.nazev}
                  className={`profil-tlacitko ${aktivniProfil?.nazev === profil.nazev ? 'vybrano' : ''}`}
                  onClick={() => setZdrojeMix(profil.mix)}
                >
                  <span className="profil-nazev">{profil.nazev}</span>
                  <span className="profil-popis">{profil.popis}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel pole-karta">
            <h3>Preference otázek</h3>
            <div className="preference-seznam">
              {PREFERENCE_VOLBY.map((volba) => (
                <button
                  key={volba.klic}
                  className={`preference-radek ${preference === volba.klic ? 'vybrano' : ''}`}
                  onClick={() => setPreference(volba.klic)}
                >
                  <span className={`radio-znacka ${preference === volba.klic ? 'aktivni' : ''}`} />
                  <span className="preference-text">
                    <span className="preference-nazev">{volba.nazev}</span>
                    <span className="preference-popis">{volba.popis}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="panel pole-karta">
            <div className="pole-hlavicka">
              <h3>Okruhy</h3>
              <div className="okruhy-akce">
                <button className="tlacitko-odkaz" onClick={() => setOkruhy(new Set(KATEGORIE.map((k) => k.klic)))}>
                  Vše
                </button>
                <button className="tlacitko-odkaz" onClick={() => setOkruhy(new Set())}>
                  Nic
                </button>
                <button className="tlacitko-ikona" onClick={() => setRozbaleneOkruhy((v) => !v)}>
                  {rozbaleneOkruhy ? '▾' : '▸'}
                </button>
              </div>
            </div>
            <p className="podnadpis podnadpis-male">
              Vyber pravidla, ze kterých se mají otázky losovat. Aktivní okruhy: {okruhy.size} z{' '}
              {KATEGORIE.length}.
            </p>
            {rozbaleneOkruhy && (
              <div className="okruhy-seznam">
                {KATEGORIE.map((k) => {
                  const pocet = VSECHNY_OTAZKY.filter((o) => o.kategorie === k.klic).length;
                  return (
                    <label className="okruh-radek" key={k.klic}>
                      <span className="okruh-cislo">{String(k.cislo).padStart(2, '0')}</span>
                      <span className="okruh-nazev">{k.nazev}</span>
                      <span className="okruh-pocet">{pocet}</span>
                      <span
                        className={`prepinac ${okruhy.has(k.klic) ? 'zapnuto' : ''}`}
                        role="switch"
                        aria-checked={okruhy.has(k.klic)}
                        onClick={() => prepnoutOkruh(k.klic)}
                      >
                        <span className="prepinac-kolecko" />
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel pole-karta">
            <h3>Další nastavení</h3>
            <div className="pole">
              <label>Typ otázek</label>
              <div className="volby">
                {(
                  [
                    { klic: 'vse', nazev: 'Všechny' },
                    { klic: 'jedna', nazev: 'Jedna správná' },
                    { klic: 'vice', nazev: 'Více správných' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.klic}
                    className={`volba-tlacitko ${typOtazky === t.klic ? 'vybrano' : ''}`}
                    onClick={() => setTypOtazky(t.klic)}
                  >
                    {t.nazev}
                  </button>
                ))}
              </div>
            </div>
            <div className="pole">
              <label>Obtížnost</label>
              <div className="volby">
                <button
                  className={`volba-tlacitko ${obtiznost === 'vse' ? 'vybrano' : ''}`}
                  onClick={() => setObtiznost('vse')}
                >
                  Všechny úrovně
                </button>
                {OBTIZNOSTI.map((o) => (
                  <button
                    key={o.klic}
                    className={`volba-tlacitko ${obtiznost === o.klic ? 'vybrano' : ''}`}
                    onClick={() => setObtiznost(o.klic)}
                  >
                    {o.nazev}
                  </button>
                ))}
              </div>
            </div>
            <div className="pole" style={{ marginBottom: 0 }}>
              <label>Časový limit</label>
              <div className="volby">
                {CASOVE_LIMITY.map((c) => (
                  <button
                    key={String(c.klic)}
                    className={`volba-tlacitko ${casovyLimitMin === c.klic ? 'vybrano' : ''}`}
                    onClick={() => setCasovyLimitMin(c.klic)}
                  >
                    {c.nazev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {nelzeSpustit && (
            <p className="poznamka poznamka-varovani">
              Tomuto výběru neodpovídá žádná otázka. Zkus zapnout víc okruhů nebo uvolnit
              filtry.
            </p>
          )}
        </div>

        <aside className="nastaveni-sidebar">
          <div className="panel souhrn-panel">
            <h3>Souhrn testu</h3>
            <div className="souhrn-radek">
              <span>Počet otázek</span>
              <strong>{nelzeSpustit ? 0 : skutecnyPocet}</strong>
            </div>
            <div className="souhrn-radek">
              <span>Zaměření</span>
              <strong>{aktivniProfil?.nazev ?? 'Vlastní'}</strong>
            </div>
            <div className="souhrn-radek">
              <span>Okruhy</span>
              <strong>{okruhy.size} aktivních</strong>
            </div>
            <div className="souhrn-radek">
              <span>Preference</span>
              <strong>{PREFERENCE_VOLBY.find((p) => p.klic === preference)?.nazev}</strong>
            </div>
            <div className="souhrn-radek">
              <span>Odhad času</span>
              <strong>~{odhadMinut} min</strong>
            </div>
            <div className="zamereni-pruh zamereni-pruh-male">
              {(['pravidlo', 'situace', 'tabulka'] as ZdrojOtazky[]).map((zdroj) => (
                <div
                  key={zdroj}
                  className="zamereni-segment"
                  style={{ width: `${zdrojeMix[zdroj]}%`, background: barvyZdroje[zdroj] }}
                />
              ))}
            </div>
            <button className="tlacitko-primarni" onClick={spustitTest} disabled={nelzeSpustit}>
              ⚡ Začít test
            </button>
            <button className="tlacitko-odkaz tlacitko-odkaz-stred" onClick={obnovitVychozi}>
              Obnovit výchozí nastavení
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
