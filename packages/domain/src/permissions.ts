import type { UserRole } from '@gymsheet/types';

/**
 * Role-based access policy shared by web and mobile. The backend remains the
 * authorization source of truth; these helpers only drive UI gating so both
 * clients hide the same surfaces for the same roles.
 */
// Since franja 7a the gym has no staff surfaces: REPP operates every gym
// (`SYSTEM_ADMIN`) and moderates them (`MODERATOR`). The legacy gym roles stay in
// the enum until 7d but carry no administration, so there is no `isStaff` any more.

/** Administrador de plataforma: opera por encima de los gimnasios. */
export function isSystemAdmin(role: UserRole | null | undefined): boolean {
  return role === 'SYSTEM_ADMIN';
}

/**
 * Platform roles that moderate social content of every gym (backend ADR-0018):
 * the central REPP team (`MODERATOR`) and the platform administrator. Gym staff
 * never moderates, whatever grants it holds.
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

/**
 * Roles the backend answers `GET /admin/permissions/me` for: only the platform
 * admin since franja 7a (every `admin/*` route is `@Roles(SYSTEM_ADMIN)`). A
 * legacy gym role (ADMIN, FRONT_DESK, COACH) or a moderator would get 403.
 */
export function hasAdminPermissionGrants(role: UserRole | null | undefined): boolean {
  return role === 'SYSTEM_ADMIN';
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

/**
 * Granular admin permission check, additive to the role checks above. A role
 * (ADMIN/FRONT_DESK) is the floor the backend enforces first; a permission
 * key narrows further for a small team with differentiated responsibilities.
 * Absence of the `permissions` list (e.g. non-staff sessions) means no grants.
 */
export function hasPermission(
  permissions: readonly string[] | null | undefined,
  permissionKey: string,
): boolean {
  return permissions != null && permissions.includes(permissionKey);
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  permissionKeys: readonly string[],
): boolean {
  return permissions != null && permissionKeys.some((key) => permissions.includes(key));
}
