/**
 * Lifecycle states for student evaluation sessions.
 */
export const EVALUATION_LIFECYCLE_STAGES = [
  'PENDING',
  'EVALUATION_SESSION',
  'ATTENDANCE_AND_MARKS',
  'SAVE_SUBMIT',
  'COMPLETED'
] as const;

export type EvaluationLifecycleStage = (typeof EVALUATION_LIFECYCLE_STAGES)[number];

/**
 * Standard weightage breakdown according to official institutional criteria.
 * Total points must calculate from component criteria rather than hardcoded totals.
 */
export const EVALUATION_STRUCTURE = {
  PRESENTATION_1: {
    key: 'presentation_1',
    label: 'Presentation-1',
    maxMarks: 6
  },
  PRESENTATION_2: {
    key: 'presentation_2',
    label: 'Presentation-2',
    maxMarks: 24
  },
  EVALUATION_1: {
    key: 'evaluation_1',
    label: 'Evaluation-1',
    maxMarks: 30
  },
  EVALUATION_2: {
    key: 'evaluation_2',
    label: 'Evaluation-2',
    maxMarks: 30
  },
  EVALUATION_3: {
    key: 'evaluation_3',
    label: 'Evaluation-3',
    maxMarks: 40
  }
} as const;

export const EVALUATION_GRAND_TOTAL_MAX = 100;

/**
 * Default recognized academic years, extensible for 4th Year or future cohorts.
 */
export const INITIAL_ACADEMIC_YEARS = ['2nd Year', '3rd Year'] as const;
export type InitialAcademicYear = (typeof INITIAL_ACADEMIC_YEARS)[number];

export const CANONICAL_EVALUATION_STAGES = [
  'PRESENTATION_1',
  'PRESENTATION_2',
  'EVALUATION_2',
  'EVALUATION_3',
] as const;

export type CanonicalEvaluationStage = (typeof CANONICAL_EVALUATION_STAGES)[number];
export type EvaluationStageCode = 'P1' | 'P2' | 'E2' | 'E3';

export interface EvaluationStageMeta {
  stage: CanonicalEvaluationStage;
  code: EvaluationStageCode;
  name: string;
  maxMarks: number;
  description: string;
}

export const EVALUATION_STAGE_CONFIG: Record<CanonicalEvaluationStage, EvaluationStageMeta> = {
  PRESENTATION_1: {
    stage: 'PRESENTATION_1',
    code: 'P1',
    name: 'Presentation-1',
    maxMarks: 6,
    description: 'DPRC Novelty & Technical Feasibility',
  },
  PRESENTATION_2: {
    stage: 'PRESENTATION_2',
    code: 'P2',
    name: 'Presentation-2',
    maxMarks: 24,
    description: 'Evaluator Rubric Review',
  },
  EVALUATION_2: {
    stage: 'EVALUATION_2',
    code: 'E2',
    name: 'Evaluation-2',
    maxMarks: 30,
    description: 'Mid-Term Functional Evaluation',
  },
  EVALUATION_3: {
    stage: 'EVALUATION_3',
    code: 'E3',
    name: 'Evaluation-3',
    maxMarks: 40,
    description: 'Final Defense, Viva & Documentation',
  },
};
