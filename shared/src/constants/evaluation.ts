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
