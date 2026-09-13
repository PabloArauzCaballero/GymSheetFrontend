import type { Metadata } from 'next';
import { DescubrirClient } from '@/features/social/components/descubrir-client';

export const metadata: Metadata = { title: 'Descubrir' };

/**
 * La baraja como destino propio, no como pestaña de Comunidad.
 *
 * Los filtros llegan por la URL y no por estado compartido: es lo que permite
 * que «Descubrir» desde Comunidad se lleve el gimnasio ya acotado, y de paso
 * que la baraja filtrada se pueda guardar en marcadores o recargar sin volver
 * al ajuste por defecto.
 */
export default async function DescubrirPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const single = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? '';
  return (
    <DescubrirClient
      genero={single(params.genero)}
      objetivo={single(params.objetivo)}
      sucursalId={single(params.sucursalId)}
    />
  );
}
