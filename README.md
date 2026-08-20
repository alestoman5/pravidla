# Pravidla hokeje 2026/27

Desktopová appka (Electron + React + TypeScript) na učení a testování z pravidel ledního hokeje 2026/27 (IIHF / ČSLH) — obdoba [arbitro.app](https://arbitro.app/), ale offline a bez účtu.
Kompaktní verze dostupná na : https://www.rozhodci.fun/pravidla

## Funkce

**Kvíz**
- 1 500 otázek ve 12 kategoriích (odpovídají 12 oficiálním částem pravidel ČÁST 01–12), 3 úrovně obtížnosti
- Otázky rozlišené podle zdroje: přímé dotazy na znění pravidel, herní situace a strukturované otázky na souběžné tresty (tabulka / časová osa)
- Konfigurace testu na míru: rozsah, poměr zdrojů otázek (s přednastavenými profily), preference výběru (bez preference / málo viděné / dříve chybované), okruhy (jednotlivé části pravidel lze zapínat/vypínat), časový limit
- Otázky s jednou i více správnými odpověďmi
- Okamžitá zpětná vazba s vysvětlením a odkazem na konkrétní pravidlo

**Rozbor výsledků**
- Otázku po otázce: tvoje odpověď vs. správná, vysvětlení, proklik do plného znění pravidla
- Filtr „jen chyby“

**Statistiky**
- Graf vývoje úspěšnosti v čase
- Úspěšnost podle kategorií (částí pravidel) seřazená od nejslabší
- Kompletní historie testů

**Prohlížeč pravidel**
- Plné znění pravidel 2026/27 offline — 93 pravidel, cca 470 sekcí
- Fulltextové vyhledávání (funguje i bez diakritiky) a hledání podle čísla pravidla (`81.3`)

**AI asistent** (volitelný, vyžaduje vlastní API klíč)
- Zeptáš se vlastními slovy na situaci nebo pravidlo
- Appka najde relevantní pasáže v pravidlech a pošle je modelu jako kontext, takže odpověď vychází ze skutečného znění a odkazuje na číslo pravidla
- Klíč se ukládá jen lokálně, zašifrovaný operačním systémem (`safeStorage`), a do rendereru se nikdy nedostane — API se volá z hlavního procesu

## Vývoj

> **Před prvním spuštěním:** `src/data/rulebook.json` (plné znění pravidel) není
> součástí repozitáře, protože jde o copyrightovaný text IIHF/ČSLH — appka bez
> něj nejde sestavit. Vygeneruj si ho z vlastní kopie oficiálního PDF podle
> sekce [Aktualizace pravidel na novou sezónu](#aktualizace-pravidel-na-novou-sezónu).

```bash
npm install
npm run dev       # Vite dev server + Electron s hot-reloadem
npm run typecheck # jen TypeScript kontrola
```

## Produkční build

```bash
npm run build      # instalovatelný .exe (electron-builder, NSIS) do release/
npm run build:dir  # jen nezabalená appka do release/win-unpacked (rychlejší pro test)
```

> **Jednorázové nastavení na Windows:** `electron-builder` si při prvním buildu stahuje i nástroje pro macOS code-signing, jejichž rozbalení vyžaduje oprávnění k vytváření symbolických odkazů. Selže-li build na `Cannot create symbolic link`, zapněte jednou **Nastavení → Soukromí a zabezpečení → Pro vývojáře → Režim pro vývojáře**, nebo spusťte terminál jednou jako správce.

## Struktura

```
electron/
  main.ts          hlavní proces: historie, API klíč (safeStorage), volání Claude API
  preload.ts       IPC most do rendereru
src/
  components/      QuizSetup, QuizSession, ResultSummary, StatsHistory,
                   ProgressChart, RulebookBrowser, AiAssistant, Settings
  data/
    questions.json banka otázek
    rulebook.json  plné znění pravidel (strojově vytěžené z oficiálního PDF)
    categories.ts  kategorie = 12 částí pravidel, odvozeno přímo z rulebook.json
  rules.ts         index pravidel, fulltextové vyhledávání, výběr úryvků pro AI
  store/progress.ts
  types.ts
```

## Zdroje dat

- **Pravidla:** Pravidla ledního hokeje 2026/27 (IIHF Official Rulebook 2026/27, český překlad ČSLH) — text vytěžen z oficiálního PDF a rozdělen na části, pravidla a sekce.
- **Otázky:** kategorie otázek (`kategorie`) odpovídají 12 oficiálním částem pravidel (ČÁST 01–12), pole `zdroj` rozlišuje přímé dotazy na znění pravidel (`pravidlo`), otázky popisující konkrétní herní situaci (`situace`) a strukturované otázky na souběžné tresty s tabulkou/časovou osou (`tabulka`, pole `situace` v datech). Každá otázka odkazuje na konkrétní pravidlo. Otázky ze starších testů, které dnešní pravidla už neznají, zařazeny nejsou.

## Rozšiřování otázek

Nové otázky se přidávají do `src/data/questions.json`:

```jsonc
{
  "id": "druhy-trestu-n231",  // unikátní; kategorie a id na sobě nemusí záviset (id → kategorie
                               // se dohledává v datech, ne parsováním prefixu)
  "kategorie": "druhy-trestu", // klíč z KATEGORIE v src/data/categories.ts (12 částí pravidel)
  "obtiznost": "pokrocily",    // zacatecnik | pokrocily | expert
  "zdroj": "pravidlo",         // pravidlo | situace | tabulka
  "text": "…",
  "moznosti": ["…", "…"],
  "spravne": [0],              // pole indexů; víc než jeden = otázka s více odpověďmi
  "vysvetleni": "…",
  "pravidlo": "Pravidlo 54.2 – Držení",
  "situace": null               // jen u zdroj: "tabulka" — { typ: "tabulka-trestu" | "casova-osa", … }
}
```

## Aktualizace pravidel na novou sezónu

Pravidla jsou strojově vytěžená z PDF skriptem, který si vygeneruje `rulebook.json`:

```bash
pdftotext -enc UTF-8 -layout pravidla.pdf pravidla.txt
node tools/parse-rules.mjs pravidla.txt src/data/rulebook.json
```

`tools/parse-rules.mjs` dělí text na části → pravidla → číslované sekce a odstraňuje záhlaví stránek, popisky obrázků a glyfy z Private Use Area. **Přepínač `-enc UTF-8` je nutný** — bez něj `pdftotext` u tohoto PDF ztratí diakritiku. Po aktualizaci je potřeba projít otázky, kterých se změna pravidel dotkla — zejména pokud se změní číslování pravidel, protože `categories.ts` odvozuje kategorie přímo ze skutečné struktury nového `rulebook.json`.

## Licence

Zdrojový kód je pod licencí [MIT](LICENSE). Plné znění pravidel (`rulebook.json`) není součástí repozitáře a řídí se copyrightem IIHF/ČSLH — viz výše.
