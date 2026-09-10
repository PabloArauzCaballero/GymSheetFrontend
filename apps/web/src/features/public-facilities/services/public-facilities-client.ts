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
};
