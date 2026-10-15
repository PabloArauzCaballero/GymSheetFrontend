/**
 * Colores con un solo dueño (medallas, celebración, historias, chat…).
 *
 * No son roles del sistema: son ilustración o convenciones ajenas (el azul del
 * «leído» de un chat). Viven aquí para que `check-theme` siga a cero fuera de
 * `src/theme/` y para que quien los cambie vea el resto de la paleta.
 */
import { alpha, ink, metricInk } from './palette';

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
  brandIntro: '#0F172A',
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

/* ─── Rutinas: portadas, avatares y estadísticas ─────────────────────────── */

/**
 * Velo de una portada a sangre: transparente arriba, el lienzo abajo. El texto
 * blanco que va encima del último tramo mide ≥ 12:1 sobre `#0c0c0b`; el tramo
 * medio (0,72) mantiene ≥ 4,5:1 aunque la foto sea blanca debajo.
 */
export const heroScrim = {
  colors: [alpha('#0c0c0b', 0), alpha('#0c0c0b', 0.18), alpha('#0c0c0b', 0.72), '#0c0c0b'] as const,
  locations: [0, 0.35, 0.72, 1] as const,
};

/** Velo superior: que los botones flotantes se lean sobre una foto clara. */
export const heroTopScrim = [alpha(ink.black, 0.45), alpha(ink.black, 0)] as const;

/** Botón redondo de vidrio sobre una imagen (volver, ⋯). */
export const glassButton = {
  bg: alpha(ink.black, 0.38),
  border: alpha(ink.white, 0.14),
  ink: ink.white,
} as const;

/** Chip sobre una imagen: vidrio oscuro con texto blanco (≥ 7:1 sobre el peor fondo con el velo). */
export const mediaChip = {
  bg: alpha(ink.black, 0.5),
  border: alpha(ink.white, 0.16),
  text: ink.white,
} as const;

/**
 * Portada de respaldo cuando ningún ejercicio trae imagen: un degradado por
 * objetivo en vez de un hueco gris con una mancuerna. Tonos profundos para que
 * el título blanco mida ≥ 7:1 sobre cualquiera de los dos extremos.
 */
export const goalGradients = {
  HIPERTROFIA: ['#3a1f5c', '#14101f'],
  FUERZA: ['#5c1f1f', '#1a0f0f'],
  RESISTENCIA: ['#123d4f', '#0c161c'],
  PERDIDA_GRASA: ['#5a3412', '#1c120a'],
  SALUD_GENERAL: ['#1d4a2b', '#0d1810'],
  RENDIMIENTO_DEPORTIVO: ['#4b3b12', '#17140a'],
  REHABILITACION: ['#1f3a5c', '#0e1520'],
  DEFAULT: ['#2b2a26', '#11110f'],
} as const satisfies Record<string, readonly [string, string]>;

/**
 * Fondos de las iniciales de un autor sin foto. Cada uno da ≥ 4,5:1 con texto
 * blanco (de 5,0:1 a 6,9:1); el color sale del id para que la misma persona
 * tenga siempre el mismo.
 */
export const avatarHues = [
  '#6d28d9', // violeta 7,1
  '#1d4ed8', // azul 6,7
  '#0f766e', // verde azulado 5,5
  '#b45309', // ámbar 5,0
  '#be185d', // frambuesa 6,0
  '#c2410c', // naranja 5,2
  '#0e7490', // cian 5,4
  '#4d7c0f', // oliva 5,0
] as const;

/** Estrella de la valoración: ámbar cálido, 10,3:1 sobre `surfaceLow`. */
export const ratingStar = '#f5b94a';

/** Franja de luz del esqueleto: blanco casi transparente. */
export const shimmerBand = [alpha(ink.white, 0), alpha(ink.white, 0.09), alpha(ink.white, 0)] as const;

/* ─── Comunidad: comentarios y «me gusta» ────────────────────────────────── */

/** Corazón del «me gusta»: cálido y ajeno a la marca, se reconoce en cualquier gimnasio. */
export const likeHeart = '#ff5d73';

/** Línea de hilo que une un comentario con sus respuestas. */
export const threadLine = alpha(ink.white, 0.12);

/** Velo inferior del pie fijo: el contenido se disuelve en el lienzo bajo el botón. */
export const footerFade = [alpha('#0c0c0b', 0), alpha('#0c0c0b', 0.92), '#0c0c0b'] as const;

/* ─── Ejercicio sin lámina ───────────────────────────────────────────────── */

/**
 * Marcador de un ejercicio que no trae imagen: un degradado profundo por zona
 * del cuerpo (mismo orden que `GROUP_ICON` de `components/media.tsx`) con su
 * icono en marca de agua y las iniciales del ejercicio. Tonos oscuros para que
 * las iniciales blancas midan ≥ 7:1 sobre cualquiera de los dos extremos.
 */
export const muscleGradients = [
  ['#5c1f2b', '#1c0e12'],
  ['#1d4a3a', '#0d1814'],
  ['#1f3a5c', '#0e1520'],
  ['#5a3412', '#1c120a'],
  ['#3a1f5c', '#14101f'],
  ['#123d4f', '#0c161c'],
  ['#4a4416', '#18160b'],
  ['#3d2a4f', '#15101b'],
] as const;

/** Sin zona reconocida. */
export const muscleGradientDefault = ['#2f2e29', '#161614'] as const;

/** Iniciales y marca de agua sobre el marcador. */
export const placeholderInk = { initials: alpha(ink.white, 0.92), watermark: alpha(ink.white, 0.12) } as const;

/* ─── Entreno: color por significado ─────────────────────────────────────── */

/**
 * Cada magnitud del entreno tiene su color, para leer la pantalla sin leer las
 * etiquetas: el peso es azul, las repeticiones violetas, el esfuerzo ámbar, el
 * descanso menta. No son la marca (el volt sigue siendo solo la acción
 * principal) ni cambian con el gimnasio. `ink` es el glifo o la cifra fina
 * sobre una superficie; `tint`, su fondo; `edge`, el filo de lo seleccionado.
 * Las tintas y su contraste (todas ≥ 5,6:1 sobre `surfaceHighest`) están en
 * `palette.ts`, donde las mide la prueba.
 */
function metric(base: string) {
  return { ink: base, tint: alpha(base, 0.14), edge: alpha(base, 0.32) } as const;
}

export const metricColors = {
  weight: metric(metricInk.weight),
  reps: metric(metricInk.reps),
  effort: metric(metricInk.effort),
  rest: metric(metricInk.rest),
  time: metric(metricInk.time),
  streak: metric(metricInk.streak),
  record: metric(metricInk.record),
  volume: metric(metricInk.volume),
  skipped: metric(metricInk.skipped),
} as const;

export type MetricKey = keyof typeof metricColors;

/** Anillo del descanso: de menta (queda tiempo) a ámbar (se acaba) y luz (ya). */
export const restRing = {
  calm: metricColors.rest.ink,
  ending: metricColors.effort.ink,
  track: alpha(ink.white, 0.08),
  glow: alpha(metricColors.rest.ink, 0.18),
} as const;

/* ─── Chat: tinta sobre la burbuja propia ────────────────────────────────── */

/** Fijo — WhatsApp volvió «check azul» un color universal, ajeno a cualquier marca de gimnasio. */
export const readReceiptTick = '#34b7f1';

const bubbleInk = '#0b0f0d';
/** Metadatos (hora, «editado») sobre la burbuja propia, que va en el color de acento. */
export const bubbleInkMuted = alpha(bubbleInk, 0.65);
export const bubbleInkFaint = alpha(bubbleInk, 0.55);

/* ─── Mapa social ────────────────────────────────────────────────────────── */

/** Marcadores y zonas del mapa; el color identifica la capa, no un rol del sistema. */
export const socialMapColors = {
  areaFill: 'rgba(200, 243, 29, 0.18)',
  areaStroke: 'rgba(150, 190, 10, 0.8)',
  peoplePin: '#9bc400',
  gymPin: '#6256d9',
  externalGymPin: '#e58b35',
} as const;
