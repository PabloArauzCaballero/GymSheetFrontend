/**
 * Movimiento (C8.1): muelles sobreamortiguados de `repp-diseno`, rebote solo
 * en logros, y con «reducir movimiento» todo pasa a fundido. Las piezas que
 * usan Reanimated están en `components/motion.tsx`; aquí viven los números.
 */
export const motion = {
  /** Respuesta al toque, cambios de color. */
  instant: 120,
  /** Entrada de un toast o tarjeta. */
  enter: 220,
  /** Salida: más rápida que la entrada. */
  exit: 160,
} as const;

/** Hundimiento al pulsar: superficies anchas, botones e iconos pequeños. */
export const pressScale = {
  surface: 0.97,
  button: 0.955,
  icon: 0.92,
} as const;

/** Muelle del toque (sin rebote). */
export const pressSpring = { damping: 26, stiffness: 340, mass: 0.5, overshootClamping: true } as const;
/**
 * Soltar: el botón vuelve con un rebote corto (≈ 1,5 % de pasada). Es la
 * respuesta física al dedo que se levanta; sin él, el control «se apaga» en vez
 * de devolver el empujón. Solo en controles, no en superficies que viajan.
 */
export const releaseSpring = { damping: 13, stiffness: 420, mass: 0.6 } as const;
/** Asentarse: entrada de hojas y paneles. */
export const settleSpring = { damping: 24, stiffness: 220, mass: 0.7, overshootClamping: true } as const;
/** Deslizar: indicadores de segmento, cambios de posición. */
export const glideSpring = { damping: 28, stiffness: 260, mass: 0.8, overshootClamping: true } as const;
/** Solo logros (récord, celebración): el único rebote permitido. */
export const celebrateSpring = { damping: 12, stiffness: 180, mass: 0.8 } as const;
/**
 * Golpe de una microinteracción social (estrella que se rellena, «me gusta»):
 * rebasa un poco y vuelve. Es la respuesta a un toque que cambia un dato de la
 * comunidad, no un control de navegación; por eso sí lleva carácter.
 */
export const popSpring = { damping: 11, stiffness: 320, mass: 0.6 } as const;
/** Retardo entre elementos de una entrada o de una cascada (estrellas, filas). */
export const stagger = 45;
