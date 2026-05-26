# QDesign2

Desktopowa aplikacja do projektowania kwestionariuszy ankietowych.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite 5, Tailwind CSS 3
- **Backend**: Tauri v2 (Rust) z pluginami `dialog` i `fs`
- **Testy**: Vitest
- **Eksport DOCX**: `docx` (npm)

## Główne funkcjonalności

### Model danych

- **Typy pytań**: `open` (otwarte), `single_choice` (jednokrotnego wyboru), `multiple_choice` (wielokrotnego wyboru), `semantic_scale` (skala semantyczna Osgooda), `numeric_scale` (skala numeryczna), `graphic_scale` (skala graficzna)
- **Skale**: polarity (bipolar/unipolar), leftLabel, rightLabel, points, pointLabels
- **Bloki**: grupowanie pytań z opcjonalną nazwą i opisem
- **Routing między pytaniami**: pole `next` wskazujące kolejne pytanie
- **Serializacja**: zapis/odczyt do plików `.qdesign2` (JSON)

### Silnik ankietowy (`src/lib/SurveyEngine.ts`)

Klasa `SurveyEngine` z metodami: `add`, `insertAfter`, `delete`, `update`, `move`, `renumber`, `validate`, `serialize`, `loadFromData`, `exportToDocx`.

- Automatyczne nadawanie ID w formacie `{prefix}.{nr}` (np. A.1, A.2, B.1)
- Walidacja: zakres punktów skali, wymagane etykiety, referencje `next`, minimalna liczba opcji (2 dla zamkniętych)
- Eksport DOCX z nagłówkami bloków, opisami, szczegółami skal i opcjami

### Interfejs użytkownika

- **Toolbar** – licznik pytań/błędów, przyciski Otwórz/Zapisz/Nowy projekt, Eksportuj DOCX
- **Sidebar** – lista bloków z pytaniami, dodawanie/usuwanie, edycja nazwy/opisu bloku
- **QuestionEditor** – formularz edycji pytania (treść, typ, skala, opcje, wymagalność, routing)
- **LivePreview** – podgląd kwestionariusza z widokiem respondenta

### Obsługa plików (`src/lib/projectIO.ts`)

- Zapis/odczyt przez natywne okno dialogowe (Tauri, gdy uruchomione jako aplikacja desktopowa)
- Fallback przez `blob`/`input` w przeglądarce

## Uruchomienie

```bash
npm run dev          # dev server (port 1420)
npm run tauri dev    # aplikacja Tauri
npm test             # testy (vitest)
npm run build        # build produkcyjny
```

## Testy

21 testów dla klasy `SurveyEngine`: numerowanie ID, walidacja punktów/etykiet/referencji/opcji, move/insertAfter/delete, eksport DOCX, edge case'y.

## Znane ograniczenia

- `nextBlockId` w `App.tsx` to zmienna modułowa (nie state) – reset przy odświeżeniu
- `ScalePolaritySelector` jest zdefiniowany ale nieużywany w `ScaleConfigurator`
