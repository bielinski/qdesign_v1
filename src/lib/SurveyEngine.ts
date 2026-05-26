import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { Question, QuestionType, ValidationError } from './types';

const POINT_RANGES: Record<QuestionType, { min: number; max: number } | null> = {
  open: null,
  single_choice: null,
  multiple_choice: null,
  semantic_scale: { min: 4, max: 7 },
  numeric_scale: { min: 5, max: 11 },
  graphic_scale: { min: 5, max: 11 },
};

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

  constructor(questions: Question[] = []) {
    this.questions = questions.map(q => ({ ...q }));
    this.renumber();
  }

  getQuestions(): Question[] {
    return this.questions.map(q => ({ ...q }));
  }

  add(question: Omit<Question, 'id'>): string {
    this.questions.push({ ...question, id: '' });
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
    this.questions = this.questions.filter(q => q.id !== id);
    this.renumber();
  }

  update(id: string, updates: Partial<Omit<Question, 'id'>>): void {
    if ((updates.type === 'single_choice' || updates.type === 'multiple_choice') && !updates.options) {
      updates.options = [];
    }
    if (updates.type && !['single_choice', 'multiple_choice'].includes(updates.type)) {
      updates.options = undefined;
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
        renumbered.push({
          ...blockQuestions[qi],
          id: `${prefix}.${qi + 1}`,
        });
      }
    }

    this.questions = renumbered;
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
    }

    return errors;
  }

  async exportToDocx(): Promise<Uint8Array> {
    const children: (Paragraph)[] = [];

    children.push(
      new Paragraph({
        text: 'Questionnaire',
        heading: HeadingLevel.HEADING_1,
      }),
    );

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

      children.push(
        new Paragraph({
          text: `Block ${blockId}`,
          heading: HeadingLevel.HEADING_2,
        }),
      );

      for (const q of blockQuestions) {
        const typeLabel = q.type.replace(/_/g, ' ');
        const requiredLabel = q.required ? '(required)' : '(optional)';

        children.push(
          new Paragraph({
            spacing: { before: 200 },
            children: [
              new TextRun({ text: `${q.id}. ${q.text}`, bold: true }),
              new TextRun({ text: ` [${typeLabel}, ${requiredLabel}]` }),
            ],
          }),
        );

        if (q.scaleConfig) {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: `Scale: ${q.scaleConfig.leftLabel} \u2014 ${q.scaleConfig.rightLabel}  (${q.scaleConfig.points} points, ${q.scaleConfig.polarity})`,
                  italics: true,
                }),
              ],
            }),
          );

          if (q.scaleConfig.pointLabels?.length) {
            const labels = q.scaleConfig.pointLabels
              .slice()
              .sort((a, b) => a.index - b.index)
              .map(pl => `${pl.index}: ${pl.label}`)
              .join(', ');

            children.push(
              new Paragraph({
                indent: { left: 400 },
                children: [
                  new TextRun({ text: `Point labels: ${labels}`, size: 18 }),
                ],
              }),
            );
          }
        }

        if (q.options && q.options.length > 0) {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              children: [
                new TextRun({
                  text: `Options: ${q.options.map((o, i) => `${i + 1}. ${o}`).join(' | ')}`,
                  italics: true,
                  size: 18,
                }),
              ],
            }),
          );
        }

        if (q.nonSubstantiveOption) {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              children: [new TextRun({ text: `Non-substantive option: ${q.nonSubstantiveOption}`, size: 18, italics: true })],
            }),
          );
        }

        if (q.next) {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              children: [new TextRun({ text: `\u2192 Next: ${q.next}`, size: 18 })],
            }),
          );
        }
      }
    }

    const doc = new Document({ sections: [{ children }] });
    return Packer.toBuffer(doc);
  }
}
