import { hasPermission } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { SupportTrainingPanel } from '@/features/support-training/components/support-training-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Entrenamiento del socio' };

const paramsSchema = z.object({ id: z.string().uuid() });
const nameSchema = z.string().trim().min(1).max(120);

/**
 * Ficha de soporte de entrenamiento (RF-B3).
 *
 * El rol lo cierra el layout de `/admin`; aquí se pide `support:read`, y
 * `support:respond` sólo decide si el botón de recalcular está activo. El
 * nombre llega por la URL desde la lista de usuarios y es puramente
 * decorativo: lo que se consulta es el id, y el backend limita el alcance.
 */
export default async function UsuarioEntrenamientoPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nombre?: string | string[] }>;
}>) {
  const session = await requireRole(['ADMIN', 'FRONT_DESK']);
  if (!hasPermission(session.permissions, 'support:read')) redirect('/admin?denied=1');

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();
  const name = nameSchema.safeParse((await searchParams).nombre);

  return (
    <SupportTrainingPanel
      canRespond={hasPermission(session.permissions, 'support:respond')}
      displayName={name.success ? name.data : null}
      userId={parsedParams.data.id}
    />
  );
}
