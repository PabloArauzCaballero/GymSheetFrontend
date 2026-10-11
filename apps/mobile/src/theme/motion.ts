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
  button: 0.97,
  icon: 0.94,
} as const;

/** Muelle del toque (sin rebote). */
export const pressSpring = { damping: 26, stiffness: 340, mass: 0.5, overshootClamping: true } as const;
/** Asentarse: entrada de hojas y paneles. */
export const settleSpring = { damping: 24, stiffness: 220, mass: 0.7, overshootClamping: true } as const;
/** Deslizar: indicadores de segmento, cambios de posición. */
export const glideSpring = { damping: 28, stiffness: 260, mass: 0.8, overshootClamping: true } as const;
/** Solo logros (récord, celebración): el único rebote permitido. */
export const celebrateSpring = { damping: 12, stiffness: 180, mass: 0.8 } as const;
