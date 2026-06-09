import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, BorderStyle, AlignmentType,
} from 'docx';
import type { Question, QuestionType, ValidationError, SerializedProject, BlockMeta, FragmentExport } from './types';

const POINT_RANGES: Record<QuestionType, { min: number; max: number } | null> = {
  open: null,
  single_choice: null,
  multiple_choice: null,
  semantic_scale: { min: 4, max: 7 },
  numeric_scale: { min: 5, max: 11 },
  graphic_scale: { min: 5, max: 11 },
  statement_scale: { min: 3, max: 11 },
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
    return Array.from({ length: q.scaleConfig?.points ?? 0 }, (_, i) => i);
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
  statement_scale: 'Ocena stwierdzeń',
};

export function getDisplayValue(source: Question, optionIndex: number): number {
  if (source.type === 'numeric_scale') return optionIndex + (source.scaleConfig?.minValue ?? 0);
  return optionIndex + 1;
}

export function formatValues(vals: number[]): string {
  if (vals.length === 0) return '';
  if (vals.length === 1) return String(vals[0]);
  const head = vals.slice(0, -1).join(', ');
  return `${head} lub ${vals[vals.length - 1]}`;
}

const NON_SUBSTANTIVE_CODE = 99;
const DOCX_FONT = 'Arial';
const CELL_FONT_SIZE = 20;
const BORDER_SIZE = 4;

function cellParagraph(text: string, opts?: { bold?: boolean; italics?: boolean; color?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType] }): Paragraph {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    indent: { left: 0, right: 0, firstLine: 0 },
    alignment: opts?.alignment,
    children: [
      new TextRun({
        text,
        font: DOCX_FONT,
        size: CELL_FONT_SIZE,
        bold: opts?.bold,
        italics: opts?.italics,
        color: opts?.color,
      }),
    ],
  });
}

function tableCell(text: string, opts?: { bold?: boolean; italics?: boolean; color?: string; alignment?: (typeof AlignmentType)[keyof typeof AlignmentType]; verticalAlign?: 'bottom' | 'center' | 'top' }): TableCell {
  const { verticalAlign, ...paragraphOpts } = opts ?? {};
  return new TableCell({
    margins: { top: 0, bottom: 0, left: 40, right: 40 },
    verticalAlign,
    children: [cellParagraph(text, paragraphOpts as Parameters<typeof cellParagraph>[1])],
  });
}

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
  insideVertical: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' },
};

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

function choiceOptionsToTable(q: Question): Table {
  const hasRouting = q.optionRouting && Object.values(q.optionRouting).some(v => v);

  const separatorBorder = { top: { style: BorderStyle.SINGLE, size: BORDER_SIZE, color: '000000' } };

  function optionRow(text: string, code: string, routing: string | undefined, isNonSubstantive: boolean): TableRow {
    const cells: TableCell[] = [
      new TableCell({
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
        borders: isNonSubstantive ? separatorBorder : undefined,
        children: [cellParagraph(text, isNonSubstantive ? { italics: true, color: '999999' } : undefined)],
      }),
      new TableCell({
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
        borders: isNonSubstantive ? separatorBorder : undefined,
        children: [cellParagraph(code, { alignment: AlignmentType.CENTER, color: isNonSubstantive ? '999999' : undefined })],
      }),
    ];
    if (hasRouting) {
      cells.push(new TableCell({
        margins: { top: 0, bottom: 0, left: 40, right: 40 },
        borders: isNonSubstantive ? separatorBorder : undefined,
        children: [cellParagraph(routing ?? '', routing ? { italics: true, color: '4472C4' } : undefined)],
      }));
    }
    return new TableRow({ children: cells });
  }

  const rows: TableRow[] = [];

  if (q.type === 'semantic_scale' && q.scaleConfig?.pointLabels) {
    const sorted = q.scaleConfig.pointLabels.slice().sort((a, b) => a.index - b.index);
    for (const pl of sorted) {
      const idx = pl.index - 1;
      rows.push(optionRow(
        pl.label || '(brak opisu)',
        String(pl.index),
        q.optionRouting?.[idx],
        false,
      ));
    }
  } else if (q.options && q.options.length > 0) {
    for (let i = 0; i < q.options.length; i++) {
      rows.push(optionRow(
        q.options[i] || '(pusta)',
        String(getDisplayValue(q, i)),
        q.optionRouting?.[i],
        false,
      ));
    }
  }

  if (q.nonSubstantiveOption) {
    rows.push(optionRow(q.nonSubstantiveOption, String(NON_SUBSTANTIVE_CODE), undefined, true));
  }

  return new Table({ rows, borders: TABLE_BORDERS });
}

function numericScaleToTable(q: Question): Table {
  if (!q.scaleConfig) return new Table({ rows: [] });

  const n = q.scaleConfig.points;
  const minVal = q.scaleConfig.minValue ?? 0;
  const empty = () => cellParagraph('');

  const headerCells: TableCell[] = [];
  const valueCells: TableCell[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      headerCells.push(tableCell(q.scaleConfig.leftLabel));
    } else if (i === n - 1) {
      headerCells.push(tableCell(q.scaleConfig.rightLabel));
    } else {
      headerCells.push(new TableCell({ margins: { top: 0, bottom: 0, left: 40, right: 40 }, children: [empty()] }));
    }
    valueCells.push(tableCell(String(minVal + i), { alignment: AlignmentType.CENTER }));
  }

  return new Table({
    rows: [
      new TableRow({ children: headerCells }),
      new TableRow({ children: valueCells }),
    ],
    borders: TABLE_BORDERS,
  });
}

function graphicScaleToTable(q: Question): Table {
  if (!q.scaleConfig) return new Table({ rows: [] });

  const n = q.scaleConfig.points;
  const empty = () => cellParagraph('');

  const headerCells: TableCell[] = [];
  const valueCells: TableCell[] = [];

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      headerCells.push(tableCell(q.scaleConfig.leftLabel));
    } else if (i === n - 1) {
      headerCells.push(tableCell(q.scaleConfig.rightLabel));
    } else {
      headerCells.push(new TableCell({ margins: { top: 0, bottom: 0, left: 40, right: 40 }, children: [empty()] }));
    }
    valueCells.push(tableCell(String(i + 1), { alignment: AlignmentType.CENTER }));
  }

  return new Table({
    rows: [
      new TableRow({ children: headerCells }),
      new TableRow({ children: valueCells }),
    ],
    borders: TABLE_BORDERS,
  });
}

function statementScaleToTable(q: Question): Table {
  if (!q.scaleConfig || !q.statements || q.statements.length === 0) return new Table({ rows: [] });

  const n = q.scaleConfig.points;
  const isSemantic = q.scaleConfig.pointLabels && q.scaleConfig.pointLabels.length > 0;
  const hasNso = !!q.nonSubstantiveOption;

  function headerAlignment(i: number): (typeof AlignmentType)[keyof typeof AlignmentType] {
    if (i === 0) return AlignmentType.RIGHT;
    if (i === n - 1) return AlignmentType.LEFT;
    return AlignmentType.CENTER;
  }

  const headerCells: TableCell[] = [tableCell('', { verticalAlign: 'bottom' })];
  for (let i = 0; i < n; i++) {
    const align = headerAlignment(i);
    if (isSemantic) {
      const label = q.scaleConfig!.pointLabels!.find(pl => pl.index === i + 1)?.label ?? '';
      headerCells.push(tableCell(label, { verticalAlign: 'bottom', alignment: align }));
    } else {
      const val = String(i + (q.scaleConfig!.minValue ?? 0));
      if (i === 0 && q.scaleConfig!.leftLabel) {
        headerCells.push(new TableCell({
          margins: { top: 0, bottom: 0, left: 40, right: 40 },
          verticalAlign: 'bottom',
          children: [
            cellParagraph(q.scaleConfig!.leftLabel, { italics: true, alignment: AlignmentType.RIGHT }),
            cellParagraph(val, { alignment: AlignmentType.RIGHT }),
          ],
        }));
      } else if (i === n - 1 && q.scaleConfig!.rightLabel) {
        headerCells.push(new TableCell({
          margins: { top: 0, bottom: 0, left: 40, right: 40 },
          verticalAlign: 'bottom',
          children: [
            cellParagraph(q.scaleConfig!.rightLabel, { italics: true, alignment: AlignmentType.LEFT }),
            cellParagraph(val, { alignment: AlignmentType.LEFT }),
          ],
        }));
      } else {
        headerCells.push(tableCell(val, { verticalAlign: 'bottom', alignment: align }));
      }
    }
  }
  if (hasNso) {
    headerCells.push(tableCell(q.nonSubstantiveOption!, { verticalAlign: 'bottom', alignment: AlignmentType.CENTER, italics: true }));
  }
  const rows: TableRow[] = [new TableRow({ children: headerCells })];

  for (const st of q.statements) {
    const cells: TableCell[] = [
      tableCell(st || '(puste)', { italics: true }),
    ];
    for (let i = 0; i < n; i++) {
      const code = String(isSemantic ? i + 1 : i + (q.scaleConfig!.minValue ?? 0));
      cells.push(tableCell(code, { alignment: AlignmentType.CENTER, color: '999999' }));
    }
    if (hasNso) {
      const nsoCode = n < 8 ? '9' : '99';
      cells.push(tableCell(nsoCode, { alignment: AlignmentType.CENTER, color: '999999' }));
    }
    rows.push(new TableRow({ children: cells }));
  }

  return new Table({ rows, borders: TABLE_BORDERS });
}

export class SurveyEngine {
  private questions: Question[];
  private _blocks: Record<string, BlockMeta>;
  private _title: string;

  constructor(questions: Question[] = [], blocks: Record<string, BlockMeta> = {}, title = '') {
    this._title = title;
    this._blocks = { ...blocks };
    this.questions = questions.map(q => ({ ...q }));
    this.renumber();
  }

  getTitle(): string {
    return this._title;
  }

  setTitle(title: string): void {
    this._title = title;
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

  deleteBlock(blockId: string): void {
    this.questions = this.questions.filter(q => q.blockId !== blockId);
    delete this._blocks[blockId];
    this.renumber();
  }

  update(id: string, updates: Partial<Omit<Question, 'id'>>): void {
    if ((updates.type === 'single_choice' || updates.type === 'multiple_choice') && !updates.options) {
      updates.options = [];
    }
    if (updates.type && !['single_choice', 'multiple_choice'].includes(updates.type)) {
      updates.options = undefined;
    }
    if (updates.type !== 'statement_scale') {
      updates.statements = undefined;
    }
    if (updates.type === 'statement_scale' && !updates.statements) {
      updates.statements = [];
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

  private getNextBlockId(): string {
    const existing = new Set(Object.keys(this._blocks));
    for (let i = 0; i < 26; i++) {
      const id = String.fromCharCode(65 + i);
      if (!existing.has(id)) return id;
    }
    return blockIndexToPrefix(existing.size);
  }

  exportSelection(questionIds: string[]): FragmentExport {
    const selected = this.questions.filter(q => questionIds.includes(q.id));
    const blockIds = new Set(selected.map(q => q.blockId));
    const blocks: Record<string, BlockMeta> = {};
    for (const bid of blockIds) {
      const meta = this._blocks[bid];
      if (meta) blocks[bid] = { ...meta };
    }
    return {
      version: 1,
      kind: 'question',
      questions: selected.map(({ id: _id, ...rest }) => rest),
      blocks,
    };
  }

  exportBlock(blockId: string): FragmentExport {
    const blockQuestions = this.questions.filter(q => q.blockId === blockId);
    const blockMeta = this._blocks[blockId] ?? { name: '' };
    return {
      version: 1,
      kind: 'block',
      questions: blockQuestions.map(({ id: _id, ...rest }) => rest),
      blocks: { [blockId]: { ...blockMeta } },
    };
  }

  importFragment(data: FragmentExport, afterBlockId?: string): void {
    if (data.kind === 'block') {
      const existingBlockIds = Object.keys(this._blocks);
      const newBlockId = this.getNextBlockId();
      const sourceMeta = Object.values(data.blocks)[0];
      this._blocks[newBlockId] = sourceMeta ? { ...sourceMeta } : { name: '' };

      const newQuestions = data.questions.map(q => ({
        ...q, id: '', blockId: newBlockId,
      }));

      if (afterBlockId && existingBlockIds.includes(afterBlockId)) {
        let insertIndex = this.questions.length;
        for (let i = this.questions.length - 1; i >= 0; i--) {
          if (this.questions[i].blockId === afterBlockId) {
            insertIndex = i + 1;
            break;
          }
        }
        this.questions.splice(insertIndex, 0, ...newQuestions);
      } else if (existingBlockIds.length > 0) {
        this.questions.push(...newQuestions);
      } else {
        this.questions.push(...newQuestions);
      }
    } else {
      if (this.questions.length === 0) {
        const newBlockId = this.getNextBlockId();
        this._blocks[newBlockId] = { name: '' };
        this.questions.push(...data.questions.map(q => ({
          ...q, id: '', blockId: newBlockId,
        })));
      } else {
        let targetBlock = afterBlockId && this._blocks[afterBlockId]
          ? afterBlockId
          : this.questions[this.questions.length - 1].blockId;
        this.questions.push(...data.questions.map(q => ({
          ...q, id: '', blockId: targetBlock,
        })));
      }
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

        const isStatementSemantic = q.type === 'statement_scale'
          && q.scaleConfig.pointLabels && q.scaleConfig.pointLabels.length > 0;

        if (!isStatementSemantic) {
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

        if ((q.type === 'semantic_scale' || isStatementSemantic) && q.scaleConfig.pointLabels) {
          const emptyLabels = q.scaleConfig.pointLabels.filter(pl => !pl.label.trim());
          if (emptyLabels.length > 0) {
            errors.push({
              questionId: q.id,
              field: 'scaleConfig.pointLabels',
              message: `${q.id}: point labels ${emptyLabels.map(pl => pl.index).join(', ')} are empty`,
            });
          }
        }
      }

      if ((q.type === 'single_choice' || q.type === 'multiple_choice') && (!q.options || q.options.length < 2)) {
        errors.push({
          questionId: q.id,
          field: 'options',
          message: `${q.id}: single_choice/multiple_choice requires at least 2 options, got ${q.options?.length ?? 0}`,
        });
      }

      if (q.type === 'statement_scale' && (!q.statements || q.statements.length < 2)) {
        errors.push({
          questionId: q.id,
          field: 'statements',
          message: `${q.id}: statement_scale requires at least 2 statements, got ${q.statements?.length ?? 0}`,
        });
      } else if (q.type === 'statement_scale' && q.statements) {
        const emptyIdxs = q.statements
          .map((s, i) => (!s.trim() ? i : -1))
          .filter(i => i >= 0);
        if (emptyIdxs.length > 0) {
          errors.push({
            questionId: q.id,
            field: 'statements',
            message: `${q.id}: statements ${emptyIdxs.map(i => i + 1).join(', ')} are empty`,
          });
        }
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
      title: this._title || undefined,
      questions: this.questions.map(({ id: _id, ...rest }) => rest),
      blocks: { ...this._blocks },
    };
  }

  loadFromData(data: SerializedProject): void {
    this._title = data.title ?? '';
    this.questions = data.questions.map(q => ({ ...q, id: '' }));
    this._blocks = data.blocks ? { ...data.blocks } : {};
    this.renumber();
  }

  async exportToDocx(): Promise<Uint8Array> {
    const children: (Paragraph | Table)[] = [];

    if (this._title) {
      children.push(new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 200 },
        children: [new TextRun({ text: this._title, font: DOCX_FONT })],
      }));
    }

    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'Kwestionariusz', font: DOCX_FONT })],
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
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 },
        children: [new TextRun({ text: headingText, font: DOCX_FONT })],
      }));

      if (blockMeta?.description) {
        children.push(new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: blockMeta.description, font: DOCX_FONT, italics: true, size: 20 })],
        }));
      }

      for (const q of blockQuestions) {
        const incoming = getIncomingRoutesText(this.questions, q.id);
        if (incoming) {
          children.push(new Paragraph({
            spacing: { before: 200 },
            children: [new TextRun({ text: incoming, font: DOCX_FONT, italics: true, size: 16, color: '4472C4' })],
          }));
        }

        const questionRuns: TextRun[] = [
          new TextRun({ text: `${q.id}. `, font: DOCX_FONT, size: 22, color: '666666' }),
          new TextRun({ text: q.text || '(brak treści)', font: DOCX_FONT, size: 22 }),
        ];
        if (q.required) {
          questionRuns.push(new TextRun({ text: ' *', font: DOCX_FONT, size: 22, color: 'FF0000' }));
        }
        children.push(new Paragraph({
          spacing: { before: 120 },
          children: questionRuns,
        }));

        const typeLabel = TYPE_LABELS[q.type] || q.type.replace(/_/g, ' ');
        children.push(new Paragraph({
          spacing: { after: 60 },
          children: [new TextRun({ text: `[${typeLabel}]`, font: DOCX_FONT, size: 16, color: '999999' })],
        }));

        if ((q.type === 'single_choice' || q.type === 'multiple_choice')
          && q.options && q.options.length > 0) {
          children.push(choiceOptionsToTable(q));
        } else if (q.type === 'semantic_scale' && q.scaleConfig?.pointLabels) {
          children.push(choiceOptionsToTable(q));
        }

        if (q.type === 'numeric_scale' && q.scaleConfig) {
          children.push(numericScaleToTable(q));
          const routingEntries = q.optionRouting
            ? Object.entries(q.optionRouting).filter(([_, v]) => v)
            : [];
          if (routingEntries.length > 0) {
            const minVal = q.scaleConfig.minValue ?? 0;
            const rt = routingEntries.map(([k, v]) => `${Number(k) + minVal} → ${v}`).join(', ');
            children.push(new Paragraph({
              spacing: { before: 60, after: 0 },
              children: [new TextRun({ text: rt, font: DOCX_FONT, size: 16, color: '4472C4', italics: true })],
            }));
          }
        }

        if (q.type === 'graphic_scale' && q.scaleConfig) {
          children.push(graphicScaleToTable(q));
          const routingEntries = q.optionRouting
            ? Object.entries(q.optionRouting).filter(([_, v]) => v)
            : [];
          if (routingEntries.length > 0) {
            const rt = routingEntries.map(([k, v]) => `${Number(k) + 1} → ${v}`).join(', ');
            children.push(new Paragraph({
              spacing: { before: 60, after: 0 },
              children: [new TextRun({ text: rt, font: DOCX_FONT, size: 16, color: '4472C4', italics: true })],
            }));
          }
        }

        if (q.type === 'statement_scale' && q.scaleConfig && q.statements && q.statements.length > 0) {
          children.push(statementScaleToTable(q));
        }

        if (q.next) {
          children.push(new Paragraph({
            indent: { left: 400 },
            spacing: { before: 100 },
            children: [new TextRun({ text: `→ Dalej: ${q.next}`, font: DOCX_FONT, size: 16, color: '4472C4' })],
          }));
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    return new Uint8Array(await blob.arrayBuffer());
  }
}
