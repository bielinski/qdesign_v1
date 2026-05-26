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
}

export function ScaleConfigurator({ type, scaleConfig, fieldErrors, onUpdate }: ScaleConfiguratorProps) {
  if (!scaleConfig) {
    if (type === 'semantic_scale' || type === 'numeric_scale' || type === 'graphic_scale') {
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
  const pointMin = isSemantic ? 4 : 5;
  const pointMax = isSemantic ? 7 : 11;

  const handlePointLabelsChange = (labels: PointLabel[]) => {
    if (isSemantic) {
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
        </>
      )}
    </div>
  );
}
