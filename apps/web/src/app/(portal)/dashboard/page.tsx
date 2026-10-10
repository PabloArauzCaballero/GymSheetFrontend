import { isSystemAdmin } from '@gymsheet/domain';
import type { UserRole } from '@gymsheet/types';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/features/dashboard/components/dashboard-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Panel' };

/** Personal que atiende un gimnasio concreto; el `COACH` no, porque entrena. */
const GYM_STAFF_ROLES: readonly UserRole[] = ['ADMIN', 'FRONT_DESK'];

export default async function DashboardPage() {
  const session = await requireSession();
  // `/dashboard` es el destino por defecto de todo: del login, del registro y
  // del `?denied=1` con el que `requireRole` rechaza una ruta. Para un
  // `SYSTEM_ADMIN` es una pantalla de socio —entrenamientos, racha, membresía—
  // que su cuenta no tiene, así que aquí se le manda a la suya en vez de
  // dejarle un panel vacío como primera impresión del portal.
  if (isSystemAdmin(session.role)) redirect('/sistema');
  // Mismo argumento, un piso más abajo: para quien atiende el gimnasio
  // (`ADMIN`, `FRONT_DESK`) esta pantalla abre con «aún no tienes membresía» y
  // cuatro indicadores en cero de un entrenamiento que no hace. Su panel es el
  // del gimnasio —quién entró hoy, qué máquina se satura, quién no renovó—, y
  // ahí se le lleva. El panel de socio sigue existiendo para `CLIENTE` y
  // `COACH`, que sí entrenan.
  if (GYM_STAFF_ROLES.includes(session.role)) redirect('/admin/operacion');
  return <DashboardClient />;
}
