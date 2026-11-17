import { ApiError, createCoachGymLinksServices, createGymAffiliationsServices, createPersonAffiliationsServices } from '@gymsheet/api-client';
import { affiliationErrorMessage, gymMembershipGate, type GymGateStatus } from '@gymsheet/domain';
import { apiClient } from '@/api/client';

/** The person's affiliations and «Mi gimnasio», the gym's «Socios» and the coach's «Mis gimnasios»: the same shared services as the web. */
export const personAffiliationsService = createPersonAffiliationsServices(apiClient.request);
export const gymAffiliationsService = createGymAffiliationsServices(apiClient.request);
export const coachGymLinksService = createCoachGymLinksServices(apiClient.request);

/** The Spanish text of an affiliation error; `requesting` reads a bare 404 as «that gym is not public». */
export function affiliationErrorText(error: unknown, requesting = false): string {
  if (error instanceof ApiError) return affiliationErrorMessage(error.code, error.message, error.details, requesting ? error.status : undefined);
  return error instanceof Error ? error.message : 'Algo salió mal. Vuelve a intentarlo.';
}

/** `403 GYM_MEMBERSHIP_REQUIRED` as a screen state, or null for any other outcome. */
export function gymGateOf(error: unknown): GymGateStatus | null {
  return error instanceof ApiError ? gymMembershipGate(error) : null;
}

export function errorCodeOf(error: unknown): string | null {
  return error instanceof ApiError ? (error.code ?? null) : null;
}
