/* eslint-disable @typescript-eslint/no-require-imports -- Metro resuelve los recursos estáticos con require(). */
import { PixelRatio } from 'react-native';

/**
 * Las cuatro láminas, renderizadas con la misma cámara que las zonas de
 * `regions.generated.ts`: por eso una zona cae exactamente sobre el músculo que
 * dibuja la imagen. Se regeneran con `tools/anatomy`.
 *
 * Dos tamaños con la misma proporción (1:2), así que las zonas (en su propio
 * `viewBox` de 1000×2000) cuadran igual con cualquiera:
 * - `IMAGES`: 1536×3072, para la figura interactiva y los recortes muy acercados.
 * - `IMAGES_SMALL`: 512×1024, para miniaturas y tarjetas (≈2 MB decodificada
 *   frente a ≈19 MB de la grande).
 */
export const IMAGES = {
  'surface-front': require('../../../assets/anatomy/surface-front.webp'),
  'surface-back': require('../../../assets/anatomy/surface-back.webp'),
  'deep-front': require('../../../assets/anatomy/deep-front.webp'),
  'deep-back': require('../../../assets/anatomy/deep-back.webp'),
} as const;

export const IMAGES_SMALL = {
  'surface-front': require('../../../assets/anatomy/small/surface-front.webp'),
  'surface-back': require('../../../assets/anatomy/small/surface-back.webp'),
  'deep-front': require('../../../assets/anatomy/small/deep-front.webp'),
  'deep-back': require('../../../assets/anatomy/small/deep-back.webp'),
} as const;

export type ImageTag = keyof typeof IMAGES;

/** Ancho en píxeles de `IMAGES_SMALL`. */
const SMALL_WIDTH = 512;
/** Cuánto se tolera ampliar la pequeña antes de pasar a la grande (no se nota en una lámina así). */
const SMALL_UPSCALE = 1.25;

/**
 * La lámina que basta para pintarla a `widthPt` puntos de ancho (el ancho de la
 * figura entera, no el del marco: un recorte acercado necesita la grande).
 */
export function anatomyImage(tag: ImageTag, widthPt: number): { source: (typeof IMAGES)[ImageTag]; recyclingKey: string } {
  const small = widthPt * PixelRatio.get() <= SMALL_WIDTH * SMALL_UPSCALE;
  return { source: small ? IMAGES_SMALL[tag] : IMAGES[tag], recyclingKey: `${tag}-${small ? 's' : 'l'}` };
}
