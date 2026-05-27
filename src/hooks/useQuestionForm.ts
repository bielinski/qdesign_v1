import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Question, QuestionType, ScaleConfig } from '../lib/types';
import { ScalePolarity } from '../lib/types';

export interface FormState {
  text: string;
  type: QuestionType;
  required: boolean;
  blockId: string;
  next?: string;
  scaleConfig?: ScaleConfig;
  options?: string[];
  nonSubstantiveOption?: string;
  optionRouting?: Record<number, string>;
}

export interface FormFieldErrors {
  text?: string;
  type?: string;
  scalePoints?: string;
  leftLabel?: string;
  rightLabel?: string;
  pointLabels?: string;
  next?: string;
  options?: string;
  optionRouting?: string;
}

export function useQuestionForm(question: Question | null) {
  const [draft, setDraft] = useState<FormState>(() => toFormState(question));

  useEffect(() => {
    setDraft(toFormState(question));
  }, [question]);

  const fieldErrors = useMemo(() => validateForm(draft), [draft]);
  const isValid = Object.keys(fieldErrors).length === 0;

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (field === 'type') {
      const newType = value as QuestionType;
      const isChoice = newType === 'single_choice' || newType === 'multiple_choice';
      const isScale = newType === 'semantic_scale' || newType === 'numeric_scale' || newType === 'graphic_scale';
      const isRoutable = isChoice || isScale;
      setDraft(prev => {
        const next = { ...prev, type: newType };
        if (!isScale) next.scaleConfig = undefined;
        if (isScale && !next.scaleConfig) next.scaleConfig = defaultScaleConfig(newType);
        if (isChoice) next.options = prev.options ?? ['', ''];
        if (!isChoice) next.options = undefined;
        if (isRoutable) next.optionRouting = prev.optionRouting ?? {};
        if (!isRoutable) next.optionRouting = undefined;
        return next;
      });
    } else {
      setDraft(prev => ({ ...prev, [field]: value }));
    }
  }, []);

  const updateScaleConfig = useCallback((updates: Partial<ScaleConfig>) => {
    setDraft(prev => {
      const current = prev.scaleConfig ?? defaultScaleConfig(prev.type);
      return { ...prev, scaleConfig: { ...current, ...updates } };
    });
  }, []);

  const hasChanges = useMemo(() => {
    if (!question) return false;
    const current = toFormState(question);
    return JSON.stringify(current) !== JSON.stringify(draft);
  }, [question, draft]);

  return { draft, setDraft, fieldErrors, isValid, hasChanges, updateField, updateScaleConfig };
}

function isRoutableType(type: QuestionType): boolean {
  return type === 'single_choice' || type === 'multiple_choice'
    || type === 'semantic_scale' || type === 'numeric_scale' || type === 'graphic_scale';
}

function toFormState(q: Question | null): FormState {
  if (!q) {
    return { text: '', type: 'open', required: false, blockId: 'A' };
  }
  return {
    text: q.text,
    type: q.type,
    required: q.required,
    blockId: q.blockId,
    next: q.next,
    scaleConfig: q.scaleConfig ? { ...q.scaleConfig } : undefined,
    options: q.options ? [...q.options] : undefined,
    nonSubstantiveOption: q.nonSubstantiveOption,
    optionRouting: isRoutableType(q.type) ? (q.optionRouting ? { ...q.optionRouting } : {}) : undefined,
  };
}

function defaultScaleConfig(type: QuestionType): ScaleConfig {
  const isSemantic = type === 'semantic_scale';
  return {
    polarity: ScalePolarity.Bipolar,
    leftLabel: '',
    rightLabel: '',
    points: isSemantic ? 5 : 7,
    pointLabels: isSemantic ? [] : undefined,
    minValue: 0,
  };
}

function validateForm(state: FormState): FormFieldErrors {
  const errors: FormFieldErrors = {};

  if (state.type === 'single_choice' || state.type === 'multiple_choice') {
    if (!state.options || state.options.length < 2) {
      errors.options = 'Pytanie zamknięte musi mieć co najmniej 2 opcje.';
    } else {
      const emptyIdxs = state.options
        .map((opt, i) => (!opt.trim() ? i : -1))
        .filter(i => i >= 0);
      if (emptyIdxs.length > 0) {
        errors.options = `Opcje ${emptyIdxs.map(i => i + 1).join(', ')} są puste.`;
      }
    }
  }

  if (state.scaleConfig) {
    const sc = state.scaleConfig;

    if (state.type === 'semantic_scale') {
      if (sc.points < 4 || sc.points > 7) {
        errors.scalePoints =
          'Skala semantyczna wymaga 4–7 punktów (Osgood, 1957).';
      }
    } else if (state.type === 'numeric_scale' || state.type === 'graphic_scale') {
      if (sc.points < 5 || sc.points > 11) {
        errors.scalePoints = `Skala ${state.type === 'numeric_scale' ? 'numeryczna' : 'graficzna'} wymaga 5–11 punktów.`;
      }
    }

    if (state.type !== 'semantic_scale') {
      if (!sc.leftLabel.trim()) {
        errors.leftLabel = 'Lewy biegun skali jest wymagany.';
      }
      if (!sc.rightLabel.trim()) {
        errors.rightLabel = 'Prawy biegun skali jest wymagany.';
      }
    }

    if (state.type === 'semantic_scale' && sc.pointLabels) {
      const emptyLabels = sc.pointLabels.filter(pl => !pl.label.trim());
      if (emptyLabels.length > 0) {
        errors.pointLabels = `Opisy punktów ${emptyLabels.map(pl => pl.index).join(', ')} są puste.`;
      }
    }
  }

  if (state.optionRouting) {
    const validIndices = new Set<number>();
    if (state.options) {
      state.options.forEach((_, i) => validIndices.add(i));
    }
    if (state.scaleConfig) {
      const count = state.type === 'numeric_scale'
        ? state.scaleConfig.points
        : state.scaleConfig.points;
      for (let i = 0; i < count; i++) validIndices.add(i);
    }
    const invalidKeys = Object.keys(state.optionRouting)
      .filter(k => !validIndices.has(Number(k)));
    if (invalidKeys.length > 0) {
      errors.optionRouting = `Nieprawidłowe indeksy reguł przejścia.`;
    }
  }

  return errors;
}
