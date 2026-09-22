import { isSystemAdmin } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/features/dashboard/components/dashboard-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Panel' };

export default async function DashboardPage() {
  const session = await requireSession();
  // `/dashboard` es el destino por defecto de todo: del login, del registro y
  // del `?denied=1` con el que `requireRole` rechaza una ruta. Para un
  // `SYSTEM_ADMIN` es una pantalla de socio —entrenamientos, racha, membresía—
  // que su cuenta no tiene, así que aquí se le manda a la suya en vez de
  // dejarle un panel vacío como primera impresión del portal.
  if (isSystemAdmin(session.role)) redirect('/sistema');
  return <DashboardClient />;
}
