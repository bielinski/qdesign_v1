import type { Question } from '../../lib/types';
import { QuestionListItem } from './QuestionListItem';

interface BlockSectionProps {
  blockId: string;
  questions: Question[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
}

export function BlockSection({
  blockId,
  questions,
  selectedId,
  onSelect,
  onAddQuestion,
  onDeleteQuestion,
}: BlockSectionProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase">
          Blok {blockId}
        </span>
        <button
          type="button"
          onClick={() => onAddQuestion(blockId)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
          title="Dodaj pytanie w bloku"
        >
          + Dodaj
        </button>
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
