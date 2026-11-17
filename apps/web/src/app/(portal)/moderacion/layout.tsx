import { PLATFORM_MODERATION_ROLES } from '@gymsheet/domain';
import type { ReactNode } from 'react';
import { requireRole } from '@/shared/server/session';

/**
 * The REPP moderation console (backend ADR-0018): the central team
 * (`MODERATOR`) and the platform admin. Gym staff no longer moderates.
 *
 * `requireRole` is only the client-side door; the backend authorizes, with
 * `@Roles(MODERATOR, SYSTEM_ADMIN)` and 403 for everyone else.
 */
export default async function ModeracionLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(PLATFORM_MODERATION_ROLES);
  return children;
}
