import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ModerationQueue } from '@/features/moderation/components/moderation-queue';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Moderación' };

export default async function AdminModeracionPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  // Recepción puede moderar sólo si alguien se lo concedió explícitamente: el
  // rol es el piso, el permiso lo estrecha. Mismo criterio que el backend.
  if (!hasPermission(session.permissions, 'moderation:read')) {
    redirect('/admin?denied=1');
  }
  return <ModerationQueue />;
}
