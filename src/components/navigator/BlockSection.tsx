import type { Question, BlockMeta } from '../../lib/types';
import { QuestionListItem } from './QuestionListItem';

interface BlockSectionProps {
  blockId: string;
  blockMeta: BlockMeta;
  questions: Question[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
  onUpdateBlockMeta: (blockId: string, meta: BlockMeta) => void;
}

export function BlockSection({
  blockId,
  blockMeta,
  questions,
  selectedId,
  onSelect,
  onAddQuestion,
  onDeleteQuestion,
  onUpdateBlockMeta,
}: BlockSectionProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase shrink-0">
          Blok {blockId}
        </span>
        <input
          type="text"
          value={blockMeta.name}
          onChange={e => onUpdateBlockMeta(blockId, { ...blockMeta, name: e.target.value })}
          placeholder="Nazwa bloku..."
          className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none p-0 text-gray-800 placeholder-gray-300 focus:ring-0 truncate"
        />
        <button
          type="button"
          onClick={() => onAddQuestion(blockId)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium shrink-0"
          title="Dodaj pytanie w bloku"
        >
          + Dodaj
        </button>
      </div>

      <div className="px-3 py-1.5 border-b border-gray-100">
        <input
          type="text"
          value={blockMeta.description ?? ''}
          onChange={e => onUpdateBlockMeta(blockId, { ...blockMeta, description: e.target.value || undefined })}
          placeholder="Opis bloku (opcjonalny)..."
          className="w-full text-[10px] bg-transparent border-none outline-none p-0 text-gray-400 placeholder-gray-300 focus:ring-0"
        />
      </div>

      <ul className="divide-y divide-gray-100">
        {questions.map(q => (
          <QuestionListItem
            key={q.id}
            question={q}
            isSelected={q.id === selectedId}
            onSelect={onSelect}
            onDelete={onDeleteQuestion}
          />
        ))}
      </ul>
    </div>
  );
}
