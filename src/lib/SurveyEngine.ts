import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Question, QuestionType, ValidationError, SerializedProject, BlockMeta } from './types';

const POINT_RANGES: Record<QuestionType, { min: number; max: number } | null> = {
  open: null,
  single_choice: null,
  multiple_choice: null,
  semantic_scale: { min: 4, max: 7 },
  numeric_scale: { min: 5, max: 11 },
  graphic_scale: { min: 5, max: 11 },
};

function isRoutableType(type: QuestionType): boolean {
  return type === 'single_choice' || type === 'multiple_choice'
    || type === 'semantic_scale' || type === 'numeric_scale' || type === 'graphic_scale';
}

function getRoutableIndices(q: Question): number[] {
  if (q.type === 'single_choice' || q.type === 'multiple_choice') {
    return (q.options ?? []).map((_, i) => i);
  }
  if (q.type === 'semantic_scale' || q.type === 'graphic_scale') {
    return Array.from({ length: q.scaleConfig?.points ?? 0 }, (_, i) => i);
  }
  if (q.type === 'numeric_scale') {
    return Array.from({ length: (q.scaleConfig?.points ?? 0) + 1 }, (_, i) => i);
  }
  return [];
}

const TYPE_LABELS: Record<string, string> = {
  open: 'Otwarte',
  single_choice: 'Jednokrotnego wyboru',
  multiple_choice: 'Wielokrotnego wyboru',
  semantic_scale: 'Skala semantyczna',
  numeric_scale: 'Skala numeryczna',
  graphic_scale: 'Skala graficzna',
};

export function getDisplayValue(source: Question, optionIndex: number): number {
  if (source.type === 'numeric_scale') return optionIndex;
  return optionIndex + 1;
}

export function formatValues(vals: number[]): string {
  if (vals.length === 0) return '';
  if (vals.length === 1) return String(vals[0]);
  const head = vals.slice(0, -1).join(', ');
  return `${head} lub ${vals[vals.length - 1]}`;
}

export function getIncomingRoutesText(allQuestions: Question[], targetId: string): string | null {
  const bySource = new Map<string, { unconditional: boolean; values: number[] }>();

  for (const source of allQuestions) {
    if (source.id === targetId) continue;

    if (source.next === targetId) {
      const entry = bySource.get(source.id) ?? { unconditional: false, values: [] };
      entry.unconditional = true;
      bySource.set(source.id, entry);
    }

    if (source.optionRouting) {
      for (const [key, val] of Object.entries(source.optionRouting)) {
        if (val === targetId) {
          const entry = bySource.get(source.id) ?? { unconditional: false, values: [] };
          entry.values.push(getDisplayValue(source, Number(key)));
          bySource.set(source.id, entry);
        }
      }
    }
  }

  if (bySource.size === 0) return null;

  const parts: string[] = [];
  for (const [sourceId, entry] of bySource) {
    const sorted = entry.values.sort((a, b) => a - b);
    if (entry.unconditional && sorted.length === 0) {
      parts.push(`Zadaj pyt. ${targetId} po ${sourceId}`);
    } else if (entry.unconditional && sorted.length > 0) {
      parts.push(`Zadaj pyt. ${targetId} po ${sourceId} (lub jeśli == ${formatValues(sorted)})`);
    } else {
      parts.push(`Zadaj pyt. ${targetId} jeśli w ${sourceId} == ${formatValues(sorted)}`);
    }
  }

  return parts.join('; ');
}

function blockIndexToPrefix(index: number): string {
  let prefix = '';
  let i = index;
  do {
    prefix = String.fromCharCode(65 + (i % 26)) + prefix;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return prefix;
}

export class SurveyEngine {
  private questions: Question[];
  private _blocks: Record<string, BlockMeta>;

  constructor(questions: Question[] = [], blocks: Record<string, BlockMeta> = {}) {
    this._blocks = { ...blocks };
    this.questions = questions.map(q => ({ ...q }));
    this.renumber();
  }

  getQuestions(): Question[] {
    return this.questions.map(q => ({ ...q }));
  }

  getBlocks(): Record<string, BlockMeta> {
    return { ...this._blocks };
  }

  getBlockMeta(blockId: string): BlockMeta {
    return this._blocks[blockId] ?? { name: '' };
  }

  setBlockMeta(blockId: string, meta: BlockMeta): void {
    this._blocks[blockId] = { ...meta };
  }

  add(question: Omit<Question, 'id'>): string {
    this.questions.push({ ...question, id: '' });
    if (!this._blocks[question.blockId]) {
      this._blocks[question.blockId] = { name: '' };
    }
    this.renumber();
    for (let i = this.questions.length - 1; i >= 0; i--) {
      if (this.questions[i].blockId === question.blockId) {
        return this.questions[i].id;
      }
    }
    return this.questions[this.questions.length - 1]?.id ?? '';
  }

  insertAfter(targetId: string, question: Omit<Question, 'id'>): void {
    const index = this.questions.findIndex(q => q.id === targetId);
    if (index === -1) {
      throw new Error(`Question with id "${targetId}" not found`);
    }
    this.questions.splice(index + 1, 0, { ...question, id: '' });
    this.renumber();
  }

  delete(id: string): void {
    const removed = this.questions.find(q => q.id === id);
    this.questions = this.questions.filter(q => q.id !== id);
    if (removed && !this.questions.some(q => q.blockId === removed.blockId)) {
      delete this._blocks[removed.blockId];
    }
    this.renumber();
  }

  update(id: string, updates: Partial<Omit<Question, 'id'>>): void {
    if ((updates.type === 'single_choice' || updates.type === 'multiple_choice') && !updates.options) {
      updates.options = [];
    }
    if (updates.type && !['single_choice', 'multiple_choice'].includes(updates.type)) {
      updates.options = undefined;
    }
    if (updates.type && !isRoutableType(updates.type)) {
      updates.optionRouting = undefined;
    }
    const index = this.questions.findIndex(q => q.id === id);
    if (index === -1) {
      throw new Error(`Question with id "${id}" not found`);
    }
    this.questions[index] = { ...this.questions[index], ...updates };
    this.renumber();
  }

  move(id: string, targetBlockId: string, targetIndex: number): void {
    const sourceIndex = this.questions.findIndex(q => q.id === id);
    if (sourceIndex === -1) {
      throw new Error(`Question with id "${id}" not found`);
    }

    const [moved] = this.questions.splice(sourceIndex, 1);
    moved.blockId = targetBlockId;

    let insertPos = this.questions.length;
    let count = 0;
    let foundBlock = false;
    for (let i = 0; i < this.questions.length; i++) {
      if (this.questions[i].blockId === targetBlockId) {
        foundBlock = true;
        if (count === targetIndex) {
          insertPos = i;
          break;
        }
        count++;
      } else if (foundBlock) {
        insertPos = i;
        break;
      }
    }

    this.questions.splice(insertPos, 0, moved);
    this.renumber();
  }

  renumber(): void {
    const oldToNew = new Map<string, string>();

    const groups = new Map<string, Question[]>();
    const order: string[] = [];

    for (const q of this.questions) {
      if (!groups.has(q.blockId)) {
        groups.set(q.blockId, []);
        order.push(q.blockId);
      }
      groups.get(q.blockId)!.push(q);
    }

    const renumbered: Question[] = [];

    for (let bi = 0; bi < order.length; bi++) {
      const blockId = order[bi];
      const blockQuestions = groups.get(blockId)!;
      const prefix = blockIndexToPrefix(bi);

      for (let qi = 0; qi < blockQuestions.length; qi++) {
        const oldId = blockQuestions[qi].id;
        const newId = `${prefix}.${qi + 1}`;
        if (oldId) oldToNew.set(oldId, newId);
        renumbered.push({
          ...blockQuestions[qi],
          id: newId,
        });
      }
    }

    for (const q of renumbered) {
      if (q.next && oldToNew.has(q.next)) {
        q.next = oldToNew.get(q.next);
      }
      if (q.optionRouting) {
        for (const [key, targetId] of Object.entries(q.optionRouting)) {
          if (oldToNew.has(targetId)) {
            q.optionRouting[Number(key)] = oldToNew.get(targetId)!;
          }
        }
      }
    }

    this.questions = renumbered;
  }

  reorderBlock(sourceBlockIndex: number, targetBlockIndex: number): void {
    const groups = new Map<string, Question[]>();
    const order: string[] = [];

    for (const q of this.questions) {
      if (!groups.has(q.blockId)) {
        groups.set(q.blockId, []);
        order.push(q.blockId);
      }
      groups.get(q.blockId)!.push(q);
    }

    if (sourceBlockIndex < 0 || sourceBlockIndex >= order.length) return;
    if (targetBlockIndex < 0 || targetBlockIndex >= order.length) return;

    const [moved] = order.splice(sourceBlockIndex, 1);
    order.splice(targetBlockIndex, 0, moved);

    this.questions = [];
    for (const blockId of order) {
      this.questions.push(...groups.get(blockId)!);
    }

    this.renumber();
  }

  validate(): ValidationError[] {
    const errors: ValidationError[] = [];
    const allIds = new Set(this.questions.map(q => q.id));

    for (const q of this.questions) {
      if (q.scaleConfig) {
        const range = POINT_RANGES[q.type];
        if (range) {
          if (q.scaleConfig.points < range.min || q.scaleConfig.points > range.max) {
            errors.push({
              questionId: q.id,
              field: 'scaleConfig.points',
              message: `${q.id}: ${q.type} requires ${range.min}-${range.max} points, got ${q.scaleConfig.points}`,
            });
          }
        }

        if (!q.scaleConfig.leftLabel?.trim()) {
          errors.push({
            questionId: q.id,
            field: 'scaleConfig.leftLabel',
            message: `${q.id}: leftLabel is required for scale questions`,
          });
        }

        if (!q.scaleConfig.rightLabel?.trim()) {
          errors.push({
            questionId: q.id,
            field: 'scaleConfig.rightLabel',
            message: `${q.id}: rightLabel is required for scale questions`,
          });
        }
      }

      if ((q.type === 'single_choice' || q.type === 'multiple_choice') && (!q.options || q.options.length < 2)) {
        errors.push({
          questionId: q.id,
          field: 'options',
          message: `${q.id}: single_choice/multiple_choice requires at least 2 options, got ${q.options?.length ?? 0}`,
        });
      }

      if (q.next && !allIds.has(q.next)) {
        errors.push({
          questionId: q.id,
          field: 'next',
          message: `${q.id}: next references non-existent question ${q.next}`,
        });
      }

      if (q.optionRouting) {
        const validIndices = new Set(getRoutableIndices(q));
        for (const [key, targetId] of Object.entries(q.optionRouting)) {
          const idx = Number(key);
          if (!validIndices.has(idx)) {
            errors.push({
              questionId: q.id,
              field: 'optionRouting',
              message: `${q.id}: optionRouting index ${idx} is out of range`,
            });
          }
          if (!allIds.has(targetId)) {
            errors.push({
              questionId: q.id,
              field: 'optionRouting',
              message: `${q.id}: optionRouting references non-existent question ${targetId}`,
            });
          }
        }
      }
    }

    return errors;
  }

  serialize(): SerializedProject {
    return {
      version: 1,
      questions: this.questions.map(({ id: _id, ...rest }) => rest),
      blocks: { ...this._blocks },
    };
  }

  loadFromData(data: SerializedProject): void {
    this.questions = data.questions.map(q => ({ ...q, id: '' }));
    this._blocks = data.blocks ? { ...data.blocks } : {};
    this.renumber();
  }

  async exportToDocx(): Promise<Uint8Array> {
    const children: Paragraph[] = [];

    children.push(new Paragraph({
      text: 'Kwestionariusz',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }));

    const groups = new Map<string, Question[]>();
    const order: string[] = [];

    for (const q of this.questions) {
      if (!groups.has(q.blockId)) {
        groups.set(q.blockId, []);
        order.push(q.blockId);
      }
      groups.get(q.blockId)!.push(q);
    }

    for (const blockId of order) {
      const blockQuestions = groups.get(blockId)!;
      const blockMeta = this._blocks[blockId];
      const headingText = blockMeta?.name
        ? `Blok ${blockId}: ${blockMeta.name}`
        : `Blok ${blockId}`;

      children.push(new Paragraph({
        text: headingText,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 },
      }));

      if (blockMeta?.description) {
        children.push(new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: blockMeta.description, italics: true, size: 20 })],
        }));
      }

      for (const q of blockQuestions) {
        const incoming = getIncomingRoutesText(this.questions, q.id);
        if (incoming) {
          children.push(new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: incoming, italics: true, size: 16, color: '4472C4' })],
          }));
        }

        const questionRuns: TextRun[] = [
          new TextRun({ text: `${q.id}. `, size: 22, color: '666666' }),
          new TextRun({ text: q.text || '(brak treści)', size: 22 }),
        ];
        if (q.required) {
          questionRuns.push(new TextRun({ text: ' *', size: 22, color: 'FF0000' }));
        }
        children.push(new Paragraph({
          spacing: { before: 120 },
          children: questionRuns,
        }));

        const typeLabel = TYPE_LABELS[q.type] || q.type.replace(/_/g, ' ');
        children.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: `[${typeLabel}]`, size: 16, color: '999999' })],
        }));

        if (q.options && q.options.length > 0) {
          const symbol = q.type === 'single_choice' ? '○' : '☐';
          for (let i = 0; i < q.options.length; i++) {
            const route = q.optionRouting?.[i] ? `  → ${q.optionRouting[i]}` : '';
            children.push(new Paragraph({
              indent: { left: 400 },
              children: [
                new TextRun({ text: `${symbol} ${q.options[i] || '(pusta)'}`, size: 20 }),
                ...(route ? [new TextRun({ text: route, size: 16, color: '4472C4', italics: true })] : []),
              ],
            }));
          }
        }

        if (q.nonSubstantiveOption) {
          const nssymbol = q.type === 'multiple_choice' ? '☐' : '○';
          children.push(new Paragraph({
            indent: { left: 400 },
            spacing: { before: 60 },
            children: [new TextRun({ text: '────────────────────', size: 10, color: 'CCCCCC' })],
          }));
          children.push(new Paragraph({
            indent: { left: 400 },
            children: [
              new TextRun({ text: `${nssymbol} `, size: 20, color: '999999' }),
              new TextRun({ text: q.nonSubstantiveOption, size: 20, italics: true, color: '999999' }),
            ],
          }));
        }

        if (q.type === 'semantic_scale' && q.scaleConfig?.pointLabels) {
          const sorted = q.scaleConfig.pointLabels.slice().sort((a, b) => a.index - b.index);
          for (const pl of sorted) {
            const idx = pl.index - 1;
            const route = q.optionRouting?.[idx] ? `  → ${q.optionRouting[idx]}` : '';
            children.push(new Paragraph({
              indent: { left: 400 },
              children: [
                new TextRun({ text: `○ ${pl.label || '(brak opisu)'}`, size: 20 }),
                ...(route ? [new TextRun({ text: route, size: 16, color: '4472C4', italics: true })] : []),
              ],
            }));
          }
        }

        if (q.type === 'numeric_scale' && q.scaleConfig) {
          children.push(new Paragraph({
            indent: { left: 400 },
            spacing: { before: 120 },
            children: [
              new TextRun({ text: q.scaleConfig.leftLabel, size: 18, italics: true, color: '666666' }),
              new TextRun({ text: '  —  ', size: 18, color: 'CCCCCC' }),
              new TextRun({ text: q.scaleConfig.rightLabel, size: 18, italics: true, color: '666666' }),
            ],
          }));
          const numbers = Array.from({ length: q.scaleConfig.points + 1 }, (_, i) => String(i)).join('   ');
          children.push(new Paragraph({
            indent: { left: 400 },
            children: [new TextRun({ text: numbers, size: 16, color: '888888' })],
          }));
          if (q.optionRouting) {
            const entries = Object.entries(q.optionRouting).filter(([_, v]) => v);
            if (entries.length > 0) {
              const rt = entries.map(([k, v]) => `${k} → ${v}`).join(', ');
              children.push(new Paragraph({
                indent: { left: 400 },
                children: [new TextRun({ text: rt, size: 16, color: '4472C4', italics: true })],
              }));
            }
          }
        }

        if (q.type === 'graphic_scale' && q.scaleConfig) {
          children.push(new Paragraph({
            indent: { left: 400 },
            spacing: { before: 120 },
            children: [
              new TextRun({ text: q.scaleConfig.leftLabel, size: 18, italics: true, color: '666666' }),
              new TextRun({ text: '  —  ', size: 18, color: 'CCCCCC' }),
              new TextRun({ text: q.scaleConfig.rightLabel, size: 18, italics: true, color: '666666' }),
            ],
          }));
          const bar = '█' + '░'.repeat(Math.max(0, q.scaleConfig.points - 2)) + '█';
          children.push(new Paragraph({
            indent: { left: 400 },
            children: [
              new TextRun({ text: '1', size: 16, color: '888888' }),
              new TextRun({ text: ` ${bar} `, size: 18, color: '888888' }),
              new TextRun({ text: String(q.scaleConfig.points), size: 16, color: '888888' }),
            ],
          }));
          if (q.optionRouting) {
            const entries = Object.entries(q.optionRouting).filter(([_, v]) => v);
            if (entries.length > 0) {
              const rt = entries.map(([k, v]) => `${Number(k) + 1} → ${v}`).join(', ');
              children.push(new Paragraph({
                indent: { left: 400 },
                children: [new TextRun({ text: rt, size: 16, color: '4472C4', italics: true })],
              }));
            }
          }
        }

        if (q.next) {
          children.push(new Paragraph({
            indent: { left: 400 },
            spacing: { before: 100 },
            children: [new TextRun({ text: `→ Dalej: ${q.next}`, size: 16, color: '4472C4' })],
          }));
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    return new Uint8Array(await blob.arrayBuffer());
  }
}
