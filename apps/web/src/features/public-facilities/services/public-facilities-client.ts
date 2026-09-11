import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import { publicBranchSummarySchema } from '@/shared/api/schemas';
import type { PublicBranchSummary } from '@/shared/api/schemas';

/**
 * Cliente ('use client') del directorio público de sucursales. Separado de
 * `public-facilities-server.ts` a propósito: ese usa `backendRequest` para
 * componentes de servidor; esto pasa por el BFF (`apiRequest`) como el resto
 * de las llamadas hechas desde el navegador.
 */
export const publicFacilitiesClient = {
  branches: () =>
    apiRequest<PublicBranchSummary[]>(
      '/public/facilities/branches',
      z.array(publicBranchSummarySchema),
    ),
  /**
   * Las sedes del gimnasio de quien pregunta, no las de todas las marcas.
   *
   * Es la que tiene que alimentar el filtro por sucursal del directorio de
   * socios. El directorio (`/me/gym-directory`) está acotado al gimnasio
   * propio, así que ofrecer sedes ajenas es ofrecer filtros que siempre
   * devuelven cero: contra esta base son 9 sedes públicas frente a 1 propia,
   * es decir ocho opciones que no pueden dar resultado. El móvil ya usa ésta.
   */
  myBranches: () =>
    apiRequest<PublicBranchSummary[]>(
      '/me/facilities/branches',
      z.array(publicBranchSummarySchema),
    ),
};
