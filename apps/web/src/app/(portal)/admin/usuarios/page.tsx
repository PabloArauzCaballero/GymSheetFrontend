import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { UsersPanel } from '@/features/admin/components/users-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsuariosPage() {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  // El enlace a la ficha de entrenamiento sólo aparece a quien puede abrirla.
  return <UsersPanel canViewTraining={hasPermission(session.permissions, 'support:read')} />;
}
