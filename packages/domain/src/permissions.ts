import type { UserRole } from '@gymsheet/types';

/**
 * Role-based access policy shared by web and mobile. The backend remains the
 * authorization source of truth; these helpers only drive UI gating so both
 * clients hide the same surfaces for the same roles.
 */
const STAFF_ROLES: readonly UserRole[] = ['ADMIN', 'COACH', 'FRONT_DESK'];
const ADMIN_ROLES: readonly UserRole[] = ['ADMIN'];

export function isStaff(role: UserRole | null | undefined): boolean {
  return role != null && STAFF_ROLES.includes(role);
}

export function isAdmin(role: UserRole | null | undefined): boolean {
  return role != null && ADMIN_ROLES.includes(role);
}

export function canManageAdminPanel(role: UserRole | null | undefined): boolean {
  return isAdmin(role);
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
