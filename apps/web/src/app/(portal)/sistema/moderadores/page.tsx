import type { Metadata } from 'next';
import { ModeratorsAdmin } from '@/features/moderation/components/moderators-admin';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Equipo de moderación' };

/**
 * Only `SYSTEM_ADMIN` (the `/sistema` layout already says so; repeated here
 * because this page writes). The backend gates it with `@Roles(SYSTEM_ADMIN)`.
 */
export default async function SistemaModeradoresPage() {
  await requireRole(['SYSTEM_ADMIN']);
  return <ModeratorsAdmin />;
}
