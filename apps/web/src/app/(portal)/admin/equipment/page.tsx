import type { Metadata } from 'next';
import { EquipmentAdmin } from '@/features/admin/components/equipment-admin';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Administrar equipamiento' };

export default async function EquipmentAdminPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  return <EquipmentAdmin canManage={session.role === 'ADMIN'} />;
}
