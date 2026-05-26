interface NextQuestionSelectorProps {
  value: string | undefined;
  options: { id: string; label: string }[];
  onChange: (value: string | undefined) => void;
}

export function NextQuestionSelector({ value, options, onChange }: NextQuestionSelectorProps) {
  return (
    <div>
      <label htmlFor="next-question" className="label">
        Pytanie docelowe (next)
      </label>
      <select
        id="next-question"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="input"
      >
        <option value="">— brak —</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.id}: {opt.label}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-gray-400 mt-0.5">
        Jeśli puste, kolejne pytanie w bloku.
      </p>
    </div>
  );
}
