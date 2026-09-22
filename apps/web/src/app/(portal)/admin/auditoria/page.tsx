import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuditPanel } from '@/features/admin/components/audit-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Auditoría' };

export default async function AdminAuditoriaPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  if (!hasPermission(session.permissions, 'admin-access:manage')) {
    redirect('/admin?denied=1');
  }
  return <AuditPanel scope="gym" />;
}
