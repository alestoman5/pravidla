import { useEffect, useMemo, useState } from 'react';
import { KATEGORIE } from '../data/categories';
import otazkyData from '../data/questions.json';
import { progressStore } from '../store/progress';
import { ProgressChart } from './ProgressChart';
import type { Otazka, Pokus } from '../types';
import { formatujDatum } from '../utils';

const VSECHNY_OTAZKY = otazkyData as Otazka[];
const KATEGORIE_PODLE_ID = new Map(VSECHNY_OTAZKY.map((o) => [o.id, o.kategorie]));

function nazevKategorie(klic: string): string {
  if (klic === 'vse') return 'Všechny kategorie';
  return KATEGORIE.find((k) => k.klic === klic)?.nazev ?? klic;
}

export function StatsHistory() {
  const [historie, setHistorie] = useState<Pokus[] | null>(null);

  useEffect(() => {
    progressStore.nacti().then(setHistorie);
  }, []);

  const souhrn = useMemo(() => {
    if (!historie || historie.length === 0) return null;
    const celkemOtazek = historie.reduce((s, p) => s + p.pocetOtazek, 0);
    const celkemSpravnych = historie.reduce((s, p) => s + p.pocetSpravnych, 0);
    const prumernaUspesnost = Math.round((celkemSpravnych / celkemOtazek) * 100);

    const poKategoriich = new Map<string, { spravne: number; celkem: number }>();
    for (const pokus of historie) {
      for (const odp of pokus.odpovedi) {
        // Kategorie se dohledá přímo v bance otázek — ID mají prefix jen informativní,
        // některé klíče kategorií (části pravidel) obsahují pomlčku.
        const klic = KATEGORIE_PODLE_ID.get(odp.otazkaId) ?? 'neznama';
        const zaznam = poKategoriich.get(klic) ?? { spravne: 0, celkem: 0 };
        zaznam.celkem += 1;
        if (odp.spravne) zaznam.spravne += 1;
        poKategoriich.set(klic, zaznam);
      }
    }

    return {
      celkemOtazek,
      celkemSpravnych,
      prumernaUspesnost,
      poKategoriich,
      pocetTestu: historie.length,
    };
  }, [historie]);

  async function vymazatHistorii() {
    const prazdna = await progressStore.vymaz();
    setHistorie(prazdna);
  }

  if (historie === null) {
    return (
      <div className="karta">
        <div className="panel">Načítám statistiky…</div>
      </div>
    );
  }

  if (!souhrn) {
    return (
      <div className="karta">
        <div className="panel">
          <h2>Statistiky</h2>
          <div className="prazdny-stav">
            Zatím nemáš žádné dokončené testy. Spusť si první test v záložce Nový test.
          </div>
        </div>
      </div>
    );
  }

  const nejslabsi = [...souhrn.poKategoriich.entries()].sort(
    (a, b) => a[1].spravne / a[1].celkem - b[1].spravne / b[1].celkem,
  );

  return (
    <div className="karta">
      <div className="panel">
        <h2>Statistiky a historie</h2>

        <div className="mrizka-statistik">
          <div className="stat-dlazdice">
            <div className="hodnota">{souhrn.pocetTestu}</div>
            <div className="popisek">Dokončených testů</div>
          </div>
          <div className="stat-dlazdice">
            <div className="hodnota">{souhrn.prumernaUspesnost} %</div>
            <div className="popisek">Celková úspěšnost</div>
          </div>
          <div className="stat-dlazdice">
            <div className="hodnota">{souhrn.celkemSpravnych}</div>
            <div className="popisek">Správných odpovědí</div>
          </div>
          <div className="stat-dlazdice">
            <div className="hodnota">{souhrn.celkemOtazek}</div>
            <div className="popisek">Zodpovězených otázek</div>
          </div>
        </div>

        <h3>Vývoj úspěšnosti</h3>
        <ProgressChart pokusy={historie} />

        <h3 style={{ marginTop: 28 }}>Úspěšnost podle kategorií</h3>
        <p className="podnadpis">Seřazeno od nejslabší — na těchto oblastech máš zabrat.</p>
        {nejslabsi.map(([klic, data]) => {
          const procenta = Math.round((data.spravne / data.celkem) * 100);
          return (
            <div className="kategorie-progres" key={klic}>
              <div className="radek">
                <span>{nazevKategorie(klic)}</span>
                <span className="tabulkove-cislo">
                  {data.spravne}/{data.celkem} ({procenta} %)
                </span>
              </div>
              <div className="lista">
                <div className="vyplnena" style={{ width: `${procenta}%` }} />
              </div>
            </div>
          );
        })}

        <h3 style={{ marginTop: 28 }}>Historie testů</h3>
        <table className="historie-tabulka">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Kategorie</th>
              <th>Výsledek</th>
            </tr>
          </thead>
          <tbody>
            {[...historie].reverse().map((p) => (
              <tr key={p.id}>
                <td>{formatujDatum(p.datum)}</td>
                <td>{nazevKategorie(p.kategorie)}</td>
                <td className="tabulkove-cislo">
                  {p.pocetSpravnych}/{p.pocetOtazek} (
                  {Math.round((p.pocetSpravnych / p.pocetOtazek) * 100)} %)
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="tlacitko-sekundarni" style={{ marginTop: 20 }} onClick={vymazatHistorii}>
          Vymazat historii
        </button>
      </div>
    </div>
  );
}
