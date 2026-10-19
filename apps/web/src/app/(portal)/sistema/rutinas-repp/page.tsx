import type { Metadata } from 'next';
import { RoutinesReppAdmin } from '@/features/routines-repp/components/routines-repp-admin';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Rutinas REPP' };

/**
 * Sólo `SYSTEM_ADMIN`: el layout de `/sistema` ya cierra la puerta, y se repite
 * aquí porque esta pantalla escribe (crea y marca oficiales) y un cambio en el
 * layout no debería abrirla sin que nadie lo note. El backend es quien manda.
 */
export default async function SistemaRutinasReppPage() {
  await requireRole(['SYSTEM_ADMIN']);
  return <RoutinesReppAdmin />;
}
