interface ScalePointsInputProps {
  points: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  error?: string;
}

export function ScalePointsInput({ points, min, max, onChange, error }: ScalePointsInputProps) {
  return (
    <div>
      <label htmlFor="scale-points" className="label">
        Liczba punktów skali: <span className="font-mono text-blue-700">{points}</span>
      </label>
      <input
        id="scale-points"
        type="range"
        min={min}
        max={max}
        step={1}
        value={points}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-blue-700"
      />
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && <p className="error-text">{error}</p>}
      <p className="text-[10px] text-gray-400 mt-1">
        Zakres metodologiczny: {min}–{max} punktów.
      </p>
    </div>
  );
}
