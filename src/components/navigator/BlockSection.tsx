import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Question, BlockMeta } from '../../lib/types';
import { QuestionListItem } from './QuestionListItem';

interface BlockSectionProps {
  blockId: string;
  blockMeta: BlockMeta;
  questions: Question[];
  selectedId: string | null;
  checkedQuestions: Set<string>;
  showCheckbox: boolean;
  onSelect: (id: string) => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlockMeta: (blockId: string, meta: BlockMeta) => void;
  onToggleQuestion: (id: string) => void;
  onToggleBlock: (blockId: string) => void;
}

export function BlockSection({
  blockId,
  blockMeta,
  questions,
  selectedId,
  checkedQuestions,
  showCheckbox,
  onSelect,
  onAddQuestion,
  onDeleteQuestion,
  onDeleteBlock,
  onUpdateBlockMeta,
  onToggleQuestion,
  onToggleBlock,
}: BlockSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: blockId,
    data: { type: 'block' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const questionIds = questions.map(q => q.id);

  return (
    <div ref={setNodeRef} style={style} className={`card overflow-hidden ${isDragging ? 'shadow-md' : ''}`}>
      <div
        className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {showCheckbox && (
          <input
            type="checkbox"
            checked={questions.length > 0 && questions.every(q => checkedQuestions.has(q.id))}
            onChange={() => onToggleBlock(blockId)}
            onClick={e => e.stopPropagation()}
            className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-400 shrink-0">
          <path d="M7 2a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM7 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM7 14a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>
        <span className="text-xs font-semibold text-gray-500 uppercase shrink-0">
          Blok {blockId}
        </span>
        <input
          type="text"
          value={blockMeta.name}
          onChange={e => onUpdateBlockMeta(blockId, { ...blockMeta, name: e.target.value })}
          placeholder="Nazwa bloku..."
          className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none p-0 text-gray-800 placeholder-gray-300 focus:ring-0 truncate"
          onClick={e => e.stopPropagation()}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAddQuestion(blockId); }}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium shrink-0"
          title="Dodaj pytanie w bloku"
        >
          + Dodaj
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteBlock(blockId); }}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
          title="Usuń blok"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.286a1.5 1.5 0 001.492-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.787-.712z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-1.5 border-b border-gray-100">
        <input
          type="text"
          value={blockMeta.description ?? ''}
          onChange={e => onUpdateBlockMeta(blockId, { ...blockMeta, description: e.target.value || undefined })}
          placeholder="Opis bloku (opcjonalny)..."
          className="w-full text-[10px] bg-transparent border-none outline-none p-0 text-gray-400 placeholder-gray-300 focus:ring-0"
          onClick={e => e.stopPropagation()}
        />
      </div>

      <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
        <ul className="divide-y divide-gray-100">
          {questions.map(q => (
            <QuestionListItem
              key={q.id}
              question={q}
              isSelected={q.id === selectedId}
              isChecked={checkedQuestions.has(q.id)}
              showCheckbox={showCheckbox}
              onSelect={onSelect}
              onDelete={onDeleteQuestion}
              onToggleCheck={onToggleQuestion}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}