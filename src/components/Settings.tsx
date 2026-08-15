import { useState } from 'react';

type Props = {
  maApiKlic: boolean;
  onZmena: (maApiKlic: boolean) => void;
};

export function Settings({ maApiKlic, onZmena }: Props) {
  const [klic, setKlic] = useState('');
  const [uklada, setUklada] = useState(false);

  async function uloz() {
    if (!klic.trim()) return;
    setUklada(true);
    const stav = await window.nastaveni.ulozKlic(klic);
    setUklada(false);
    setKlic('');
    onZmena(stav.maApiKlic);
  }

  async function smaz() {
    const stav = await window.nastaveni.smazKlic();
    onZmena(stav.maApiKlic);
  }

  return (
    <div className="karta">
      <div className="panel">
        <h2>Nastavení</h2>

        <h3>API klíč pro AI asistenta</h3>
        <p className="podnadpis">
          AI asistent volá Claude API pod tvým vlastním účtem. Klíč se ukládá jen na tomto počítači,
          zašifrovaný operačním systémem, a nikam jinam se neposílá. Kvíz, statistiky i prohlížeč
          pravidel fungují bez něj.
        </p>

        {maApiKlic ? (
          <div className="stav-radek">
            <span className="stitek-ok">✓ Klíč je uložen</span>
            <button className="tlacitko-sekundarni" onClick={smaz}>
              Odstranit klíč
            </button>
          </div>
        ) : (
          <div className="pole">
            <label htmlFor="apiklic">Vlož API klíč</label>
            <div className="stav-radek">
              <input
                id="apiklic"
                className="vstup"
                type="password"
                placeholder="sk-ant-…"
                value={klic}
                onChange={(e) => setKlic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') uloz();
                }}
              />
              <button
                className="tlacitko-primarni tlacitko-uzke"
                onClick={uloz}
                disabled={uklada || !klic.trim()}
              >
                {uklada ? 'Ukládám…' : 'Uložit'}
              </button>
            </div>
            <p className="poznamka">
              Klíč získáš na console.anthropic.com → API Keys. Za volání API platíš podle svého
              účtu u Anthropic.
            </p>
          </div>
        )}

        <h3 style={{ marginTop: 32 }}>Data aplikace</h3>
        <p className="podnadpis">
          Historie testů i API klíč jsou uložené lokálně ve tvém uživatelském profilu. Historii
          můžeš vymazat v záložce Statistiky.
        </p>
      </div>
    </div>
  );
}
