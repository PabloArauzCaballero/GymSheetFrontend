/**
 * Las reglas del tour que no dependen de React ni de la plataforma.
 *
 * Viven aparte para poder probarlas con `node --test`: son justo las decisiones
 * que rompían el tutorial —cuándo se abre, dónde cae la tarjeta, cuánto se
 * desplaza la lista— y ninguna necesita un teléfono para comprobarse.
 */

/** Descanso mínimo entre el cierre de un tour y la apertura del siguiente. */
export const TOUR_GRACE_MS = 1200;

/**
 * Lo que tarda una pantalla en quedarse quieta tras recibir el foco: la
 * transición de pila dura unos 350 ms y medir antes da la posición de mitad de
 * recorrido, que es de donde venía el anillo desplazado.
 */
export const SETTLE_MS = 380;

/** Cuánto se espera a que aparezca el elemento al que apunta un paso. */
export const ANCHOR_WAIT_MS = 2500;

/** Distancia entre el hueco y la tarjeta que lo explica. */
export const CARD_GAP = 12;

/** Margen que el anillo deja alrededor del elemento. */
export const HALO = 8;

export type OpenInput = {
  /** Las banderas de SecureStore ya se leyeron. */
  readonly hydrated: boolean;
  /** Este tour ya se completó. */
  readonly done: boolean;
  /** Hay un tour en pantalla (de cualquier pantalla). */
  readonly anotherActive: boolean;
  /** Momento en que esta pantalla recibió el foco; `null` si no lo tiene. */
  readonly focusedAt: number | null;
  /** Cuándo se cerró el último tour. */
  readonly closedAt: number | null;
  /** El primer paso apunta a un elemento. */
  readonly needsAnchor: boolean;
  /** Última vez que se midió ese elemento; `null` si nunca. */
  readonly anchorMeasuredAt: number | null;
  readonly now: number;
};

export type OpenDecision =
  | { readonly kind: 'hold' }
  | { readonly kind: 'wait'; readonly retryInMs: number; readonly remeasure: boolean }
  | { readonly kind: 'open'; readonly reason: 'ready' | 'anchor-timeout' };

/**
 * Cuándo puede abrirse el tour de una pantalla.
 *
 * Antes se abría con dos temporizadores fijos desde el montaje (650 ms y 1400 ms
 * después). Eso fallaba por tres lados a la vez: las pestañas se quedan montadas
 * para siempre, así que el tour podía dispararse desde una pestaña que ya no se
 * veía; la bienvenida dura más que los dos intentos, así que el de Inicio se
 * perdía; y los elementos que dependen de datos aún no existían a los 650 ms, así
 * que salía una tarjeta suelta y el anillo aparecía después, de golpe.
 *
 * Ahora el tour espera a tres cosas, todas observables: que la pantalla TENGA el
 * foco y haya terminado de moverse, que no haya otro tour o su descanso, y que el
 * elemento al que apunta el primer paso se haya medido DESPUÉS de que todo se
 * quedara quieto. Si el elemento no aparece en `ANCHOR_WAIT_MS` se abre igualmente
 * y el paso decide qué hacer sin él.
 */
export function decideTourOpen(input: OpenInput): OpenDecision {
  if (!input.hydrated || input.done || input.anotherActive || input.focusedAt === null) {
    return { kind: 'hold' };
  }

  const settledAt = input.focusedAt + SETTLE_MS;
  const graceAt = input.closedAt === null ? 0 : input.closedAt + TOUR_GRACE_MS;
  const readyAt = Math.max(settledAt, graceAt);

  if (input.now < readyAt) {
    return { kind: 'wait', retryInMs: readyAt - input.now, remeasure: false };
  }
  if (!input.needsAnchor) return { kind: 'open', reason: 'ready' };

  if (input.anchorMeasuredAt !== null && input.anchorMeasuredAt >= settledAt) {
    return { kind: 'open', reason: 'ready' };
  }
  const giveUpAt = readyAt + ANCHOR_WAIT_MS;
  if (input.now >= giveUpAt) return { kind: 'open', reason: 'anchor-timeout' };

  return { kind: 'wait', retryInMs: Math.min(300, giveUpAt - input.now), remeasure: true };
}

export type Rect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type CardPlacement =
  | { readonly side: 'above'; readonly bottom: number; readonly maxHeight: number }
  | { readonly side: 'below'; readonly top: number; readonly maxHeight: number }
  /** No cabe ni arriba ni abajo (elemento muy alto): la tarjeta flota abajo. */
  | { readonly side: 'floating'; readonly bottom: number; readonly maxHeight: number };

/** Por debajo de esto el texto de un paso deja de leerse sin desplazarlo. */
export const MIN_CARD_HEIGHT = 200;
const MAX_CARD_HEIGHT = 440;

/**
 * Dónde cae la tarjeta respecto al hueco.
 *
 * Va pegada al hueco, en el lado con más sitio, y no clavada al borde de la
 * pantalla: una tarjeta lejos del elemento que explica obliga al ojo a hacer el
 * viaje entre las dos cosas. Si ningún lado ofrece `MIN_CARD_HEIGHT`, el elemento
 * es demasiado alto para rodearlo y la tarjeta flota abajo, tapando su parte
 * inferior —el paso `scrollDeltaFor` ya trae su parte superior a la vista.
 */
export function placeCard(input: {
  readonly hole: Rect;
  readonly stageHeight: number;
  readonly insetTop: number;
  readonly insetBottom: number;
}): CardPlacement {
  const { hole, stageHeight, insetTop, insetBottom } = input;
  const holeTop = hole.y - HALO;
  const holeBottom = hole.y + hole.height + HALO;
  const spaceAbove = holeTop - insetTop - CARD_GAP;
  const spaceBelow = stageHeight - holeBottom - insetBottom - CARD_GAP;
  const best = Math.max(spaceAbove, spaceBelow);

  if (best < MIN_CARD_HEIGHT) {
    return {
      side: 'floating',
      bottom: insetBottom + CARD_GAP,
      maxHeight: Math.max(MIN_CARD_HEIGHT, Math.min(MAX_CARD_HEIGHT, stageHeight * 0.42)),
    };
  }
  if (spaceBelow >= spaceAbove) {
    return {
      side: 'below',
      top: holeBottom + CARD_GAP,
      maxHeight: Math.min(MAX_CARD_HEIGHT, spaceBelow),
    };
  }
  return {
    side: 'above',
    bottom: stageHeight - holeTop + CARD_GAP,
    maxHeight: Math.min(MAX_CARD_HEIGHT, spaceAbove),
  };
}

/** Un elemento más alto que esto se encuadra por su parte superior. */
const TALL_FRACTION = 0.45;
/** Un desplazamiento menor que esto no merece una animación bajo el dedo. */
const MIN_SCROLL = 12;

/**
 * Cuánto hay que desplazar la lista para que el elemento quede en la franja
 * útil, o `0` si ya está bien.
 *
 * La franja excluye una quinta parte arriba y otra abajo: en una de las dos va la
 * tarjeta. Un elemento alto no cabe en la franja, y alinear su borde inferior (lo
 * que se hacía) empuja su parte superior fuera de pantalla: el anillo rodeaba
 * algo que la persona no podía ver entero. Para ésos se alinea el borde superior.
 */
export function scrollDeltaFor(input: {
  readonly anchorTop: number;
  readonly anchorHeight: number;
  readonly stageHeight: number;
}): number {
  const { anchorTop, anchorHeight, stageHeight } = input;
  const safeTop = stageHeight * 0.2;
  const safeBottom = stageHeight * 0.8;
  const bottom = anchorTop + anchorHeight;

  let delta = 0;
  if (anchorHeight > stageHeight * TALL_FRACTION) {
    delta = anchorTop - safeTop;
  } else if (bottom > safeBottom) {
    delta = bottom - safeBottom;
  } else if (anchorTop < safeTop) {
    delta = anchorTop - safeTop;
  }
  return Math.abs(delta) < MIN_SCROLL ? 0 : delta;
}
