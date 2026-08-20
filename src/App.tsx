import { useEffect, useState } from 'react';
import { QuizSetup } from './components/QuizSetup';
import { QuizSession } from './components/QuizSession';
import { ResultSummary } from './components/ResultSummary';
import { StatsHistory } from './components/StatsHistory';
import { RulebookBrowser } from './components/RulebookBrowser';
import { AiAssistant } from './components/AiAssistant';
import { Settings } from './components/Settings';
import { progressStore } from './store/progress';
import type { NastaveniTestu, Otazka, Pokus } from './types';

type Pohled = 'setup' | 'quiz' | 'result' | 'stats' | 'pravidla' | 'asistent' | 'nastaveni';

const ZALOZKY: { klic: Pohled; nazev: string }[] = [
  { klic: 'setup', nazev: 'Nový test' },
  { klic: 'stats', nazev: 'Statistiky' },
  { klic: 'pravidla', nazev: 'Pravidla' },
  { klic: 'asistent', nazev: 'AI asistent' },
  { klic: 'nastaveni', nazev: 'Nastavení' },
];

export default function App() {
  const [pohled, setPohled] = useState<Pohled>('setup');
  const [aktivniOtazky, setAktivniOtazky] = useState<Otazka[]>([]);
  const [aktivniNastaveni, setAktivniNastaveni] = useState<NastaveniTestu | null>(null);
  const [posledniPokus, setPosledniPokus] = useState<Pokus | null>(null);
  const [maApiKlic, setMaApiKlic] = useState(false);
  const [dotazNaPravidlo, setDotazNaPravidlo] = useState('');

  useEffect(() => {
    window.nastaveni.nacti().then((n) => setMaApiKlic(n.maApiKlic));
  }, []);

  function spustitTest(otazky: Otazka[], nastaveni: NastaveniTestu) {
    setAktivniOtazky(otazky);
    setAktivniNastaveni(nastaveni);
    setPohled('quiz');
  }

  async function dokoncitTest(pokus: Pokus) {
    await progressStore.pridej(pokus);
    setPosledniPokus(pokus);
    setPohled('result');
  }

  /**
   * Proklik z rozboru odpovědí rovnou na příslušné pravidlo v prohlížeči.
   * Odkaz může uvádět víc sekcí („Pravidlo 78.4, 78.5 – Góly“); do vyhledávání
   * pošleme jen první číslo, jinak by dotaz neodpovídal žádné sekci.
   */
  function otevritPravidlo(odkaz: string) {
    const cislo = odkaz.match(/\d{1,3}(?:\.\d{1,2})?/);
    setDotazNaPravidlo(cislo ? cislo[0] : odkaz);
    setPohled('pravidla');
  }

  const jeVKvizu = pohled === 'quiz';

  return (
    <div className="app">
      <header className="hlavicka">
        <h1>🏒 Pravidla hokeje 2026/27</h1>
        <nav>
          {ZALOZKY.map((z) => (
            <button
              key={z.klic}
              className={pohled === z.klic ? 'aktivni' : ''}
              onClick={() => setPohled(z.klic)}
              disabled={jeVKvizu}
              title={jeVKvizu ? 'Nejdřív dokonči nebo ukonči test' : undefined}
            >
              {z.nazev}
            </button>
          ))}
        </nav>
      </header>

      <main className="obsah">
        {pohled === 'setup' && <QuizSetup onSpustit={spustitTest} />}

        {pohled === 'quiz' && aktivniNastaveni && (
          <QuizSession
            otazky={aktivniOtazky}
            nastaveni={aktivniNastaveni}
            onDokonceno={dokoncitTest}
            onZrusit={() => setPohled('setup')}
          />
        )}

        {pohled === 'result' && posledniPokus && (
          <ResultSummary
            pokus={posledniPokus}
            onNovyTest={() => setPohled('setup')}
            onZobrazitStatistiky={() => setPohled('stats')}
            onOtevritPravidlo={otevritPravidlo}
          />
        )}

        {pohled === 'stats' && <StatsHistory />}

        {pohled === 'pravidla' && (
          <RulebookBrowser key={dotazNaPravidlo} vychoziDotaz={dotazNaPravidlo} />
        )}

        {pohled === 'asistent' && (
          <AiAssistant maApiKlic={maApiKlic} onOtevritNastaveni={() => setPohled('nastaveni')} />
        )}

        {pohled === 'nastaveni' && <Settings maApiKlic={maApiKlic} onZmena={setMaApiKlic} />}
      </main>
    </div>
  );
}
