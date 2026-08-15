# Pravidla hokeje 2025/26

Desktopová appka (Electron + React + TypeScript) na učení a testování z pravidel ledního hokeje 2025/26 (IIHF / ČSLH) — obdoba [arbitro.app](https://arbitro.app/), ale offline a bez účtu.

## Funkce

**Kvíz**
- 106 otázek v 8 kategoriích, 3 úrovně obtížnosti
- Otázky s jednou i více správnými odpověďmi (lze filtrovat)
- Volitelný časový limit (5 / 10 / 20 minut)
- Režim opakování otázek, ve kterých jsi naposledy chyboval
- Okamžitá zpětná vazba s vysvětlením a odkazem na konkrétní pravidlo

**Rozbor výsledků**
- Otázku po otázce: tvoje odpověď vs. správná, vysvětlení, proklik do plného znění pravidla
- Filtr „jen chyby“

**Statistiky**
- Graf vývoje úspěšnosti v čase
- Úspěšnost podle kategorií seřazená od nejslabší
- Kompletní historie testů

**Prohlížeč pravidel**
- Plné znění pravidel 2025/26 offline — 93 pravidel, 477 sekcí
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
    categories.ts
  rules.ts         index pravidel, fulltextové vyhledávání, výběr úryvků pro AI
  store/progress.ts
  types.ts
```

## Zdroje dat

- **Pravidla:** [Pravidla ledního hokeje 2025/26](https://ceskyhokej.cz/) (IIHF Official Rulebook 2025/26 v1.1, červenec 2025, český překlad ČSLH) — text vytěžen z oficiálního PDF a rozdělen na pravidla a sekce.
- **Otázky:** formát a témata vycházejí ze zkušebních testů pro rozhodčí ČSLH; každá otázka je ověřena proti aktuálnímu znění pravidel 2025/26 a odkazuje na konkrétní pravidlo. Otázky ze starších testů, které dnešní pravidla už neznají (např. „trest ve hře“), zařazeny nejsou.

## Rozšiřování otázek

Nové otázky se přidávají do `src/data/questions.json`:

```jsonc
{
  "id": "tresty-18",          // unikátní; prefix = klíč kategorie (kvůli statistikám)
  "kategorie": "tresty",
  "obtiznost": "pokrocily",   // zacatecnik | pokrocily | expert
  "text": "…",
  "moznosti": ["…", "…"],
  "spravne": [0],             // pole indexů; víc než jeden = otázka s více odpověďmi
  "vysvetleni": "…",
  "pravidlo": "Pravidlo 54.2 – Držení"
}
```

## Aktualizace pravidel na novou sezónu

Pravidla jsou strojově vytěžená z PDF skriptem, který si vygeneruje `rulebook.json`:

```bash
pdftotext -enc UTF-8 -layout pravidla.pdf pravidla.txt
node tools/parse-rules.mjs pravidla.txt src/data/rulebook.json
```

`tools/parse-rules.mjs` dělí text na části → pravidla → číslované sekce a odstraňuje záhlaví stránek, popisky obrázků a glyfy z Private Use Area. **Přepínač `-enc UTF-8` je nutný** — bez něj `pdftotext` u tohoto PDF ztratí diakritiku. Po aktualizaci je potřeba projít otázky, kterých se změna pravidel dotkla.

## Licence

Zdrojový kód je pod licencí [MIT](LICENSE). Plné znění pravidel (`rulebook.json`) není součástí repozitáře a řídí se copyrightem IIHF/ČSLH — viz výše.
