import { z } from 'zod';
import { apiRequest, apiUpload } from '@/shared/api/api-client';
import type { MediaFile } from '@/shared/api/contracts';
import { mediaFileSchema } from '@/shared/api/schemas';

/**
 * Repositorio de medios administrado por el gimnasio. La carga responde con el
 * archivo y su ubicación de almacenamiento; aquí solo interesa el archivo, que
 * es lo que se referencia desde un plan.
 */
const uploadResponseSchema = z.object({
  archivo: mediaFileSchema,
  almacenamiento: z
    .object({
      proveedor: z.string(),
      reutilizado: z.boolean(),
      bytes: z.number().int(),
    })
    .loose(),
});

export type MediaUploadInput = {
  file: Blob;
  fileName: string;
  /** Clave natural en kebab-case: subir con el mismo código reemplaza la imagen. */
  codigo: string;
  nombre: string;
  altText: string;
  licencia?: string;
  atribucion?: string;
  width?: number;
  height?: number;
};

export const mediaAdminService = {
  list: (limit = 50) =>
    apiRequest<MediaFile[]>(`/admin/media?limit=${limit}`, z.array(mediaFileSchema)),
  upload: async (input: MediaUploadInput): Promise<MediaFile> => {
    const form = new FormData();
    form.append('file', input.file, input.fileName);
    form.append('code', input.codigo);
    form.append('name', input.nombre);
    form.append('altText', input.altText);
    form.append('license', input.licencia ?? 'Propietaria');
    form.append('attribution', input.atribucion ?? 'GymSheet');
    // El backend exige ancho y alto juntos o ninguno.
    if (input.width && input.height) {
      form.append('width', String(input.width));
      form.append('height', String(input.height));
    }
    const response = await apiUpload('/admin/media', uploadResponseSchema, form);
    return response.archivo;
  },
};

/**
 * Código estable para la imagen de un plan. Derivarlo del código del plan hace
 * que reemplazar el QR sea idempotente: la segunda carga sobrescribe la pieza
 * en lugar de acumular archivos huérfanos.
 */
export function planImageCode(planCode: string): string {
  const slug = planCode
    .toLowerCase()
    .normalize('NFD')
    // Descompuesta la cadena, se descartan las marcas diacríticas combinantes.
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return `qr-plan-${slug || 'sin-codigo'}`;
}
