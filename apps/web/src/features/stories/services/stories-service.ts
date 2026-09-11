import { z } from 'zod';
import { apiRequest, apiUpload } from '@/shared/api/api-client';
import type { Story, StoryFeedEntry, StoryViewersResponse } from '@/shared/api/schemas';
import { storyFeedEntrySchema, storySchema, storyViewersResponseSchema } from '@/shared/api/schemas';

/**
 * Stories efímeras (24 h). Sólo las ven los matches, nunca el gimnasio entero.
 *
 * La subida es el único punto de la web que manda `multipart/form-data`: va por
 * `apiUpload`, que deja que el navegador escriba el `Content-Type` con su
 * `boundary`, y el proxy `/api/backend` reenvía los bytes tal cual. El JWT
 * sigue en la cookie HttpOnly: el navegador nunca habla con el backend.
 */
export const storiesService = {
  feed: () => apiRequest<StoryFeedEntry[]>('/me/stories/feed', z.array(storyFeedEntrySchema)),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiUpload<Story>('/me/stories', storySchema, form);
  },
  view: (storyId: string) =>
    apiRequest(`/me/stories/${storyId}/view`, z.object({ recorded: z.literal(true) }), {
      method: 'POST',
    }),
  /** Quién vio una story propia. El backend responde 404 si es de otra persona. */
  viewers: (storyId: string) =>
    apiRequest<StoryViewersResponse>(`/me/stories/${storyId}/viewers`, storyViewersResponseSchema),
  remove: (storyId: string) =>
    apiRequest(`/me/stories/${storyId}`, z.object({ deleted: z.literal(true) }), {
      method: 'DELETE',
    }),
};

export const storyKeys = {
  feed: ['stories', 'feed'] as const,
  viewers: (storyId: string) => ['stories', 'viewers', storyId] as const,
};
