import { EvaluationLifecycleStage } from '../constants/evaluation';

export type AttendanceStatus = 'PRESENT' | 'ABSENT';

/**
 * Attendance record for a specific student.
 * Note: Attendance and marks are logically separate records even when captured in same session.
 */
export interface StudentAttendanceRecord {
  id?: string;
  studentRollNumber: string;
  projectId: string;
  stage: EvaluationLifecycleStage;
  status: AttendanceStatus;
  recordedByFacultyId: string;
  recordedAt: string;
}

/**
 * Individual student marks record.
 * Important: Marks are student-specific, NOT team-level.
 * Totals must be calculated from constituent criteria.
 */
export interface StudentMarksRecord {
  id?: string;
  studentRollNumber: string;
  projectId: string;
  presentation1Marks?: number; // max 6
  presentation2Marks?: number; // max 24
  evaluation1Marks?: number;   // max 30
  evaluation2Marks?: number;   // max 30
  evaluation3Marks?: number;   // max 40
  remarks?: string;
  evaluatedByFacultyId: string;
  evaluatedAt: string;
}

/**
 * Helper to compute total evaluated marks.
 */
export function calculateStudentGrandTotal(marks: Partial<StudentMarksRecord>): number {
  const p1 = marks.presentation1Marks ?? 0;
  const p2 = marks.presentation2Marks ?? 0;
  const e1 = marks.evaluation1Marks ?? 0;
  const e2 = marks.evaluation2Marks ?? 0;
  const e3 = marks.evaluation3Marks ?? 0;
  return Number((p1 + p2 + e1 + e2 + e3).toFixed(2));
}

/**
 * Evaluation session envelope for team grading workflow.
 */
export interface EvaluationSession {
  sessionId?: string;
  projectId: string;
  academicYear: string;
  facultyId: string;
  currentStage: EvaluationLifecycleStage;
  attendance: Record<string, AttendanceStatus>; // rollNumber -> status
  marks: Record<string, StudentMarksRecord>;     // rollNumber -> marks
}
