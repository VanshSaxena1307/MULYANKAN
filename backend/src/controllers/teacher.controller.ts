import { Response } from 'express';
import {
  db,
  teachers,
  projects,
  academicYears,
  projectMembers,
  students,
  evaluationAttendance,
  evaluationMarks,
  evaluations,
  eq,
  or,
  and,
  inArray,
  sql,
} from '@mulyankan/database';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  DashboardTeacherProfile,
  TeacherProjectSummary,
  ProjectMemberSummary,
  AssociatedTeacherInfo,
  DashboardStats,
  TeacherCohort,
  TeacherDashboardResponse,
  TeacherRole,
  CanonicalEvaluationStage,
  EvaluationStageCode,
  EvaluationStageMeta,
  EVALUATION_STAGE_CONFIG,
  EvaluationStudentRow,
  ProjectEvaluationDataResponse,
  AttendanceStatus,
  UpdateAttendanceRequest,
  UpdateMarksRequest,
  UpdateEvaluationBatchRequest,
} from '@mulyankan/shared';

/**
 * Normalizes input role string to canonical TeacherRole
 */
export function normalizeTeacherRole(rawRole?: unknown): TeacherRole | null {
  if (!rawRole || typeof rawRole !== 'string') return null;
  const normalized = rawRole.trim().toLowerCase();

  if (normalized === 'guide') return 'Guide';
  if (normalized === 'evaluator') return 'Evaluator';
  if (
    normalized === 'dprc member 1' ||
    normalized === 'dprc_member1' ||
    normalized === 'dprc_1' ||
    normalized === 'dprc1' ||
    normalized === 'dprc-1'
  ) {
    return 'DPRC Member 1';
  }
  if (
    normalized === 'dprc member 2' ||
    normalized === 'dprc_member2' ||
    normalized === 'dprc_2' ||
    normalized === 'dprc2' ||
    normalized === 'dprc-2'
  ) {
    return 'DPRC Member 2';
  }

  return null;
}

/**
 * Normalizes stage string ('P1', 'PRESENTATION_1', etc.) to canonical stage configuration
 */
export function normalizeEvaluationStage(
  rawStage?: unknown
): EvaluationStageMeta | null {
  if (!rawStage || typeof rawStage !== 'string') return null;
  const s = rawStage.trim().toUpperCase().replace(/[\s-]/g, '_');

  if (s === 'P1' || s === 'PRESENTATION_1') {
    return EVALUATION_STAGE_CONFIG.PRESENTATION_1;
  }
  if (s === 'P2' || s === 'PRESENTATION_2') {
    return EVALUATION_STAGE_CONFIG.PRESENTATION_2;
  }
  if (s === 'E2' || s === 'EVALUATION_2') {
    return EVALUATION_STAGE_CONFIG.EVALUATION_2;
  }
  if (s === 'E3' || s === 'EVALUATION_3') {
    return EVALUATION_STAGE_CONFIG.EVALUATION_3;
  }

  return null;
}

export interface AuthorizedProjectContext {
  project: {
    id: string;
    projectId: string;
    title: string | null;
    academicYearId: string | null;
    guideTeacherId: string | null;
    evaluatorTeacherId: string | null;
    dprcMember1TeacherId: string | null;
    dprcMember2TeacherId: string | null;
  };
  role: TeacherRole;
  teacher: {
    id: string;
    userId: string;
    name: string;
  };
}

/**
 * Reusable project + role authorization verifier.
 * Strictly checks that:
 * 1. Authenticated teacher exists and isActive = true.
 * 2. Role is valid (Guide, Evaluator, DPRC Member 1, DPRC Member 2).
 * 3. Project exists.
 * 4. Authenticated teacher is assigned to the project under that exact role.
 * If unauthorized, returns appropriate error status and message with ZERO mutations.
 */
export async function verifyTeacherProjectAuthorization(
  userId: string,
  projectIdOrCode: string,
  rawRole: unknown
): Promise<{
  errorStatus?: number;
  errorMessage?: string;
  context?: AuthorizedProjectContext;
}> {
  // 1. Verify authenticated teacher exists and isActive
  const [teacher] = await db
    .select({
      id: teachers.id,
      userId: teachers.userId,
      name: teachers.name,
      isActive: teachers.isActive,
    })
    .from(teachers)
    .where(eq(teachers.id, userId))
    .limit(1);

  if (!teacher || !teacher.isActive) {
    return { errorStatus: 401, errorMessage: 'Teacher account not found or inactive' };
  }

  // 2. Validate role
  const role = normalizeTeacherRole(rawRole);
  if (!role) {
    return {
      errorStatus: 400,
      errorMessage:
        'Invalid role specified. Supported roles are Guide, Evaluator, DPRC Member 1, DPRC Member 2.',
    };
  }

  // 3. Find project by UUID or projectId
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    projectIdOrCode
  );
  const condition = isUuid
    ? eq(projects.id, projectIdOrCode)
    : eq(projects.projectId, projectIdOrCode);

  const [project] = await db
    .select({
      id: projects.id,
      projectId: projects.projectId,
      title: projects.title,
      academicYearId: projects.academicYearId,
      guideTeacherId: projects.guideTeacherId,
      evaluatorTeacherId: projects.evaluatorTeacherId,
      dprcMember1TeacherId: projects.dprcMember1TeacherId,
      dprcMember2TeacherId: projects.dprcMember2TeacherId,
    })
    .from(projects)
    .where(condition)
    .limit(1);

  if (!project) {
    return { errorStatus: 404, errorMessage: 'Project not found' };
  }

  // 4. Strict Role-to-Column Authorization
  let isAuthorized = false;
  switch (role) {
    case 'Guide':
      isAuthorized = project.guideTeacherId === teacher.id;
      break;
    case 'Evaluator':
      isAuthorized = project.evaluatorTeacherId === teacher.id;
      break;
    case 'DPRC Member 1':
      isAuthorized = project.dprcMember1TeacherId === teacher.id;
      break;
    case 'DPRC Member 2':
      isAuthorized = project.dprcMember2TeacherId === teacher.id;
      break;
  }

  if (!isAuthorized) {
    return {
      errorStatus: 403,
      errorMessage: `Access denied. You are not assigned to project ${project.projectId} under the ${role} role.`,
    };
  }

  return {
    context: {
      project,
      role,
      teacher,
    },
  };
}

/**
 * GET /api/teacher/dashboard
 * Scoped dashboard endpoint returning ONLY projects assigned to the authenticated teacher
 * under the requested operational role.
 */
export const getTeacherDashboard = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // 1. Fetch authenticated teacher (NEVER select password_hash)
    const [teacher] = await db
      .select({
        id: teachers.id,
        userId: teachers.userId,
        name: teachers.name,
        email: teachers.email,
        department: teachers.department,
        designation: teachers.designation,
        role: teachers.role,
        isActive: teachers.isActive,
        mustChangePassword: teachers.mustChangePassword,
      })
      .from(teachers)
      .where(eq(teachers.id, user.id))
      .limit(1);

    if (!teacher || !teacher.isActive) {
      res.status(401).json({ error: 'Teacher account not found or inactive' });
      return;
    }

    const teacherProfile: DashboardTeacherProfile = {
      id: teacher.id,
      userId: teacher.userId,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      designation: teacher.designation,
      role: teacher.role,
      mustChangePassword: teacher.mustChangePassword,
    };

    // 2. Count actual assignments per role for this teacher across the database
    const [guideCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.guideTeacherId, teacher.id));
    const guidedCount = guideCountRes?.count || 0;

    const [evalCountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.evaluatorTeacherId, teacher.id));
    const evaluatedCount = evalCountRes?.count || 0;

    const [dprc1CountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.dprcMember1TeacherId, teacher.id));
    const dprc1Count = dprc1CountRes?.count || 0;

    const [dprc2CountRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.dprcMember2TeacherId, teacher.id));
    const dprc2Count = dprc2CountRes?.count || 0;

    const [totalProjectsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(
        or(
          eq(projects.guideTeacherId, teacher.id),
          eq(projects.evaluatorTeacherId, teacher.id),
          eq(projects.dprcMember1TeacherId, teacher.id),
          eq(projects.dprcMember2TeacherId, teacher.id)
        )
      );
    const totalProjects = totalProjectsRes?.count || 0;

    // 3. Build availableRoles validated against teacher's actual project assignments
    const availableRoles: TeacherRole[] = [];
    if (guidedCount > 0) availableRoles.push('Guide');
    if (evaluatedCount > 0) availableRoles.push('Evaluator');
    if (dprc1Count > 0) availableRoles.push('DPRC Member 1');
    if (dprc2Count > 0) availableRoles.push('DPRC Member 2');

    // 4. Role validation & selection
    const rawRoleParam = req.query.role;
    let selectedRole: TeacherRole;

    if (rawRoleParam !== undefined && rawRoleParam !== '') {
      const parsed = normalizeTeacherRole(rawRoleParam);
      if (!parsed) {
        res.status(400).json({
          error:
            'Invalid role specified. Supported roles are Guide, Evaluator, DPRC Member 1, DPRC Member 2.',
        });
        return;
      }

      // Validate that authenticated teacher actually holds this role
      if (!availableRoles.includes(parsed)) {
        res.status(403).json({
          error: `Access denied. You do not have any project assignments under the ${parsed} role.`,
        });
        return;
      }

      selectedRole = parsed;
    } else {
      // Default to Guide if available, otherwise Evaluator, or first available role
      if (guidedCount > 0) {
        selectedRole = 'Guide';
      } else if (evaluatedCount > 0) {
        selectedRole = 'Evaluator';
      } else if (availableRoles.length > 0) {
        selectedRole = availableRoles[0];
      } else {
        selectedRole = 'Guide';
      }
    }

    // 5. Build STRICT server-side authorization filter based on role rules:
    // 1. Evaluator role: projects.evaluator_teacher_id = authenticatedTeacher.id
    // 2. Guide role: projects.guide_teacher_id = authenticatedTeacher.id
    // 3. DPRC Member 1 role: projects.dprc_member1_teacher_id = authenticatedTeacher.id
    // 4. DPRC Member 2 role: projects.dprc_member2_teacher_id = authenticatedTeacher.id
    let roleCondition;
    switch (selectedRole) {
      case 'Guide':
        roleCondition = eq(projects.guideTeacherId, teacher.id);
        break;
      case 'Evaluator':
        roleCondition = eq(projects.evaluatorTeacherId, teacher.id);
        break;
      case 'DPRC Member 1':
        roleCondition = eq(projects.dprcMember1TeacherId, teacher.id);
        break;
      case 'DPRC Member 2':
        roleCondition = eq(projects.dprcMember2TeacherId, teacher.id);
        break;
      default:
        roleCondition = eq(projects.guideTeacherId, teacher.id);
    }

    // Optional cohort filter
    const academicYearFilter = (req.query.academicYearId as string)?.trim();
    const finalWhere = academicYearFilter
      ? and(roleCondition, eq(projects.academicYearId, academicYearFilter))
      : roleCondition;

    // 6. Query projects strictly matching the role condition
    const scopedProjects = await db
      .select({
        id: projects.id,
        projectId: projects.projectId,
        title: projects.title,
        technology: projects.technology,
        domain: projects.domain,
        status: projects.status,
        academicYearId: projects.academicYearId,
        guideTeacherId: projects.guideTeacherId,
        evaluatorTeacherId: projects.evaluatorTeacherId,
        dprcMember1TeacherId: projects.dprcMember1TeacherId,
        dprcMember2TeacherId: projects.dprcMember2TeacherId,
        academicYearName: academicYears.name,
        academicYearSession: academicYears.academicSession,
        academicYearSemester: academicYears.semester,
      })
      .from(projects)
      .leftJoin(academicYears, eq(projects.academicYearId, academicYears.id))
      .where(finalWhere);

    // 7. Associated teacher information (strictly non-sensitive columns)
    const teacherIdSet = new Set<string>();
    for (const p of scopedProjects) {
      if (p.guideTeacherId) teacherIdSet.add(p.guideTeacherId);
      if (p.evaluatorTeacherId) teacherIdSet.add(p.evaluatorTeacherId);
      if (p.dprcMember1TeacherId) teacherIdSet.add(p.dprcMember1TeacherId);
      if (p.dprcMember2TeacherId) teacherIdSet.add(p.dprcMember2TeacherId);
    }

    const associatedTeacherMap = new Map<string, AssociatedTeacherInfo>();
    if (teacherIdSet.size > 0) {
      const teacherRecords = await db
        .select({
          id: teachers.id,
          name: teachers.name,
          userId: teachers.userId,
          designation: teachers.designation,
        })
        .from(teachers)
        .where(inArray(teachers.id, Array.from(teacherIdSet)));

      for (const t of teacherRecords) {
        associatedTeacherMap.set(t.id, t);
      }
    }

    // 8. Project members, attendance, and marks for scoped projects
    const projectIds = scopedProjects.map((p) => p.id);
    const membersByProject = new Map<string, ProjectMemberSummary[]>();
    const uniqueStudentIdSet = new Set<string>();

    if (projectIds.length > 0) {
      const memberRows = await db
        .select({
          projectId: projectMembers.projectId,
          studentId: students.id,
          rollNumber: students.rollNumber,
          name: students.name,
          email: students.email,
          department: students.department,
          isTeamLeader: projectMembers.isTeamLeader,
          memberOrder: projectMembers.memberOrder,
        })
        .from(projectMembers)
        .innerJoin(students, eq(projectMembers.studentId, students.id))
        .where(inArray(projectMembers.projectId, projectIds));

      memberRows.sort((a, b) => a.memberOrder - b.memberOrder);

      const attendanceRows = await db
        .select({
          projectId: evaluationAttendance.projectId,
          studentId: evaluationAttendance.studentId,
          stage: evaluationAttendance.evaluationStage,
          status: evaluationAttendance.status,
        })
        .from(evaluationAttendance)
        .where(inArray(evaluationAttendance.projectId, projectIds));

      const attendanceMap = new Map<string, Record<string, string>>();
      for (const att of attendanceRows) {
        const key = `${att.projectId}_${att.studentId}`;
        const current = attendanceMap.get(key) || {};
        current[att.stage] = att.status;
        attendanceMap.set(key, current);
      }

      const marksRows = await db
        .select({
          projectId: evaluationMarks.projectId,
          studentId: evaluationMarks.studentId,
          stage: evaluationMarks.evaluationStage,
          stageTotalMarks: evaluationMarks.stageTotalMarks,
          remarks: evaluationMarks.remarks,
        })
        .from(evaluationMarks)
        .where(inArray(evaluationMarks.projectId, projectIds));

      const marksMap = new Map<
        string,
        Record<string, { stageTotalMarks: string | number; remarks?: string | null }>
      >();
      for (const m of marksRows) {
        const key = `${m.projectId}_${m.studentId}`;
        const current = marksMap.get(key) || {};
        current[m.stage] = {
          stageTotalMarks: m.stageTotalMarks,
          remarks: m.remarks,
        };
        marksMap.set(key, current);
      }

      for (const row of memberRows) {
        uniqueStudentIdSet.add(row.studentId);
        const key = `${row.projectId}_${row.studentId}`;
        const memberAttendance = attendanceMap.get(key) || {};
        const memberMarks = marksMap.get(key) || {};

        const memberSummary: ProjectMemberSummary = {
          studentId: row.studentId,
          rollNumber: row.rollNumber,
          name: row.name,
          email: row.email,
          department: row.department,
          isTeamLeader: row.isTeamLeader,
          memberOrder: row.memberOrder,
          attendance: memberAttendance,
          marks: memberMarks,
        };

        const list = membersByProject.get(row.projectId) || [];
        list.push(memberSummary);
        membersByProject.set(row.projectId, list);
      }
    }

    // 9. Format response summaries
    const standardStages = ['PRESENTATION_1', 'PRESENTATION_2', 'EVALUATION_2', 'EVALUATION_3'];

    const projectSummaries: TeacherProjectSummary[] = scopedProjects.map((p) => {
      const isGuide = p.guideTeacherId === teacher.id;
      const isEvaluator = p.evaluatorTeacherId === teacher.id;
      const isDprcMember1 = p.dprcMember1TeacherId === teacher.id;
      const isDprcMember2 = p.dprcMember2TeacherId === teacher.id;

      const relationships: string[] = [];
      if (isGuide) relationships.push('Guide');
      if (isEvaluator) relationships.push('Evaluator');
      if (isDprcMember1) relationships.push('DPRC Member 1');
      if (isDprcMember2) relationships.push('DPRC Member 2');

      const projectMembersList = membersByProject.get(p.id) || [];
      const totalMembers = projectMembersList.length;

      const stagesStatus: Record<
        string,
        { totalMembers: number; markedCount: number; presentCount: number; isCompleted: boolean }
      > = {};

      for (const stage of standardStages) {
        let markedCount = 0;
        let presentCount = 0;
        for (const member of projectMembersList) {
          if (member.marks[stage] && member.marks[stage].stageTotalMarks !== null) {
            markedCount++;
          }
          if (member.attendance[stage] === 'PRESENT') {
            presentCount++;
          }
        }
        stagesStatus[stage] = {
          totalMembers,
          markedCount,
          presentCount,
          isCompleted: totalMembers > 0 && markedCount >= totalMembers,
        };
      }

      return {
        id: p.id,
        projectId: p.projectId,
        title: p.title,
        technology: p.technology,
        domain: p.domain,
        status: p.status,
        academicYearId: p.academicYearId,
        academicYearName: p.academicYearName,
        academicYearSession: p.academicYearSession,
        academicYearSemester: p.academicYearSemester,
        guideTeacher: p.guideTeacherId ? associatedTeacherMap.get(p.guideTeacherId) || null : null,
        evaluatorTeacher: p.evaluatorTeacherId
          ? associatedTeacherMap.get(p.evaluatorTeacherId) || null
          : null,
        dprcMember1: p.dprcMember1TeacherId
          ? associatedTeacherMap.get(p.dprcMember1TeacherId) || null
          : null,
        dprcMember2: p.dprcMember2TeacherId
          ? associatedTeacherMap.get(p.dprcMember2TeacherId) || null
          : null,
        isGuide,
        isEvaluator,
        isDprcMember1,
        isDprcMember2,
        relationships,
        members: projectMembersList,
        evaluationStatus: {
          stages: stagesStatus,
        },
      };
    });

    // 10. Cohorts calculation across all assigned projects of this teacher
    const allAssignedCohorts = await db
      .select({
        academicYearId: projects.academicYearId,
        academicYearName: academicYears.name,
        academicYearSession: academicYears.academicSession,
        academicYearSemester: academicYears.semester,
      })
      .from(projects)
      .leftJoin(academicYears, eq(projects.academicYearId, academicYears.id))
      .where(
        or(
          eq(projects.guideTeacherId, teacher.id),
          eq(projects.evaluatorTeacherId, teacher.id),
          eq(projects.dprcMember1TeacherId, teacher.id),
          eq(projects.dprcMember2TeacherId, teacher.id)
        )
      );

    const cohortMap = new Map<string, TeacherCohort>();
    for (const row of allAssignedCohorts) {
      if (row.academicYearId && row.academicYearName) {
        const existing = cohortMap.get(row.academicYearId);
        if (existing) {
          existing.projectCount += 1;
        } else {
          cohortMap.set(row.academicYearId, {
            id: row.academicYearId,
            name: row.academicYearName,
            semester: row.academicYearSemester || '',
            academicSession: row.academicYearSession || '',
            projectCount: 1,
          });
        }
      }
    }

    const stats: DashboardStats = {
      totalProjects,
      guidedCount,
      evaluatedCount,
      dprc1Count,
      dprc2Count,
      scopedProjectsCount: scopedProjects.length,
      totalStudents: uniqueStudentIdSet.size,
    };

    const responsePayload: TeacherDashboardResponse = {
      teacher: teacherProfile,
      activeRole: selectedRole,
      stats,
      availableRoles,
      cohorts: Array.from(cohortMap.values()),
      projects: projectSummaries,
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error fetching teacher dashboard data:', error);
    res.status(500).json({ error: 'Failed to retrieve teacher dashboard data' });
  }
};

/**
 * GET /api/teacher/projects
 * Returns scoped projects list for the authenticated teacher.
 */
export const getTeacherProjects = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  return getTeacherDashboard(req, res);
};

/**
 * GET /api/teacher/projects/:id
 * Strictly authorized individual project detail endpoint.
 *
 * If the authenticated teacher requests a project not assigned under the requested role,
 * or not assigned to the teacher at all, returns HTTP 403 or 404 without exposing
 * any private student, marks, or evaluation data.
 */
export const getTeacherProjectById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const rawParam = req.params.id;
    const projectIdParam = Array.isArray(rawParam) ? rawParam[0] : rawParam;
    if (!projectIdParam || typeof projectIdParam !== 'string') {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectIdParam);
    const projectLookupCondition = isUuid
      ? eq(projects.id, projectIdParam)
      : eq(projects.projectId, projectIdParam);

    const [project] = await db
      .select({
        id: projects.id,
        projectId: projects.projectId,
        title: projects.title,
        technology: projects.technology,
        domain: projects.domain,
        status: projects.status,
        academicYearId: projects.academicYearId,
        guideTeacherId: projects.guideTeacherId,
        evaluatorTeacherId: projects.evaluatorTeacherId,
        dprcMember1TeacherId: projects.dprcMember1TeacherId,
        dprcMember2TeacherId: projects.dprcMember2TeacherId,
        academicYearName: academicYears.name,
        academicYearSession: academicYears.academicSession,
        academicYearSemester: academicYears.semester,
      })
      .from(projects)
      .leftJoin(academicYears, eq(projects.academicYearId, academicYears.id))
      .where(projectLookupCondition)
      .limit(1);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // 2. Role-scoped authorization check
    const rawRoleParam = req.query.role;
    if (rawRoleParam !== undefined && rawRoleParam !== '') {
      const parsedRole = normalizeTeacherRole(rawRoleParam);
      if (!parsedRole) {
        res.status(400).json({
          error:
            'Invalid role specified. Supported roles are Guide, Evaluator, DPRC Member 1, DPRC Member 2.',
        });
        return;
      }

      let isAuthorizedUnderRole = false;
      switch (parsedRole) {
        case 'Guide':
          isAuthorizedUnderRole = project.guideTeacherId === user.id;
          break;
        case 'Evaluator':
          isAuthorizedUnderRole = project.evaluatorTeacherId === user.id;
          break;
        case 'DPRC Member 1':
          isAuthorizedUnderRole = project.dprcMember1TeacherId === user.id;
          break;
        case 'DPRC Member 2':
          isAuthorizedUnderRole = project.dprcMember2TeacherId === user.id;
          break;
      }

      if (!isAuthorizedUnderRole) {
        res.status(403).json({
          error: `Access denied. You are not assigned to project ${project.projectId} under the ${parsedRole} role.`,
        });
        return;
      }
    } else {
      // If role is omitted, verify teacher is assigned in AT LEAST ONE role on this project
      const isAssigned =
        project.guideTeacherId === user.id ||
        project.evaluatorTeacherId === user.id ||
        project.dprcMember1TeacherId === user.id ||
        project.dprcMember2TeacherId === user.id;

      if (!isAssigned) {
        res.status(403).json({
          error: `Access denied. You are not assigned to project ${project.projectId}.`,
        });
        return;
      }
    }

    // 3. Authorization succeeded: gather project details
    const teacherIdSet = new Set<string>();
    if (project.guideTeacherId) teacherIdSet.add(project.guideTeacherId);
    if (project.evaluatorTeacherId) teacherIdSet.add(project.evaluatorTeacherId);
    if (project.dprcMember1TeacherId) teacherIdSet.add(project.dprcMember1TeacherId);
    if (project.dprcMember2TeacherId) teacherIdSet.add(project.dprcMember2TeacherId);

    const associatedTeacherMap = new Map<string, AssociatedTeacherInfo>();
    if (teacherIdSet.size > 0) {
      const teacherRecords = await db
        .select({
          id: teachers.id,
          name: teachers.name,
          userId: teachers.userId,
          designation: teachers.designation,
        })
        .from(teachers)
        .where(inArray(teachers.id, Array.from(teacherIdSet)));

      for (const t of teacherRecords) {
        associatedTeacherMap.set(t.id, t);
      }
    }

    const memberRows = await db
      .select({
        projectId: projectMembers.projectId,
        studentId: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        email: students.email,
        department: students.department,
        isTeamLeader: projectMembers.isTeamLeader,
        memberOrder: projectMembers.memberOrder,
      })
      .from(projectMembers)
      .innerJoin(students, eq(projectMembers.studentId, students.id))
      .where(eq(projectMembers.projectId, project.id));

    memberRows.sort((a, b) => a.memberOrder - b.memberOrder);

    const attendanceRows = await db
      .select({
        studentId: evaluationAttendance.studentId,
        stage: evaluationAttendance.evaluationStage,
        status: evaluationAttendance.status,
      })
      .from(evaluationAttendance)
      .where(eq(evaluationAttendance.projectId, project.id));

    const attendanceMap = new Map<string, Record<string, string>>();
    for (const att of attendanceRows) {
      const current = attendanceMap.get(att.studentId) || {};
      current[att.stage] = att.status;
      attendanceMap.set(att.studentId, current);
    }

    const marksRows = await db
      .select({
        studentId: evaluationMarks.studentId,
        stage: evaluationMarks.evaluationStage,
        stageTotalMarks: evaluationMarks.stageTotalMarks,
        remarks: evaluationMarks.remarks,
      })
      .from(evaluationMarks)
      .where(eq(evaluationMarks.projectId, project.id));

    const marksMap = new Map<
      string,
      Record<string, { stageTotalMarks: string | number; remarks?: string | null }>
    >();
    for (const m of marksRows) {
      const current = marksMap.get(m.studentId) || {};
      current[m.stage] = {
        stageTotalMarks: m.stageTotalMarks,
        remarks: m.remarks,
      };
      marksMap.set(m.studentId, current);
    }

    const members: ProjectMemberSummary[] = memberRows.map((row) => ({
      studentId: row.studentId,
      rollNumber: row.rollNumber,
      name: row.name,
      email: row.email,
      department: row.department,
      isTeamLeader: row.isTeamLeader,
      memberOrder: row.memberOrder,
      attendance: attendanceMap.get(row.studentId) || {},
      marks: marksMap.get(row.studentId) || {},
    }));

    const isGuide = project.guideTeacherId === user.id;
    const isEvaluator = project.evaluatorTeacherId === user.id;
    const isDprcMember1 = project.dprcMember1TeacherId === user.id;
    const isDprcMember2 = project.dprcMember2TeacherId === user.id;

    const relationships: string[] = [];
    if (isGuide) relationships.push('Guide');
    if (isEvaluator) relationships.push('Evaluator');
    if (isDprcMember1) relationships.push('DPRC Member 1');
    if (isDprcMember2) relationships.push('DPRC Member 2');

    const standardStages = ['PRESENTATION_1', 'PRESENTATION_2', 'EVALUATION_2', 'EVALUATION_3'];
    const totalMembers = members.length;
    const stagesStatus: Record<
      string,
      { totalMembers: number; markedCount: number; presentCount: number; isCompleted: boolean }
    > = {};

    for (const stage of standardStages) {
      let markedCount = 0;
      let presentCount = 0;
      for (const member of members) {
        if (member.marks[stage] && member.marks[stage].stageTotalMarks !== null) {
          markedCount++;
        }
        if (member.attendance[stage] === 'PRESENT') {
          presentCount++;
        }
      }
      stagesStatus[stage] = {
        totalMembers,
        markedCount,
        presentCount,
        isCompleted: totalMembers > 0 && markedCount >= totalMembers,
      };
    }

    const projectDetail: TeacherProjectSummary = {
      id: project.id,
      projectId: project.projectId,
      title: project.title,
      technology: project.technology,
      domain: project.domain,
      status: project.status,
      academicYearId: project.academicYearId,
      academicYearName: project.academicYearName,
      academicYearSession: project.academicYearSession,
      academicYearSemester: project.academicYearSemester,
      guideTeacher: project.guideTeacherId ? associatedTeacherMap.get(project.guideTeacherId) || null : null,
      evaluatorTeacher: project.evaluatorTeacherId
        ? associatedTeacherMap.get(project.evaluatorTeacherId) || null
        : null,
      dprcMember1: project.dprcMember1TeacherId
        ? associatedTeacherMap.get(project.dprcMember1TeacherId) || null
        : null,
      dprcMember2: project.dprcMember2TeacherId
        ? associatedTeacherMap.get(project.dprcMember2TeacherId) || null
        : null,
      isGuide,
      isEvaluator,
      isDprcMember1,
      isDprcMember2,
      relationships,
      members,
      evaluationStatus: {
        stages: stagesStatus,
      },
    };

    res.status(200).json({ project: projectDetail });
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve project details' });
  }
};

/**
 * GET /api/teacher/projects/:id/evaluation
 * Returns editable evaluation ledger for a project under the teacher's active role.
 * Query params:
 * - role: Guide | Evaluator | DPRC Member 1 | DPRC Member 2 (required)
 * - stage: P1 | P2 | E2 | E3 | PRESENTATION_1 | PRESENTATION_2 | EVALUATION_2 | EVALUATION_3 (required)
 */
export const getTeacherProjectEvaluation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role: rawRole, stage: rawStage } = req.query;

    const authResult = await verifyTeacherProjectAuthorization(user.id, id, rawRole);
    if (authResult.errorStatus) {
      res.status(authResult.errorStatus).json({ error: authResult.errorMessage });
      return;
    }

    const { project, role } = authResult.context!;

    const stageMeta = normalizeEvaluationStage(rawStage);
    if (!stageMeta) {
      res.status(400).json({
        error:
          'Invalid evaluation stage. Supported stages are P1 (Presentation-1), P2 (Presentation-2), E2 (Evaluation-2), E3 (Evaluation-3).',
      });
      return;
    }

    // Fetch enrolled project members ordered by workbook sequence
    const memberRows = await db
      .select({
        studentId: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        isTeamLeader: projectMembers.isTeamLeader,
        memberOrder: projectMembers.memberOrder,
      })
      .from(projectMembers)
      .innerJoin(students, eq(projectMembers.studentId, students.id))
      .where(eq(projectMembers.projectId, project.id));

    memberRows.sort((a, b) => a.memberOrder - b.memberOrder);

    // Fetch attendance for this stage
    const attendanceRows = await db
      .select({
        studentId: evaluationAttendance.studentId,
        status: evaluationAttendance.status,
      })
      .from(evaluationAttendance)
      .where(
        and(
          eq(evaluationAttendance.projectId, project.id),
          eq(evaluationAttendance.evaluationStage, stageMeta.stage)
        )
      );

    const attendanceMap = new Map<string, AttendanceStatus>();
    for (const row of attendanceRows) {
      attendanceMap.set(row.studentId, row.status as AttendanceStatus);
    }

    // Fetch marks for this stage
    const marksRows = await db
      .select({
        studentId: evaluationMarks.studentId,
        stageTotalMarks: evaluationMarks.stageTotalMarks,
        remarks: evaluationMarks.remarks,
      })
      .from(evaluationMarks)
      .where(
        and(
          eq(evaluationMarks.projectId, project.id),
          eq(evaluationMarks.evaluationStage, stageMeta.stage)
        )
      );

    const marksMap = new Map<string, { marks: number | null; remarks?: string | null }>();
    for (const row of marksRows) {
      marksMap.set(row.studentId, {
        marks: row.stageTotalMarks !== null ? Number(row.stageTotalMarks) : null,
        remarks: row.remarks,
      });
    }

    const studentRows: EvaluationStudentRow[] = memberRows.map((m) => {
      const markEntry = marksMap.get(m.studentId);
      return {
        studentId: m.studentId,
        rollNumber: m.rollNumber,
        name: m.name,
        isTeamLeader: m.isTeamLeader,
        memberOrder: m.memberOrder,
        attendance: attendanceMap.get(m.studentId) || null,
        marks: markEntry !== undefined && markEntry.marks !== null ? markEntry.marks : null,
        remarks: markEntry?.remarks || null,
      };
    });

    const response: ProjectEvaluationDataResponse = {
      projectId: project.id,
      projectCode: project.projectId,
      title: project.title,
      stage: stageMeta.stage,
      stageCode: stageMeta.code,
      stageName: stageMeta.name,
      maxMarks: stageMeta.maxMarks,
      activeRole: role,
      students: studentRows,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error retrieving project evaluation data:', error);
    res.status(500).json({ error: 'Failed to retrieve project evaluation data' });
  }
};

/**
 * PUT /api/teacher/projects/:id/attendance
 * Updates student attendance for an evaluation stage.
 * Request body:
 * {
 *   role: TeacherRole,
 *   stage: 'P1' | 'P2' | 'E2' | 'E3' | string,
 *   attendance: [{ studentId: string, status: 'PRESENT' | 'ABSENT' }]
 * }
 */
export const updateProjectAttendance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role: rawRole, stage: rawStage, attendance } = req.body;

    const authResult = await verifyTeacherProjectAuthorization(user.id, id, rawRole);
    if (authResult.errorStatus) {
      res.status(authResult.errorStatus).json({ error: authResult.errorMessage });
      return;
    }

    const { project } = authResult.context!;

    const stageMeta = normalizeEvaluationStage(rawStage);
    if (!stageMeta) {
      res.status(400).json({
        error:
          'Invalid evaluation stage. Supported stages are P1 (Presentation-1), P2 (Presentation-2), E2 (Evaluation-2), E3 (Evaluation-3).',
      });
      return;
    }

    if (!Array.isArray(attendance) || attendance.length === 0) {
      res.status(400).json({ error: 'Attendance payload must be a non-empty array.' });
      return;
    }

    // Verify all student IDs belong to this project
    const validMembers = await db
      .select({ studentId: projectMembers.studentId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, project.id));
    const validStudentIdSet = new Set(validMembers.map((m) => m.studentId));

    for (const item of attendance) {
      if (!item.studentId || !validStudentIdSet.has(item.studentId)) {
        res.status(400).json({
          error: `Student ID "${item?.studentId}" is not an enrolled member of project ${project.projectId}.`,
        });
        return;
      }
      const statusUpper = typeof item.status === 'string' ? item.status.trim().toUpperCase() : '';
      if (statusUpper !== 'PRESENT' && statusUpper !== 'ABSENT') {
        res.status(400).json({
          error: `Invalid attendance status "${item.status}". Status must be "PRESENT" or "ABSENT".`,
        });
        return;
      }
    }

    // Resolve evaluation record ID for foreign key
    const [evalRecord] = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(
        and(
          eq(evaluations.stage, stageMeta.stage),
          project.academicYearId ? eq(evaluations.academicYearId, project.academicYearId) : sql`1=1`
        )
      )
      .limit(1);
    const evaluationId = evalRecord?.id || null;

    // Transactional Upsert: prevents duplicates via idx_eval_attendance_unique
    await db.transaction(async (tx) => {
      for (const item of attendance) {
        const statusUpper = item.status.trim().toUpperCase();
        await tx
          .insert(evaluationAttendance)
          .values({
            evaluationId,
            evaluationStage: stageMeta.stage,
            projectId: project.id,
            studentId: item.studentId,
            status: statusUpper,
            markedByTeacherId: user.id,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              evaluationAttendance.evaluationStage,
              evaluationAttendance.projectId,
              evaluationAttendance.studentId,
            ],
            set: {
              status: statusUpper,
              markedByTeacherId: user.id,
              updatedAt: new Date(),
            },
          });
      }
    });

    res.status(200).json({
      success: true,
      message: `Attendance updated successfully for ${attendance.length} student(s).`,
      count: attendance.length,
    });
  } catch (error) {
    console.error('Error updating project attendance:', error);
    res.status(500).json({ error: 'Failed to update project attendance' });
  }
};

/**
 * PUT /api/teacher/projects/:id/marks
 * Updates student marks for an evaluation stage.
 * Request body:
 * {
 *   role: TeacherRole,
 *   stage: 'P1' | 'P2' | 'E2' | 'E3' | string,
 *   marks: [{ studentId: string, marks: number | null, remarks?: string }]
 * }
 */
export const updateProjectMarks = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role: rawRole, stage: rawStage, marks } = req.body;

    const authResult = await verifyTeacherProjectAuthorization(user.id, id, rawRole);
    if (authResult.errorStatus) {
      res.status(authResult.errorStatus).json({ error: authResult.errorMessage });
      return;
    }

    const { project } = authResult.context!;

    const stageMeta = normalizeEvaluationStage(rawStage);
    if (!stageMeta) {
      res.status(400).json({
        error:
          'Invalid evaluation stage. Supported stages are P1 (Presentation-1), P2 (Presentation-2), E2 (Evaluation-2), E3 (Evaluation-3).',
      });
      return;
    }

    if (!Array.isArray(marks) || marks.length === 0) {
      res.status(400).json({ error: 'Marks payload must be a non-empty array.' });
      return;
    }

    // Verify valid project members
    const validMembers = await db
      .select({
        studentId: projectMembers.studentId,
        rollNumber: students.rollNumber,
        name: students.name,
      })
      .from(projectMembers)
      .innerJoin(students, eq(projectMembers.studentId, students.id))
      .where(eq(projectMembers.projectId, project.id));

    const validStudentMap = new Map(validMembers.map((m) => [m.studentId, m]));

    // Strict validation of each mark record
    for (const item of marks) {
      if (!item.studentId || !validStudentMap.has(item.studentId)) {
        res.status(400).json({
          error: `Student ID "${item?.studentId}" is not an enrolled member of project ${project.projectId}.`,
        });
        return;
      }

      const student = validStudentMap.get(item.studentId)!;

      if (item.marks !== null && item.marks !== undefined && item.marks !== '') {
        const num = Number(item.marks);
        if (Number.isNaN(num) || !Number.isFinite(num)) {
          res.status(400).json({
            error: `Invalid mark "${item.marks}" for student ${student.name} (${student.rollNumber}). Marks must be a valid number.`,
          });
          return;
        }
        if (num < 0) {
          res.status(400).json({
            error: `Invalid mark ${num} for student ${student.name} (${student.rollNumber}). Marks cannot be negative.`,
          });
          return;
        }
        if (num > stageMeta.maxMarks) {
          res.status(400).json({
            error: `Invalid mark ${num} for student ${student.name} (${student.rollNumber}). Maximum marks allowed for ${stageMeta.name} is ${stageMeta.maxMarks}.`,
          });
          return;
        }
      }
    }

    // Resolve evaluation record ID for foreign key
    const [evalRecord] = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(
        and(
          eq(evaluations.stage, stageMeta.stage),
          project.academicYearId ? eq(evaluations.academicYearId, project.academicYearId) : sql`1=1`
        )
      )
      .limit(1);
    const evaluationId = evalRecord?.id || null;

    // Transactional Update/Upsert: Atomic batch with rollback on any failure
    await db.transaction(async (tx) => {
      for (const item of marks) {
        if (item.marks === null || item.marks === undefined || item.marks === '') {
          // If null / cleared: remove row from evaluation_marks so it remains NULL (unentered)
          await tx
            .delete(evaluationMarks)
            .where(
              and(
                eq(evaluationMarks.evaluationStage, stageMeta.stage),
                eq(evaluationMarks.projectId, project.id),
                eq(evaluationMarks.studentId, item.studentId)
              )
            );
        } else {
          const num = Number(item.marks);
          const formatted = num.toFixed(2);

          await tx
            .insert(evaluationMarks)
            .values({
              evaluationId,
              evaluationStage: stageMeta.stage,
              projectId: project.id,
              studentId: item.studentId,
              stageTotalMarks: formatted,
              evaluatedByTeacherId: user.id,
              remarks: item.remarks || null,
              p1ScaledScore: stageMeta.stage === 'PRESENTATION_1' ? formatted : null,
              p2ReviewMarks: stageMeta.stage === 'PRESENTATION_2' ? formatted : null,
              e2TotalMarks: stageMeta.stage === 'EVALUATION_2' ? formatted : null,
              e3TotalMarks: stageMeta.stage === 'EVALUATION_3' ? formatted : null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                evaluationMarks.evaluationStage,
                evaluationMarks.projectId,
                evaluationMarks.studentId,
              ],
              set: {
                stageTotalMarks: formatted,
                evaluatedByTeacherId: user.id,
                remarks: item.remarks !== undefined ? item.remarks : evaluationMarks.remarks,
                ...(stageMeta.stage === 'PRESENTATION_1' ? { p1ScaledScore: formatted } : {}),
                ...(stageMeta.stage === 'PRESENTATION_2' ? { p2ReviewMarks: formatted } : {}),
                ...(stageMeta.stage === 'EVALUATION_2' ? { e2TotalMarks: formatted } : {}),
                ...(stageMeta.stage === 'EVALUATION_3' ? { e3TotalMarks: formatted } : {}),
                updatedAt: new Date(),
              },
            });
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Marks updated successfully for ${marks.length} student(s).`,
      count: marks.length,
    });
  } catch (error) {
    console.error('Error updating project marks:', error);
    res.status(500).json({ error: 'Failed to update project marks' });
  }
};

/**
 * PUT /api/teacher/projects/:id/evaluation
 * Batch updates attendance and marks atomically in a single transaction.
 * Request body:
 * {
 *   role: TeacherRole,
 *   stage: 'P1' | 'P2' | 'E2' | 'E3' | string,
 *   records: [{ studentId: string, attendance?: 'PRESENT' | 'ABSENT' | null, marks?: number | null, remarks?: string }]
 * }
 */
export const updateProjectEvaluationBatch = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { role: rawRole, stage: rawStage, records } = req.body;

    const authResult = await verifyTeacherProjectAuthorization(user.id, id, rawRole);
    if (authResult.errorStatus) {
      res.status(authResult.errorStatus).json({ error: authResult.errorMessage });
      return;
    }

    const { project } = authResult.context!;

    const stageMeta = normalizeEvaluationStage(rawStage);
    if (!stageMeta) {
      res.status(400).json({
        error:
          'Invalid evaluation stage. Supported stages are P1 (Presentation-1), P2 (Presentation-2), E2 (Evaluation-2), E3 (Evaluation-3).',
      });
      return;
    }

    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: 'Records payload must be a non-empty array.' });
      return;
    }

    // Verify valid project members
    const validMembers = await db
      .select({
        studentId: projectMembers.studentId,
        rollNumber: students.rollNumber,
        name: students.name,
      })
      .from(projectMembers)
      .innerJoin(students, eq(projectMembers.studentId, students.id))
      .where(eq(projectMembers.projectId, project.id));

    const validStudentMap = new Map(validMembers.map((m) => [m.studentId, m]));

    // Pre-validate all records before entering database transaction
    for (const item of records) {
      if (!item.studentId || !validStudentMap.has(item.studentId)) {
        res.status(400).json({
          error: `Student ID "${item?.studentId}" is not an enrolled member of project ${project.projectId}.`,
        });
        return;
      }

      const student = validStudentMap.get(item.studentId)!;

      // Validate attendance if provided
      if (item.attendance !== undefined && item.attendance !== null && item.attendance !== '') {
        const attUpper = String(item.attendance).trim().toUpperCase();
        if (attUpper !== 'PRESENT' && attUpper !== 'ABSENT') {
          res.status(400).json({
            error: `Invalid attendance status "${item.attendance}" for student ${student.name}. Must be "PRESENT" or "ABSENT".`,
          });
          return;
        }
      }

      // Validate marks if provided
      if (item.marks !== undefined && item.marks !== null && item.marks !== '') {
        const num = Number(item.marks);
        if (Number.isNaN(num) || !Number.isFinite(num)) {
          res.status(400).json({
            error: `Invalid mark "${item.marks}" for student ${student.name} (${student.rollNumber}). Marks must be a valid number.`,
          });
          return;
        }
        if (num < 0) {
          res.status(400).json({
            error: `Invalid mark ${num} for student ${student.name} (${student.rollNumber}). Marks cannot be negative.`,
          });
          return;
        }
        if (num > stageMeta.maxMarks) {
          res.status(400).json({
            error: `Invalid mark ${num} for student ${student.name} (${student.rollNumber}). Maximum marks allowed for ${stageMeta.name} is ${stageMeta.maxMarks}.`,
          });
          return;
        }
      }
    }

    // Resolve evaluation record ID for foreign key
    const [evalRecord] = await db
      .select({ id: evaluations.id })
      .from(evaluations)
      .where(
        and(
          eq(evaluations.stage, stageMeta.stage),
          project.academicYearId ? eq(evaluations.academicYearId, project.academicYearId) : sql`1=1`
        )
      )
      .limit(1);
    const evaluationId = evalRecord?.id || null;

    // Single Atomic Transaction for attendance and marks batch
    await db.transaction(async (tx) => {
      for (const item of records) {
        // 1. Process attendance
        if (item.attendance !== undefined && item.attendance !== null && item.attendance !== '') {
          const statusUpper = String(item.attendance).trim().toUpperCase();
          await tx
            .insert(evaluationAttendance)
            .values({
              evaluationId,
              evaluationStage: stageMeta.stage,
              projectId: project.id,
              studentId: item.studentId,
              status: statusUpper,
              markedByTeacherId: user.id,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                evaluationAttendance.evaluationStage,
                evaluationAttendance.projectId,
                evaluationAttendance.studentId,
              ],
              set: {
                status: statusUpper,
                markedByTeacherId: user.id,
                updatedAt: new Date(),
              },
            });
        }

        // 2. Process marks
        if (item.marks === null || item.marks === '') {
          // Explicit null/empty: delete row so it remains NULL (not evaluated)
          await tx
            .delete(evaluationMarks)
            .where(
              and(
                eq(evaluationMarks.evaluationStage, stageMeta.stage),
                eq(evaluationMarks.projectId, project.id),
                eq(evaluationMarks.studentId, item.studentId)
              )
            );
        } else if (item.marks !== undefined) {
          const num = Number(item.marks);
          const formatted = num.toFixed(2);

          await tx
            .insert(evaluationMarks)
            .values({
              evaluationId,
              evaluationStage: stageMeta.stage,
              projectId: project.id,
              studentId: item.studentId,
              stageTotalMarks: formatted,
              evaluatedByTeacherId: user.id,
              remarks: item.remarks || null,
              p1ScaledScore: stageMeta.stage === 'PRESENTATION_1' ? formatted : null,
              p2ReviewMarks: stageMeta.stage === 'PRESENTATION_2' ? formatted : null,
              e2TotalMarks: stageMeta.stage === 'EVALUATION_2' ? formatted : null,
              e3TotalMarks: stageMeta.stage === 'EVALUATION_3' ? formatted : null,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                evaluationMarks.evaluationStage,
                evaluationMarks.projectId,
                evaluationMarks.studentId,
              ],
              set: {
                stageTotalMarks: formatted,
                evaluatedByTeacherId: user.id,
                remarks: item.remarks !== undefined ? item.remarks : evaluationMarks.remarks,
                ...(stageMeta.stage === 'PRESENTATION_1' ? { p1ScaledScore: formatted } : {}),
                ...(stageMeta.stage === 'PRESENTATION_2' ? { p2ReviewMarks: formatted } : {}),
                ...(stageMeta.stage === 'EVALUATION_2' ? { e2TotalMarks: formatted } : {}),
                ...(stageMeta.stage === 'EVALUATION_3' ? { e3TotalMarks: formatted } : {}),
                updatedAt: new Date(),
              },
            });
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Evaluation records saved successfully for ${records.length} student(s).`,
      count: records.length,
    });
  } catch (error) {
    console.error('Error saving evaluation batch:', error);
    res.status(500).json({ error: 'Failed to save evaluation records' });
  }
};
