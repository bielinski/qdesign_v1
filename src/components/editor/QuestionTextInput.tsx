interface QuestionTextInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function QuestionTextInput({ value, onChange, error }: QuestionTextInputProps) {
  return (
    <div>
      <label htmlFor="question-text" className="label">
        Treść pytania <span className="text-gray-300">*</span>
      </label>
      <textarea
        id="question-text"
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className={`input resize-none ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''}`}
        placeholder="Wpisz treść pytania..."
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
