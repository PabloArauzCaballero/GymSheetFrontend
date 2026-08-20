import type { Metadata } from 'next';
import { UsersPanel } from '@/features/admin/components/users-panel';

export const metadata: Metadata = { title: 'Usuarios' };

export default function UsuariosPage() {
  return <UsersPanel />;
}
