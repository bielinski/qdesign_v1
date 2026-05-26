import { useState, useCallback } from 'react';
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
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
  onUpdateBlockMeta: (blockId: string, meta: BlockMeta) => void;
  onReorderBlock: (sourceIndex: number, targetIndex: number) => void;
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
  onMoveQuestion,
  onUpdateBlockMeta,
  onReorderBlock,
}: SidebarProps) {
  const [activeDrag, setActiveDrag] = useState<{ id: string; type: string } | null>(null);

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
      <aside className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
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
            onSelect={onSelect}
            onAddQuestion={onAddQuestion}
            onDeleteQuestion={onDeleteQuestion}
            onUpdateBlockMeta={onUpdateBlockMeta}
          />
        </div>

        <div className="px-3 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onAddBlock}
            className="btn-secondary w-full text-xs"
          >
            + Dodaj blok
          </button>
        </div>
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