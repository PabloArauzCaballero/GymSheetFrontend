import { apiRequest } from '@/shared/api/api-client';
import type { TutorialProgressRecord, TutorialProgressUpsert } from '@/shared/api/contracts';
import { tutorialProgressListSchema, tutorialProgressRecordSchema } from '@/shared/api/schemas';

/**
 * Thin client for the backend tutorial-progress contract. All calls go through
 * the BFF (`/api/backend/*`) so the JWT stays in the HttpOnly cookie. See
 * `docs/tutorials.md` for the endpoint contract the backend must implement.
 */
export const tutorialProgressService = {
  list: () =>
    apiRequest<TutorialProgressRecord[]>('/me/tutorial-progress', tutorialProgressListSchema),

  upsert: (tutorialId: string, input: TutorialProgressUpsert) =>
    apiRequest<TutorialProgressRecord>(
      `/me/tutorial-progress/${encodeURIComponent(tutorialId)}`,
      tutorialProgressRecordSchema,
      { method: 'PUT', body: input },
    ),

  reset: (tutorialId: string) =>
    apiRequest<TutorialProgressRecord[]>(
      `/me/tutorial-progress/${encodeURIComponent(tutorialId)}`,
      tutorialProgressListSchema,
      { method: 'DELETE' },
    ),
};
