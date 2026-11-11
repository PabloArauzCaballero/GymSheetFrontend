/**
 * Partitura de la entrada de marca.
 *
 * Todo lo que se mueve en el arranque sale de un solo reloj en milisegundos, y
 * este archivo dice qué vale cada pieza en cada instante. Es matemática pura a
 * propósito: no importa React Native ni Reanimated, así que la secuencia entera
 * se puede probar sin dispositivo, y el componente que la dibuja se limita a
 * leerla.
 *
 * **La idea.** GymSheet es una planilla de entrenamiento, y lo que una planilla
 * registra es progresión: cada serie carga un poco más que la anterior. La
 * entrada cuenta eso con la propia marca:
 *
 * 1. Cuatro columnas suben en escalera dentro del recuadro de marca: cuatro
 *    series, cada una más cargada que la anterior.
 * 2. La cuarta llega al tope y las cuatro se cierran en un bloque sólido: la
 *    serie queda registrada, y ese bloque es el recuadro de la marca.
 * 3. El monograma se asienta encima, como el dato que se anota en la celda.
 * 4. Se traza un renglón y el nombre sube desde él, escrito sobre la línea.
 *
 * Las funciones llevan la directiva `'worklet'` para ejecutarse en el hilo de
 * interfaz; fuera de Reanimated es una cadena sin efecto.
 */

/** Tiempos de la secuencia, en milisegundos desde el primer cuadro. */
export const SPLASH_TIMING = {
  /** Respiro en negro: el primer cuadro es idéntico al splash nativo. */
  barsStart: 80,
  /** Lo que tarda una columna en subir a su carga. */
  barRise: 300,
  /** Desfase entre columnas: se leen como series sucesivas, no como un bloque. */
  barStagger: 70,
  /** Cierre en bloque. Arranca 30 ms antes de que asiente la última columna. */
  lockStart: 560,
  lockDuration: 260,
  /**
   * Relevo de las columnas al recuadro macizo, en el tramo final del cierre.
   * Termina con él: a partir de ahí la marca es una sola vista con sus esquinas.
   */
  sealStart: 720,
  sealDuration: 100,
  /** El monograma entra con el bloque casi cerrado, no después. */
  monogramStart: 740,
  monogramDuration: 200,
  rulingStart: 780,
  rulingDuration: 300,
  /** El nombre sale del renglón cuando este ya va por la mitad. */
  wordmarkStart: 900,
  wordmarkDuration: 340,
  /** Fin de la entrada, con la marca completa ya en reposo unos 160 ms. */
  introEnd: 1400,
  /** Entrega a la aplicación: más corta que la entrada. */
  exitDuration: 220,
  /** Con «reducir movimiento»: marca quieta este tiempo y fuera. */
  reducedHold: 600,
  reducedExitDuration: 160,
  /**
   * Tope de espera. Pasado este tiempo la marca entrega pase lo que pase, aunque
   * la restauración de sesión siga en curso: una red lenta no debe dejar al
   * usuario mirando un logotipo inmóvil sin saber si la aplicación responde.
   */
  handoffCap: 2600,
} as const;

/**
 * Carga de cada columna como fracción de la altura del recuadro. Escalones
 * iguales: una progresión, no un ecualizador.
 */
export const BAR_LOADS = [0.34, 0.56, 0.78, 1] as const;

export const BAR_COUNT = BAR_LOADS.length;

/** Ancho de columna mientras sube: deja ver la separación entre series. */
export const BAR_OPEN_SCALE = 0.72;

/**
 * Ancho al cerrar. Un poco más de 1 para que las columnas se solapen y no quede
 * una rendija de un píxel en densidades donde el ancho no cae en entero; el
 * recuadro recorta lo que sobra por fuera.
 */
export const BAR_SEALED_SCALE = 1.04;

/** Escala con la que el monograma empieza a asentarse. */
export const MONOGRAM_FROM_SCALE = 0.86;

/** Escala mínima: evita una matriz no invertible con escala 0 en Android. */
const MIN_SCALE = 0.001;

/** Avance 0–1 de un tramo que empieza en `start` y dura `duration`. */
export function segment(clock: number, start: number, duration: number): number {
  'worklet';
  if (duration <= 0) return clock >= start ? 1 : 0;
  const progress = (clock - start) / duration;
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return progress;
}

/** Llegada: rápida al salir y frenando. Sin rebote. */
export function easeOut(progress: number): number {
  'worklet';
  const rest = 1 - progress;
  return 1 - rest * rest * rest;
}

/** Cambio de estado en el sitio: arranca y frena. */
export function easeInOut(progress: number): number {
  'worklet';
  if (progress < 0.5) return 4 * progress * progress * progress;
  const rest = -2 * progress + 2;
  return 1 - (rest * rest * rest) / 2;
}

function mix(from: number, to: number, progress: number): number {
  'worklet';
  return from + (to - from) * progress;
}

/** Instante en que empieza a subir la columna `index`. */
export function barStartAt(index: number): number {
  'worklet';
  return SPLASH_TIMING.barsStart + index * SPLASH_TIMING.barStagger;
}

/** Instante en que el recuadro macizo ha sustituido del todo a las columnas. */
export function sealEndAt(): number {
  'worklet';
  return SPLASH_TIMING.sealStart + SPLASH_TIMING.sealDuration;
}

/**
 * Opacidad del recuadro macizo de marca.
 *
 * Las columnas, al cerrarse, ya ocupan todo el recuadro; este funde encima una
 * única vista con fondo y radio propios. Así las esquinas finales no dependen
 * de que el sistema recorte bien unos hijos transformados, que es justo lo que
 * falla en algunos Android.
 */
export function sealOpacity(clock: number): number {
  'worklet';
  return easeOut(segment(clock, SPLASH_TIMING.sealStart, SPLASH_TIMING.sealDuration));
}

export type BarFrame = {
  /** Altura como fracción del recuadro. */
  readonly scaleY: number;
  readonly scaleX: number;
  readonly opacity: number;
};

/**
 * Columna `index` en el instante `clock`.
 *
 * Dos tramos encadenados sobre la misma propiedad: sube hasta su carga y, al
 * cerrar, completa lo que le falta hasta el tope mientras se ensancha.
 */
export function barFrame(clock: number, index: number): BarFrame {
  'worklet';
  const load = BAR_LOADS[index] ?? 1;
  const rise = easeOut(segment(clock, barStartAt(index), SPLASH_TIMING.barRise));
  const lock = easeInOut(segment(clock, SPLASH_TIMING.lockStart, SPLASH_TIMING.lockDuration));
  const height = load * rise + (1 - load) * lock;
  return {
    scaleY: height < MIN_SCALE ? MIN_SCALE : height > 1 ? 1 : height,
    scaleX: mix(BAR_OPEN_SCALE, BAR_SEALED_SCALE, lock),
    // Sellado el recuadro, las columnas ya no se dibujan: debajo de un bloque
    // opaco solo costarían composición.
    opacity: rise > 0 && clock <= sealEndAt() ? 1 : 0,
  };
}

export type MonogramFrame = { readonly opacity: number; readonly scale: number };

export function monogramFrame(clock: number): MonogramFrame {
  'worklet';
  const progress = easeOut(
    segment(clock, SPLASH_TIMING.monogramStart, SPLASH_TIMING.monogramDuration),
  );
  return { opacity: progress, scale: mix(MONOGRAM_FROM_SCALE, 1, progress) };
}

export type RulingFrame = { readonly scaleX: number; readonly opacity: number };

/** El renglón se traza desde el centro hacia los dos lados. */
export function rulingFrame(clock: number): RulingFrame {
  'worklet';
  const progress = easeInOut(
    segment(clock, SPLASH_TIMING.rulingStart, SPLASH_TIMING.rulingDuration),
  );
  return { scaleX: progress < MIN_SCALE ? MIN_SCALE : progress, opacity: progress > 0 ? 1 : 0 };
}

export type WordmarkFrame = {
  /** Fracción de su propia altura que el nombre sigue hundido bajo el renglón. */
  readonly sunk: number;
  readonly opacity: number;
};

export function wordmarkFrame(clock: number): WordmarkFrame {
  'worklet';
  const progress = easeOut(
    segment(clock, SPLASH_TIMING.wordmarkStart, SPLASH_TIMING.wordmarkDuration),
  );
  return { sunk: 1 - progress, opacity: progress };
}

/**
 * Reloj inicial. Con «reducir movimiento» la secuencia nace terminada: la marca
 * aparece completa y quieta en vez de armarse.
 */
export function initialClock(reduceMotion: boolean): number {
  return reduceMotion ? SPLASH_TIMING.introEnd : 0;
}

/** Cuánto permanece la marca antes de poder entregar. */
export function introDuration(reduceMotion: boolean): number {
  return reduceMotion ? SPLASH_TIMING.reducedHold : SPLASH_TIMING.introEnd;
}

/** Duración total mínima, de primer cuadro a aplicación visible. */
export function totalDuration(reduceMotion: boolean): number {
  return reduceMotion
    ? SPLASH_TIMING.reducedHold + SPLASH_TIMING.reducedExitDuration
    : SPLASH_TIMING.introEnd + SPLASH_TIMING.exitDuration;
}

export type HandoffInput = {
  /** La entrada terminó de dibujarse. */
  readonly introDone: boolean;
  /** Fuentes cargadas y sesión resuelta: hay una primera pantalla que mostrar. */
  readonly appReady: boolean;
  /** Se agotó `handoffCap`. */
  readonly capReached: boolean;
};

/**
 * ¿Toca entregar a la aplicación?
 *
 * La entrada no se corta a medias, y no espera más que la carga real: si la
 * aplicación ya está lista cuando termina, entrega en el acto. Si no, la marca
 * espera quieta hasta que lo esté.
 *
 * El tope manda sobre todo lo demás, también sobre `introDone`: es la salida
 * de emergencia, y no puede depender de que la animación llegue a avisar de
 * que terminó. Si ese aviso se pierde, la capa se retira igualmente.
 */
export function shouldHandOff({ introDone, appReady, capReached }: HandoffInput): boolean {
  return capReached || (introDone && appReady);
}

/**
 * Cuadros que se dejan pasar entre «toca entregar» y el inicio del fundido.
 *
 * Al resolverse la sesión la aplicación de debajo todavía está pintando su
 * redirección —y, si la cuenta es de otro gimnasio, remontando el árbol con la
 * nueva marca—. Dos cuadros bastan para que el fundido descubra la pantalla de
 * destino y no ese paso intermedio.
 */
export const HANDOFF_SETTLE_FRAMES = 2;
