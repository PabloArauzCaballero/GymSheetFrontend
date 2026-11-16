import { closeAccountResultSchema } from '@gymsheet/schemas';
import { apiRequest } from '@/shared/api/api-client';

/**
 * `POST /admin/users/:id/close`: an ADMIN closes a staff account of their gym.
 * Through the BFF proxy (same-origin, CSRF-checked); the backend decides scope.
 */
export const staffClosureService = {
  close: (userId: string) =>
    apiRequest(`/admin/users/${encodeURIComponent(userId)}/close`, closeAccountResultSchema, { method: 'POST' }),
};
