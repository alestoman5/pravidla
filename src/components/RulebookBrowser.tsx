import { useMemo, useState } from 'react';
import { PRAVIDLA, POCET_PRAVIDEL, POCET_SEKCI, hledejSekce } from '../rules';
import type { Pravidlo } from '../types';

type Props = {
  /** Předvyplněný dotaz — používá se při prokliku z výsledku testu na pravidlo. */
  vychoziDotaz?: string;
};

export function RulebookBrowser({ vychoziDotaz = '' }: Props) {
  const [dotaz, setDotaz] = useState(vychoziDotaz);
  const [otevrenaCast, setOtevrenaCast] = useState<number | null>(PRAVIDLA[0]?.cislo ?? null);
  const [vybranePravidlo, setVybranePravidlo] = useState<Pravidlo | null>(null);

  const vysledky = useMemo(() => (dotaz.trim().length >= 2 ? hledejSekce(dotaz, 25) : []), [dotaz]);
  const hleda = dotaz.trim().length >= 2;

  return (
    <div className="karta karta-siroka">
      <div className="panel">
        <h2>Pravidla ledního hokeje 2026/27</h2>
        <p className="podnadpis">
          Kompletní znění — {POCET_PRAVIDEL} pravidel, {POCET_SECI_TEXT(POCET_SEKCI)}. Funguje offline.
        </p>

        <input
          className="vstup"
          type="search"
          placeholder="Hledat v pravidlech… (např. „zakázané uvolnění“ nebo „81.3“)"
          value={dotaz}
          onChange={(e) => setDotaz(e.target.value)}
        />

        {hleda ? (
          <div className="vysledky-hledani">
            <div className="pocet-vysledku">
              {vysledky.length === 0
                ? 'Nic nenalezeno — zkus jiná slova.'
                : `Nalezeno ${vysledky.length} ${vysledky.length === 1 ? 'sekce' : 'sekcí'}`}
            </div>
            {vysledky.map((v, i) => (
              <div className="vysledek" key={`${v.odkaz}-${i}`}>
                <div className="vysledek-odkaz">{v.odkaz}</div>
                <div className="vysledek-text">{v.text}</div>
                <div className="vysledek-cast">
                  ČÁST {v.cast.cislo} · {v.cast.nazev}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="prohlizec">
            <nav className="prohlizec-strom">
              {PRAVIDLA.map((cast) => (
                <div key={cast.cislo}>
                  <button
                    className={`strom-cast ${otevrenaCast === cast.cislo ? 'otevrena' : ''}`}
                    onClick={() =>
                      setOtevrenaCast(otevrenaCast === cast.cislo ? null : cast.cislo)
                    }
                  >
                    <span className="sipka">{otevrenaCast === cast.cislo ? '▾' : '▸'}</span>
                    {cast.nazev}
                  </button>
                  {otevrenaCast === cast.cislo && (
                    <div className="strom-pravidla">
                      {cast.pravidla.map((p) => (
                        <button
                          key={p.cislo}
                          className={`strom-pravidlo ${
                            vybranePravidlo?.cislo === p.cislo ? 'aktivni' : ''
                          }`}
                          onClick={() => setVybranePravidlo(p)}
                        >
                          <span className="cislo-pravidla">{p.cislo}</span> {p.nazev}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <article className="prohlizec-obsah">
              {vybranePravidlo ? (
                <>
                  <h3>
                    Pravidlo {vybranePravidlo.cislo} — {vybranePravidlo.nazev}
                  </h3>
                  {vybranePravidlo.uvod && <p className="pravidlo-uvod">{vybranePravidlo.uvod}</p>}
                  {vybranePravidlo.sekce.map((s) => (
                    <section className="pravidlo-sekce" key={s.cislo}>
                      <h4>
                        {s.cislo} {s.nazev}
                      </h4>
                      <p>{s.text}</p>
                    </section>
                  ))}
                </>
              ) : (
                <div className="prazdny-stav">
                  Vyber pravidlo vlevo, nebo použij vyhledávání nahoře.
                </div>
              )}
            </article>
          </div>
        )}
      </div>
    </div>
  );
}

/** České skloňování počtu sekcí (1 sekce / 2–4 sekce / 5+ sekcí). */
function POCET_SECI_TEXT(n: number): string {
  if (n === 1) return '1 sekce';
  if (n >= 2 && n <= 4) return `${n} sekce`;
  return `${n} sekcí`;
}
