import { useEffect } from 'react';
import type { PointLabel } from '../../lib/types';

interface PointLabelsEditorProps {
  pointCount: number;
  pointLabels: PointLabel[];
  onChange: (labels: PointLabel[]) => void;
  error?: string;
  showEndpoints?: boolean;
}

export function PointLabelsEditor({ pointCount, pointLabels, onChange, error, showEndpoints }: PointLabelsEditorProps) {
  useEffect(() => {
    if (pointLabels.length !== pointCount) {
      const updated = synchronizeLabels(pointLabels, pointCount);
      onChange(updated);
    }
  }, [pointCount, pointLabels, onChange]);

  const updateLabel = (index: number, label: string) => {
    const updated = pointLabels.map(pl =>
      pl.index === index ? { ...pl, label } : pl,
    );
    onChange(updated);
  };

  const rowStyling = (isFirst: boolean, isLast: boolean) => {
    if (isFirst) return 'border-l-2 border-blue-400 bg-blue-50/30';
    if (isLast) return 'border-l-2 border-blue-400 bg-blue-50/30';
    return '';
  };

  return (
    <div>
      <label className="label">Słowne opisy punktów skali</label>
      <div className="space-y-1.5">
        {Array.from({ length: pointCount }, (_, i) => {
          const idx = i + 1;
          const isFirst = idx === 1;
          const isLast = idx === pointCount;
          const existing = pointLabels.find(pl => pl.index === idx);
          return (
            <div key={idx} className={`flex items-center gap-2 px-1 py-0.5 rounded ${rowStyling(isFirst, isLast)}`}>
              <span className="w-6 text-xs text-gray-400 text-right font-mono shrink-0">
                {idx}.
              </span>
              <input
                type="text"
                value={existing?.label ?? ''}
                onChange={e => updateLabel(idx, e.target.value)}
                className="input flex-1"
                placeholder={showEndpoints && isFirst ? 'Lewy biegun (punkt 1)' : showEndpoints && isLast ? 'Prawy biegun (punkt ' + pointCount + ')' : `Opis punktu ${idx}...`}
              />
              {showEndpoints && isFirst && (
                <span className="text-[10px] text-blue-500 font-medium shrink-0">lewy biegun</span>
              )}
              {showEndpoints && isLast && (
                <span className="text-[10px] text-blue-500 font-medium shrink-0">prawy biegun</span>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

function synchronizeLabels(labels: PointLabel[], targetCount: number): PointLabel[] {
  const existing = new Map(labels.map(pl => [pl.index, pl]));
  const result: PointLabel[] = [];

  for (let i = 1; i <= targetCount; i++) {
    const existingLabel = existing.get(i);
    result.push(existingLabel ?? { index: i, label: '' });
  }

  return result;
}
