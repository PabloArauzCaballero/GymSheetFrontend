import type { Metadata } from 'next';
import { AuditPanel } from '@/features/admin/components/audit-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Auditoría' };

export default async function AdminAuditoriaPage() {
  await requireRole(['SYSTEM_ADMIN']);
  return <AuditPanel scope="gym" />;
}
