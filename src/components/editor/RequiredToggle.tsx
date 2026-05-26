interface RequiredToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function RequiredToggle({ value, onChange }: RequiredToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="text-sm text-gray-700">Pytanie wymagane</span>
    </label>
  );
}
