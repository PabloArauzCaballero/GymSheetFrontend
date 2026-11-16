import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { VerificationQueue } from '@/features/verification/components/verification-queue';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Verificaciones' };

export default async function AdminVerificacionesPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  // Same floor as the backend: the role opens the door, `moderation:read` narrows it.
  if (!hasPermission(session.permissions, 'moderation:read')) redirect('/admin?denied=1');
  return <VerificationQueue />;
}
