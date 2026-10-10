/**
 * Colores con un solo dueño (medallas, celebración, historias, chat…).
 *
 * No son roles del sistema: son ilustración o convenciones ajenas (el azul del
 * «leído» de un chat). Viven aquí para que `check-theme` siga a cero fuera de
 * `src/theme/` y para que quien los cambie vea el resto de la paleta.
 */
import { alpha, ink } from './palette';

/* ─── Podio (rank-badge) ─────────────────────────────────────────────────── */

/**
 * Oro, plata y bronce: metales, no la paleta de la marca; se repiten igual sea
 * cual sea el gimnasio activo.
 */
export const medalColors = {
  gold: '#F4C430',
  silver: '#C7CDD6',
  bronze: '#CE8946',
  /** Glifo encima de cualquiera de los tres metales. */
  icon: '#241A05',
} as const;

/* ─── Celebración (cartas de logro) ──────────────────────────────────────── */

/** Arcoíris de las cartas holográficas: chispas y brillo. */
const rainbow = {
  pink: '#FF7AB6',
  yellow: '#FFD84D',
  mint: '#6BFFB8',
  sky: '#5CC8FF',
  violet: '#B98CFF',
} as const;

export const celebrationPalette = {
  /** Superficie interior de las dos caras: casi negra, con un punto de azul frío. */
  faceInk: '#0C0D12',
  /** Texto del sello, encima del degradado del marco. */
  stampInk: '#111216',
  /** Luz pura: destello, contorno del sello, título sobre el pie oscuro. */
  light: ink.white,
  /** Pie de la carta, detrás del título. */
  footerScrim: alpha(ink.black, 0.55),
  rainbow: [rainbow.pink, rainbow.yellow, rainbow.mint, rainbow.sky, rainbow.violet] as const,
  /** Paradas del brillo holográfico. */
  sheen: {
    clear: alpha(ink.white, 0),
    rainbow: [
      alpha(ink.white, 0),
      alpha(rainbow.pink, 0.28),
      alpha(rainbow.yellow, 0.34),
      alpha(ink.white, 0.5),
      alpha(rainbow.mint, 0.32),
      alpha(rainbow.sky, 0.3),
      alpha(rainbow.violet, 0.26),
      alpha(ink.white, 0),
    ] as const,
    softPeak: alpha(ink.white, 0.45),
    plainPeak: alpha(ink.white, 0.3),
  },
} as const;

/**
 * Fondos de escenario (celebración y cortinilla de arranque): casi negros, no
 * negros. Un haz de luz sobre `#000` puro no tiene aire que iluminar y en OLED
 * el degradado se corta con borde visible.
 */
export const stageBackground = {
  celebration: '#050507',
  brandIntro: '#050505',
} as const;

/** Barrido de luz del emblema de arranque: blanco puro, transparente en los extremos. */
export const brandIntroSweep = [alpha(ink.white, 0), alpha(ink.white, 0.8), alpha(ink.white, 0)] as const;

/** Cifra protagonista (cronómetro de cardio): fuera de la rampa a propósito. */
export const heroNumberFontSize = 44;

/* ─── Historias ──────────────────────────────────────────────────────────── */

export const storyChrome = {
  /** Fondo del visor detrás de la historia que se arrastra. */
  backdrop: ink.black,
} as const;

/* ─── Chat ───────────────────────────────────────────────────────────────── */

export const chatColors = {
  /** «Leído»: WhatsApp volvió el check azul un color universal, ajeno a la marca. */
  readTick: '#34b7f1',
  // Los metadatos de la burbuja propia salen de `alpha(accentContrast(), n)`
  // en la pantalla: la tinta depende de la marca.
} as const;

/* ─── Fondo ambiente ─────────────────────────────────────────────────────── */

export const ambientColors = {
  /** Onda superior: casi blanco, no el acento (el color saturado es de la acción). */
  waveTop: '#e8f0d8',
  /** Onda inferior, sobre la barra de pestañas. */
  waveBottom: '#9fb6bf',
  /** Luz de contraste fija que da volumen al fondo. */
  glowCounter: '#786eff',
} as const;

/* ─── Mapa corporal ──────────────────────────────────────────────────────── */

export const bodyMapColors = {
  /** Contorno de las regiones del músculo resaltado (se usa con opacidad 0,5). */
  highlightStroke: ink.white,
  /** Fondo del chip activo sobre el vidrio. */
  chipActive: alpha(ink.white, 0.16),
} as const;
