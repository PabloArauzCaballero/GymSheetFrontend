/* eslint-disable @typescript-eslint/no-require-imports -- Metro resuelve los recursos estáticos con require(). */
/**
 * Las cuatro láminas, renderizadas con la misma cámara que las zonas de
 * `regions.generated.ts`: por eso una zona cae exactamente sobre el músculo que
 * dibuja la imagen. Se regeneran con `tools/anatomy`.
 */
export const IMAGES = {
  'surface-front': require('../../../assets/anatomy/surface-front.webp'),
  'surface-back': require('../../../assets/anatomy/surface-back.webp'),
  'deep-front': require('../../../assets/anatomy/deep-front.webp'),
  'deep-back': require('../../../assets/anatomy/deep-back.webp'),
} as const;

export type ImageTag = keyof typeof IMAGES;
