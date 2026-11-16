import { PLATFORM_MODERATION_ROLES } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { VerificationQueue } from '@/features/verification/components/verification-queue';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Verificaciones' };

/**
 * The selfie review of the REPP team: a selfie is biometric data and the gym
 * never sees it. The backend serves `/admin/verifications*` only to
 * `MODERATOR` and `SYSTEM_ADMIN`; this guard is just the client-side door.
 */
export default async function ModeracionVerificacionesPage() {
  await requireRole(PLATFORM_MODERATION_ROLES);
  return <VerificationQueue />;
}
