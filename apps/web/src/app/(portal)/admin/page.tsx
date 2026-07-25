import type { Metadata } from 'next';
import { AdminOverview } from '@/features/admin/components/admin-overview';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Administración' };

export default async function AdminPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  return <AdminOverview role={session.role} />;
}
