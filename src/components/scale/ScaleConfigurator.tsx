import type { QuestionType, ScaleConfig, PointLabel } from '../../lib/types';
import type { FormFieldErrors } from '../../hooks/useQuestionForm';
import { ScaleEndpointsInput } from './ScaleEndpointsInput';
import { ScalePointsInput } from './ScalePointsInput';
import { PointLabelsEditor } from './PointLabelsEditor';
import { NumericScaleVisual } from './NumericScaleVisual';

interface ScaleConfiguratorProps {
  type: QuestionType;
  scaleConfig?: ScaleConfig;
  fieldErrors: FormFieldErrors;
  onUpdate: (updates: Partial<ScaleConfig>) => void;
  optionRouting: Record<number, string>;
  targetOptions: { id: string; label: string }[];
  onRoutingChange: (routing: Record<number, string>) => void;
}

export function ScaleConfigurator({ type, scaleConfig, fieldErrors, onUpdate, optionRouting, targetOptions, onRoutingChange }: ScaleConfiguratorProps) {
  if (!scaleConfig) {
    if (type === 'semantic_scale' || type === 'numeric_scale' || type === 'graphic_scale' || type === 'statement_scale') {
      return (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
          Konfiguracja skali nie jest dostępna. Zapisz pytanie, aby zainicjalizować.
        </p>
      );
    }
    return null;
  }

  const isSemantic = type === 'semantic_scale';
  const isNumeric = type === 'numeric_scale';
  const isStatement = type === 'statement_scale';
  const hasPointLabels = isStatement && scaleConfig.pointLabels && scaleConfig.pointLabels.length > 0;

  const pointMin = isSemantic ? 4 : isStatement ? 3 : 5;
  const pointMax = isSemantic ? 7 : isStatement ? 11 : 11;

  const handlePointLabelsChange = (labels: PointLabel[]) => {
    if (isSemantic || isStatement) {
      const first = labels.find(pl => pl.index === 1)?.label?.trim();
      const last = labels.find(pl => pl.index === labels.length)?.label?.trim();
      const allFilled = labels.every(pl => pl.label.trim());
      onUpdate({
        pointLabels: labels,
        ...(allFilled && first ? { leftLabel: first } : {}),
        ...(allFilled && last ? { rightLabel: last } : {}),
      });
    } else {
      onUpdate({ pointLabels: labels });
    }
  };

  const routingSection = (routableIndices: number[]) => (
    <div>
      <label className="label">Reguły przejścia dla odpowiedzi</label>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {routableIndices.map(idx => (
          <div key={idx} className="flex items-center gap-2 text-xs py-0.5">
            <span className="font-mono text-gray-400 w-6 text-right shrink-0">
              {type === 'numeric_scale' ? idx + (scaleConfig?.minValue ?? 0) : idx + 1}.
            </span>
            <span className="flex-1 truncate text-gray-500">
              {labelForIndex(type, scaleConfig, idx)}
            </span>
            <select
              value={optionRouting[idx] ?? ''}
              onChange={e => {
                const updated = { ...optionRouting };
                if (e.target.value) updated[idx] = e.target.value;
                else delete updated[idx];
                onRoutingChange(updated);
              }}
              className="input text-[10px] py-1 w-40 shrink-0"
            >
              <option value="">→ (domyślny)</option>
              {targetOptions.map(t => (
                <option key={t.id} value={t.id}>{t.id}: {t.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {fieldErrors.optionRouting && <p className="error-text">{fieldErrors.optionRouting}</p>}
    </div>
  );

  return (
    <div className="card p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Konfiguracja skali
      </h3>

      {isNumeric && (
        <>
          <NumericScaleVisual
            leftLabel={scaleConfig.leftLabel}
            rightLabel={scaleConfig.rightLabel}
            points={scaleConfig.points}
            minValue={scaleConfig.minValue ?? 0}
          />
          <ScaleEndpointsInput
            leftLabel={scaleConfig.leftLabel}
            rightLabel={scaleConfig.rightLabel}
            onLeftChange={v => onUpdate({ leftLabel: v })}
            onRightChange={v => onUpdate({ rightLabel: v })}
            leftError={fieldErrors.leftLabel}
            rightError={fieldErrors.rightLabel}
          />
          <ScalePointsInput
            points={scaleConfig.points}
            min={pointMin}
            max={pointMax}
            onChange={v => onUpdate({ points: v })}
            error={fieldErrors.scalePoints}
          />
          <div>
            <label htmlFor="numeric-min-value" className="label">Wartość początkowa skali</label>
            <input
              id="numeric-min-value"
              type="number"
              min={0}
              max={10}
              value={scaleConfig.minValue ?? 0}
              onChange={e => onUpdate({ minValue: Math.max(0, parseInt(e.target.value) || 0) })}
              className="input w-24"
            />
          </div>
          {routingSection(Array.from({ length: scaleConfig.points }, (_, i) => i))}
        </>
      )}

      {isSemantic && (
        <>
          <PointLabelsEditor
            pointCount={scaleConfig.points}
            pointLabels={scaleConfig.pointLabels ?? []}
            onChange={handlePointLabelsChange}
            error={fieldErrors.pointLabels}
            showEndpoints
          />
          <ScalePointsInput
            points={scaleConfig.points}
            min={pointMin}
            max={pointMax}
            onChange={v => onUpdate({ points: v })}
            error={fieldErrors.scalePoints}
          />
          {routingSection(Array.from({ length: scaleConfig.points }, (_, i) => i))}
        </>
      )}

      {type === 'graphic_scale' && (
        <>
          <ScaleEndpointsInput
            leftLabel={scaleConfig.leftLabel}
            rightLabel={scaleConfig.rightLabel}
            onLeftChange={v => onUpdate({ leftLabel: v })}
            onRightChange={v => onUpdate({ rightLabel: v })}
            leftError={fieldErrors.leftLabel}
            rightError={fieldErrors.rightLabel}
          />
          <ScalePointsInput
            points={scaleConfig.points}
            min={pointMin}
            max={pointMax}
            onChange={v => onUpdate({ points: v })}
            error={fieldErrors.scalePoints}
          />
          {routingSection(Array.from({ length: scaleConfig.points }, (_, i) => i))}
        </>
      )}

      {isStatement && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ pointLabels: [], minValue: 0 })}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${!hasPointLabels ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Numeryczna
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ pointLabels: Array.from({ length: scaleConfig.points }, (_, i) => ({ index: i + 1, label: '' })), minValue: undefined })}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${hasPointLabels ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              Semantyczna
            </button>
          </div>

          {hasPointLabels ? (
            <PointLabelsEditor
              pointCount={scaleConfig.points}
              pointLabels={scaleConfig.pointLabels ?? []}
              onChange={handlePointLabelsChange}
              error={fieldErrors.pointLabels}
              showEndpoints
            />
          ) : (
            <ScaleEndpointsInput
              leftLabel={scaleConfig.leftLabel}
              rightLabel={scaleConfig.rightLabel}
              onLeftChange={v => onUpdate({ leftLabel: v })}
              onRightChange={v => onUpdate({ rightLabel: v })}
              leftError={fieldErrors.leftLabel}
              rightError={fieldErrors.rightLabel}
            />
          )}

          <ScalePointsInput
            points={scaleConfig.points}
            min={pointMin}
            max={pointMax}
            onChange={v => onUpdate({ points: v })}
            error={fieldErrors.scalePoints}
          />

          {!hasPointLabels && (
            <div>
              <label htmlFor="statement-min-value" className="label">Wartość początkowa skali</label>
              <input
                id="statement-min-value"
                type="number"
                min={0}
                max={10}
                value={scaleConfig.minValue ?? 0}
                onChange={e => onUpdate({ minValue: Math.max(0, parseInt(e.target.value) || 0) })}
                className="input w-24"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function labelForIndex(type: QuestionType, config: ScaleConfig, idx: number): string {
  if (type === 'numeric_scale' || (type === 'statement_scale' && !config.pointLabels?.length)) {
    return `Wartość ${idx + (config.minValue ?? 0)}`;
  }
  if (type === 'semantic_scale' || (type === 'statement_scale' && config.pointLabels?.length)) {
    const label = config.pointLabels?.find(pl => pl.index === idx + 1)?.label;
    return label ? `Punkt ${idx + 1}: ${label}` : `Punkt ${idx + 1}`;
  }
  return `Punkt ${idx + 1}`;
}