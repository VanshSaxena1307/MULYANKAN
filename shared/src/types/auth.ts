import { SystemRole, TeacherRole } from '../constants/roles';

export interface UserProfile {
  id: string;
  username: string; // e.g., firstname@abes or collision-resolved variant
  name: string;
  email?: string;
  role: SystemRole;
  activeTeacherRole: TeacherRole;
  requiresPasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface FirstTimePasswordChangePayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RoleSwitchRequest {
  newRole: TeacherRole;
}
