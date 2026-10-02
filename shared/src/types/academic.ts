export interface AcademicYearConfig {
  id: string;
  name: string; // e.g. "2nd Year", "3rd Year"
  isActive: boolean;
  orderIndex: number;
}

/**
 * Student entity definition.
 * Roll Number is the primary unique identifier for student identity.
 */
export interface Student {
  rollNumber: string; // Unique student identifier
  name: string;
  projectId: string; // References team/project
  isTeamLeader: boolean; // First listed team member is designated leader
  academicYear: string; // Extensible year identifier
  department?: string;
  section?: string;
}

/**
 * Project / Team entity definition.
 * Project ID uniquely identifies the team project.
 */
export interface ProjectTeam {
  projectId: string; // Unique team/project identity
  title: string;
  academicYear: string;
  guideFacultyId?: string;
  evaluatorFacultyId?: string;
  synopsis?: string;
  category?: string;
}

/**
 * Team with associated student members.
 */
export interface ProjectTeamWithMembers extends ProjectTeam {
  leader: Student;
  members: Student[];
}
