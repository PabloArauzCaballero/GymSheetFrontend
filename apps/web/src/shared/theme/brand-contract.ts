/**
 * Contrato de marca: lo que identifica a un inquilino más allá del color.
 *
 * Nombre, marca gráfica y tipografía se eligen de conjuntos cerrados en vez de
 * aceptar valores libres. Un SVG arbitrario venido de configuración habría que
 * incrustarlo en el documento —con el riesgo que eso trae— y además podría
 * romper la composición al no respetar el encuadre; una familia tipográfica
 * libre exigiría descargarla en tiempo de ejecución, con salto visual al
 * cargar. Elegir de un catálogo mantiene ambas cosas bajo control.
 */

/** Glifos disponibles para la marca gráfica. */
export const brandIconKeys = [
  'dumbbell',
  'activity',
  'flame',
  'zap',
  'heart-pulse',
  'shield',
  'target',
  'mountain',
] as const;
export type BrandIconKey = (typeof brandIconKeys)[number];

/**
 * Tipografías disponibles. Todas son sans neo-grotescas de rasgo cerrado: el
 * cambio se percibe como otra marca, no como otro producto.
 */
export const brandFontKeys = ['hanken', 'inter', 'manrope'] as const;
export type BrandFontKey = (typeof brandFontKeys)[number];

export type TenantBrand = {
  /** Nombre del gimnasio; encabeza títulos, manifiesto y atribución de medios. */
  readonly name: string;
  /** Rótulo junto a la marca gráfica; suele ir en versales. */
  readonly wordmark: string;
  /** Monograma para espacios reducidos (2–3 caracteres). */
  readonly monogram: string;
  readonly icon: BrandIconKey;
  readonly font: BrandFontKey;
};

/** Variable que resuelve la tipografía activa. */
export const FONT_VARIABLE = '--font-app';

/**
 * Variable CSS que declara cada familia. Vive aquí, sin tocar `next/font`,
 * porque el generador de la hoja de tema también se usa en el cliente (pantalla
 * de error crítico) y `next/font` sólo puede resolverse en compilación.
 * `brand-fonts.ts` es quien carga las familias y debe declarar estas mismas
 * variables.
 */
export const fontVariableByKey: Record<BrandFontKey, string> = {
  hanken: 'var(--font-hanken)',
  inter: 'var(--font-inter)',
  manrope: 'var(--font-manrope)',
};

export const defaultBrand: TenantBrand = {
  name: 'GymSheet',
  wordmark: 'GYMSHEET',
  monogram: 'GS',
  icon: 'dumbbell',
  font: 'hanken',
};

/**
 * Sustituye el marcador `{marca}` en textos de producto. Permite que las copias
 * (tutoriales, avisos) nombren al gimnasio sin que cada definición conozca al
 * inquilino.
 */
export function applyBrandCopy(text: string, brand: TenantBrand): string {
  return text.replaceAll('{marca}', brand.name);
}
