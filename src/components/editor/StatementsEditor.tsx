import { useRef, useEffect } from 'react';

interface StatementsEditorProps {
  statements: string[];
  onChange: (statements: string[]) => void;
  error?: string;
}

export function StatementsEditor({ statements, onChange, error }: StatementsEditorProps) {
  const lastInputRef = useRef<HTMLInputElement>(null);

  const addStatement = () => onChange([...statements, '']);

  useEffect(() => {
    lastInputRef.current?.focus();
  }, [statements.length]);

  const removeStatement = (index: number) => {
    if (statements.length <= 2) return;
    onChange(statements.filter((_, i) => i !== index));
  };

  const updateStatement = (index: number, value: string) => {
    onChange(statements.map((s, i) => (i === index ? value : s)));
  };

  return (
    <div>
      <label className="label">Stwierdzenia (wiersze macierzy)</label>
      <div className="space-y-1.5">
        {statements.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-xs text-gray-400 text-right font-mono shrink-0">
              {i + 1}.
            </span>
            <input
              ref={i === statements.length - 1 ? lastInputRef : undefined}
              type="text"
              value={s}
              onChange={e => updateStatement(i, e.target.value)}
              className="input flex-1"
              placeholder={`Stwierdzenie ${i + 1}...`}
            />
            <button
              type="button"
              onClick={() => removeStatement(i)}
              disabled={statements.length <= 2}
              className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Usuń stwierdzenie"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStatement}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Dodaj stwierdzenie
      </button>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
