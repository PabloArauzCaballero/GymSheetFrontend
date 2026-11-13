import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ComunidadClient } from '@/features/social/components/comunidad-client';
import { requireSession } from '@/shared/server/session';
import { staffHomeFor } from '@/shared/server/staff-home';

export const metadata: Metadata = { title: 'Comunidad' };

/**
 * Comunidad es la baraja, como la pestaña del móvil, y el destino tras iniciar
 * sesión. El personal del gimnasio no tiene baraja: se le lleva a su panel.
 */
export default async function ComunidadPage() {
  const session = await requireSession();
  const staffHome = staffHomeFor(session.role);
  if (staffHome) redirect(staffHome);
  return <ComunidadClient />;
}
