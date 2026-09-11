import type { Metadata } from 'next';
import { ComunidadClient } from '@/features/social/components/comunidad-client';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Comunidad' };

/**
 * La sesión se resuelve en el servidor y baja como prop.
 *
 * La tira de stories necesita saber cuál de las entradas del feed es la propia
 * —es la única que puede subir, borrar y ver espectadores—, y el principal sólo
 * existe del lado servidor: el JWT vive en una cookie HttpOnly y el navegador
 * no lo lee. Pasarlo como prop evita inventar un endpoint de «quién soy» para
 * el cliente.
 */
export default async function ComunidadPage() {
  const session = await requireSession();
  return (
    <ComunidadClient
      sessionName={session.nombreCompleto ?? session.email}
      sessionUserId={session.id}
    />
  );
}
