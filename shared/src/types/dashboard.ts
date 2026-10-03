import { TeacherRole } from '../constants/roles';

export interface DashboardTeacherProfile {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  department: string;
  designation?: string | null;
  role: string;
  mustChangePassword?: boolean;
}

export interface ProjectMemberSummary {
  studentId: string;
  rollNumber: string;
  name: string;
  email: string | null;
  department: string;
  isTeamLeader: boolean;
  memberOrder: number;
  attendance: Record<string, string>; // stage -> 'PRESENT' | 'ABSENT'
  marks: Record<string, { stageTotalMarks: string | number; remarks?: string | null }>;
}

export interface AssociatedTeacherInfo {
  id: string;
  name: string;
  userId: string;
  designation?: string | null;
}

export interface ProjectStageStatus {
  totalMembers: number;
  markedCount: number;
  presentCount: number;
  isCompleted: boolean;
}

export interface TeacherProjectSummary {
  id: string;
  projectId: string; // e.g. 'P_001', 'P_083'
  title: string | null;
  technology: string | null;
  domain: string | null;
  status: string;
  academicYearId: string | null;
  academicYearName: string | null;
  academicYearSession: string | null;
  academicYearSemester: string | null;
  guideTeacher: AssociatedTeacherInfo | null;
  evaluatorTeacher: AssociatedTeacherInfo | null;
  dprcMember1: AssociatedTeacherInfo | null;
  dprcMember2: AssociatedTeacherInfo | null;
  isGuide: boolean;
  isEvaluator: boolean;
  isDprcMember1: boolean;
  isDprcMember2: boolean;
  relationships: string[]; // e.g. ['Guide'] or ['Evaluator', 'DPRC Member 1']
  members: ProjectMemberSummary[];
  evaluationStatus: {
    stages: Record<string, ProjectStageStatus>;
  };
}

export interface DashboardStats {
  totalProjects: number;
  guidedCount: number;
  evaluatedCount: number;
  dprc1Count: number;
  dprc2Count: number;
  scopedProjectsCount: number;
  totalStudents: number;
}

export interface TeacherCohort {
  id: string;
  name: string;
  semester: string;
  academicSession: string;
  projectCount: number;
}

export interface TeacherDashboardResponse {
  teacher: DashboardTeacherProfile;
  activeRole: TeacherRole;
  stats: DashboardStats;
  availableRoles: TeacherRole[];
  cohorts: TeacherCohort[];
  projects: TeacherProjectSummary[];
}
