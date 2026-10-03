import type { BodyLayer, BodyView } from '@gymsheet/anatomy';

/**
 * Ruta pública de cada lámina. Son copia de `apps/mobile/assets/anatomy`: un
 * test (`images.test.ts`) falla si las dos copias dejan de ser idénticas.
 */
export function anatomyImage(layer: BodyLayer, view: BodyView) {
  return `/anatomy/${layer}-${view}.webp`;
}
