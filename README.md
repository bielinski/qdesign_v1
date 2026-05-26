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
- **Skale**: polarity (bipolar/unipolar), leftLabel, rightLabel, points, pointLabels
- **Bloki**: grupowanie pytań z opcjonalną nazwą i opisem
- **Routing domyślny `next`**: bezwarunkowe przejście do wskazanego pytania
- **Routing warunkowy `optionRouting`** (`Record<number, string>`): dla każdej opcji wyboru lub punktu skali można wskazać pytanie docelowe; `next` służy jako fallback
- **Serializacja**: zapis/odczyt do plików `.qdesign2` (JSON)

### Silnik ankietowy (`src/lib/SurveyEngine.ts`)

Klasa `SurveyEngine` z metodami: `add`, `insertAfter`, `delete`, `update`, `move`, `reorderBlock`, `renumber`, `validate`, `serialize`, `loadFromData`, `exportToDocx`.

- Automatyczne nadawanie ID w formacie `{prefix}.{nr}` (np. A.1, A.2, B.1)
- Zmiana kolejności pytań (przenoszenie między blokami) i bloków (`reorderBlock`)
- Po każdej zmianie kolejności aktualizacja referencji `next` i `optionRouting` (mapowanie old→new ID)
- Walidacja: zakres punktów skali, wymagane etykiety, referencje `next` i `optionRouting` (indeksy w zakresie, cele istnieją), minimalna liczba opcji (2 dla zamkniętych)
- Eksport DOCX z layoutem tożsamym z podglądem (listy, wizualizacje skal, routing, polskie etykiety)

### Interfejs użytkownika

- **Toolbar** – licznik pytań/błędów, przyciski Otwórz/Zapisz/Nowy projekt, Eksportuj DOCX (nieblokowany przez błędy walidacji)
- **Sidebar** – lista bloków z pytaniami. **Przeciąganie pytań** (zmiana kolejności wewnątrz i między blokami) oraz **przeciąganie bloków** dzięki `@dnd-kit`
- **QuestionEditor** – formularz edycji pytania: treść, typ, skala, opcje, wymagalność, routing warunkowy (select `→` przy każdej opcji/punkcie skali), routing domyślny (`next`). Lista dostępnych celów ograniczona do pytań po bieżącym
- **LivePreview** – podgląd kwestionariusza z widokiem respondenta, w tym informacje o regułach wejścia (np. "Zadaj pyt. A.3 jeśli w A.1 == 2 lub 3")

### Obsługa plików (`src/lib/projectIO.ts`)

- Zapis/odczyt przez natywne okno dialogowe (Tauri, gdy uruchomione jako aplikacja desktopowa), permisja `fs:allow-write-text-file` + `fs:allow-write-file` dla `$HOME/**`
- Fallback przez `blob`/`input` w przeglądarce

### Eksport DOCX

Generuje dokument `.docx` z layoutem tożsami z podglądem na żywo:
- Bloki z nazwami i opisami
- Incoming routes (niebieska kursywa)
- ID + treść pytania + `*` (wymagane)
- Choice: `○`/`☐` z opcjami i routingiem per opcja
- Semantic scale: lista `○` z etykietami i routingiem per punkt
- Numeric scale: endpointy + zakres liczb `0 1 2 ... N` + routing per wartość
- Graphic scale: endpointy + wizualny pasek `█░█` + routing per punkt
- Non-substantive option jako osobna pozycja z separatorem

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
