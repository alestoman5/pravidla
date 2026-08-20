import { useEffect, useMemo, useState } from 'react';
import { KATEGORIE } from '../data/categories';
import type { NastaveniTestu, OdpovedNaOtazku, Otazka, Pokus, ZdrojOtazky } from '../types';
import { zamichej, noveId } from '../utils';

type Props = {
  otazky: Otazka[];
  nastaveni: NastaveniTestu;
  onDokonceno: (pokus: Pokus) => void;
  onZrusit: () => void;
};

function nazevKategorie(klic: string): string {
  return KATEGORIE.find((k) => k.klic === klic)?.nazev ?? klic;
}

const NAZVY_OBTIZNOSTI: Record<string, string> = {
  zacatecnik: 'začátečník',
  pokrocily: 'pokročilý',
  expert: 'expert',
};

const ZDROJ_STITEK: Record<ZdrojOtazky, string> = {
  pravidlo: 'Pravidla',
  situace: 'Situace',
  tabulka: 'Krácení',
};

const PISMENA = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizSession({ otazky, nastaveni, onDokonceno, onZrusit }: Props) {
  const [index, setIndex] = useState(0);
  const [odpovedi, setOdpovedi] = useState<OdpovedNaOtazku[]>([]);
  const [vybrano, setVybrano] = useState<number[]>([]);
  const [potvrzeno, setPotvrzeno] = useState(false);
  const [zbyvaSekund, setZbyvaSekund] = useState(
    nastaveni.casovyLimitMin ? nastaveni.casovyLimitMin * 60 : null,
  );

  const otazka = otazky[index];
  // Pořadí možností se zamíchá jednou na otázku, aby správná odpověď nebyla vždy na stejném místě.
  const poradiMoznosti = useMemo(
    () => zamichej(otazka.moznosti.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [otazka.id],
  );
  const jeVicenasobna = otazka.spravne.length > 1;

  function dokoncitTest(finalniOdpovedi: OdpovedNaOtazku[]) {
    const kategorie =
      nastaveni.okruhy.length === KATEGORIE.length
        ? 'vse'
        : `${nastaveni.okruhy.length}/${KATEGORIE.length} okruhů`;
    const pokus: Pokus = {
      id: noveId(),
      datum: new Date().toISOString(),
      kategorie,
      obtiznost: nastaveni.obtiznost,
      pocetOtazek: otazky.length,
      pocetSpravnych: finalniOdpovedi.filter((o) => o.spravne).length,
      odpovedi: finalniOdpovedi,
    };
    onDokonceno(pokus);
  }

  // Odpočet časového limitu; po vypršení se test ukončí s dosud danými odpověďmi.
  useEffect(() => {
    if (zbyvaSekund === null) return;
    if (zbyvaSekund <= 0) {
      dokoncitTest(odpovedi);
      return;
    }
    const id = setTimeout(() => setZbyvaSekund((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zbyvaSekund]);

  function prepnoutVyber(originalniIndex: number) {
    if (potvrzeno) return;
    if (jeVicenasobna) {
      setVybrano((prev) =>
        prev.includes(originalniIndex)
          ? prev.filter((i) => i !== originalniIndex)
          : [...prev, originalniIndex],
      );
    } else {
      setVybrano([originalniIndex]);
    }
  }

  function potvrditOdpoved() {
    if (vybrano.length === 0) return;
    setPotvrzeno(true);
    const spravneSerazene = [...otazka.spravne].sort((a, b) => a - b);
    const vybranoSerazene = [...vybrano].sort((a, b) => a - b);
    const jeSpravne =
      spravneSerazene.length === vybranoSerazene.length &&
      spravneSerazene.every((v, i) => v === vybranoSerazene[i]);
    setOdpovedi((prev) => [...prev, { otazkaId: otazka.id, vybrano, spravne: jeSpravne }]);
  }

  function dalsiOtazka() {
    if (index + 1 < otazky.length) {
      setIndex(index + 1);
      setVybrano([]);
      setPotvrzeno(false);
    } else {
      dokoncitTest(odpovedi);
    }
  }

  const casDochazi = zbyvaSekund !== null && zbyvaSekund <= 30;

  return (
    <div className="karta karta-siroka">
      <div className="progres">
        <div className="progres-lista">
          <div
            className="progres-vyplnena"
            style={{ width: `${Math.round((index / otazky.length) * 100)}%` }}
          />
        </div>
        {zbyvaSekund !== null && (
          <span className={`odpocet ${casDochazi ? 'dochazi' : ''}`}>{formatujCas(zbyvaSekund)}</span>
        )}
        <button className="tlacitko-sekundarni" onClick={onZrusit}>
          Ukončit
        </button>
      </div>

      <div className="panel">
        <div className="otazka-hlavicka">
          <span className="otazka-poradi">
            OTÁZKA <strong>{index + 1}</strong> Z {otazky.length}
          </span>
          <span className={`zdroj-pilulka zdroj-${otazka.zdroj}`}>{ZDROJ_STITEK[otazka.zdroj]}</span>
        </div>
        <span className="stitek">
          {nazevKategorie(otazka.kategorie)} · {NAZVY_OBTIZNOSTI[otazka.obtiznost]}
        </span>

        {otazka.situace && <SituaceKontext situace={otazka.situace} />}

        <div className="otazka-text">{otazka.text}</div>
        {jeVicenasobna && (
          <div className="vicenasobna-znacka">
            <span className="vicenasobna-ikona">⧉</span>
            Otázka má {otazka.spravne.length} správné odpovědi
          </div>
        )}

        {poradiMoznosti.map((originalniIndex, poradi) => {
          const jeVybrana = vybrano.includes(originalniIndex);
          const jeSpravnaMoznost = otazka.spravne.includes(originalniIndex);
          let trida = 'moznost';
          if (potvrzeno) {
            if (jeSpravnaMoznost) trida += ' spravna';
            else if (jeVybrana) trida += ' chybna';
          } else if (jeVybrana) {
            trida += ' vybrana';
          }
          return (
            <button
              key={originalniIndex}
              className={trida}
              onClick={() => prepnoutVyber(originalniIndex)}
              disabled={potvrzeno}
            >
              <span className="moznost-pismeno">{PISMENA[poradi]}</span>
              <span className="moznost-text">{otazka.moznosti[originalniIndex]}</span>
            </button>
          );
        })}

        {potvrzeno && (
          <div className="vysvetleni-box">
            <div>{otazka.vysvetleni}</div>
            <div className="pravidlo-ref">📖 {otazka.pravidlo}</div>
          </div>
        )}

        <div className="akce-radek">
          {!potvrzeno ? (
            <button
              className="tlacitko-primarni"
              onClick={potvrditOdpoved}
              disabled={vybrano.length === 0}
            >
              Potvrdit odpověď
            </button>
          ) : (
            <button className="tlacitko-primarni" onClick={dalsiOtazka}>
              {index + 1 < otazky.length ? 'Další otázka' : 'Zobrazit výsledek'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SituaceKontext({ situace }: { situace: NonNullable<Otazka['situace']> }) {
  if (situace.typ === 'tabulka-trestu') {
    return (
      <div className="situace-tabulka">
        {(['A', 'B'] as const).map((tym) => (
          <div className="situace-tym-sloupec" key={tym}>
            <div className="situace-tym-hlavicka">
              <span className={`situace-tecka situace-tecka-${tym}`} />
              Tým {tym === 'A' ? situace.tymA : situace.tymB}
            </div>
            {situace.tresty
              .filter((t) => t.tym === tym)
              .map((t, i) => (
                <div className="situace-radek-trestu" key={i}>
                  <span>{t.hrac}</span>
                  <span className="situace-trest-stitek">{t.trest}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="situace-osa">
      <div className="situace-osa-hlavicka">
        <span>TÝM A</span>
        <span>ČAS</span>
        <span>TÝM B</span>
      </div>
      {situace.udalosti.map((u, i) => (
        <div className="situace-osa-radek" key={i}>
          <div className="situace-osa-strana">
            {u.tym === 'A' && <span className="situace-osa-stitek">{u.popis}</span>}
          </div>
          <div className="situace-osa-stred">
            <span className="situace-osa-tecka" />
            <span className="situace-osa-cas">{u.cas}</span>
          </div>
          <div className="situace-osa-strana">
            {u.tym === 'B' && <span className="situace-osa-stitek">{u.popis}</span>}
            {!u.tym && <span className={`situace-osa-stitek situace-osa-${u.zvyrazneni ?? ''}`}>{u.popis}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatujCas(sekundy: number): string {
  const m = Math.floor(sekundy / 60);
  const s = sekundy % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
