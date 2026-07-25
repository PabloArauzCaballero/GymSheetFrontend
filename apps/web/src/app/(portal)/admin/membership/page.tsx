import type { Metadata } from 'next';
import { MembershipAdmin } from '@/features/admin/components/membership-admin';
import { requireRole } from '@/shared/server/session';
export const metadata: Metadata = { title: 'Membresías y clientes' };
export default async function MembershipAdminPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  return <MembershipAdmin role={session.role} />;
}
