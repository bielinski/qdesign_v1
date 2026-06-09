import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Question, BlockMeta } from '../../lib/types';
import { BlockSection } from './BlockSection';

interface BlockNavigatorProps {
  questions: Question[];
  blocks: Record<string, BlockMeta>;
  selectedId: string | null;
  checkedQuestions: Set<string>;
  showCheckboxes: boolean;
  onSelect: (id: string) => void;
  onAddQuestion: (blockId: string) => void;
  onDeleteQuestion: (id: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateBlockMeta: (blockId: string, meta: BlockMeta) => void;
  onToggleQuestion: (id: string) => void;
  onToggleBlock: (blockId: string) => void;
}

export function BlockNavigator({
  questions,
  blocks,
  selectedId,
  checkedQuestions,
  showCheckboxes,
  onSelect,
  onAddQuestion,
  onDeleteQuestion,
  onDeleteBlock,
  onUpdateBlockMeta,
  onToggleQuestion,
  onToggleBlock,
}: BlockNavigatorProps) {
  const groups = groupByBlock(questions);

  if (groups.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-8">
        Brak pytań. Dodaj blok, aby rozpocząć.
      </p>
    );
  }

  const blockIds = groups.map(g => g.blockId);

  return (
    <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
      <div className="space-y-2">
        {groups.map(({ blockId, questions: blockQs }) => (
          <BlockSection
            key={blockId}
            blockId={blockId}
            blockMeta={blocks[blockId] ?? { name: '' }}
            questions={blockQs}
            selectedId={selectedId}
            checkedQuestions={checkedQuestions}
            showCheckbox={showCheckboxes}
            onSelect={onSelect}
            onAddQuestion={onAddQuestion}
            onDeleteQuestion={onDeleteQuestion}
            onDeleteBlock={onDeleteBlock}
            onUpdateBlockMeta={onUpdateBlockMeta}
            onToggleQuestion={onToggleQuestion}
            onToggleBlock={onToggleBlock}
          />
        ))}
      </div>
    </SortableContext>
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