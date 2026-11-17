import type { Metadata } from 'next';
import { AccessAdmin } from '@/features/admin/components/access-admin';
import { requireRole } from '@/shared/server/session';
export const metadata: Metadata = { title: 'Control de acceso' };
export default async function AccessAdminPage() {
  const session = await requireRole(['SYSTEM_ADMIN']);
  return <AccessAdmin role={session.role} />;
}
