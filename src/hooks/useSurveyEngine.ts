import { useState, useCallback } from 'react';
import { SurveyEngine } from '../lib/SurveyEngine';
import type { Question } from '../lib/types';

export function useSurveyEngine() {
  const [engine] = useState(() => new SurveyEngine());
  const [questions, setQuestions] = useState(() => engine.getQuestions());
  const [errors, setErrors] = useState(() => engine.validate());
  const sync = useCallback(() => {
    setQuestions(engine.getQuestions());
    setErrors(engine.validate());
  }, [engine]);

  const addQuestion = useCallback(
    (q: Omit<Question, 'id'>): string => {
      const newId = engine.add(q);
      sync();
      return newId;
    },
    [engine, sync],
  );

  const insertAfter = useCallback(
    (targetId: string, q: Omit<Question, 'id'>) => {
      engine.insertAfter(targetId, q);
      sync();
    },
    [engine, sync],
  );

  const updateQuestion = useCallback(
    (id: string, updates: Partial<Omit<Question, 'id'>>) => {
      engine.update(id, updates);
      sync();
    },
    [engine, sync],
  );

  const deleteQuestion = useCallback(
    (id: string) => {
      engine.delete(id);
      sync();
    },
    [engine, sync],
  );

  const moveQuestion = useCallback(
    (id: string, targetBlockId: string, targetIndex: number) => {
      engine.move(id, targetBlockId, targetIndex);
      sync();
    },
    [engine, sync],
  );

  const exportDocx = useCallback(async () => {
    return engine.exportToDocx();
  }, [engine]);

  return {
    questions,
    errors,
    addQuestion,
    insertAfter,
    updateQuestion,
    deleteQuestion,
    moveQuestion,
    exportDocx,
  };
}
