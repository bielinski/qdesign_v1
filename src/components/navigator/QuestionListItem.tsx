import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Question } from '../../lib/types';

interface QuestionListItemProps {
  question: Question;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  open: 'Otwarte',
  single_choice: 'Jednokrotny',
  multiple_choice: 'Wielokrotny',
  semantic_scale: 'Semantyczna',
  numeric_scale: 'Numeryczna',
  graphic_scale: 'Graficzna',
};

export function QuestionListItem({ question, isSelected, onSelect, onDelete }: QuestionListItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    data: { type: 'question', blockId: question.blockId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-1 cursor-default transition-colors
        ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <button
        type="button"
        className="shrink-0 px-1 py-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors touch-none"
        {...attributes}
        {...listeners}
        title="Przeciągnij, aby zmienić kolejność"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path d="M7 2a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM7 8a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM7 14a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>
      </button>

      <div
        className={`flex-1 flex items-center gap-2 py-2 pr-3 cursor-pointer min-w-0
          ${isSelected ? 'border-l-2 border-blue-600' : 'border-l-2 border-transparent'}`}
        onClick={() => onSelect(question.id)}
      >
        <span className={`text-xs font-mono font-semibold shrink-0 w-8 ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>
          {question.id}
        </span>

        <div className="flex-1 min-w-0">
          <p className={`text-xs whitespace-normal break-words ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
            {question.text || '(brak treści)'}
          </p>
          <span className="text-[10px] text-gray-400">{TYPE_LABELS[question.type]}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(question.id);
          }}
          className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
          title="Usuń pytanie"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.286a1.5 1.5 0 001.492-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.787-.712z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </li>
  );
}