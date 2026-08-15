import { useEffect, useRef, useState } from 'react';
import { uryvkyProDotaz } from '../rules';
import type { ZpravaChatu } from '../types';

const UKAZKOVE_DOTAZY = [
  'Kdy se neodpíská zakázané uvolnění, když brankář opustí brankoviště?',
  'Útočník vjede do brankoviště a brankář nemůže zakročit. Platí gól?',
  'Jaký trest je za bodnutí špičkou hole, když ke kontaktu nedošlo?',
  'Kam se vhazuje po úmyslném ofsajdu?',
];

type Props = {
  maApiKlic: boolean;
  onOtevritNastaveni: () => void;
};

export function AiAssistant({ maApiKlic, onOtevritNastaveni }: Props) {
  const [zpravy, setZpravy] = useState<ZpravaChatu[]>([]);
  const [vstup, setVstup] = useState('');
  const [nacita, setNacita] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);
  const konecRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    konecRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [zpravy, nacita]);

  async function odeslat(text: string) {
    const dotaz = text.trim();
    if (!dotaz || nacita) return;

    setChyba(null);
    setVstup('');
    const noveZpravy: ZpravaChatu[] = [...zpravy, { role: 'user', text: dotaz }];
    setZpravy(noveZpravy);
    setNacita(true);

    // Relevantní pravidla vyhledáme lokálně a pošleme modelu jako kontext (RAG),
    // aby odpovídal ze skutečného znění pravidel, ne z paměti.
    const uryvky = uryvkyProDotaz(dotaz);
    const historieProModel = zpravy.slice(-6).map((z) => ({ role: z.role, text: z.text }));

    const vysledek = await window.asistent.zeptejSe(dotaz, uryvky, historieProModel);
    setNacita(false);

    if (vysledek.ok) {
      setZpravy([
        ...noveZpravy,
        { role: 'assistant', text: vysledek.odpoved, zdroje: uryvky.slice(0, 5).map((u) => u.odkaz) },
      ]);
    } else {
      setChyba(vysledek.chyba);
    }
  }

  if (!maApiKlic) {
    return (
      <div className="karta">
        <div className="panel">
          <h2>AI asistent</h2>
          <p className="podnadpis">
            Zeptej se vlastními slovy na jakoukoli situaci nebo pravidlo. Asistent hledá odpověď
            přímo ve znění pravidel 2025/26 a uvádí, ze kterého pravidla vychází.
          </p>
          <div className="prazdny-stav">
            <p>Pro použití asistenta je potřeba API klíč od Anthropic.</p>
            <button className="tlacitko-primarni" style={{ maxWidth: 260, margin: '16px auto 0' }} onClick={onOtevritNastaveni}>
              Přejít do Nastavení
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="karta">
      <div className="panel panel-chat">
        <h2>AI asistent</h2>
        <p className="podnadpis">
          Zeptej se vlastními slovy. Odpovědi vycházejí ze znění pravidel 2025/26 a odkazují na
          konkrétní pravidlo — vždy si je u sporných situací ověř v plném znění.
        </p>

        <div className="chat-zpravy">
          {zpravy.length === 0 && (
            <div className="ukazkove-dotazy">
              {UKAZKOVE_DOTAZY.map((d) => (
                <button key={d} className="ukazkovy-dotaz" onClick={() => odeslat(d)}>
                  {d}
                </button>
              ))}
            </div>
          )}

          {zpravy.map((z, i) => (
            <div key={i} className={`chat-zprava ${z.role}`}>
              <div className="chat-bublina">{z.text}</div>
              {z.zdroje && z.zdroje.length > 0 && (
                <div className="chat-zdroje">
                  <span className="zdroje-popisek">Vycházelo z:</span>
                  {z.zdroje.map((zd) => (
                    <span className="zdroj-stitek" key={zd}>
                      {zd}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {nacita && (
            <div className="chat-zprava assistant">
              <div className="chat-bublina nacita">Hledám v pravidlech…</div>
            </div>
          )}

          {chyba && <div className="chat-chyba">{chyba}</div>}
          <div ref={konecRef} />
        </div>

        <form
          className="chat-vstup"
          onSubmit={(e) => {
            e.preventDefault();
            odeslat(vstup);
          }}
        >
          <input
            className="vstup"
            placeholder="Popiš situaci nebo se zeptej na pravidlo…"
            value={vstup}
            onChange={(e) => setVstup(e.target.value)}
            disabled={nacita}
          />
          <button className="tlacitko-primarni tlacitko-uzke" type="submit" disabled={nacita || !vstup.trim()}>
            Odeslat
          </button>
        </form>
      </div>
    </div>
  );
}
