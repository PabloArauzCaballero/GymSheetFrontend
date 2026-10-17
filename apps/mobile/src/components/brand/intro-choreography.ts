/**
 * La coreografía de la cortinilla REPP, como **función pura del tiempo**.
 *
 * Una sola fuente para dos salidas: los worklets de `repp-intro.tsx` la evalúan
 * en el hilo de UI a cada fotograma, y `scripts/render-brand-video.mjs` la evalúa
 * en Node para renderizar el vídeo de redes fotograma a fotograma. Si la app y el
 * vídeo se movieran distinto, uno de los dos estaría mal; así no pueden.
 *
 * Todo es vectorial: cada fotograma es un `d` de SVG recalculado, así que la
 * marca tiene el mismo filo a 1× en un teléfono que a 4K en un reel.
 *
 * | t (ms)      | Acto                                                        |
 * |-------------|-------------------------------------------------------------|
 * | 0–120       | Relevo: idéntico píxel a píxel al splash nativo             |
 * | 120–740     | 1. La «R» del icono se transforma en la «R» del logotipo    |
 * | 160–780     |    El gesto jade la sigue con 40 ms de arrastre             |
 * | 520–1140    | 2. «E», «P», «P» salen de detrás de la «R», escalonadas     |
 * | 1180–1820   | 3. Un destello cruza el logotipo, recortado a sus letras    |
 * | 1820 →      | 4. Salida (la decide la app: cuando la sesión está lista)   |
 */
import {
  REPP_MARK_BODY,
  REPP_MARK_CENTER,
  REPP_MARK_TICK,
  REPP_WORDMARK_BOX,
  REPP_WORDMARK_LETTERS,
  REPP_WORDMARK_R,
  REPP_WORDMARK_TICK,
} from './mark';

/* -------------------------------------------------------------------------- */
/* Relevo con el splash nativo                                                 */
/* -------------------------------------------------------------------------- */

/** `imageWidth` del plugin `expo-splash-screen` en `app.json`. */
export const SPLASH_IMAGE_WIDTH = 300;
/** Fracción del lienzo de 120 que ocupa el signo en `splash.png`. */
export const SPLASH_MARK_SCALE = 0.55;
/** Puntos de pantalla por unidad del signo mientras se ve el splash. */
export const SPLASH_UNIT = (SPLASH_IMAGE_WIDTH / 120) * SPLASH_MARK_SCALE;

/* -------------------------------------------------------------------------- */
/* Cronología                                                                  */
/* -------------------------------------------------------------------------- */

export const INTRO = {
  handoff: 120,
  morphAt: 120,
  morphIn: 620,
  /** El gesto llega un poco después que la «R»: arrastre, no bloque. */
  tickLag: 40,
  lettersAt: 560,
  letterIn: 560,
  letterStagger: 70,
  sheenAt: 1180,
  sheenIn: 640,
  /** Fin de la parte animada: desde aquí la escena está quieta y legible. */
  main: 1820,
  exitIn: 360,
  /** Golpe háptico: cuando la última «P» toca su sitio. */
  hapticAt: 1000,
} as const;

/* -------------------------------------------------------------------------- */
/* Curvas                                                                      */
/* -------------------------------------------------------------------------- */

/** `cubic-bezier()` de CSS, resuelta por Newton con caída a bisección. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x;
    if (Math.abs(err) < 1e-6) break;
    const slope = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(slope) < 1e-6) break;
    t -= err / slope;
  }
  if (t < 0 || t > 1) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 24; i++) {
      const value = ((ax * t + bx) * t + cx) * t;
      if (value < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
  }
  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;
  return ((ay * t + by) * t + cy) * t;
}

/** Progreso local 0–1 de un acto que empieza en `at` y dura `duration`. */
function local(t: number, at: number, duration: number): number {
  'worklet';
  return Math.min(1, Math.max(0, (t - at) / duration));
}

/** Transformación: acelera fuerte, aterriza suave. El objeto pesa. */
function easeMorph(x: number): number {
  'worklet';
  return cubicBezier(0.7, 0, 0.16, 1, x);
}

/** Llegada: sale con energía y se posa sin rebote. */
function easeArrive(x: number): number {
  'worklet';
  return cubicBezier(0.16, 1, 0.3, 1, x);
}

function easeInOut(x: number): number {
  'worklet';
  return cubicBezier(0.45, 0, 0.25, 1, x);
}

/* -------------------------------------------------------------------------- */
/* Trazados interpolables                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Un trazado reducido a `M`, `L`, `C`, `Z` absolutos (las `H`/`V` se pasan a
 * `L`), separado en la secuencia de comandos y los números. Dos trazados con
 * la misma `cmds` se pueden interpolar punto a punto.
 */
export type Shape = { cmds: string; pts: number[] };

export function parseShape(d: string): Shape {
  const tokens = d.match(/[MLHVCZ]|-?\d*\.?\d+/g) ?? [];
  let cmds = '';
  const pts: number[] = [];
  let x = 0;
  let y = 0;
  let i = 0;
  let current = '';
  while (i < tokens.length) {
    const token = tokens[i] as string;
    if (/[MLHVCZ]/.test(token)) {
      current = token;
      i += 1;
      if (current === 'Z') cmds += 'Z';
      continue;
    }
    const num = (offset: number) => Number(tokens[i + offset]);
    if (current === 'M' || current === 'L') {
      x = num(0);
      y = num(1);
      cmds += current;
      pts.push(x, y);
      i += 2;
      // Tras un `M`, los pares siguientes son `L` implícitos.
      if (current === 'M') current = 'L';
    } else if (current === 'H' || current === 'V') {
      if (current === 'H') x = num(0);
      else y = num(0);
      cmds += 'L';
      pts.push(x, y);
      i += 1;
    } else if (current === 'C') {
      cmds += 'C';
      pts.push(num(0), num(1), num(2), num(3), num(4), num(5));
      x = num(4);
      y = num(5);
      i += 6;
    } else {
      throw new Error(`Comando de trazado no soportado en «${d}»`);
    }
  }
  return { cmds, pts };
}

/** Escala uniforme + desplazamiento: unidades del dibujo → puntos de pantalla. */
export type Place = { s: number; ox: number; oy: number };

/**
 * El `d` de un fotograma: cada punto es la mezcla, en `t`, del punto de `a`
 * colocado con `pa` y el de `b` colocado con `pb`.
 */
export function blendPath(cmds: string, a: number[], pa: Place, b: number[], pb: Place, t: number): string {
  'worklet';
  let d = '';
  let p = 0;
  for (let c = 0; c < cmds.length; c++) {
    const cmd = cmds[c] as string;
    if (cmd === 'Z') {
      d += 'Z';
      continue;
    }
    d += cmd;
    const pairs = cmd === 'C' ? 3 : 1;
    for (let k = 0; k < pairs; k++) {
      const ax = pa.ox + (a[p] as number) * pa.s;
      const ay = pa.oy + (a[p + 1] as number) * pa.s;
      const bx = pb.ox + (b[p] as number) * pb.s;
      const by = pb.oy + (b[p + 1] as number) * pb.s;
      d += `${(ax + (bx - ax) * t).toFixed(2)} ${(ay + (by - ay) * t).toFixed(2)} `;
      p += 2;
    }
  }
  return d;
}

const MARK_R = parseShape(REPP_MARK_BODY);
const MARK_TICK = parseShape(REPP_MARK_TICK);
const WORD_R = parseShape(REPP_WORDMARK_R);
const WORD_TICK = parseShape(REPP_WORDMARK_TICK);
const WORD_LETTERS = REPP_WORDMARK_LETTERS.map(parseShape);

if (MARK_R.cmds !== WORD_R.cmds || MARK_TICK.cmds !== WORD_TICK.cmds) {
  // Si alguien cambia un vector sin respetar la estructura del otro, que se
  // rompa aquí y no como un garabato a mitad de animación.
  throw new Error('El signo y el logotipo REPP ya no tienen trazados compatibles.');
}

export const SHAPES = {
  rCmds: MARK_R.cmds,
  markR: MARK_R.pts,
  wordR: WORD_R.pts,
  tickCmds: MARK_TICK.cmds,
  markTick: MARK_TICK.pts,
  wordTick: WORD_TICK.pts,
  letters: WORD_LETTERS,
} as const;

/* -------------------------------------------------------------------------- */
/* Encuadre                                                                    */
/* -------------------------------------------------------------------------- */

export type IntroLayout = {
  width: number;
  height: number;
  /** Dónde está el signo en el primer fotograma (el del splash). */
  mark: Place;
  /** Dónde queda el logotipo al final. */
  word: Place;
};

/**
 * @param markUnit puntos por unidad del signo al empezar (`SPLASH_UNIT` en la app).
 * @param wordWidth ancho de tinta del logotipo al terminar.
 */
export function introLayout(width: number, height: number, markUnit: number, wordWidth: number): IntroLayout {
  const s = wordWidth / REPP_WORDMARK_BOX.width;
  return {
    width,
    height,
    mark: {
      s: markUnit,
      ox: width / 2 - REPP_MARK_CENTER.x * markUnit,
      oy: height / 2 - REPP_MARK_CENTER.y * markUnit,
    },
    word: {
      s,
      ox: width / 2 - (REPP_WORDMARK_BOX.x + REPP_WORDMARK_BOX.width / 2) * s,
      oy: height / 2 - (REPP_WORDMARK_BOX.y + REPP_WORDMARK_BOX.height / 2) * s,
    },
  };
}

/** Ancho del logotipo en la app: presente sin gritar. */
export function appWordWidth(screenWidth: number): number {
  return Math.min(screenWidth * 0.56, 260);
}

/* -------------------------------------------------------------------------- */
/* Fotogramas                                                                  */
/* -------------------------------------------------------------------------- */

export function rPath(t: number, layout: IntroLayout): string {
  'worklet';
  const k = easeMorph(local(t, INTRO.morphAt, INTRO.morphIn));
  return blendPath(SHAPES.rCmds, SHAPES.markR, layout.mark, SHAPES.wordR, layout.word, k);
}

export function tickPath(t: number, layout: IntroLayout): string {
  'worklet';
  const k = easeMorph(local(t, INTRO.morphAt + INTRO.tickLag, INTRO.morphIn));
  return blendPath(SHAPES.tickCmds, SHAPES.markTick, layout.mark, SHAPES.wordTick, layout.word, k);
}

function letterProgress(index: number, t: number): number {
  'worklet';
  return local(t, INTRO.lettersAt + index * INTRO.letterStagger, INTRO.letterIn);
}

/**
 * Cada letra sube desde **debajo de la línea base**, que hace de máscara
 * (`baselineClip`): el nombre se levanta a su sitio en vez de aparecer. Se
 * probó que salieran de detrás de la «R» y, a mitad de camino, la «E» se
 * montaba sobre ella: blanco sobre blanco, una mancha.
 */
export function letterPath(index: number, t: number, layout: IntroLayout): string {
  'worklet';
  const shape = SHAPES.letters[index] as Shape;
  const k = easeArrive(letterProgress(index, t));
  const travel = (REPP_WORDMARK_BOX.height + 12) * layout.word.s;
  const place = { s: layout.word.s, ox: layout.word.ox, oy: layout.word.oy + travel * (1 - k) };
  return blendPath(shape.cmds, shape.pts, place, shape.pts, place, 0);
}

export function letterOpacity(index: number, t: number): number {
  'worklet';
  return Math.min(1, letterProgress(index, t) / 0.3);
}

/** La máscara de las letras: todo lo que queda por encima de la línea base. */
export function baselineClip(layout: IntroLayout): { x: number; y: number; width: number; height: number } {
  const baseline = layout.word.oy + (REPP_WORDMARK_BOX.y + REPP_WORDMARK_BOX.height) * layout.word.s;
  return { x: 0, y: 0, width: layout.width, height: baseline };
}

/**
 * El destello: un paralelogramo inclinado como la cursiva del logotipo que
 * cruza de izquierda a derecha. Se recorta a las letras, así que sólo se ve
 * dentro de la tinta.
 */
export function sheenPath(t: number, layout: IntroLayout): string {
  'worklet';
  const k = easeInOut(local(t, INTRO.sheenAt, INTRO.sheenIn));
  const s = layout.word.s;
  const band = 120 * s;
  const slant = 50 * s;
  const top = layout.word.oy + REPP_WORDMARK_BOX.y * s - 4;
  const bottom = layout.word.oy + (REPP_WORDMARK_BOX.y + REPP_WORDMARK_BOX.height) * s + 4;
  const left = layout.word.ox + REPP_WORDMARK_BOX.x * s - band;
  const right = layout.word.ox + (REPP_WORDMARK_BOX.x + REPP_WORDMARK_BOX.width) * s + slant;
  const x = left + (right - left) * k;
  return `M${x.toFixed(2)} ${top.toFixed(2)} L${(x + band).toFixed(2)} ${top.toFixed(2)} L${(x + band - slant).toFixed(2)} ${bottom.toFixed(2)} L${(x - slant).toFixed(2)} ${bottom.toFixed(2)} Z`;
}

export function sheenOpacity(t: number): number {
  'worklet';
  const k = local(t, INTRO.sheenAt, INTRO.sheenIn);
  return Math.sin(Math.PI * k);
}

/** Los trazados del logotipo ya en reposo: el recorte del destello. */
export function restingWordmark(layout: IntroLayout): string[] {
  const end = INTRO.main;
  return [rPath(end, layout), tickPath(end, layout), ...SHAPES.letters.map((_, i) => letterPath(i, end, layout))];
}
