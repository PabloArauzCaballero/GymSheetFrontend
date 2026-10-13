/**
 * Cartas de logro: materiales por rareza y tintas de las ilustraciones.
 *
 * Dos ejes independientes, a propósito:
 * - la **rareza** decide el material de la carta (marco, fondo del arte, foil,
 *   sombra): se reconoce de lejos y sube en todos los ejes a la vez;
 * - el **motivo** decide los colores de la ilustración (una llama es naranja en
 *   una común y en una legendaria): es lo que hace que ochenta cartas no sean
 *   la misma carta con otro icono.
 *
 * Todo lo que es texto va sobre `face` (casi negro) o sobre el pie: los pares
 * están medidos en `contrast.test.ts`.
 */
import { alpha, ink } from './palette';

export type CardRarityKey = 'COMUN' | 'RARA' | 'EPICA' | 'LEGENDARIA';

export type CardMaterial = Readonly<{
  /** Marco: de la arista iluminada a la arista en sombra. */
  frame: readonly [string, string, string, string];
  /** Fondo del arte, de arriba abajo. */
  art: readonly [string, string, string];
  /** Luz detrás de la ilustración. */
  glow: string;
  /** Rótulo de rareza y cifra de puntos sobre el pie. ≥ 7:1 sobre `face`. */
  label: string;
  /** Trama del arte (líneas finas). */
  pattern: string;
  /** Sombra de color bajo la carta. */
  shadow: string;
  /** Paradas del foil que cruza la carta. */
  foil: readonly [string, string, ...string[]];
  /** Gemas del rótulo: cuántas se encienden (1–4). */
  gems: 1 | 2 | 3 | 4;
}>;

const clear = alpha(ink.white, 0);

export const cardMaterials: Readonly<Record<CardRarityKey, CardMaterial>> = {
  /** Jade: fresca y viva, nunca gris. */
  COMUN: {
    frame: ['#E9FFF6', '#5FE3B5', '#149A78', '#0A4A3D'],
    art: ['#0E5C4C', '#0A3A33', '#081B1A'],
    glow: '#63F2C1',
    label: '#8DF5D2', // 13,9:1 sobre face
    pattern: alpha('#8DF5D2', 0.1),
    shadow: '#19C79A',
    foil: [clear, alpha(ink.white, 0.34), clear],
    gems: 1,
  },
  /** Zafiro. */
  RARA: {
    frame: ['#E6F4FF', '#62B4FF', '#2166E0', '#102A7A'],
    art: ['#1B4FB8', '#102F7C', '#0A1433'],
    glow: '#6CBBFF',
    label: '#A9D6FF', // 12,4:1
    pattern: alpha('#A9D6FF', 0.11),
    shadow: '#2F86FF',
    foil: [clear, alpha('#BFE3FF', 0.3), alpha(ink.white, 0.5), alpha('#BFE3FF', 0.3), clear],
    gems: 2,
  },
  /** Amatista con vetas magenta. */
  EPICA: {
    frame: ['#FBE9FF', '#D07BFF', '#8A36E8', '#3C1380'],
    art: ['#7B2BD6', '#48189A', '#170A38'],
    glow: '#D592FF',
    label: '#E7C2FF', // 12,1:1
    pattern: alpha('#F2B6FF', 0.12),
    shadow: '#A64DFF',
    foil: [clear, alpha('#FF8AD8', 0.3), alpha(ink.white, 0.55), alpha('#9D8CFF', 0.34), clear],
    gems: 3,
  },
  /** Oro con foil arcoíris. */
  LEGENDARIA: {
    frame: ['#FFFBE0', '#FFD86B', '#E79A1C', '#7A4208'],
    art: ['#C97A10', '#7C3F0A', '#241204'],
    glow: '#FFE08A',
    label: '#FFE7A3', // 15,6:1
    pattern: alpha('#FFE7A3', 0.14),
    shadow: '#FFB02E',
    foil: [
      clear,
      alpha('#FF7AB6', 0.34),
      alpha('#FFD84D', 0.4),
      alpha(ink.white, 0.6),
      alpha('#6BFFB8', 0.36),
      alpha('#5CC8FF', 0.34),
      alpha('#B98CFF', 0.3),
      clear,
    ],
    gems: 4,
  },
};

/** Superficie interior de la carta y del dorso. */
export const cardFace = {
  ink: '#0A0B10',
  /** Pie de la carta: vidrio oscuro sobre el arte. */
  footer: alpha('#06070B', 0.78),
  /** Título sobre el pie. 18:1. */
  title: ink.white,
  /** Filo interior del marco (luz arriba, sombra abajo). */
  bevelLight: alpha(ink.white, 0.55),
  bevelDark: alpha(ink.black, 0.45),
  /** Carta velada (secreta o aún sin conseguir). */
  veil: alpha('#06070B', 0.62),
  veilInk: '#9AA3B5',
} as const;

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
  volt: { light: '#F1FFB0', main: '#C3F400', deep: '#7FA800', ink: '#2C3B00' },
  steel: { light: '#F2F6FB', main: '#B4C0D0', deep: '#6B7890', ink: '#232B3A' },
  cream: { light: ink.white, main: '#FFF3DC', deep: '#E6CFA6', ink: '#5B4520' },
} as const satisfies Record<string, ArtHue>;

export type ArtHueName = keyof typeof artHues;

/** Chispa y trazos de luz sobre cualquier ilustración. */
export const artSpark = ink.white;
/** Sombra de contacto bajo los objetos. */
export const artShadow = alpha(ink.black, 0.28);

/** Marca REPP sobre el dorso de las cartas y sobre fondos oscuros. */
export const brandMarkInk = {
  onDark: ink.white,
  cut: '#0A0B10',
} as const;
