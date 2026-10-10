import {
  createCardioServices,
  createCatalogServices,
  createCommunityServices,
  createProgramServices,
  createSharingServices,
} from '@gymsheet/api-client';
import { apiRequest } from '@/shared/api/api-client';

/**
 * Los servicios de las rutinas REPP (F3 a F6), todos sobre el mismo transporte
 * del navegador: `apiRequest` habla con el BFF y valida cada respuesta con los
 * esquemas compartidos. Son los mismos servicios que usa el móvil.
 */
export const catalogService = createCatalogServices(apiRequest);
export const sharingService = createSharingServices(apiRequest);
export const communityService = createCommunityServices(apiRequest);
export const programService = createProgramServices(apiRequest);
export const cardioService = createCardioServices(apiRequest);
