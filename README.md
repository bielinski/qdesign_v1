# QDesign2

Desktopowa aplikacja do projektowania kwestionariuszy ankietowych.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3, `@dnd-kit`
- **Backend**: Tauri v2 (Rust) z pluginami `dialog` i `fs`
- **Testy**: Vitest
- **Eksport DOCX**: `docx` (npm)

## Główne funkcjonalności

### Model danych

- **Typy pytań**: `open` (otwarte), `single_choice` (jednokrotnego wyboru), `multiple_choice` (wielokrotnego wyboru), `semantic_scale` (skala semantyczna Osgooda), `numeric_scale` (skala numeryczna), `graphic_scale` (skala graficzna)
- **Skale**: polarity (bipolar/unipolar), leftLabel, rightLabel, points, pointLabels, minValue (wartość początkowa dla skali numerycznej)
- **Bloki**: grupowanie pytań z opcjonalną nazwą i opisem
- **Routing domyślny `next`**: bezwarunkowe przejście do wskazanego pytania
- **Routing warunkowy `optionRouting`** (`Record<number, string>`): dla każdej opcji wyboru lub punktu skali można wskazać pytanie docelowe; `next` służy jako fallback
- **Serializacja**: zapis/odczyt do plików `.qdesign` (JSON)

### Silnik ankietowy (`src/lib/SurveyEngine.ts`)

Klasa `SurveyEngine` z metodami: `add`, `insertAfter`, `delete`, `update`, `move`, `reorderBlock`, `renumber`, `validate`, `serialize`, `loadFromData`, `exportToDocx`.

- Automatyczne nadawanie ID w formacie `{prefix}.{nr}` (np. A.1, A.2, B.1)
- Zmiana kolejności pytań (przenoszenie między blokami) i bloków (`reorderBlock`)
- Po każdej zmianie kolejności aktualizacja referencji `next` i `optionRouting` (mapowanie old→new ID)
- Walidacja: zakres punktów skali, wymagane etykiety, referencje `next` i `optionRouting` (indeksy w zakresie, cele istnieją), minimalna liczba opcji (2 dla zamkniętych)
- Eksport DOCX z layoutem tożsamym z podglądem (tabele dla odpowiedzi, czcionka Arial, routing, polskie etykiety)

### Interfejs użytkownika

- **Toolbar** – edytowalny tytuł badania, licznik pytań/błędów, przyciski Otwórz/Zapisz/Zapisz jako/Nowy projekt, Eksportuj DOCX (nieblokowany przez błędy walidacji)
- **Sidebar** – lista bloków z pytaniami (pełna treść, bez ucinania). **Przeciąganie pytań** (zmiana kolejności wewnątrz i między blokami) oraz **przeciąganie bloków** dzięki `@dnd-kit`. Szerokość panelu można zmieniać przeciągając jego prawą krawędź (zapamiętywana w localStorage)
- **QuestionEditor** – formularz edycji pytania: treść, typ, skala (z konfigurowalną wartością początkową dla skali numerycznej), opcje, wymagalność, routing warunkowy (select przy każdej opcji/punkcie skali), routing domyślny (`next`). Lista dostępnych celów ograniczona do pytań po bieżącym
- **LivePreview** – podgląd kwestionariusza z widokiem respondenta, w tym tytuł badania na górze i informacje o regułach wejścia (np. "Zadaj pyt. A.3 jeśli w A.1 == 2 lub 3")

### Obsługa plików (`src/lib/projectIO.ts`)

- Zapis/odczyt przez natywne okno dialogowe (Tauri), rozszerzenie `.qdesign`
- Aplikacja zapamiętuje ścieżkę ostatniego pliku — „Zapisz projekt" nadpisuje ten sam plik bez pytania; „Zapisz jako" zawsze otwiera okno wyboru
- Ścieżka przechowywana w `localStorage`
- Fallback przez `blob`/`input` w przeglądarce

### Eksport DOCX

Generuje dokument `.docx` z layoutem tożsami z podglądem na żywo (czcionka Arial, tabele zamiast list):
- Tytuł badania jako nagłówek 1. rzędu (jeśli ustawiony)
- Bloki z nazwami i opisami (nagłówki 2. rzędu)
- Incoming routes (niebieska kursywa)
- ID + treść pytania + `*` (wymagane)
- Choice (`single_choice`, `multiple_choice`): tabela z trzema kolumnami (treść odpowiedzi, kod liczbowy, routing) lub dwoma (bez routingu); non-substantive option z kodem `99` oddzielona kreską
- Semantic scale: tabela analogiczna do choice (etykieta punktu, kod, routing)
- Numeric scale: tabela z dwoma wierszami — pierwszy: etykiety krańców, drugi: wartości liczbowe `minValue … minValue+points-1`; routing jako notka pod tabelą
- Graphic scale: tabela analogiczna do numerycznej (wartości `1 … points`); routing jako notka pod tabelą

## Uruchomienie

```bash
npm run dev          # dev server (port 1420)
npm run tauri dev    # aplikacja Tauri
npm test             # testy (vitest)
npm run build        # build produkcyjny
```

## Testy

28 testów dla klasy `SurveyEngine`: numerowanie ID, walidacja punktów/etykiet/referencji/opcji/routingu, move/insertAfter/delete/reorderBlock, eksport DOCX, edge case'y.

## Znane ograniczenia

- `nextBlockId` w `App.tsx` to zmienna modułowa (nie state) – reset przy odświeżeniu
- `ScalePolaritySelector` jest zdefiniowany ale nieużywany w `ScaleConfigurator`
