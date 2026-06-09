export type QuestionType =
  | 'open'
  | 'single_choice'
  | 'multiple_choice'
  | 'semantic_scale'
  | 'numeric_scale'
  | 'graphic_scale'
  | 'statement_scale';

export enum ScalePolarity {
  Bipolar = 'bipolar',
  Unipolar = 'unipolar',
}

export interface PointLabel {
  index: number;
  label: string;
}

export interface ScaleConfig {
  polarity: ScalePolarity;
  leftLabel: string;
  rightLabel: string;
  points: number;
  pointLabels?: PointLabel[];
  minValue?: number;
}

export interface BlockMeta {
  name: string;
  description?: string;
}

export interface Question {
  id: string;
  blockId: string;
  text: string;
  type: QuestionType;
  scaleConfig?: ScaleConfig;
  required: boolean;
  next?: string;
  options?: string[];
  statements?: string[];
  nonSubstantiveOption?: string;
  optionRouting?: Record<number, string>;
}

export interface SerializedProject {
  version: number;
  title?: string;
  questions: Omit<Question, 'id'>[];
  blocks: Record<string, BlockMeta>;
}

export interface FragmentExport {
  version: number;
  kind: 'question' | 'block';
  questions: Omit<Question, 'id'>[];
  blocks: Record<string, BlockMeta>;
}

export interface ValidationError {
  questionId: string;
  field: string;
  message: string;
}
