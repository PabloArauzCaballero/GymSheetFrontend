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
// Ruta directa (sin el barril): este archivo lo cargan también scripts de Node sin resolutor.
import { CARD_MATERIAL_INKS } from '@gymsheet/domain/card-materials';
import { alpha, ink } from './palette.ts';

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

/**
 * Las tintas por rareza viven en `@gymsheet/domain` (`CARD_MATERIAL_INKS`) para
 * que la web pinte la misma carta; aquí solo se componen las transparencias.
 */
const inks = CARD_MATERIAL_INKS;

export const cardMaterials: Readonly<Record<CardRarityKey, CardMaterial>> = {
  /** Jade: fresca y viva, nunca gris. */
  COMUN: {
    ...inks.COMUN,
    pattern: alpha(inks.COMUN.label, 0.1),
    foil: [clear, alpha(ink.white, 0.34), clear],
    gems: 1,
  },
  /** Zafiro. */
  RARA: {
    ...inks.RARA,
    pattern: alpha(inks.RARA.label, 0.11),
    foil: [clear, alpha('#BFE3FF', 0.3), alpha(ink.white, 0.5), alpha('#BFE3FF', 0.3), clear],
    gems: 2,
  },
  /** Amatista con vetas magenta. */
  EPICA: {
    ...inks.EPICA,
    pattern: alpha('#F2B6FF', 0.12),
    foil: [clear, alpha('#FF8AD8', 0.3), alpha(ink.white, 0.55), alpha('#9D8CFF', 0.34), clear],
    gems: 3,
  },
  /** Oro con foil arcoíris. */
  LEGENDARIA: {
    ...inks.LEGENDARIA,
    pattern: alpha(inks.LEGENDARIA.label, 0.14),
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

// Las tintas viven en `packages/design-tokens/src/art.ts`: la web dibuja a Repi con las mismas.
export { artHues, artShadow, artSpark, type ArtHue, type ArtHueName } from '@gymsheet/design-tokens/art';

/** Marca REPP sobre el dorso de las cartas y sobre fondos oscuros. */
export const brandMarkInk = {
  onDark: ink.white,
  cut: '#0A0B10',
} as const;
