/**
 * Tintas de las ilustraciones de REPP (cartas de logro y Repi), compartidas por
 * el móvil y la web. Sin imports: los scripts de Node que rasterizan el arte la
 * cargan sin resolutor.
 */
/**
 * Tintas de ilustración. Cada una: `light` (brillo), `main`, `deep` (sombra
 * propia) e `ink` (contorno y detalle oscuro).
 */
export type ArtHue = Readonly<{ light: string; main: string; deep: string; ink: string }>;

export const artHues = {
  ember: { light: '#FFD36B', main: '#FF7A2F', deep: '#E23A1E', ink: '#5E1206' },
  sun: { light: '#FFF4B8', main: '#FFD23F', deep: '#F59B0B', ink: '#6B3B00' },
  rose: { light: '#FFC2D6', main: '#FF4F81', deep: '#C81E5B', ink: '#5A0A2A' },
  sky: { light: '#C8ECFF', main: '#3FB2FF', deep: '#1767D6', ink: '#0A2A66' },
  mint: { light: '#C9FFE6', main: '#36DFA0', deep: '#0E9B74', ink: '#04423A' },
  violet: { light: '#EAD2FF', main: '#A66BFF', deep: '#6630D6', ink: '#27106B' },
  /** El tono de la marca en las ilustraciones (jade REPP; la clave se conserva). */
  volt: { light: '#C4F3E8', main: '#3FBFA6', deep: '#2E8B7B', ink: '#0B3A33' },
  steel: { light: '#F2F6FB', main: '#B4C0D0', deep: '#6B7890', ink: '#232B3A' },
  cream: { light: '#FFFFFF', main: '#FFF3DC', deep: '#E6CFA6', ink: '#5B4520' },
} as const satisfies Record<string, ArtHue>;

export type ArtHueName = keyof typeof artHues;

/** Chispa y trazos de luz sobre cualquier ilustración. */
export const artSpark = '#FFFFFF';
/** Sombra de contacto bajo los objetos. */
export const artShadow = 'rgba(0, 0, 0, 0.28)';
