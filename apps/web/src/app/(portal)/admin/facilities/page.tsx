import type { Metadata } from 'next';
import { FacilitiesAdmin } from '@/features/admin/components/facilities-admin';
import { requireRole } from '@/shared/server/session';
export const metadata: Metadata = { title: 'Instalaciones' };
export default async function FacilitiesAdminPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  return <FacilitiesAdmin role={session.role} />;
}
