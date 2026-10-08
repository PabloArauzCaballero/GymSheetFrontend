import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ModerationQueue } from '@/features/moderation/components/moderation-queue';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Moderación global' };

/**
 * La misma cola que la del gimnasio, vista desde la plataforma.
 *
 * Las rutinas públicas, los ejercicios que viajan dentro de ellas y sus
 * comentarios no pertenecen a un gimnasio, y `/admin` le cierra la puerta a
 * `SYSTEM_ADMIN`. El alcance lo resuelve el backend desde la sesión: aquí la
 * cola trae todos los gimnasios.
 */
export default async function SistemaModeracionPage() {
  const session = await requireRole(['SYSTEM_ADMIN']);
  if (!hasPermission(session.permissions, 'moderation:read')) {
    redirect('/sistema?denied=1');
  }
  return <ModerationQueue />;
}
