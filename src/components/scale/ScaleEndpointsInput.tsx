interface ScaleEndpointsInputProps {
  leftLabel: string;
  rightLabel: string;
  onLeftChange: (value: string) => void;
  onRightChange: (value: string) => void;
  leftError?: string;
  rightError?: string;
}

export function ScaleEndpointsInput({
  leftLabel,
  rightLabel,
  onLeftChange,
  onRightChange,
  leftError,
  rightError,
}: ScaleEndpointsInputProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor="scale-left" className="label">
          Lewy biegun
        </label>
        <input
          id="scale-left"
          type="text"
          value={leftLabel}
          onChange={e => onLeftChange(e.target.value)}
          className={`input ${leftError ? 'border-red-400' : ''}`}
          placeholder="np. Bardzo złe"
        />
        {leftError && <p className="error-text">{leftError}</p>}
      </div>

      <div>
        <label htmlFor="scale-right" className="label">
          Prawy biegun
        </label>
        <input
          id="scale-right"
          type="text"
          value={rightLabel}
          onChange={e => onRightChange(e.target.value)}
          className={`input ${rightError ? 'border-red-400' : ''}`}
          placeholder="np. Bardzo dobre"
        />
        {rightError && <p className="error-text">{rightError}</p>}
      </div>
    </div>
  );
}
