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
  return (
    <li
      className={`group relative flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
      onClick={() => onSelect(question.id)}
    >
      <span className={`text-xs font-mono font-semibold shrink-0 w-8 ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>
        {question.id}
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-xs truncate ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
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
        className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
        title="Usuń pytanie"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.286a1.5 1.5 0 001.492-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5a.75.75 0 01.787-.712z" clipRule="evenodd" />
        </svg>
      </button>
    </li>
  );
}
