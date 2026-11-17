import type { UserRole } from '@gymsheet/types';

/**
 * Role-based access policy shared by web and mobile. The backend remains the
 * authorization source of truth; these helpers only drive UI gating so both
 * clients hide the same surfaces for the same roles.
 */
// The gym has no staff: REPP operates every gym (`SYSTEM_ADMIN`) and moderates
// them (`MODERATOR`). Since franja 7d (backend ADR-0029) the staff roles and the
// permission catalog are gone, so the role alone decides.

/** Administrador de plataforma: opera por encima de los gimnasios. */
export function isSystemAdmin(role: UserRole | null | undefined): boolean {
  return role === 'SYSTEM_ADMIN';
}

/**
 * Platform roles that moderate social content of every gym (backend ADR-0018):
 * the central REPP team (`MODERATOR`) and the platform administrator.
 */
export const PLATFORM_MODERATION_ROLES: readonly UserRole[] = ['MODERATOR', 'SYSTEM_ADMIN'];

/** Member of the central REPP moderation team (not the platform administrator). */
export function isModerator(role: UserRole | null | undefined): boolean {
  return role === 'MODERATOR';
}

/** Can open the moderation console, the routines review and the signups review. */
export function isPlatformModerator(role: UserRole | null | undefined): boolean {
  return role != null && PLATFORM_MODERATION_ROLES.includes(role);
}

export function canAccessMemberFeatures(role: UserRole | null | undefined): boolean {
  return role != null;
}

export function hasAnyRole(
  role: UserRole | null | undefined,
  allowed: readonly UserRole[],
): boolean {
  return role != null && allowed.includes(role);
}
