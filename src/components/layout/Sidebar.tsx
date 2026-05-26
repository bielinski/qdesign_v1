import type { Question } from '../../lib/types';
import { BlockNavigator } from '../navigator/BlockNavigator';

interface SidebarProps {
  questions: Question[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddBlock: () => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
}

export function Sidebar({
  questions,
  selectedId,
  onSelect,
  onAddBlock,
  onAddQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}: SidebarProps) {
  return (
    <aside className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Bloki pytań
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
        <BlockNavigator
          questions={questions}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddQuestion={onAddQuestion}
          onDeleteQuestion={onDeleteQuestion}
          onMoveQuestion={onMoveQuestion}
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
  );
}
