import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * ==============================================================================
 * 1. TEACHERS (Faculty, Guides, Evaluators & DPRC Members)
 * ==============================================================================
 * Institutional faculty credentials for both Guide and Evaluator operational modes.
 * - Single teacher login (userId format: firstname@abes)
 * - Initial temporary password with mandatory first-login password update.
 * - Production database strictly stores passwordHash, NEVER plaintext password.
 */
export const teachers = pgTable(
  'teachers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 100 }).notNull().unique(), // e.g. 'firstname@abes'
    name: varchar('name', { length: 255 }).notNull(), // e.g. 'Mr. Abhishek Yadav'
    email: varchar('email', { length: 255 }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    mustChangePassword: boolean('must_change_password').default(true).notNull(),
    department: varchar('department', { length: 150 })
      .default('Department of Computer Science & Engineering')
      .notNull(),
    designation: varchar('designation', { length: 100 }),
    role: varchar('role', { length: 50 }).default('Teacher').notNull(), // 'Teacher' | 'Coordinator' | 'Admin'
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_teachers_user_id').on(table.userId),
    index('idx_teachers_name').on(table.name),
  ]
);

/**
 * ==============================================================================
 * 2. ACADEMIC YEARS / COHORTS
 * ==============================================================================
 * Extensible cohort entity supporting current cohorts (2nd Year, 3rd Year)
 * and future academic sessions, semesters, and departments without code rewrites.
 */
export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(), // e.g. '3rd Year', '2nd Year'
    semester: varchar('semester', { length: 50 }).notNull(), // e.g. 'Semester-5th'
    academicSession: varchar('academic_session', { length: 50 }).notNull(), // e.g. '2026-27'
    department: varchar('department', { length: 150 })
      .default('Department of Computer Science & Engineering')
      .notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_academic_years_name').on(table.name),
    index('idx_academic_years_session').on(table.academicSession),
  ]
);

/**
 * ==============================================================================
 * 3. STUDENTS
 * ==============================================================================
 * Students have an internal UUID primary key.
 * IMPORTANT:
 * Roll Number is retained as the academic identifier, but is NOT the primary key
 * and not globally unique in DB to accommodate institutional re-registration anomalies
 * (e.g. Divyansh Kumar Roll No. 2400320100440 appearing in both P_083 and P_084).
 */
export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rollNumber: varchar('roll_number', { length: 50 }).notNull(), // Academic identifier
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    department: varchar('department', { length: 150 })
      .default('Department of Computer Science & Engineering')
      .notNull(),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_students_roll_number').on(table.rollNumber),
    index('idx_students_academic_year').on(table.academicYearId),
  ]
);

/**
 * ==============================================================================
 * 4. PROJECTS
 * ==============================================================================
 * Institutional project teams identified by institutional Project ID (P_001, P_002...).
 * Maps relationships to:
 * - Guide Teacher
 * - Evaluator Teacher
 * - DPRC Member 1 & DPRC Member 2 (for Evaluation-1 / Presentation-1 scoring)
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: varchar('project_id', { length: 50 }).notNull(), // e.g. 'P_001', 'P_083'
    title: text('title'), // e.g. 'Independent Multimodal Sign Recognition'
    technology: varchar('technology', { length: 200 }), // e.g. 'AIML-DS'
    domain: varchar('domain', { length: 200 }), // e.g. 'Artificial Intelligence & Data Science'
    academicYearId: uuid('academic_year_id').references(() => academicYears.id, {
      onDelete: 'set null',
    }),
    guideTeacherId: uuid('guide_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    evaluatorTeacherId: uuid('evaluator_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    dprcMember1TeacherId: uuid('dprc_member1_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    dprcMember2TeacherId: uuid('dprc_member2_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_projects_code').on(table.projectId),
    index('idx_projects_guide').on(table.guideTeacherId),
    index('idx_projects_evaluator').on(table.evaluatorTeacherId),
    index('idx_projects_academic_year').on(table.academicYearId),
  ]
);

/**
 * ==============================================================================
 * 5. PROJECT MEMBERS (Join entity between Projects and Students)
 * ==============================================================================
 * Connects students to project teams.
 * - Resolves the many-to-many relationship allowing students to participate in teams.
 * - Explicitly tracks isTeamLeader: the first listed student for a project in the
 *   official workbook is designated as the Team Leader.
 * - memberOrder: preserves original workbook listing sequence.
 */
export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    isTeamLeader: boolean('is_team_leader').default(false).notNull(),
    memberOrder: integer('member_order').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_project_members_unique').on(table.projectId, table.studentId),
    index('idx_project_members_project').on(table.projectId),
    index('idx_project_members_student').on(table.studentId),
  ]
);

/**
 * ==============================================================================
 * 6. EVALUATIONS (Stage & Criteria Configuration)
 * ==============================================================================
 * Defines the evaluation periods and formal criteria weights for an academic cohort:
 * - Presentation-1 = 6 Marks
 * - Presentation-2 = 24 Marks
 * - Evaluation-2 = 30 Marks
 * - Evaluation-3 = 40 Marks
 * Grand Total = 100 Marks
 */
export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    academicYearId: uuid('academic_year_id').references(() => academicYears.id, {
      onDelete: 'cascade',
    }),
    stage: varchar('stage', { length: 50 }).notNull(), // 'PRESENTATION_1' | 'PRESENTATION_2' | 'EVALUATION_2' | 'EVALUATION_3'
    name: varchar('name', { length: 100 }).notNull(), // 'Presentation-1', 'Presentation-2', 'Evaluation-2', 'Evaluation-3'
    maxMarks: numeric('max_marks', { precision: 5, scale: 2 }).notNull(), // 6.00, 24.00, 30.00, 40.00
    description: text('description'),
    isLocked: boolean('is_locked').default(false).notNull(),
    conductedAt: timestamp('conducted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_evaluations_academic_year').on(table.academicYearId),
    index('idx_evaluations_stage').on(table.stage),
  ]
);

/**
 * ==============================================================================
 * 7. EVALUATION ATTENDANCE
 * ==============================================================================
 * Attendance is student-specific and persists as a distinct, logically separate
 * record from marks, even when marked in the same evaluation session.
 * - evaluationStage: 'PRESENTATION_1' | 'PRESENTATION_2' | 'EVALUATION_2' | 'EVALUATION_3'
 * - status: 'PRESENT' | 'ABSENT'
 * - Supports bulk "Mark All Present" operation.
 * - Fully editable by teachers through the application.
 */
export const evaluationAttendance = pgTable(
  'evaluation_attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    evaluationId: uuid('evaluation_id').references(() => evaluations.id, {
      onDelete: 'set null',
    }),
    evaluationStage: varchar('evaluation_stage', { length: 50 }).notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull(), // 'PRESENT' | 'ABSENT'
    markedByTeacherId: uuid('marked_by_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),
    remarks: text('remarks'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_eval_attendance_unique').on(
      table.evaluationStage,
      table.projectId,
      table.studentId
    ),
    index('idx_eval_attendance_project').on(table.projectId),
    index('idx_eval_attendance_student').on(table.studentId),
    index('idx_eval_attendance_stage').on(table.evaluationStage),
  ]
);

/**
 * ==============================================================================
 * 8. EVALUATION MARKS
 * ==============================================================================
 * Individual student marks records. Marks are NEVER team-level.
 * Criteria and rubrics strictly mirror the verified institutional workbook:
 *
 * Presentation-1 (6 Marks max, DPRC):
 *   - Novelty & Innovation (5)
 *   - Technical Feasibility (5)
 *   - Total 10 scaled to 6
 *
 * Presentation-2 (24 Marks max, Evaluator Review):
 *   - Literature Review, Existing Work & Research Gap (6)
 *   - Proposed Methodology, Technical Approach & Feasibility (6)
 *   - Societal, Environmental, Sustainability & Ethical Considerations (6)
 *   - Work Plan, Team Contribution & Initial Presentation (6)
 *   - Total: 24
 *
 * Evaluation-1 Total = Presentation-1 (6) + Presentation-2 (24) = 30
 *
 * Evaluation-2 (30 Marks max):
 *   - Project Implementation & Technical Knowledge (6)
 *   - Troubleshooting & Functional Development (6)
 *   - Teamwork & Professional Practice (6)
 *   - Ethics & Environmental Compliance (6)
 *   - Presentation & Timeline Management (6)
 *   - Total: 30
 *
 * Evaluation-3 (40 Marks max):
 *   - Objectives Quality & Implementation (8)
 *   - Testing, Validation & Innovation (8)
 *   - Documentation & Research Output (8)
 *   - Societal & Environmental Impact (8)
 *   - Presentation, Viva & Contribution (8)
 *   - Total: 40
 *
 * Grand Total = Evaluation-1 (30) + Evaluation-2 (30) + Evaluation-3 (40) = 100
 *
 * Application is NOT view-only: teachers can enter/update marks directly.
 */
export const evaluationMarks = pgTable(
  'evaluation_marks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    evaluationId: uuid('evaluation_id').references(() => evaluations.id, {
      onDelete: 'set null',
    }),
    evaluationStage: varchar('evaluation_stage', { length: 50 }).notNull(), // 'PRESENTATION_1' | 'PRESENTATION_2' | 'EVALUATION_2' | 'EVALUATION_3'
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),
    evaluatedByTeacherId: uuid('evaluated_by_teacher_id').references(() => teachers.id, {
      onDelete: 'set null',
    }),

    // --- Presentation-1 Rubrics (DPRC, Scaled to 6 Marks) ---
    p1NoveltyScore: numeric('p1_novelty_score', { precision: 5, scale: 2 }), // max 5
    p1FeasibilityScore: numeric('p1_feasibility_score', { precision: 5, scale: 2 }), // max 5
    p1RawTotal: numeric('p1_raw_total', { precision: 5, scale: 2 }), // max 10
    p1ScaledScore: numeric('p1_scaled_score', { precision: 5, scale: 2 }), // max 6

    // --- Presentation-2 Rubrics (Evaluator Review, 24 Marks) ---
    p2LiteratureReview: numeric('p2_literature_review', { precision: 5, scale: 2 }), // max 6
    p2Methodology: numeric('p2_methodology', { precision: 5, scale: 2 }), // max 6
    p2SocietalEthics: numeric('p2_societal_ethics', { precision: 5, scale: 2 }), // max 6
    p2WorkPlan: numeric('p2_work_plan', { precision: 5, scale: 2 }), // max 6
    p2ReviewMarks: numeric('p2_review_marks', { precision: 5, scale: 2 }), // max 24

    // --- Evaluation-2 Rubrics (Mid-Term Review, 30 Marks) ---
    e2Implementation: numeric('e2_implementation', { precision: 5, scale: 2 }), // max 6
    e2Troubleshooting: numeric('e2_troubleshooting', { precision: 5, scale: 2 }), // max 6
    e2ContributionTeamwork: numeric('e2_contribution_teamwork', { precision: 5, scale: 2 }), // max 6
    e2EthicsCompliance: numeric('e2_ethics_compliance', { precision: 5, scale: 2 }), // max 6
    e2TimelineReporting: numeric('e2_timeline_reporting', { precision: 5, scale: 2 }), // max 6
    e2TotalMarks: numeric('e2_total_marks', { precision: 5, scale: 2 }), // max 30

    // --- Evaluation-3 Rubrics (Final Viva & Report, 40 Marks) ---
    e3ObjectivesQuality: numeric('e3_objectives_quality', { precision: 5, scale: 2 }), // max 8
    e3TestingInnovation: numeric('e3_testing_innovation', { precision: 5, scale: 2 }), // max 8
    e3ReportDocumentation: numeric('e3_report_documentation', { precision: 5, scale: 2 }), // max 8
    e3SocietalImpact: numeric('e3_societal_impact', { precision: 5, scale: 2 }), // max 8
    e3VivaContribution: numeric('e3_viva_contribution', { precision: 5, scale: 2 }), // max 8
    e3TotalMarks: numeric('e3_total_marks', { precision: 5, scale: 2 }), // max 40

    // Calculated stage total & remarks
    stageTotalMarks: numeric('stage_total_marks', { precision: 5, scale: 2 }).notNull(),
    remarks: text('remarks'),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_eval_marks_unique').on(
      table.evaluationStage,
      table.projectId,
      table.studentId
    ),
    index('idx_eval_marks_project').on(table.projectId),
    index('idx_eval_marks_student').on(table.studentId),
    index('idx_eval_marks_stage').on(table.evaluationStage),
    index('idx_eval_marks_evaluator').on(table.evaluatedByTeacherId),
  ]
);

/**
 * ==============================================================================
 * DRIZZLE RELATIONS DEFINITIONS
 * ==============================================================================
 */
export const teachersRelations = relations(teachers, ({ many }) => ({
  guidedProjects: many(projects, { relationName: 'guideProjects' }),
  evaluatedProjects: many(projects, { relationName: 'evaluatorProjects' }),
  dprc1Projects: many(projects, { relationName: 'dprc1Projects' }),
  dprc2Projects: many(projects, { relationName: 'dprc2Projects' }),
  marksGiven: many(evaluationMarks),
  attendanceRecorded: many(evaluationAttendance),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  students: many(students),
  projects: many(projects),
  evaluations: many(evaluations),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [students.academicYearId],
    references: [academicYears.id],
  }),
  projectMemberships: many(projectMembers),
  attendanceRecords: many(evaluationAttendance),
  marksRecords: many(evaluationMarks),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [projects.academicYearId],
    references: [academicYears.id],
  }),
  guideTeacher: one(teachers, {
    fields: [projects.guideTeacherId],
    references: [teachers.id],
    relationName: 'guideProjects',
  }),
  evaluatorTeacher: one(teachers, {
    fields: [projects.evaluatorTeacherId],
    references: [teachers.id],
    relationName: 'evaluatorProjects',
  }),
  dprcMember1: one(teachers, {
    fields: [projects.dprcMember1TeacherId],
    references: [teachers.id],
    relationName: 'dprc1Projects',
  }),
  dprcMember2: one(teachers, {
    fields: [projects.dprcMember2TeacherId],
    references: [teachers.id],
    relationName: 'dprc2Projects',
  }),
  members: many(projectMembers),
  attendanceRecords: many(evaluationAttendance),
  marksRecords: many(evaluationMarks),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  student: one(students, {
    fields: [projectMembers.studentId],
    references: [students.id],
  }),
}));

export const evaluationsRelations = relations(evaluations, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [evaluations.academicYearId],
    references: [academicYears.id],
  }),
  attendanceRecords: many(evaluationAttendance),
  marksRecords: many(evaluationMarks),
}));

export const evaluationAttendanceRelations = relations(evaluationAttendance, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [evaluationAttendance.evaluationId],
    references: [evaluations.id],
  }),
  project: one(projects, {
    fields: [evaluationAttendance.projectId],
    references: [projects.id],
  }),
  student: one(students, {
    fields: [evaluationAttendance.studentId],
    references: [students.id],
  }),
  markedByTeacher: one(teachers, {
    fields: [evaluationAttendance.markedByTeacherId],
    references: [teachers.id],
  }),
}));

export const evaluationMarksRelations = relations(evaluationMarks, ({ one }) => ({
  evaluation: one(evaluations, {
    fields: [evaluationMarks.evaluationId],
    references: [evaluations.id],
  }),
  project: one(projects, {
    fields: [evaluationMarks.projectId],
    references: [projects.id],
  }),
  student: one(students, {
    fields: [evaluationMarks.studentId],
    references: [students.id],
  }),
  evaluatedByTeacher: one(teachers, {
    fields: [evaluationMarks.evaluatedByTeacherId],
    references: [teachers.id],
  }),
}));
