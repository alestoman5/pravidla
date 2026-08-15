import { useState } from 'react';
import type { Pokus } from '../types';
import { formatujDatum } from '../utils';

// Souřadnicová soustava grafu. Spodní okraj zahrnuje i pásmo popisků osy X,
// aby se graf nikdy neořízl o vlastní osu.
const S = 720;
const V = 250;
const M = { nahore: 14, vpravo: 18, dole: 34, vlevo: 42 };
const PLOCHA_S = S - M.vlevo - M.vpravo;
const PLOCHA_V = V - M.nahore - M.dole;

const TICKY_Y = [0, 25, 50, 75, 100];

type Props = {
  pokusy: Pokus[];
};

export function ProgressChart({ pokusy }: Props) {
  const [aktivni, setAktivni] = useState<number | null>(null);

  // Jeden bod není vývoj — dlaždice se souhrnem nad grafem už tu hodnotu ukazují.
  if (pokusy.length < 2) {
    return (
      <div className="prazdny-stav prazdny-graf">
        Vývoj úspěšnosti se zobrazí po druhém dokončeném testu.
      </div>
    );
  }

  const body = pokusy.map((p, i) => ({
    i,
    pokus: p,
    uspesnost: Math.round((p.pocetSpravnych / p.pocetOtazek) * 100),
  }));

  const x = (i: number) => M.vlevo + (body.length === 1 ? PLOCHA_S / 2 : (i / (body.length - 1)) * PLOCHA_S);
  const y = (hodnota: number) => M.nahore + PLOCHA_V - (hodnota / 100) * PLOCHA_V;

  const cara = body.map((b) => `${x(b.i).toFixed(1)},${y(b.uspesnost).toFixed(1)}`).join(' ');
  const posledni = body[body.length - 1];
  const bodAktivni = aktivni !== null ? body[aktivni] : null;

  /** Převede pozici myši na index nejbližšího bodu — hit plocha tak pokrývá celý graf. */
  function najdiBod(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pomer = (e.clientX - rect.left) / rect.width;
    const vSouradnicich = pomer * S;
    const idx = Math.round(((vSouradnicich - M.vlevo) / PLOCHA_S) * (body.length - 1));
    setAktivni(Math.max(0, Math.min(body.length - 1, idx)));
  }

  return (
    <figure className="graf">
      <svg viewBox={`0 0 ${S} ${V}`} className="graf-svg" role="img"
        aria-label={`Vývoj úspěšnosti přes ${body.length} testů, poslední ${posledni.uspesnost} procent`}>
        {/* Mřížka a osa — plné vlasové linky, o odstín od povrchu */}
        {TICKY_Y.map((t) => (
          <g key={t}>
            <line
              x1={M.vlevo}
              x2={S - M.vpravo}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'graf-osa' : 'graf-mrizka'}
            />
            <text x={M.vlevo - 8} y={y(t) + 4} className="graf-popisek-osy" textAnchor="end">
              {t}%
            </text>
          </g>
        ))}

        {/* Crosshair aktivního bodu */}
        {bodAktivni && (
          <line
            x1={x(bodAktivni.i)}
            x2={x(bodAktivni.i)}
            y1={M.nahore}
            y2={M.nahore + PLOCHA_V}
            className="graf-crosshair"
          />
        )}

        <polyline points={cara} className="graf-cara" />

        {body.map((b) => (
          <circle
            key={b.pokus.id}
            cx={x(b.i)}
            cy={y(b.uspesnost)}
            r={aktivni === b.i ? 5.5 : 3.5}
            className="graf-bod"
          />
        ))}

        {/* Přímý popisek jen u posledního bodu — číslo u každého bodu je nečitelný šum */}
        {aktivni === null && (
          <text
            x={x(posledni.i) - 8}
            y={y(posledni.uspesnost) - 10}
            className="graf-popisek-hodnoty"
            textAnchor="end"
          >
            {posledni.uspesnost} %
          </text>
        )}

        {/* Popisky osy X: jen první a poslední, aby se nepřekrývaly */}
        <text x={M.vlevo} y={V - 10} className="graf-popisek-osy" textAnchor="start">
          {kratkeDatum(body[0].pokus.datum)}
        </text>
        <text x={S - M.vpravo} y={V - 10} className="graf-popisek-osy" textAnchor="end">
          {kratkeDatum(posledni.pokus.datum)}
        </text>

        <rect
          x={M.vlevo}
          y={M.nahore}
          width={PLOCHA_S}
          height={PLOCHA_V}
          fill="transparent"
          onMouseMove={najdiBod}
          onMouseLeave={() => setAktivni(null)}
        />
      </svg>

      <figcaption className="graf-popis">
        {bodAktivni ? (
          <>
            <strong>{bodAktivni.uspesnost} %</strong> — {bodAktivni.pokus.pocetSpravnych}/
            {bodAktivni.pokus.pocetOtazek} správně · {formatujDatum(bodAktivni.pokus.datum)}
          </>
        ) : (
          <>Úspěšnost jednotlivých testů v čase. Najeď myší na graf pro detail.</>
        )}
      </figcaption>
    </figure>
  );
}

function kratkeDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
}
