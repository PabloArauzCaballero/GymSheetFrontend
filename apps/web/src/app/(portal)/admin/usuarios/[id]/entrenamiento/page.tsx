import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { SupportTrainingPanel } from '@/features/support-training/components/support-training-panel';
import { requireRole } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Entrenamiento del socio' };

const paramsSchema = z.object({ id: z.string().uuid() });
const nameSchema = z.string().trim().min(1).max(120);

/**
 * Ficha de soporte de entrenamiento (RF-B3).
 *
 * El rol lo cierra el layout de `/admin` (`SYSTEM_ADMIN`): since franja 7d
 * there are no permission grants (backend ADR-0029), the role is enough. El
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
  await requireRole(['SYSTEM_ADMIN']);

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();
  const name = nameSchema.safeParse((await searchParams).nombre);

  return (
    <SupportTrainingPanel
      displayName={name.success ? name.data : null}
      userId={parsedParams.data.id}
    />
  );
}
