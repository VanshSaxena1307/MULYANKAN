export const TEACHER_ROLES = ['Guide', 'Evaluator'] as const;
export type TeacherRole = (typeof TEACHER_ROLES)[number];

export const SYSTEM_ROLES = [...TEACHER_ROLES, 'Admin'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const DEFAULT_TEACHER_ROLE: TeacherRole = 'Guide';

/**
 * Institutional role switch confirmation message template as mandated by requirements.
 */
export function getRoleSwitchConfirmationMessage(currentRole: TeacherRole, newRole: TeacherRole): string {
  return `You really want to switch role from ${currentRole} to ${newRole}?`;
}
