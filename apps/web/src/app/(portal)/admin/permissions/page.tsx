import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PermissionsPanel } from '@/features/admin/components/permissions-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Permisos de administración' };

export default async function AdminPermissionsPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  if (!hasPermission(session.permissions, 'admin-access:manage')) {
    redirect('/admin?denied=1');
  }
  return <PermissionsPanel />;
}
