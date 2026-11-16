import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { UsersPanel } from '@/features/admin/components/users-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsuariosPage() {
  const session = await requireRole(['SYSTEM_ADMIN']);
  // El enlace a la ficha de entrenamiento sólo aparece a quien puede abrirla.
  // Closing a staff account is SYSTEM_ADMIN-only in the backend (franja 7a); the UI only mirrors it.
  return (
    <UsersPanel
      canViewTraining={hasPermission(session.permissions, 'support:read')}
      closure={session.role === 'SYSTEM_ADMIN' ? { callerId: session.id } : undefined}
    />
  );
}
