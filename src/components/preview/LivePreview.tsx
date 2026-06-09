import type { Question, BlockMeta } from '../../lib/types';
import { NumericScaleVisual } from '../scale/NumericScaleVisual';
import { getIncomingRoutesText } from '../../lib/SurveyEngine';

interface LivePreviewProps {
  questions: Question[];
  blocks: Record<string, BlockMeta>;
  title: string;
}

const TYPE_LABELS: Record<string, string> = {
  open: 'Otwarte',
  single_choice: 'Jednokrotnego wyboru',
  multiple_choice: 'Wielokrotnego wyboru',
  semantic_scale: 'Skala semantyczna',
  numeric_scale: 'Skala numeryczna',
  graphic_scale: 'Skala graficzna',
  statement_scale: 'Ocena stwierdzeń',
};

export function LivePreview({ questions, blocks, title }: LivePreviewProps) {
  const groups = groupByBlock(questions);

  if (questions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-sm italic">
        {title && <h1 className="text-xl font-bold text-gray-400 not-italic mb-2">{title}</h1>}
        <span>Kwestionariusz jest pusty.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white border-l border-gray-200 p-6">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center border-b border-gray-200 pb-3">
          <h2 className="text-lg font-semibold text-gray-800">Podgląd kwestionariusza</h2>
          <p className="text-[10px] text-gray-400">Widok respondenta</p>
        </div>

        {title && (
          <h1 className="text-xl font-bold text-gray-900 text-center leading-snug">
            {title}
          </h1>
        )}

        {groups.map(({ blockId, questions: blockQs }) => {
          const blockMeta = blocks[blockId];
          return (
          <div key={blockId}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Blok {blockId}{blockMeta?.name ? `: ${blockMeta.name}` : ''}
            </h3>

            <div className="space-y-4">
              {blockQs.map(q => {
                const routing = q.optionRouting;
                return (
                <div key={q.id} className="border-l-2 border-gray-200 pl-3">
                  {(() => {
                    const incoming = getIncomingRoutesText(questions, q.id);
                    if (!incoming) return null;
                    return (
                      <p className="text-[10px] text-blue-600 mb-1.5 leading-relaxed">
                        {incoming}
                      </p>
                    );
                  })()}

                  <p className="text-sm text-gray-800">
                    <span className="font-mono text-gray-400 text-xs">{q.id}.</span>{' '}
                    {q.text}
                    {q.required && <span className="text-red-400 text-xs ml-1">*</span>}
                  </p>

                  <p className="text-[10px] text-gray-400 mt-0.5">
                    [{TYPE_LABELS[q.type]}]
                  </p>

                  {q.options && q.options.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {q.options.map((opt, i) => (
                        <label key={i} className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                          <input
                            type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                            disabled
                            className={q.type === 'single_choice' ? 'h-3 w-3 text-blue-600' : 'h-3 w-3 rounded text-blue-600'}
                          />
                          <span>{opt || '(pusta)'}</span>
                          {q.optionRouting?.[i] && (
                            <span className="text-[10px] text-blue-400 ml-auto">→ {q.optionRouting[i]}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.nonSubstantiveOption && q.type !== 'statement_scale' && (
                    <div className="mt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 border-t border-gray-100 pt-1.5">
                        <input
                          type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                          disabled
                          className={q.type === 'multiple_choice' ? 'h-3 w-3 rounded text-blue-600' : 'h-3 w-3 text-blue-600'}
                        />
                        <span className="italic">{q.nonSubstantiveOption}</span>
                      </label>
                    </div>
                  )}

                  {q.type === 'semantic_scale' && q.scaleConfig?.pointLabels && q.scaleConfig.pointLabels.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {q.scaleConfig.pointLabels
                        .slice()
                        .sort((a, b) => a.index - b.index)
                        .map(pl => {
                          const idx = pl.index - 1;
                          return (
                          <label key={pl.index} className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                            <input type="radio" disabled name={`preview-${q.id}`} className="h-3 w-3 text-blue-600" checked={false} />
                            <span>{pl.label || '(brak opisu)'}</span>
                            {q.optionRouting?.[idx] && (
                              <span className="text-[10px] text-blue-400 ml-auto">→ {q.optionRouting[idx]}</span>
                            )}
                          </label>
                          );
                        })}
                    </div>
                  )}

                  {q.type === 'numeric_scale' && q.scaleConfig && (
                    <div className="mt-1.5">
                      <NumericScaleVisual
                        leftLabel={q.scaleConfig.leftLabel}
                        rightLabel={q.scaleConfig.rightLabel}
                        points={q.scaleConfig.points}
                        minValue={q.scaleConfig.minValue ?? 0}
                      />
                      {(() => {
                        const sc = q.scaleConfig;
                        return routing && Object.keys(routing).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-blue-400">
                            {Array.from({ length: sc.points }, (_, i) => (
                              routing[i] && (
                                <span key={i}>{i + (sc.minValue ?? 0)} → {routing[i]}</span>
                              )
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {q.type === 'graphic_scale' && q.scaleConfig && (
                    <div className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">{q.scaleConfig.leftLabel}</span>
                        <span className="text-gray-400">{q.scaleConfig.rightLabel}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">1</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full">
                          <div className="h-full w-1/2 bg-blue-200 rounded-full" />
                        </div>
                        <span className="text-[10px] text-gray-400">{q.scaleConfig.points}</span>
                      </div>
                      {routing && Object.keys(routing).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-blue-400">
                          {Array.from({ length: q.scaleConfig.points }, (_, i) => (
                            routing[i] && (
                              <span key={i}>{i + 1} → {routing[i]}</span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {q.type === 'statement_scale' && q.scaleConfig && q.statements && q.statements.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left text-gray-400 font-normal py-1 pr-2 whitespace-nowrap"></th>
                            {Array.from({ length: q.scaleConfig.points }, (_, i) => {
                              const isSemantic = q.scaleConfig!.pointLabels && q.scaleConfig!.pointLabels!.length > 0;
                              const header = isSemantic
                                ? q.scaleConfig!.pointLabels!.find(pl => pl.index === i + 1)?.label ?? ''
                                : String(i + (q.scaleConfig!.minValue ?? 0));
                              return (
                                <th key={i} className="text-center text-gray-400 font-normal py-1 px-1.5 whitespace-nowrap">
                                  {header || '—'}
                                </th>
                              );
                            })}
                            {q.nonSubstantiveOption && (
                              <th className="text-center text-gray-400 font-normal py-1 px-1.5 whitespace-nowrap italic text-[10px]">
                                {q.nonSubstantiveOption}
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {q.statements.map((st, si) => (
                            <tr key={si} className={si % 2 === 0 ? 'bg-gray-50/50' : ''}>
                              <td className="text-gray-600 py-1.5 pr-2 whitespace-nowrap max-w-[120px] truncate">
                                {st || <span className="text-gray-300 italic">(puste)</span>}
                              </td>
                              {Array.from({ length: q.scaleConfig!.points }, (_, pi) => (
                                <td key={pi} className="text-center py-1.5 px-1.5">
                                  <input
                                    type="radio"
                                    disabled
                                    name={`preview-${q.id}-${si}`}
                                    className="h-3 w-3 text-blue-600"
                                  />
                                </td>
                              ))}
                              {q.nonSubstantiveOption && (
                                <td className="text-center py-1.5 px-1.5">
                                  <input
                                    type="radio"
                                    disabled
                                    name={`preview-${q.id}-${si}`}
                                    className="h-3 w-3 text-blue-600"
                                  />
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {q.next && (
                    <p className="text-[10px] text-blue-500 mt-0.5">
                      → Dalej: {q.next}
                    </p>
                  )}
                </div>
              );
            })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
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
