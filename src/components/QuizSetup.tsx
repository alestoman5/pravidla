import { useEffect, useMemo, useState } from 'react';
import { KATEGORIE, OBTIZNOSTI } from '../data/categories';
import otazkyData from '../data/questions.json';
import { progressStore } from '../store/progress';
import type { NastaveniTestu, Obtiznost, Otazka, TypOtazky } from '../types';
import { zamichej } from '../utils';

const VSECHNY_OTAZKY = otazkyData as Otazka[];

const CASOVE_LIMITY: { klic: number | null; nazev: string }[] = [
  { klic: null, nazev: 'Bez limitu' },
  { klic: 5, nazev: '5 minut' },
  { klic: 10, nazev: '10 minut' },
  { klic: 20, nazev: '20 minut' },
];

type Props = {
  onSpustit: (otazky: Otazka[], nastaveni: NastaveniTestu) => void;
};

export function QuizSetup({ onSpustit }: Props) {
  const [kategorie, setKategorie] = useState<string>('vse');
  const [obtiznost, setObtiznost] = useState<Obtiznost | 'vse'>('vse');
  const [typOtazky, setTypOtazky] = useState<TypOtazky | 'vse'>('vse');
  const [casovyLimitMin, setCasovyLimitMin] = useState<number | null>(null);
  const [jenChybne, setJenChybne] = useState(false);
  const [pocetOtazek, setPocetOtazek] = useState(15);
  const [chybneId, setChybneId] = useState<Set<string>>(new Set());

  // Množina otázek, ve kterých uživatel někdy chyboval — podklad pro režim opakování.
  useEffect(() => {
    progressStore.nacti().then((pokusy) => {
      const chybne = new Set<string>();
      const spravneNaposledy = new Map<string, boolean>();
      for (const pokus of pokusy) {
        for (const odp of pokus.odpovedi) {
          spravneNaposledy.set(odp.otazkaId, odp.spravne);
        }
      }
      for (const [id, bylaSpravne] of spravneNaposledy) {
        if (!bylaSpravne) chybne.add(id);
      }
      setChybneId(chybne);
    });
  }, []);

  const dostupneOtazky = useMemo(() => {
    return VSECHNY_OTAZKY.filter((o) => {
      if (kategorie !== 'vse' && o.kategorie !== kategorie) return false;
      if (obtiznost !== 'vse' && o.obtiznost !== obtiznost) return false;
      if (typOtazky === 'jedna' && o.spravne.length !== 1) return false;
      if (typOtazky === 'vice' && o.spravne.length < 2) return false;
      if (jenChybne && !chybneId.has(o.id)) return false;
      return true;
    });
  }, [kategorie, obtiznost, typOtazky, jenChybne, chybneId]);

  const maxOtazek = Math.max(1, dostupneOtazky.length);
  const skutecnyPocet = Math.min(pocetOtazek, maxOtazek);
  const nelzeSpustit = dostupneOtazky.length === 0;

  function spustitTest() {
    const vybrane = zamichej(dostupneOtazky).slice(0, skutecnyPocet);
    onSpustit(vybrane, {
      kategorie,
      obtiznost,
      typOtazky,
      pocetOtazek: vybrane.length,
      jenChybne,
      casovyLimitMin,
    });
  }

  return (
    <div className="karta">
      <div className="panel">
        <h2>Nový test</h2>
        <p className="podnadpis">
          Otestuj se z pravidel ledního hokeje 2025/26. Po každé odpovědi uvidíš vysvětlení
          s odkazem na konkrétní pravidlo.
        </p>

        <div className="pole">
          <label>Kategorie</label>
          <div className="volby">
            <button
              className={`volba-tlacitko ${kategorie === 'vse' ? 'vybrano' : ''}`}
              onClick={() => setKategorie('vse')}
            >
              Všechny kategorie
            </button>
            {KATEGORIE.map((k) => (
              <button
                key={k.klic}
                className={`volba-tlacitko ${kategorie === k.klic ? 'vybrano' : ''}`}
                onClick={() => setKategorie(k.klic)}
              >
                {k.nazev}
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

        <div className="pole">
          <label>Typ otázek</label>
          <div className="volby">
            <button
              className={`volba-tlacitko ${typOtazky === 'vse' ? 'vybrano' : ''}`}
              onClick={() => setTypOtazky('vse')}
            >
              Všechny
            </button>
            <button
              className={`volba-tlacitko ${typOtazky === 'jedna' ? 'vybrano' : ''}`}
              onClick={() => setTypOtazky('jedna')}
            >
              Jedna správná
            </button>
            <button
              className={`volba-tlacitko ${typOtazky === 'vice' ? 'vybrano' : ''}`}
              onClick={() => setTypOtazky('vice')}
            >
              Více správných
            </button>
          </div>
        </div>

        <div className="pole">
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

        <div className="pole">
          <label>Režim</label>
          <button
            className={`volba-tlacitko sirsi ${jenChybne ? 'vybrano' : ''}`}
            onClick={() => setJenChybne(!jenChybne)}
            disabled={chybneId.size === 0}
          >
            {jenChybne ? '✓ ' : ''}Opakovat jen chybné otázky
            {chybneId.size > 0 ? ` (${chybneId.size})` : ' — zatím žádné'}
          </button>
        </div>

        <div className="pole">
          <label>
            Počet otázek: {nelzeSpustit ? 0 : skutecnyPocet} (dostupných: {dostupneOtazky.length})
          </label>
          <input
            type="range"
            min={Math.min(5, maxOtazek)}
            max={maxOtazek}
            value={skutecnyPocet}
            onChange={(e) => setPocetOtazek(Number(e.target.value))}
            disabled={nelzeSpustit}
          />
        </div>

        {nelzeSpustit && (
          <p className="poznamka poznamka-varovani">
            Tomuto výběru neodpovídá žádná otázka. Zkus uvolnit některý z filtrů.
          </p>
        )}

        <button className="tlacitko-primarni" onClick={spustitTest} disabled={nelzeSpustit}>
          Spustit test
        </button>
      </div>
    </div>
  );
}
