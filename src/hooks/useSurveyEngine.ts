import { useState, useCallback } from 'react';
import { SurveyEngine } from '../lib/SurveyEngine';
import type { Question, SerializedProject, BlockMeta, FragmentExport } from '../lib/types';

export function useSurveyEngine() {
  const [engine] = useState(() => new SurveyEngine());
  const [title, setTitle] = useState(() => engine.getTitle());
  const [questions, setQuestions] = useState(() => engine.getQuestions());
  const [errors, setErrors] = useState(() => engine.validate());
  const [blocks, setBlocks] = useState(() => engine.getBlocks());
  const sync = useCallback(() => {
    setQuestions(engine.getQuestions());
    setErrors(engine.validate());
    setBlocks(engine.getBlocks());
    setTitle(engine.getTitle());
  }, [engine]);

  const setSurveyTitle = useCallback((v: string) => {
    engine.setTitle(v);
    setTitle(v);
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

  const deleteBlock = useCallback(
    (blockId: string): void => {
      engine.deleteBlock(blockId);
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

  const exportSelection = useCallback(
    (ids: string[]): FragmentExport => {
      return engine.exportSelection(ids);
    },
    [engine],
  );

  const exportBlock = useCallback(
    (blockId: string): FragmentExport => {
      return engine.exportBlock(blockId);
    },
    [engine],
  );

  const importFragment = useCallback(
    (data: FragmentExport, afterBlockId?: string) => {
      engine.importFragment(data, afterBlockId);
      sync();
    },
    [engine, sync],
  );

  const exportDocx = useCallback(async () => {
    return engine.exportToDocx();
  }, [engine]);

  const saveProject = useCallback((): SerializedProject => {
    return engine.serialize();
  }, [engine]);

  const loadProject = useCallback(
    (data: SerializedProject): void => {
      engine.loadFromData(data);
      sync();
    },
    [engine, sync],
  );

  const updateBlockMeta = useCallback(
    (blockId: string, meta: BlockMeta): void => {
      engine.setBlockMeta(blockId, meta);
      sync();
    },
    [engine, sync],
  );

  const reorderBlock = useCallback(
    (sourceIndex: number, targetIndex: number): void => {
      engine.reorderBlock(sourceIndex, targetIndex);
      sync();
    },
    [engine, sync],
  );

  return {
    title,
    setSurveyTitle,
    questions,
    errors,
    blocks,
    addQuestion,
    insertAfter,
    updateQuestion,
    deleteQuestion,
    deleteBlock,
    moveQuestion,
    exportDocx,
    saveProject,
    loadProject,
    updateBlockMeta,
    reorderBlock,
    exportSelection,
    exportBlock,
    importFragment,
  };
}
