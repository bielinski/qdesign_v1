import type { QuestionType } from '../../lib/types';

interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (value: QuestionType) => void;
}

const TYPES: { value: QuestionType; label: string; desc: string }[] = [
  { value: 'open', label: 'Otwarte', desc: 'Dowolna odpowiedź tekstowa' },
  { value: 'single_choice', label: 'Jednokrotnego wyboru', desc: 'Jedna z wielu opcji' },
  { value: 'multiple_choice', label: 'Wielokrotnego wyboru', desc: 'Wiele opcji do wyboru' },
  { value: 'semantic_scale', label: 'Skala semantyczna', desc: 'Różnic semantyczny (Osgood)' },
  { value: 'numeric_scale', label: 'Skala numeryczna', desc: 'Ocena liczbowa' },
  { value: 'graphic_scale', label: 'Skala graficzna', desc: 'Wizualna skala odpowiedzi' },
  { value: 'statement_scale', label: 'Ocena stwierdzeń', desc: 'Macierzowa ocena stwierdzeń na skali' },
];

export function QuestionTypeSelector({ value, onChange }: QuestionTypeSelectorProps) {
  return (
    <div>
      <label htmlFor="question-type" className="label">
        Typ pytania
      </label>
      <select
        id="question-type"
        value={value}
        onChange={e => onChange(e.target.value as QuestionType)}
        className="input"
      >
        {TYPES.map(t => (
          <option key={t.value} value={t.value}>
            {t.label} — {t.desc}
          </option>
        ))}
      </select>
    </div>
  );
}
