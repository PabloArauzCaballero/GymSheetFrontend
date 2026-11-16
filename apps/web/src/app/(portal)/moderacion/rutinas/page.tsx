import { PLATFORM_MODERATION_ROLES } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { RoutinesReppAdmin } from '@/features/routines-repp/components/routines-repp-admin';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutinas denunciadas' };

/**
 * The routines review of the REPP team (`GET /admin/routines`), read only: making
 * a routine official and its metrics stay with the platform admin in
 * `/sistema/rutinas-repp`, and the backend refuses them to a moderator.
 */
export default async function ModeracionRutinasPage() {
  await requireRole(PLATFORM_MODERATION_ROLES);
  return <RoutinesReppAdmin readOnly />;
}
