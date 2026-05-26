interface NonSubstantiveOptionEditorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function NonSubstantiveOptionEditor({ value, onChange }: NonSubstantiveOptionEditorProps) {
  const enabled = value !== undefined;

  const toggle = (checked: boolean) => {
    onChange(checked ? 'Trudno powiedzieć' : undefined);
  };

  return (
    <div className="card p-3 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => toggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Dodaj opcję spoza kafeterii</span>
      </label>

      {enabled && (
        <div className="pl-6">
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className="input"
            placeholder="np. Trudno powiedzieć, Nie wiem, Nie mam zdania"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">
            Opcja wyświetlona na końcu listy odpowiedzi.
          </p>
        </div>
      )}
    </div>
  );
}
