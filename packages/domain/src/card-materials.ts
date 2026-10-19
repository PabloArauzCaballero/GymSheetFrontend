/**
 * Tintas de las cartas de logro por rareza: la única fuente de color.
 *
 * Las define el móvil (`apps/mobile/src/theme/cards.ts` las compone con sus
 * transparencias) y la web las hereda de aquí: antes cada plataforma tenía las
 * suyas y una rara era zafiro en el teléfono y azul eléctrico en la web.
 *
 * Contrastes medidos sobre la cara de la carta (`#0A0B10`) en el test de
 * contraste del móvil: el rótulo siempre ≥ 7:1.
 */
export type CardMaterialRarity = 'COMUN' | 'RARA' | 'EPICA' | 'LEGENDARIA';

export type CardMaterialInks = Readonly<{
  /** Marco: de la arista iluminada a la arista en sombra. */
  frame: readonly [string, string, string, string];
  /** Fondo del arte, de arriba abajo. */
  art: readonly [string, string, string];
  /** Luz detrás de la ilustración, partículas y rayos. */
  glow: string;
  /** Rótulo de rareza y cifra de puntos. */
  label: string;
  /** Sombra de color bajo la carta. */
  shadow: string;
}>;

export const CARD_MATERIAL_INKS: Readonly<Record<CardMaterialRarity, CardMaterialInks>> = {
  /** Jade: fresca y viva, nunca gris. */
  COMUN: {
    frame: ['#E9FFF6', '#5FE3B5', '#149A78', '#0A4A3D'],
    art: ['#0E5C4C', '#0A3A33', '#081B1A'],
    glow: '#63F2C1',
    label: '#8DF5D2', // 13,9:1 sobre la cara
    shadow: '#19C79A',
  },
  /** Zafiro. */
  RARA: {
    frame: ['#E6F4FF', '#62B4FF', '#2166E0', '#102A7A'],
    art: ['#1B4FB8', '#102F7C', '#0A1433'],
    glow: '#6CBBFF',
    label: '#A9D6FF', // 12,4:1
    shadow: '#2F86FF',
  },
  /** Amatista con vetas magenta. */
  EPICA: {
    frame: ['#FBE9FF', '#D07BFF', '#8A36E8', '#3C1380'],
    art: ['#7B2BD6', '#48189A', '#170A38'],
    glow: '#D592FF',
    label: '#E7C2FF', // 12,1:1
    shadow: '#A64DFF',
  },
  /** Oro. */
  LEGENDARIA: {
    frame: ['#FFFBE0', '#FFD86B', '#E79A1C', '#7A4208'],
    art: ['#C97A10', '#7C3F0A', '#241204'],
    glow: '#FFE08A',
    label: '#FFE7A3', // 15,6:1
    shadow: '#FFB02E',
  },
};
