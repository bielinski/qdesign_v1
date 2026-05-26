import type { Question } from '../../lib/types';
import type { FormState, FormFieldErrors } from '../../hooks/useQuestionForm';
import { QuestionTextInput } from './QuestionTextInput';
import { QuestionTypeSelector } from './QuestionTypeSelector';
import { RequiredToggle } from './RequiredToggle';
import { NextQuestionSelector } from './NextQuestionSelector';
import { ScaleConfigurator } from '../scale/ScaleConfigurator';
import { OptionsEditor } from './OptionsEditor';
import { NonSubstantiveOptionEditor } from './NonSubstantiveOptionEditor';

interface QuestionEditorProps {
  question: Question | null;
  draft: FormState;
  fieldErrors: FormFieldErrors;
  allQuestions: Question[];
  isValid: boolean;
  hasChanges: boolean;
  onUpdateField: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  onUpdateScaleConfig: (updates: Partial<import('../../lib/types').ScaleConfig>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function QuestionEditor({
  question,
  draft,
  fieldErrors,
  allQuestions,
  isValid,
  hasChanges,
  onUpdateField,
  onUpdateScaleConfig,
  onSave,
  onCancel,
}: QuestionEditorProps) {
  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Wybierz pytanie z panelu bocznego, aby rozpocząć edycję.
      </div>
    );
  }

  const nextOptions = allQuestions
    .filter(q => q.id !== question.id)
    .map(q => ({ id: q.id, label: q.text.slice(0, 60) }));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Edycja pytania <span className="text-blue-700 font-mono">{question.id}</span>
            </h2>
          </div>

          <QuestionTextInput
            value={draft.text}
            onChange={v => onUpdateField('text', v)}
            error={fieldErrors.text}
          />

          <QuestionTypeSelector
            value={draft.type}
            onChange={v => onUpdateField('type', v)}
          />

          <ScaleConfigurator
            type={draft.type}
            scaleConfig={draft.scaleConfig}
            fieldErrors={fieldErrors}
            onUpdate={onUpdateScaleConfig}
          />

          {(draft.type === 'single_choice' || draft.type === 'multiple_choice') && (
            <OptionsEditor
              options={draft.options ?? []}
              onChange={v => onUpdateField('options', v)}
              error={fieldErrors.options}
            />
          )}

          <NonSubstantiveOptionEditor
            value={draft.nonSubstantiveOption}
            onChange={v => onUpdateField('nonSubstantiveOption', v)}
          />

          <RequiredToggle
            value={draft.required}
            onChange={v => onUpdateField('required', v)}
          />

          <NextQuestionSelector
            value={draft.next}
            options={nextOptions}
            onChange={v => onUpdateField('next', v)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-t border-gray-200 bg-white shrink-0">
        <button
          type="button"
          onClick={onSave}
          disabled={!isValid || !hasChanges}
          className="btn-primary"
        >
          Zapisz
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Anuluj
        </button>

        {!isValid && (
          <span className="text-xs text-red-600 ml-2">
            Popraw błędy przed zapisem.
          </span>
        )}
      </div>
    </div>
  );
}
