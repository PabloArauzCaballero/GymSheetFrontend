import { z } from 'zod';
import { apiRequest, apiUpload } from '@/shared/api/api-client';
import type { ProfilePhoto } from '@/shared/api/contracts';
import { profilePhotoSchema } from '@/shared/api/schemas';

const deletedSchema = z.object({ deleted: z.literal(true) });

/** Galería de fotos de perfil del socio. No es la mediateca administrada por el gimnasio (`/admin/media`). */
export const profilePhotosService = {
  list: () => apiRequest<ProfilePhoto[]>('/me/photos', z.array(profilePhotoSchema)),
  upload: (file: Blob, fileName: string) => {
    const form = new FormData();
    form.append('file', file, fileName);
    return apiUpload<ProfilePhoto>('/me/photos', profilePhotoSchema, form);
  },
  remove: (photoId: string) =>
    apiRequest(`/me/photos/${photoId}`, deletedSchema, { method: 'DELETE' }),
};
