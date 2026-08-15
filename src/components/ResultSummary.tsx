import { useState } from 'react';
import otazkyData from '../data/questions.json';
import type { Otazka, Pokus } from '../types';

const VSECHNY_OTAZKY = otazkyData as Otazka[];

type Props = {
  pokus: Pokus;
  onNovyTest: () => void;
  onZobrazitStatistiky: () => void;
  onOtevritPravidlo: (odkaz: string) => void;
};

export function ResultSummary({ pokus, onNovyTest, onZobrazitStatistiky, onOtevritPravidlo }: Props) {
  const [rozbalene, setRozbalene] = useState<Set<string>>(new Set());
  const [jenChyby, setJenChyby] = useState(false);

  const uspesnost = Math.round((pokus.pocetSpravnych / pokus.pocetOtazek) * 100);
  const trida = uspesnost >= 80 ? 'dobre' : uspesnost >= 50 ? 'stredni' : 'spatne';

  function prepnout(id: string) {
    setRozbalene((prev) => {
      const dalsi = new Set(prev);
      if (dalsi.has(id)) dalsi.delete(id);
      else dalsi.add(id);
      return dalsi;
    });
  }

  const zobrazene = jenChyby ? pokus.odpovedi.filter((o) => !o.spravne) : pokus.odpovedi;
  const pocetChyb = pokus.odpovedi.filter((o) => !o.spravne).length;

  return (
    <div className="karta">
      <div className="panel">
        <h2>Výsledek testu</h2>
        <div className={`velke-skore ${trida}`}>{uspesnost} %</div>
        <p className="skore-popis">
          {pokus.pocetSpravnych} z {pokus.pocetOtazek} otázek správně
        </p>

        <div className="review-hlavicka">
          <h3>Rozbor odpovědí</h3>
          {pocetChyb > 0 && (
            <button className="tlacitko-sekundarni tlacitko-male" onClick={() => setJenChyby(!jenChyby)}>
              {jenChyby ? 'Zobrazit vše' : `Jen chyby (${pocetChyb})`}
            </button>
          )}
        </div>

        <div className="review-seznam">
          {zobrazene.map((odp) => {
            const otazka = VSECHNY_OTAZKY.find((o) => o.id === odp.otazkaId);
            if (!otazka) return null;
            const jeRozbalena = rozbalene.has(odp.otazkaId);
            return (
              <div className={`review-polozka ${odp.spravne ? '' : 'chybna'}`} key={odp.otazkaId}>
                <button className="review-zahlavi" onClick={() => prepnout(odp.otazkaId)}>
                  <span className={`souhrn-ikona ${odp.spravne ? 'ok' : 'spatne'}`}>
                    {odp.spravne ? '✓' : '✕'}
                  </span>
                  <span className="review-otazka">{otazka.text}</span>
                  <span className="review-sipka">{jeRozbalena ? '▾' : '▸'}</span>
                </button>

                {jeRozbalena && (
                  <div className="review-detail">
                    {otazka.moznosti.map((moznost, i) => {
                      const jeSpravna = otazka.spravne.includes(i);
                      const bylaVybrana = odp.vybrano.includes(i);
                      let trida = 'review-moznost';
                      if (jeSpravna) trida += ' spravna';
                      else if (bylaVybrana) trida += ' chybna';
                      return (
                        <div className={trida} key={i}>
                          <span className="review-znacka">
                            {jeSpravna ? '✓' : bylaVybrana ? '✕' : ''}
                          </span>
                          <span>{moznost}</span>
                          {bylaVybrana && <span className="review-tvoje">tvoje odpověď</span>}
                        </div>
                      );
                    })}
                    <div className="vysvetleni-box">
                      <div>{otazka.vysvetleni}</div>
                      <button
                        className="pravidlo-odkaz"
                        onClick={() => onOtevritPravidlo(otazka.pravidlo)}
                      >
                        📖 {otazka.pravidlo} — otevřít v pravidlech
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="akce-dvojice">
          <button className="tlacitko-sekundarni" onClick={onZobrazitStatistiky}>
            Zobrazit statistiky
          </button>
          <button className="tlacitko-primarni" onClick={onNovyTest}>
            Nový test
          </button>
        </div>
      </div>
    </div>
  );
}
