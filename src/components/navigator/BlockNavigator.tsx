import type { Question } from '../../lib/types';
import { BlockSection } from './BlockSection';

interface BlockNavigatorProps {
  questions: Question[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onMoveQuestion: (id: string, targetBlockId: string, targetIndex: number) => void;
}

export function BlockNavigator({
  questions,
  selectedId,
  onSelect,
  onAddQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}: BlockNavigatorProps) {
  const groups = groupByBlock(questions);

  if (groups.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-8">
        Brak pytań. Dodaj blok, aby rozpocząć.
      </p>
    );
  }

  return (
    <>
      {groups.map(({ blockId, questions: blockQs }) => (
        <BlockSection
          key={blockId}
          blockId={blockId}
          questions={blockQs}
          selectedId={selectedId}
          onSelect={onSelect}
          onAddQuestion={onAddQuestion}
          onDeleteQuestion={onDeleteQuestion}
          onMoveQuestion={onMoveQuestion}
        />
      ))}
    </>
  );
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
