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
  eq,
  or,
  inArray,
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
} from '@mulyankan/shared';

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

    // 1. Fetch logged-in teacher (NEVER select password_hash)
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
      res.status(401).json({ error: 'Teacher account is not found or inactive' });
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

    // 2. Query ALL projects where this teacher has any institutional role
    // (Guide, Evaluator, DPRC Member 1, DPRC Member 2)
    // Strictly prevents returning projects belonging exclusively to unrelated teachers.
    const allAssignedProjects = await db
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
      .where(
        or(
          eq(projects.guideTeacherId, teacher.id),
          eq(projects.evaluatorTeacherId, teacher.id),
          eq(projects.dprcMember1TeacherId, teacher.id),
          eq(projects.dprcMember2TeacherId, teacher.id)
        )
      );

    // 3. Compute overall stats and available roles based on actual database assignments
    let guidedCount = 0;
    let evaluatedCount = 0;
    const cohortMap = new Map<string, TeacherCohort>();

    for (const p of allAssignedProjects) {
      const isGuide = p.guideTeacherId === teacher.id;
      const isEval =
        p.evaluatorTeacherId === teacher.id ||
        p.dprcMember1TeacherId === teacher.id ||
        p.dprcMember2TeacherId === teacher.id;

      if (isGuide) guidedCount++;
      if (isEval) evaluatedCount++;

      if (p.academicYearId && p.academicYearName) {
        const existing = cohortMap.get(p.academicYearId);
        if (existing) {
          existing.projectCount += 1;
        } else {
          cohortMap.set(p.academicYearId, {
            id: p.academicYearId,
            name: p.academicYearName,
            semester: p.academicYearSemester || '',
            academicSession: p.academicYearSession || '',
            projectCount: 1,
          });
        }
      }
    }

    const availableRoles: TeacherRole[] = [];
    if (guidedCount > 0) availableRoles.push('Guide');
    if (evaluatedCount > 0) availableRoles.push('Evaluator');
    if (availableRoles.length === 0) {
      // Fallback if newly assigned or unassigned
      availableRoles.push('Guide', 'Evaluator');
    }

    // 4. Apply optional filters: role ('Guide' | 'Evaluator' | 'ALL') & academicYearId
    const roleFilter = (req.query.role as string)?.trim();
    const academicYearFilter = (req.query.academicYearId as string)?.trim();

    let filteredProjects = allAssignedProjects;

    if (roleFilter === 'Guide') {
      filteredProjects = filteredProjects.filter((p) => p.guideTeacherId === teacher.id);
    } else if (roleFilter === 'Evaluator') {
      filteredProjects = filteredProjects.filter(
        (p) =>
          p.evaluatorTeacherId === teacher.id ||
          p.dprcMember1TeacherId === teacher.id ||
          p.dprcMember2TeacherId === teacher.id
      );
    }

    if (academicYearFilter) {
      filteredProjects = filteredProjects.filter((p) => p.academicYearId === academicYearFilter);
    }

    // 5. Gather all associated teacher details for the filtered projects
    const teacherIdSet = new Set<string>();
    for (const p of filteredProjects) {
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

    // 6. Gather project members (students) and their evaluation attendance & marks
    const projectIds = filteredProjects.map((p) => p.id);
    const membersByProject = new Map<string, ProjectMemberSummary[]>();
    const uniqueStudentIdSet = new Set<string>();

    if (projectIds.length > 0) {
      // Fetch members
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

      // Order members by memberOrder
      memberRows.sort((a, b) => a.memberOrder - b.memberOrder);

      // Fetch attendance
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

      // Fetch marks
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

      // Populate membersByProject
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

    // 7. Assemble final list of TeacherProjectSummary
    const standardStages = ['PRESENTATION_1', 'PRESENTATION_2', 'EVALUATION_2', 'EVALUATION_3'];

    const projectSummaries: TeacherProjectSummary[] = filteredProjects.map((p) => {
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

    const stats: DashboardStats = {
      totalProjects: allAssignedProjects.length,
      guidedCount,
      evaluatedCount,
      totalStudents: uniqueStudentIdSet.size,
    };

    const responsePayload: TeacherDashboardResponse = {
      teacher: teacherProfile,
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

export const getTeacherProjects = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Delegate to dashboard logic or return project listing
  return getTeacherDashboard(req, res);
};

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

    // Verify project belongs to logged-in teacher
    const [project] = await db
      .select()
      .from(projects)
      .where(
        or(
          eq(projects.id, projectIdParam),
          eq(projects.projectId, projectIdParam)
        )
      )
      .limit(1);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isAuthorized =
      project.guideTeacherId === user.id ||
      project.evaluatorTeacherId === user.id ||
      project.dprcMember1TeacherId === user.id ||
      project.dprcMember2TeacherId === user.id;

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Access denied. You are not assigned to this project.',
      });
      return;
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve project details' });
  }
};
