import { useRef, useEffect } from 'react';

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
  error?: string;
}

export function OptionsEditor({ options, onChange, error }: OptionsEditorProps) {
  const lastInputRef = useRef<HTMLInputElement>(null);

  const addOption = () => onChange([...options, '']);

  useEffect(() => {
    lastInputRef.current?.focus();
  }, [options.length]);

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    onChange(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    onChange(options.map((opt, i) => (i === index ? value : opt)));
  };

  return (
    <div>
      <label className="label">Opcje odpowiedzi</label>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 text-xs text-gray-400 text-right font-mono shrink-0">
              {i + 1}.
            </span>
            <input
              ref={i === options.length - 1 ? lastInputRef : undefined}
              type="text"
              value={opt}
              onChange={e => updateOption(i, e.target.value)}
              className="input flex-1"
              placeholder={`Opcja ${i + 1}...`}
            />
            <button
              type="button"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              className="shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Usuń opcję"
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
        onClick={addOption}
        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        + Dodaj opcję
      </button>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
