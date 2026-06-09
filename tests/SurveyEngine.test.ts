import { describe, it, expect } from 'vitest';
import { SurveyEngine } from '../src/lib/SurveyEngine';
import { ScalePolarity } from '../src/lib/types';
import type { Question } from '../src/lib/types';

function makeQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: '',
    blockId: 'A',
    text: 'Question',
    type: 'open',
    required: false,
    ...overrides,
  };
}

describe('SurveyEngine', () => {
  describe('renumber()', () => {
    it('assigns sequential IDs within blocks', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
        makeQuestion({ blockId: 'A', text: 'Q2' }),
        makeQuestion({ blockId: 'B', text: 'Q3' }),
      ]);
      const qs = engine.getQuestions();
      expect(qs[0].id).toBe('A.1');
      expect(qs[1].id).toBe('A.2');
      expect(qs[2].id).toBe('B.1');
    });

    it('renumbers after insertInMiddle (insertAfter)', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
        makeQuestion({ blockId: 'A', text: 'Q2' }),
        makeQuestion({ blockId: 'A', text: 'Q3' }),
      ]);
      engine.insertAfter('A.1', { blockId: 'A', text: 'New', type: 'open', required: false });
      const ids = engine.getQuestions().map(q => q.id);
      expect(ids).toEqual(['A.1', 'A.2', 'A.3', 'A.4']);
      expect(engine.getQuestions()[1].text).toBe('New');
    });

    it('renumbers after delete', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
        makeQuestion({ blockId: 'A', text: 'Q2' }),
        makeQuestion({ blockId: 'A', text: 'Q3' }),
      ]);
      engine.delete('A.2');
      const ids = engine.getQuestions().map(q => q.id);
      expect(ids).toEqual(['A.1', 'A.2']);
      expect(engine.getQuestions()[1].text).toBe('Q3');
    });

    it('renumbers after move to another block (all questions now in target block)', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
        makeQuestion({ blockId: 'B', text: 'Q2' }),
      ]);
      engine.move('A.1', 'B', 0);
      const qs = engine.getQuestions();
      // both questions are now in block 'B', which is the only block → prefix 'A'
      expect(qs.map(q => q.id)).toEqual(['A.1', 'A.2']);
      expect(qs.every(q => q.blockId === 'B')).toBe(true);
    });

    it('renumbers after move within same block', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
        makeQuestion({ blockId: 'A', text: 'Q2' }),
        makeQuestion({ blockId: 'A', text: 'Q3' }),
      ]);
      engine.move('A.1', 'A', 2);
      const qs = engine.getQuestions();
      expect(qs.map(q => q.id)).toEqual(['A.1', 'A.2', 'A.3']);
      expect(qs[2].text).toBe('Q1');
    });

    it('handles many blocks with correct alphabetic prefixes', () => {
      const blockIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                        'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
      const questions = blockIds.map((bid, i) =>
        makeQuestion({ blockId: bid, text: `Q${i + 1}` }),
      );
      const engine = new SurveyEngine(questions);
      const qs = engine.getQuestions();
      expect(qs[0].id).toBe('A.1');
      expect(qs[1].id).toBe('B.1');
      expect(qs[25].id).toBe('Z.1');
    });
  });

  describe('validate() - scale points', () => {
    it('rejects semantic_scale with 3 points', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'semantic_scale',
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 3 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.points')).toBe(true);
    });

    it('accepts semantic_scale with 5 points', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'semantic_scale',
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      expect(engine.validate().filter(e => e.field === 'scaleConfig.points')).toHaveLength(0);
    });

    it('rejects numeric_scale with 12 points', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'numeric_scale',
          scaleConfig: { polarity: ScalePolarity.Unipolar, leftLabel: 'L', rightLabel: 'R', points: 12 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.points')).toBe(true);
    });

    it('rejects graphic_scale with 4 points', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'graphic_scale',
          scaleConfig: { polarity: ScalePolarity.Unipolar, leftLabel: 'L', rightLabel: 'R', points: 4 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.points')).toBe(true);
    });
  });

  describe('validate() - labels', () => {
    it('rejects missing leftLabel', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'semantic_scale',
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: '', rightLabel: 'R', points: 5 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.leftLabel')).toBe(true);
    });

    it('rejects missing rightLabel', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'semantic_scale',
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: '', points: 5 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.rightLabel')).toBe(true);
    });
  });

  describe('validate() - next references', () => {
    it('rejects dangling next reference', () => {
      const engine = new SurveyEngine([
        makeQuestion({ next: 'B.99' }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'next')).toBe(true);
    });

    it('accepts valid next reference', () => {
      const engine = new SurveyEngine([
        makeQuestion({ text: 'Q1' }),
        makeQuestion({ text: 'Q2', next: 'A.1' }),
      ]);
      expect(engine.validate().filter(e => e.field === 'next')).toHaveLength(0);
    });
  });

  describe('validate() - valid questionnaires', () => {
    it('returns no errors for a fully valid questionnaire', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          text: 'How do you feel?',
          type: 'semantic_scale',
          required: true,
          scaleConfig: {
            polarity: ScalePolarity.Bipolar,
            leftLabel: 'Very bad',
            rightLabel: 'Very good',
            points: 5,
          },
        }),
        makeQuestion({
          text: 'Why?',
          type: 'open',
          required: false,
          next: 'A.3',
        }),
        makeQuestion({
          text: 'Age',
          type: 'numeric_scale',
          required: true,
          scaleConfig: {
            polarity: ScalePolarity.Unipolar,
            leftLabel: 'Young',
            rightLabel: 'Old',
            points: 7,
          },
        }),
      ]);
      expect(engine.validate()).toEqual([]);
    });
  });

  describe('add() returning ID', () => {
    it('returns the ID of the newly added question in existing block', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
      ]);
      const newId = engine.add({ blockId: 'A', text: 'NewQ', type: 'open', required: false });
      expect(newId).toBe('A.2');
    });

    it('returns the ID of the newly added question in new block', () => {
      const engine = new SurveyEngine([
        makeQuestion({ blockId: 'A', text: 'Q1' }),
      ]);
      const newId = engine.add({ blockId: 'B', text: 'NewQ', type: 'open', required: false });
      expect(newId).toBe('B.1');
    });
  });

  describe('validate() - options', () => {
    it('rejects single_choice with no options', () => {
      const engine = new SurveyEngine([
        makeQuestion({ type: 'single_choice' }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'options')).toBe(true);
    });

    it('rejects single_choice with 1 option', () => {
      const engine = new SurveyEngine([
        makeQuestion({ type: 'single_choice', options: ['Only'] }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'options')).toBe(true);
    });

    it('rejects multiple_choice with empty options', () => {
      const engine = new SurveyEngine([
        makeQuestion({ type: 'multiple_choice', options: [] }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'options')).toBe(true);
    });

    it('accepts single_choice with 2 options', () => {
      const engine = new SurveyEngine([
        makeQuestion({ type: 'single_choice', options: ['A', 'B'] }),
      ]);
      expect(engine.validate().filter(e => e.field === 'options')).toHaveLength(0);
    });
  });

  describe('validate() - nonSubstantiveOption', () => {
    it('accepts a question with nonSubstantiveOption', () => {
      const engine = new SurveyEngine([
        makeQuestion({ text: 'With option', nonSubstantiveOption: 'Trudno powiedzieć' }),
      ]);
      expect(engine.validate()).toHaveLength(0);
    });
  });

  describe('exportToDocx()', () => {
    it('generates a non-empty Uint8Array', async () => {
      const engine = new SurveyEngine([
        makeQuestion({ text: 'Test question', type: 'open', required: true }),
      ]);
      const buffer = await engine.exportToDocx();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('generates document with scale details', async () => {
      const engine = new SurveyEngine([
        makeQuestion({
          text: 'Rate your experience',
          type: 'semantic_scale',
          scaleConfig: {
            polarity: ScalePolarity.Bipolar,
            leftLabel: 'Poor',
            rightLabel: 'Excellent',
            points: 7,
            pointLabels: [
              { index: 1, label: 'Terrible' },
              { index: 7, label: 'Perfect' },
            ],
          },
          required: true,
        }),
      ]);
      const buffer = await engine.exportToDocx();
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  describe('statement_scale validation', () => {
    it('rejects statement_scale with 0 statements', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: [],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'statements')).toBe(true);
    });

    it('rejects statement_scale with 1 statement', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: ['Only'],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'statements')).toBe(true);
    });

    it('accepts statement_scale with 2 statements', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: ['A', 'B'],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      expect(engine.validate().filter(e => e.field === 'statements')).toHaveLength(0);
    });

    it('rejects statement_scale with empty statement', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: ['A', ''],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'statements')).toBe(true);
    });

    it('validates numeric-style scale config for statement_scale without pointLabels', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: ['A', 'B'],
          scaleConfig: { polarity: ScalePolarity.Unipolar, leftLabel: '', rightLabel: '', points: 5, pointLabels: [], minValue: 0 },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.leftLabel')).toBe(true);
      expect(errors.some(e => e.field === 'scaleConfig.rightLabel')).toBe(true);
    });

    it('validates semantic-style scale config for statement_scale with pointLabels', () => {
      const engine = new SurveyEngine([
        makeQuestion({
          type: 'statement_scale',
          statements: ['A', 'B'],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: '', rightLabel: '', points: 5, pointLabels: [{ index: 1, label: '' }, { index: 2, label: '' }] },
        }),
      ]);
      const errors = engine.validate();
      expect(errors.some(e => e.field === 'scaleConfig.pointLabels')).toBe(true);
    });
  });

  describe('statement_scale export', () => {
    it('generates a non-empty Uint8Array', async () => {
      const engine = new SurveyEngine([
        makeQuestion({
          text: 'Rate statements',
          type: 'statement_scale',
          statements: ['S1', 'S2'],
          scaleConfig: { polarity: ScalePolarity.Bipolar, leftLabel: 'L', rightLabel: 'R', points: 5 },
        }),
      ]);
      const buffer = await engine.exportToDocx();
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty question list', () => {
      const engine = new SurveyEngine([]);
      expect(engine.getQuestions()).toEqual([]);
      expect(engine.validate()).toEqual([]);
    });

    it('throws on insertAfter with non-existent id', () => {
      const engine = new SurveyEngine();
      expect(() => engine.insertAfter('nonexistent', makeQuestion())).toThrow('not found');
    });

    it('throws on move with non-existent id', () => {
      const engine = new SurveyEngine();
      expect(() => engine.move('nonexistent', 'B', 0)).toThrow('not found');
    });

    it('does not mutate returned array from getQuestions', () => {
      const engine = new SurveyEngine([makeQuestion({ text: 'Original' })]);
      const qs = engine.getQuestions();
      qs[0].text = 'Hacked';
      expect(engine.getQuestions()[0].text).toBe('Original');
    });
  });
});
