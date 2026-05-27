interface NumericScaleVisualProps {
  leftLabel: string;
  rightLabel: string;
  points: number;
  minValue: number;
}

export function NumericScaleVisual({ leftLabel, rightLabel, points, minValue }: NumericScaleVisualProps) {
  return (
    <div className="text-xs text-gray-600 bg-gray-50 rounded-md px-3 py-2.5 space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-gray-500 truncate max-w-[40%]">{leftLabel || '(lewy biegun)'}</span>
        <span className="text-gray-300">—</span>
        <span className="text-gray-500 truncate max-w-[40%]">{rightLabel || '(prawy biegun)'}</span>
      </div>
      <div className="flex justify-between">
        {Array.from({ length: points }, (_, i) => (
          <span key={i} className="text-[10px] font-mono text-gray-400">
            {i + minValue}
          </span>
        ))}
      </div>
    </div>
  );
}
