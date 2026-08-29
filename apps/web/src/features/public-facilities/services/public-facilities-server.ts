import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import type { PublicBranchDetail, PublicBranchSummary } from '@/shared/api/schemas';
import { publicBranchDetailSchema, publicBranchSummarySchema } from '@/shared/api/schemas';
import { backendRequest, readBackendJson } from '@/shared/server/backend';

/**
 * El directorio público se renderiza en el servidor (es la única parte del
 * producto pensada para indexarse) y llama al backend directo, sin pasar por
 * `/api/backend`: esa ruta exige la cookie de sesión, y estas páginas no
 * tienen ni necesitan una.
 */
const envelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

async function readData<T>(response: Response, schema: z.ZodType<T>): Promise<T | null> {
  if (!response.ok) return null;
  const envelope = envelopeSchema.safeParse(await readBackendJson(response));
  if (!envelope.success) return null;
  const parsed = schema.safeParse(envelope.data.data);
  return parsed.success ? parsed.data : null;
}

export async function listPublicBranches(filters: {
  search?: string;
  servicio?: string;
}): Promise<PublicBranchSummary[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.servicio) params.set('servicio', filters.servicio);
  params.set('limit', '50');
  const response = await backendRequest(`/public/facilities/branches?${params.toString()}`);
  const branches = await readData(response, z.array(publicBranchSummarySchema));
  if (!branches) {
    // Un fallo de red, backend o contrato no es un directorio vacío. Lanzarlo
    // activa la superficie de error reintentable del App Router y evita que la
    // landing y `/gimnasios` afirmen silenciosamente que no existen sedes.
    throw new Error('No se pudo cargar el directorio público de gimnasios.');
  }
  return branches;
}

/**
 * `cache()` de React: `generateMetadata` y la página piden la misma sede por
 * separado, y sin deduplicar, Next puede confirmar la respuesta 200 desde la
 * fase de metadata antes de que la página llegue a llamar `notFound()` —
 * el contenido sale correcto, pero el código de estado queda mal (soft 404).
 */
export const getPublicBranch = cache(async (id: string): Promise<PublicBranchDetail | null> => {
  const response = await backendRequest(`/public/facilities/branches/${id}`);
  return readData(response, publicBranchDetailSchema);
});
