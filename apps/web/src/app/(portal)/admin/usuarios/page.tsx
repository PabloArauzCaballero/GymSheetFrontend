import type { Metadata } from 'next';
import { UsersPanel } from '@/features/admin/components/users-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsuariosPage() {
  await requireRole(['SYSTEM_ADMIN']);
  return <UsersPanel />;
}
