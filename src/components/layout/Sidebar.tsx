import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { Question, BlockMeta } from '../../lib/types';
import { BlockNavigator } from '../navigator/BlockNavigator';

interface SidebarProps {
  questions: Question[];
  blocks: Record<string, BlockMeta>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddBlock: () => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
  onUpdateBlockMeta: (blockId: string, meta: BlockMeta) => void;
  onReorderBlock: (sourceIndex: number, targetIndex: number) => void;
  onExportQuestions: (ids: string[]) => void;
  onExportBlock: (blockId: string) => void;
  onImport: () => void;
}

function groupByBlock(questions: Question[]): { blockId: string; questions: Question[] }[] {
  const map = new Map<string, Question[]>();
  const order: string[] = [];
  for (const q of questions) {
    if (!map.has(q.blockId)) {
      map.set(q.blockId, []);
      order.push(q.blockId);
    }
    map.get(q.blockId)!.push(q);
  }
  return order.map(blockId => ({ blockId, questions: map.get(blockId)! }));
}

function findBlockIndex(groups: { blockId: string; questions: Question[] }[], blockId: string): number {
  return groups.findIndex(g => g.blockId === blockId);
}

function findQuestionIndex(groups: { blockId: string; questions: Question[] }[], questionId: string): { blockIndex: number; questionIndex: number } | null {
  for (let bi = 0; bi < groups.length; bi++) {
    const qi = groups[bi].questions.findIndex(q => q.id === questionId);
    if (qi !== -1) return { blockIndex: bi, questionIndex: qi };
  }
  return null;
}

export function Sidebar({
  questions,
  blocks,
  selectedId,
  onSelect,
  onAddBlock,
  onAddQuestion,
  onDeleteQuestion,
  onDeleteBlock,
  onMoveQuestion,
  onUpdateBlockMeta,
  onReorderBlock,
  onExportQuestions,
  onExportBlock,
  onImport,
}: SidebarProps) {
  const [activeDrag, setActiveDrag] = useState<{ id: string; type: string } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [checkedQuestionIds, setCheckedQuestionIds] = useState<Set<string>>(new Set());

  const handleToggleQuestion = useCallback((id: string) => {
    setCheckedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleBlock = useCallback((blockId: string) => {
    const blockQuestions = questions.filter(q => q.blockId === blockId);
    const allChecked = blockQuestions.every(q => checkedQuestionIds.has(q.id));
    setCheckedQuestionIds(prev => {
      const next = new Set(prev);
      for (const q of blockQuestions) {
        if (allChecked) next.delete(q.id);
        else next.add(q.id);
      }
      return next;
    });
  }, [questions, checkedQuestionIds]);

  const allFromSingleBlock = useMemo<string | null>(() => {
    if (checkedQuestionIds.size === 0) return null;
    const ids = [...checkedQuestionIds];
    const firstBlock = questions.find(q => q.id === ids[0])?.blockId;
    if (!firstBlock) return null;
    const sameBlock = ids.every(id => {
      const q = questions.find(q => q.id === id);
      return q && q.blockId === firstBlock;
    });
    if (!sameBlock) return null;
    const blockQuestions = questions.filter(q => q.blockId === firstBlock);
    const allInBlock = blockQuestions.every(q => checkedQuestionIds.has(q.id));
    return allInBlock ? firstBlock : null;
  }, [checkedQuestionIds, questions]);

  const handleStartExport = useCallback(() => {
    setCheckedQuestionIds(new Set());
    setSelectionMode(true);
  }, []);

  const handleCancelExport = useCallback(() => {
    setCheckedQuestionIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleDoExportQuestions = useCallback(() => {
    onExportQuestions([...checkedQuestionIds]);
    setSelectionMode(false);
  }, [onExportQuestions, checkedQuestionIds]);

  const handleDoExportBlock = useCallback(() => {
    if (allFromSingleBlock) onExportBlock(allFromSingleBlock);
    setSelectionMode(false);
  }, [onExportBlock, allFromSingleBlock]);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('qdesign2-sidebar-width');
    return saved ? parseInt(saved, 10) : 288;
  });
  const isResizing = useRef(false);

  useEffect(() => {
    localStorage.setItem('qdesign2-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
    };
    const handleMouseUp = () => {
      isResizing.current = false;
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    const type = event.active.data.current?.type as string;
    setActiveDrag({ id, type });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    if (activeType === 'block' && overType === 'block') {
      const groups = groupByBlock(questions);
      const sourceIndex = findBlockIndex(groups, active.id as string);
      const targetIndex = findBlockIndex(groups, over.id as string);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        onReorderBlock(sourceIndex, targetIndex);
      }
      return;
    }

    if (activeType === 'question') {
      const groups = groupByBlock(questions);
      const activeInfo = findQuestionIndex(groups, active.id as string);
      if (!activeInfo) return;

      const activeBlockId = groups[activeInfo.blockIndex].blockId;

      if (overType === 'question') {
        const overInfo = findQuestionIndex(groups, over.id as string);
        if (!overInfo) return;

        const overBlockId = groups[overInfo.blockIndex].blockId;
        const targetIndex = overInfo.questionIndex;

        if (activeBlockId === overBlockId) {
          if (targetIndex !== activeInfo.questionIndex) {
            onMoveQuestion(active.id as string, overBlockId, targetIndex);
          }
        } else {
          onMoveQuestion(active.id as string, overBlockId, targetIndex);
        }
      } else if (overType === 'block') {
        const overBlockIndex = findBlockIndex(groups, over.id as string);
        if (overBlockIndex === -1) return;
        const overBlockId = groups[overBlockIndex].blockId;
        if (activeBlockId !== overBlockId) {
          onMoveQuestion(active.id as string, overBlockId, 0);
        }
      }
    }
  }, [questions, onMoveQuestion, onReorderBlock]);

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
  }, []);

  const activeQuestion = activeDrag
    ? questions.find(q => q.id === activeDrag.id) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <aside className="shrink-0 border-r border-gray-200 bg-white flex flex-col h-full relative" style={{ width: sidebarWidth }}>
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Bloki pytań
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
          <BlockNavigator
            questions={questions}
            blocks={blocks}
            selectedId={selectedId}
            checkedQuestions={checkedQuestionIds}
            showCheckboxes={selectionMode}
            onSelect={onSelect}
            onAddQuestion={onAddQuestion}
            onDeleteQuestion={onDeleteQuestion}
            onDeleteBlock={onDeleteBlock}
            onUpdateBlockMeta={onUpdateBlockMeta}
            onToggleQuestion={handleToggleQuestion}
            onToggleBlock={handleToggleBlock}
          />
        </div>

        <div className="px-3 py-3 border-t border-gray-200 space-y-1.5">
          <button
            type="button"
            onClick={onAddBlock}
            className="btn-secondary w-full text-xs"
          >
            + Dodaj blok
          </button>
          {selectionMode ? (
            <>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleDoExportQuestions}
                  disabled={checkedQuestionIds.size === 0}
                  className="btn-secondary text-xs flex-1"
                >
                  Eksportuj pytania
                </button>
                <button
                  type="button"
                  onClick={handleDoExportBlock}
                  disabled={!allFromSingleBlock}
                  className="btn-secondary text-xs flex-1"
                >
                  Eksportuj blok
                </button>
              </div>
              <button
                type="button"
                onClick={handleCancelExport}
                className="btn-secondary w-full text-xs"
              >
                Anuluj
              </button>
            </>
          ) : (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleStartExport}
                disabled={questions.length === 0}
                className="btn-secondary text-xs flex-1"
              >
                Eksportuj
              </button>
              <button
                type="button"
                onClick={onImport}
                className="btn-secondary text-xs flex-1"
              >
                Importuj
              </button>
            </div>
          )}
        </div>
        <div
          className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400/50 active:bg-blue-400 transition-colors z-10"
          onMouseDown={handleResizeStart}
        />
      </aside>

      <DragOverlay>
        {activeDrag?.type === 'question' && activeQuestion && (
          <div className="bg-white shadow-lg rounded border border-blue-200 px-3 py-2 text-xs text-gray-700">
            <span className="font-mono text-blue-700">{activeQuestion.id}</span>{' '}
            {activeQuestion.text || '(brak treści)'}
          </div>
        )}
        {activeDrag?.type === 'block' && (
          <div className="bg-white shadow-lg rounded border border-blue-200 px-3 py-2 text-xs font-semibold text-gray-600">
            Blok {activeDrag.id}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}