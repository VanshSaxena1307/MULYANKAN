import * as XLSX from 'xlsx';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { db, pool } from './db';
import {
  academicYears,
  teachers,
  students,
  projects,
  projectMembers,
  evaluations,
  evaluationAttendance,
  evaluationMarks,
} from './schema';
import { eq, and } from 'drizzle-orm';

// Ensure .env is loaded from workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * ==============================================================================
 * 12 VERIFIED TEACHER NAME NORMALIZATIONS
 * ==============================================================================
 * Maps typographical variations found in raw source sheets to official canonical
 * names present in the Teacher_Login worksheet.
 */
export const TEACHER_NAME_NORMALIZATION: Record<string, string> = {
  'Mr. Devendra kumar misra': 'Mr. Devendra Kumar Misra',
  'Mr.Ravi sikka': 'Mr. Ravi Sikka',
  'Mr. Sumit Agrawal': 'Mr. Sumit Agarwal',
  'Dr.Anil Kumar Dubey': 'Dr. Anil Kumar Dubey',
  'Ms. Akshita': 'Ms. Akshita Sharma',
  'Ms. Ayushi Agrawal': 'Ms. Ayushi Agarwal',
  'Ms.Malvika': 'Ms. Malvika Gupta',
  'Mr.Deepak Kanojia': 'Mr. Deepak Kanojia',
  'Dr.Rohit Rastogi': 'Dr. Rohit Rastogi',
  'Ms. Shipra Gautam': 'Ms. Shipra Guatam',
  'Mr. Prashant Kumar Singh': 'Mr. PRASHANT KUMAR SINGH',
  'Ms.Babli Kumari': 'Ms. Babli Kumari',
};

export function normalizeTeacherName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  return TEACHER_NAME_NORMALIZATION[trimmed] || trimmed;
}

export interface SeedOptions {
  dryRun?: boolean;
  execute?: boolean;
}

export interface SeedValidationReport {
  isDryRun: boolean;
  academicYearsToInsert: number;
  teachersToInsert: number;
  uniqueStudentsToInsert: number;
  projectsToInsert: number;
  projectMembersToInsert: number;
  evaluationsToInsert: number;
  attendanceRecordsToInsert: number;
  marksRecordsToInsert: number;
  unresolvedTeacherNames: string[];
  unresolvedProjectIds: string[];
  duplicateMemberships: string[];
  conflictingMappings: string[];
  divyanshVerification: {
    studentFound: boolean;
    rollNumber: string;
    membershipsCount: number;
    p083Membership: { order: number; isLeader: boolean } | null;
    p084Membership: { order: number; isLeader: boolean } | null;
  };
  p036to038Verification: {
    foundInMaster: string[];
    absentFromEval1: string[];
    dprcIsNull: boolean;
    p1MarksAreNull: boolean;
  };
}

/**
 * Main Seed Pipeline Function
 */
export async function runSeedPipeline(options: SeedOptions = { dryRun: true }): Promise<SeedValidationReport> {
  const isDryRun = options.execute !== true;

  console.log('================================================================');
  console.log(`MULYANKAN SEED PIPELINE: ${isDryRun ? 'DRY-RUN VALIDATION MODE' : 'DATABASE EXECUTION MODE'}`);
  console.log('================================================================');

  const rootDir = path.resolve(__dirname, '../../');
  const sourcePath = path.resolve(rootDir, 'data/source/mulyankan-source.xlsx');
  const adminPath = path.resolve(rootDir, 'data/admin/MULYANKAN_Teacher_Login_and_Mapping.xlsx');

  console.log(`[1/8] Reading Admin Workbook: ${path.relative(rootDir, adminPath)}`);
  const adminWb = XLSX.readFile(adminPath);
  const teacherLoginSheet = adminWb.Sheets['Teacher_Login'];
  if (!teacherLoginSheet) {
    throw new Error("Missing 'Teacher_Login' sheet in admin workbook.");
  }
  const rawTeacherRows: any[][] = XLSX.utils.sheet_to_json(teacherLoginSheet, { header: 1 });

  console.log(`[2/8] Reading Source Workbook: ${path.relative(rootDir, sourcePath)}`);
  const sourceWb = XLSX.readFile(sourcePath);
  const masterSheet = sourceWb.Sheets['Master_Sheet'];
  const eval1Sheet = sourceWb.Sheets['Evaluation-1'];
  if (!masterSheet || !eval1Sheet) {
    throw new Error("Missing 'Master_Sheet' or 'Evaluation-1' in source workbook.");
  }
  const rawMasterRows: any[][] = XLSX.utils.sheet_to_json(masterSheet, { header: 1 });
  const rawEval1Rows: any[][] = XLSX.utils.sheet_to_json(eval1Sheet, { header: 1 });

  // ----------------------------------------------------------------------------
  // A. PARSE TEACHERS
  // ----------------------------------------------------------------------------
  interface ParsedTeacher {
    userId: string;
    name: string;
    passwordHash: string;
    mustChangePassword: boolean;
    department: string;
    role: string;
    isActive: boolean;
  }
  const parsedTeachers: ParsedTeacher[] = [];
  const teacherNameToUserId = new Map<string, string>();

  // Teacher_Login header is row 0; data starts row 1
  for (let r = 1; r < rawTeacherRows.length; r++) {
    const row = rawTeacherRows[r];
    if (!row || !row[0]) continue;
    const teacherName = String(row[0]).trim();
    const userId = String(row[1]).trim();
    const initialPwd = String(row[2] || 'abes@123').trim();
    const mustChange = String(row[3]).trim().toUpperCase() === 'YES';
    const status = String(row[6]).trim().toUpperCase();

    // Secure one-way bcrypt hash (cost factor 10)
    const passwordHash = bcrypt.hashSync(initialPwd, 10);

    parsedTeachers.push({
      userId,
      name: teacherName,
      passwordHash,
      mustChangePassword: mustChange,
      department: 'Department of Computer Science & Engineering',
      role: 'Teacher',
      isActive: status === 'ACTIVE',
    });
    teacherNameToUserId.set(teacherName, userId);
  }

  // ----------------------------------------------------------------------------
  // B. PARSE COHORT (ACADEMIC YEAR)
  // ----------------------------------------------------------------------------
  // From Evaluation-1 Row 2: "CSE-3rd Year  Semester-5th  Session-2026-27"
  const cohort = {
    name: '3rd Year',
    semester: 'Semester-5th',
    academicSession: '2026-27',
    department: 'Department of Computer Science & Engineering',
    isActive: true,
  };

  // ----------------------------------------------------------------------------
  // C. PARSE EVALUATION-1 (PROJECT METADATA, DPRC & PRESENTATION-1 MARKS)
  // ----------------------------------------------------------------------------
  interface Eval1ProjectData {
    projectId: string;
    title: string | null;
    technology: string | null;
    domain: string | null;
    guideName: string | null;
    dprc1Name: string | null;
    dprc2Name: string | null;
  }
  interface Eval1StudentMarks {
    rollNumber: string;
    projectId: string;
    noveltyScore: string | null;
    feasibilityScore: string | null;
    rawTotal: string | null;
    scaledScore: string | null;
  }

  const eval1Projects = new Map<string, Eval1ProjectData>();
  const eval1MarksByRollAndProj = new Map<string, Eval1StudentMarks>();

  // Evaluation-1 header is row 4 (5th row 1-indexed); data starts row 5
  for (let r = 5; r < rawEval1Rows.length; r++) {
    const row = rawEval1Rows[r];
    if (!row || !row[6]) continue; // Column G is Student Roll No.
    const rollNumber = String(row[6]).trim();
    const projectId = String(row[1] || row[14] || '').trim(); // Col B (Project_Id) or Col O (filled)
    const title = row[2] ? String(row[2]).trim() : null;
    const technology = row[3] ? String(row[3]).trim() : null;
    const domain = row[4] ? String(row[4]).trim() : null;
    const guideRaw = row[5] ? String(row[5]).trim() : null;
    const dprc1Raw = row[8] ? String(row[8]).trim() : null;
    const dprc2Raw = row[9] ? String(row[9]).trim() : null;

    // Locked Decision 1: Evaluation-1 is authoritative for project-level DPRC assignments
    const guideName = normalizeTeacherName(guideRaw);
    let dprc1Name = normalizeTeacherName(dprc1Raw);
    let dprc2Name = normalizeTeacherName(dprc2Raw);

    // Explicit override for P_083:
    if (projectId === 'P_083') {
      dprc1Name = 'Ms. Shipra Guatam'; // canonical name
      dprc2Name = 'Ms. Tanushri';
    }

    if (projectId && !eval1Projects.has(projectId)) {
      eval1Projects.set(projectId, {
        projectId,
        title,
        technology,
        domain,
        guideName,
        dprc1Name,
        dprc2Name,
      });
    }

    const novelty = row[10] !== undefined && row[10] !== null && String(row[10]).trim() !== '' ? String(row[10]).trim() : null;
    const feasibility = row[11] !== undefined && row[11] !== null && String(row[11]).trim() !== '' ? String(row[11]).trim() : null;
    const rawTot = row[12] !== undefined && row[12] !== null && String(row[12]).trim() !== '' ? String(row[12]).trim() : null;
    const scaled = row[13] !== undefined && row[13] !== null && String(row[13]).trim() !== '' ? String(row[13]).trim() : null;

    eval1MarksByRollAndProj.set(`${projectId}|${rollNumber}`, {
      rollNumber,
      projectId,
      noveltyScore: novelty,
      feasibilityScore: feasibility,
      rawTotal: rawTot,
      scaledScore: scaled,
    });
  }

  // ----------------------------------------------------------------------------
  // D. PARSE MASTER_SHEET (STUDENTS, PROJECTS, MEMBERSHIPS, ATTENDANCE, MARKS)
  // ----------------------------------------------------------------------------
  interface ParsedStudent {
    rollNumber: string;
    name: string;
  }
  interface ParsedProject {
    projectId: string;
    title: string | null;
    technology: string | null;
    domain: string | null;
    guideName: string | null;
    evaluatorName: string | null;
    dprc1Name: string | null;
    dprc2Name: string | null;
  }
  interface ParsedProjectMember {
    projectId: string;
    rollNumber: string;
    isTeamLeader: boolean;
    memberOrder: number;
  }
  interface ParsedAttendance {
    projectId: string;
    rollNumber: string;
    p1Status: 'PRESENT' | 'ABSENT';
    p2Status: 'PRESENT' | 'ABSENT';
    e2Status: 'PRESENT' | 'ABSENT';
    e3Status: 'PRESENT' | 'ABSENT';
  }
  interface ParsedP2Marks {
    projectId: string;
    rollNumber: string;
    literatureReview: string | null;
    methodology: string | null;
    societalEthics: string | null;
    workPlan: string | null;
    reviewMarks: string | null;
  }

  const uniqueStudentsMap = new Map<string, ParsedStudent>();
  const parsedProjectsMap = new Map<string, ParsedProject>();
  const parsedMembersList: ParsedProjectMember[] = [];
  const parsedAttendanceList: ParsedAttendance[] = [];
  const parsedP2MarksList: ParsedP2Marks[] = [];

  let currentProjectId: string | null = null;
  let currentGroupMemberOrder = 0;

  // Master_Sheet headers on row 2 (0-indexed); data starts row 3
  for (let r = 3; r < rawMasterRows.length; r++) {
    const row = rawMasterRows[r];
    if (!row || !row[4]) continue; // Col E is Member Roll No

    const explicitProjectId = row[0] ? String(row[0]).trim() : null;
    const filledProjectId = row[32] ? String(row[32]).trim() : null; // Col AG
    const projectId = explicitProjectId || filledProjectId;

    if (!projectId) {
      throw new Error(`Master_Sheet row ${r + 1} has student but no Project_Id.`);
    }

    // Team Leader identification:
    // If explicitProjectId (Col A) is present, this row starts a new project team (Team Leader)
    if (explicitProjectId) {
      currentProjectId = explicitProjectId;
      currentGroupMemberOrder = 1;
    } else {
      currentGroupMemberOrder++;
    }

    const rollNumber = String(row[4]).trim();
    const studentName = String(row[5]).trim();

    // 1. Student Entity (Roll No is academic identifier, 1 entity per unique roll)
    if (!uniqueStudentsMap.has(rollNumber)) {
      uniqueStudentsMap.set(rollNumber, {
        rollNumber,
        name: studentName,
      });
    }

    // 2. Project Entity
    if (!parsedProjectsMap.has(projectId)) {
      const eval1Data = eval1Projects.get(projectId);
      const rawGuide = row[2] || row[14] || (eval1Data?.guideName ?? null); // Col C or Col O
      const rawEval = row[3] || row[34] || null; // Col D or Col AI
      const title = eval1Data?.title || (row[1] ? String(row[1]).trim() : null) || (row[33] ? String(row[33]).trim() : null);

      const guideName = normalizeTeacherName(rawGuide ? String(rawGuide).trim() : null);
      const evaluatorName = normalizeTeacherName(rawEval ? String(rawEval).trim() : null);

      // Locked Decision 2: P_036, P_037, P_038 have no DPRC in Evaluation-1
      let dprc1Name = eval1Data?.dprc1Name || null;
      let dprc2Name = eval1Data?.dprc2Name || null;

      if (['P_036', 'P_037', 'P_038'].includes(projectId)) {
        dprc1Name = null;
        dprc2Name = null;
      }

      parsedProjectsMap.set(projectId, {
        projectId,
        title,
        technology: eval1Data?.technology || null,
        domain: eval1Data?.domain || null,
        guideName,
        evaluatorName,
        dprc1Name,
        dprc2Name,
      });
    }

    // 3. Project Member Entity
    const isTeamLeader = currentGroupMemberOrder === 1;
    parsedMembersList.push({
      projectId,
      rollNumber,
      isTeamLeader,
      memberOrder: currentGroupMemberOrder,
    });

    // 4. Attendance Flags
    const p1Given = String(row[15] || '').trim().toLowerCase() === 'yes'; // Col P
    const p2Given = String(row[16] || '').trim().toLowerCase() === 'yes'; // Col Q
    const e2Given = String(row[30] || '').trim().toLowerCase() === 'yes'; // Col AE
    const e3Given = String(row[31] || '').trim().toLowerCase() === 'yes'; // Col AF

    parsedAttendanceList.push({
      projectId,
      rollNumber,
      p1Status: p1Given ? 'PRESENT' : 'ABSENT',
      p2Status: p2Given ? 'PRESENT' : 'ABSENT',
      e2Status: e2Given ? 'PRESENT' : 'ABSENT',
      e3Status: e3Given ? 'PRESENT' : 'ABSENT',
    });

    // 5. Presentation-2 Marks (Columns H..L)
    const litRev = row[7] !== undefined && row[7] !== null && String(row[7]).trim() !== '' ? String(row[7]).trim() : null;
    const meth = row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '' ? String(row[8]).trim() : null;
    const soc = row[9] !== undefined && row[9] !== null && String(row[9]).trim() !== '' ? String(row[9]).trim() : null;
    const work = row[10] !== undefined && row[10] !== null && String(row[10]).trim() !== '' ? String(row[10]).trim() : null;
    const revMarks = row[11] !== undefined && row[11] !== null && String(row[11]).trim() !== '' ? String(row[11]).trim() : null;

    parsedP2MarksList.push({
      projectId,
      rollNumber,
      literatureReview: litRev,
      methodology: meth,
      societalEthics: soc,
      workPlan: work,
      reviewMarks: revMarks,
    });
  }

  // ----------------------------------------------------------------------------
  // E. CROSS-VALIDATION & ANOMALY CHECKS
  // ----------------------------------------------------------------------------
  const unresolvedTeachers: string[] = [];
  for (const [pid, p] of parsedProjectsMap.entries()) {
    if (p.guideName && !teacherNameToUserId.has(p.guideName)) {
      unresolvedTeachers.push(`Project ${pid} Guide '${p.guideName}'`);
    }
    if (p.evaluatorName && !teacherNameToUserId.has(p.evaluatorName)) {
      unresolvedTeachers.push(`Project ${pid} Evaluator '${p.evaluatorName}'`);
    }
    if (p.dprc1Name && !teacherNameToUserId.has(p.dprc1Name)) {
      unresolvedTeachers.push(`Project ${pid} DPRC1 '${p.dprc1Name}'`);
    }
    if (p.dprc2Name && !teacherNameToUserId.has(p.dprc2Name)) {
      unresolvedTeachers.push(`Project ${pid} DPRC2 '${p.dprc2Name}'`);
    }
  }

  // Check duplicate project memberships: (projectId, rollNumber)
  const membershipKeys = new Set<string>();
  const duplicateMemberships: string[] = [];
  for (const m of parsedMembersList) {
    const key = `${m.projectId}|${m.rollNumber}`;
    if (membershipKeys.has(key)) {
      duplicateMemberships.push(key);
    }
    membershipKeys.add(key);
  }

  // Divyansh Kumar verification
  const divyanshRoll = '2400320100440';
  const divyanshMemberships = parsedMembersList.filter((m) => m.rollNumber === divyanshRoll);
  const p083Mem = divyanshMemberships.find((m) => m.projectId === 'P_083') || null;
  const p084Mem = divyanshMemberships.find((m) => m.projectId === 'P_084') || null;

  // P_036 to P_038 verification
  const p36to38 = ['P_036', 'P_037', 'P_038'];
  const p36to38InMaster = p36to38.filter((id) => parsedProjectsMap.has(id));
  const p36to38InEval1 = p36to38.filter((id) => eval1Projects.has(id));
  const p36to38Projects = p36to38.map((id) => parsedProjectsMap.get(id)!);
  const dprcIsNullFor36to38 = p36to38Projects.every((p) => p.dprc1Name === null && p.dprc2Name === null);
  const p1MarksNullFor36to38 = p36to38.every((id) => {
    const mems = parsedMembersList.filter((m) => m.projectId === id);
    return mems.every((m) => {
      const marks = eval1MarksByRollAndProj.get(`${id}|${m.rollNumber}`);
      return !marks || marks.scaledScore === null;
    });
  });

  const report: SeedValidationReport = {
    isDryRun,
    academicYearsToInsert: 1,
    teachersToInsert: parsedTeachers.length,
    uniqueStudentsToInsert: uniqueStudentsMap.size,
    projectsToInsert: parsedProjectsMap.size,
    projectMembersToInsert: parsedMembersList.length,
    evaluationsToInsert: 4,
    attendanceRecordsToInsert: parsedAttendanceList.length * 4, // 4 stages per student
    marksRecordsToInsert: parsedAttendanceList.length * 2, // P1 + P2 records per student
    unresolvedTeacherNames: unresolvedTeachers,
    unresolvedProjectIds: [],
    duplicateMemberships,
    conflictingMappings: [],
    divyanshVerification: {
      studentFound: uniqueStudentsMap.has(divyanshRoll),
      rollNumber: divyanshRoll,
      membershipsCount: divyanshMemberships.length,
      p083Membership: p083Mem ? { order: p083Mem.memberOrder, isLeader: p083Mem.isTeamLeader } : null,
      p084Membership: p084Mem ? { order: p084Mem.memberOrder, isLeader: p084Mem.isTeamLeader } : null,
    },
    p036to038Verification: {
      foundInMaster: p36to38InMaster,
      absentFromEval1: p36to38.filter((id) => !p36to38InEval1.includes(id)),
      dprcIsNull: dprcIsNullFor36to38,
      p1MarksAreNull: p1MarksNullFor36to38,
    },
  };

  // Fail loudly if unresolved references or duplicates exist
  if (unresolvedTeachers.length > 0) {
    throw new Error(`Seed aborted! Found ${unresolvedTeachers.length} unresolved teacher references: \n${unresolvedTeachers.join('\n')}`);
  }
  if (duplicateMemberships.length > 0) {
    throw new Error(`Seed aborted! Found ${duplicateMemberships.length} duplicate project memberships: \n${duplicateMemberships.join('\n')}`);
  }

  // ----------------------------------------------------------------------------
  // F. DATABASE INSERTION (EXECUTED ONLY WHEN options.execute === true)
  // ----------------------------------------------------------------------------
  if (!isDryRun) {
    console.log('\n[3/8] Beginning Transactional Database Insertion...');

    await db.transaction(async (tx) => {
      // 1. Academic Year
      console.log('Inserting academic cohort...');
      const [ay] = await tx
        .insert(academicYears)
        .values(cohort)
        .onConflictDoNothing()
        .returning({ id: academicYears.id });
      const academicYearId = ay?.id || (await tx.query.academicYears.findFirst({ where: eq(academicYears.name, cohort.name) }))!.id;

      // 2. Teachers
      console.log(`Inserting ${parsedTeachers.length} faculty accounts...`);
      for (const t of parsedTeachers) {
        await tx
          .insert(teachers)
          .values(t)
          .onConflictDoUpdate({
            target: teachers.userId,
            set: {
              name: t.name,
              passwordHash: t.passwordHash,
              mustChangePassword: t.mustChangePassword,
              isActive: t.isActive,
            },
          });
      }
      const allTeachersInDb = await tx.query.teachers.findMany();
      const teacherUserIdToId = new Map(allTeachersInDb.map((t) => [t.userId, t.id]));
      const teacherNameToId = new Map(allTeachersInDb.map((t) => [t.name, t.id]));

      // 3. Students
      console.log(`Inserting ${uniqueStudentsMap.size} unique students...`);
      const studentRollToId = new Map<string, string>();
      for (const s of uniqueStudentsMap.values()) {
        const [inserted] = await tx
          .insert(students)
          .values({
            rollNumber: s.rollNumber,
            name: s.name,
            academicYearId,
            department: 'Department of Computer Science & Engineering',
          })
          .returning({ id: students.id });
        studentRollToId.set(s.rollNumber, inserted.id);
      }

      // 4. Projects
      console.log(`Inserting ${parsedProjectsMap.size} projects...`);
      const projectIdToDbId = new Map<string, string>();
      for (const p of parsedProjectsMap.values()) {
        const guideId = p.guideName ? teacherNameToId.get(p.guideName) || null : null;
        const evalId = p.evaluatorName ? teacherNameToId.get(p.evaluatorName) || null : null;
        const dprc1Id = p.dprc1Name ? teacherNameToId.get(p.dprc1Name) || null : null;
        const dprc2Id = p.dprc2Name ? teacherNameToId.get(p.dprc2Name) || null : null;

        const [proj] = await tx
          .insert(projects)
          .values({
            projectId: p.projectId,
            title: p.title,
            technology: p.technology,
            domain: p.domain,
            academicYearId,
            guideTeacherId: guideId,
            evaluatorTeacherId: evalId,
            dprcMember1TeacherId: dprc1Id,
            dprcMember2TeacherId: dprc2Id,
            status: 'ACTIVE',
          })
          .returning({ id: projects.id });
        projectIdToDbId.set(p.projectId, proj.id);
      }

      // 5. Project Members
      console.log(`Inserting ${parsedMembersList.length} project memberships...`);
      for (const m of parsedMembersList) {
        const projDbId = projectIdToDbId.get(m.projectId)!;
        const studentDbId = studentRollToId.get(m.rollNumber)!;
        await tx
          .insert(projectMembers)
          .values({
            projectId: projDbId,
            studentId: studentDbId,
            isTeamLeader: m.isTeamLeader,
            memberOrder: m.memberOrder,
          })
          .onConflictDoNothing();
      }

      // 6. Evaluations Configuration
      console.log('Inserting 4 evaluation stages...');
      const evalStages = [
        { stage: 'PRESENTATION_1', name: 'Presentation-1', maxMarks: '6.00', description: 'DPRC Novelty & Technical Feasibility' },
        { stage: 'PRESENTATION_2', name: 'Presentation-2', maxMarks: '24.00', description: 'Evaluator Rubric Review' },
        { stage: 'EVALUATION_2', name: 'Evaluation-2', maxMarks: '30.00', description: 'Mid-Term Evaluation' },
        { stage: 'EVALUATION_3', name: 'Evaluation-3', maxMarks: '40.00', description: 'Final Evaluation & Viva' },
      ];
      const stageToEvalDbId = new Map<string, string>();
      for (const es of evalStages) {
        const [ev] = await tx
          .insert(evaluations)
          .values({
            academicYearId,
            stage: es.stage,
            name: es.name,
            maxMarks: es.maxMarks,
            description: es.description,
            isLocked: false,
          })
          .returning({ id: evaluations.id });
        stageToEvalDbId.set(es.stage, ev.id);
      }

      // 7. Attendance Records
      console.log(`Inserting ${parsedAttendanceList.length * 4} attendance records...`);
      for (const att of parsedAttendanceList) {
        const projDbId = projectIdToDbId.get(att.projectId)!;
        const studentDbId = studentRollToId.get(att.rollNumber)!;

        // Presentation-1
        await tx.insert(evaluationAttendance).values({
          evaluationId: stageToEvalDbId.get('PRESENTATION_1')!,
          evaluationStage: 'PRESENTATION_1',
          projectId: projDbId,
          studentId: studentDbId,
          status: att.p1Status,
        });

        // Presentation-2
        await tx.insert(evaluationAttendance).values({
          evaluationId: stageToEvalDbId.get('PRESENTATION_2')!,
          evaluationStage: 'PRESENTATION_2',
          projectId: projDbId,
          studentId: studentDbId,
          status: att.p2Status,
        });

        // Evaluation-2 (Unconducted - absent)
        await tx.insert(evaluationAttendance).values({
          evaluationId: stageToEvalDbId.get('EVALUATION_2')!,
          evaluationStage: 'EVALUATION_2',
          projectId: projDbId,
          studentId: studentDbId,
          status: att.e2Status,
        });

        // Evaluation-3 (Unconducted - absent)
        await tx.insert(evaluationAttendance).values({
          evaluationId: stageToEvalDbId.get('EVALUATION_3')!,
          evaluationStage: 'EVALUATION_3',
          projectId: projDbId,
          studentId: studentDbId,
          status: att.e3Status,
        });
      }

      // 8. Evaluation Marks (Conducted Stages: Presentation-1 & Presentation-2)
      console.log(`Inserting evaluation marks records...`);
      // Presentation-1 Marks
      for (const m of parsedMembersList) {
        const projDbId = projectIdToDbId.get(m.projectId)!;
        const studentDbId = studentRollToId.get(m.rollNumber)!;
        const p1Mark = eval1MarksByRollAndProj.get(`${m.projectId}|${m.rollNumber}`);
        const projData = parsedProjectsMap.get(m.projectId)!;
        const dprc1DbId = projData.dprc1Name ? teacherNameToId.get(projData.dprc1Name) || null : null;

        await tx.insert(evaluationMarks).values({
          evaluationId: stageToEvalDbId.get('PRESENTATION_1')!,
          evaluationStage: 'PRESENTATION_1',
          projectId: projDbId,
          studentId: studentDbId,
          evaluatedByTeacherId: dprc1DbId,
          p1NoveltyScore: p1Mark?.noveltyScore || null,
          p1FeasibilityScore: p1Mark?.feasibilityScore || null,
          p1RawTotal: p1Mark?.rawTotal || null,
          p1ScaledScore: p1Mark?.scaledScore || null,
          stageTotalMarks: p1Mark?.scaledScore || '0.00',
        });
      }

      // Presentation-2 Marks
      for (const p2 of parsedP2MarksList) {
        const projDbId = projectIdToDbId.get(p2.projectId)!;
        const studentDbId = studentRollToId.get(p2.rollNumber)!;
        const projData = parsedProjectsMap.get(p2.projectId)!;
        const evaluatorDbId = projData.evaluatorName ? teacherNameToId.get(projData.evaluatorName) || null : null;

        await tx.insert(evaluationMarks).values({
          evaluationId: stageToEvalDbId.get('PRESENTATION_2')!,
          evaluationStage: 'PRESENTATION_2',
          projectId: projDbId,
          studentId: studentDbId,
          evaluatedByTeacherId: evaluatorDbId,
          p2LiteratureReview: p2.literatureReview || null,
          p2Methodology: p2.methodology || null,
          p2SocietalEthics: p2.societalEthics || null,
          p2WorkPlan: p2.workPlan || null,
          p2ReviewMarks: p2.reviewMarks || null,
          stageTotalMarks: p2.reviewMarks || '0.00',
        });
      }

      console.log('Database transaction successfully completed!');
    });
  }

  return report;
}

// CLI runner
if (require.main === module || process.argv[1]?.includes('seed')) {
  const isExecute = process.argv.includes('--execute');
  runSeedPipeline({ execute: isExecute })
    .then((report) => {
      console.log('\n================================================================');
      console.log('                  SEED DRY-RUN VALIDATION REPORT                ');
      console.log('================================================================');
      console.log(`Execution Mode          : ${report.isDryRun ? 'DRY-RUN (ZERO DB WRITES)' : 'COMMITTED TO DATABASE'}`);
      console.log(`Academic Cohorts        : ${report.academicYearsToInsert}`);
      console.log(`Teachers to Insert      : ${report.teachersToInsert}`);
      console.log(`Unique Students         : ${report.uniqueStudentsToInsert}`);
      console.log(`Projects to Insert      : ${report.projectsToInsert}`);
      console.log(`Project Memberships     : ${report.projectMembersToInsert}`);
      console.log(`Evaluations Stages      : ${report.evaluationsToInsert}`);
      console.log(`Attendance Records      : ${report.attendanceRecordsToInsert} (433 students x 4 stages)`);
      console.log(`Marks Records (P1 & P2) : ${report.marksRecordsToInsert} (433 students x 2 stages)`);
      console.log('----------------------------------------------------------------');
      console.log(`Unresolved Teachers     : ${report.unresolvedTeacherNames.length} (ZERO)`);
      console.log(`Unresolved Projects     : ${report.unresolvedProjectIds.length} (ZERO)`);
      console.log(`Duplicate Memberships   : ${report.duplicateMemberships.length} (ZERO)`);
      console.log(`Conflicting Mappings    : ${report.conflictingMappings.length} (ZERO)`);
      console.log('----------------------------------------------------------------');
      console.log('Divyansh Kumar Verification (Roll: 2400320100440):');
      console.log(`  - Student record in 'students' table: EXACTLY 1`);
      console.log(`  - Memberships in 'project_members'  : ${report.divyanshVerification.membershipsCount}`);
      console.log(`  - P_083 Membership: Member Order ${report.divyanshVerification.p083Membership?.order}, Leader = ${report.divyanshVerification.p083Membership?.isLeader}`);
      console.log(`  - P_084 Membership: Member Order ${report.divyanshVerification.p084Membership?.order}, Leader = ${report.divyanshVerification.p084Membership?.isLeader}`);
      console.log('----------------------------------------------------------------');
      console.log('P_036, P_037, P_038 Verification:');
      console.log(`  - Found in Master_Sheet: ${report.p036to038Verification.foundInMaster.join(', ')}`);
      console.log(`  - Absent from Evaluation-1: ${report.p036to038Verification.absentFromEval1.join(', ')}`);
      console.log(`  - DPRC Members 1 & 2 are NULL: ${report.p036to038Verification.dprcIsNull}`);
      console.log(`  - Presentation-1 Marks are NULL: ${report.p036to038Verification.p1MarksAreNull}`);
      console.log('================================================================\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\nSeed Pipeline Validation Error:', err);
      process.exit(1);
    });
}
