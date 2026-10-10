/**
 * El orden del entrenamiento guiado (C3.e, C8.3.3), como lógica pura: qué
 * ejercicio toca, en qué vuelta va un bloque y cuánto se descansa tras cada
 * serie. Sin React ni importaciones de valor, para probarla con `node --test`.
 *
 * - Un ejercicio suelto: sus series seguidas, con su `descansoSeg` entre ellas.
 * - Una superserie o circuito (ejercicios contiguos con el mismo `grupo`):
 *   A1 → A2 (→ A3…) → descanso tras la vuelta → A1… Entre ejercicios del
 *   bloque, la transición `descansoEntreSeg` (0 = pasar directo); tras el
 *   último de la vuelta, el `descansoSeg` del último ejercicio del bloque.
 */

/** Descanso que se supone cuando la rutina no lo indica (el de siempre). */
export const FALLBACK_REST_SEC = 90;
/** Tope del backend para `descansoSegAnterior`. */
export const MAX_PREVIOUS_REST_SEC = 7200;

export type FlowItem = {
  id: string;
  grupo: number | null;
  grupoTipo?: 'SUPERSERIE' | 'CIRCUITO' | null;
  /** Series objetivo copiadas de la rutina; `null` en un ejercicio añadido a mano. */
  target: number | null;
  /** Series ya registradas hoy. */
  logged: number;
  descansoSeg: number | null;
  descansoEntreSeg: number | null;
};

export type FlowBlock<T extends FlowItem> = {
  kind: 'single' | 'superserie' | 'circuito';
  /** «A», «B»… en un bloque; `null` en uno suelto. */
  label: string | null;
  items: T[];
  /** Vueltas del bloque (la serie objetivo más alta); en uno suelto, sus series. */
  rounds: number | null;
  /** Transición dentro del bloque. */
  between: number;
  /** Descanso tras la vuelta (bloque) o tras cada serie (suelto). */
  restAfter: number | null;
};

function letter(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/** Agrupa en bloques los ejercicios de la sesión, en su orden. */
export function buildFlowBlocks<T extends FlowItem>(items: readonly T[]): Array<FlowBlock<T>> {
  const runs: T[][] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev && item.grupo !== null && prev.grupo === item.grupo) last.push(item);
    else runs.push([item]);
  }
  const blocks: Array<FlowBlock<T>> = [];
  let index = 0;
  for (const run of runs) {
    const first = run[0];
    if (!first) continue;
    if (run.length < 2 || first.grupo === null) {
      for (const item of run) {
        blocks.push({ kind: 'single', label: null, items: [item], rounds: item.target, between: 0, restAfter: item.descansoSeg });
      }
      continue;
    }
    const targets = run.map((item) => item.target).filter((value): value is number => value !== null);
    const declared = run.find((item) => item.grupoTipo)?.grupoTipo;
    blocks.push({
      kind: declared === 'CIRCUITO' || (!declared && run.length >= 3) ? 'circuito' : 'superserie',
      label: letter(index),
      items: run,
      rounds: targets.length > 0 ? Math.max(...targets) : null,
      between: run.find((item) => item.descansoEntreSeg !== null)?.descansoEntreSeg ?? 0,
      restAfter: run[run.length - 1]?.descansoSeg ?? null,
    });
    index += 1;
  }
  return blocks;
}

/** ¿Le quedan series objetivo a este ejercicio? Sin objetivo, nunca se da por terminado solo. */
export function isItemDone(item: FlowItem): boolean {
  return item.target !== null && item.logged >= item.target;
}

export function isBlockDone(block: FlowBlock<FlowItem>): boolean {
  return block.items.every(isItemDone);
}

export type FlowStep = {
  blockIndex: number;
  itemId: string;
  /** Vuelta (1…) en un bloque; en uno suelto, el número de la serie siguiente. */
  round: number;
};

/**
 * El paso siguiente de un bloque: la vuelta más baja que aún no completó algún
 * ejercicio, y dentro de ella el primero en orden (A1 antes que A2).
 */
function stepInBlock(block: FlowBlock<FlowItem>, blockIndex: number): FlowStep | null {
  if (block.kind === 'single') {
    const item = block.items[0];
    if (!item || isItemDone(item)) return null;
    return { blockIndex, itemId: item.id, round: item.logged + 1 };
  }
  const pending = block.items.filter((item) => !isItemDone(item));
  if (pending.length === 0) return null;
  const round = Math.min(...pending.map((item) => item.logged)) + 1;
  const item = block.items.find((candidate) => !isItemDone(candidate) && candidate.logged < round);
  return item ? { blockIndex, itemId: item.id, round } : null;
}

/** Lo que toca ahora: el primer bloque con trabajo pendiente. `null` = sesión completa. */
export function currentStep(blocks: ReadonlyArray<FlowBlock<FlowItem>>): FlowStep | null {
  return stepFrom(blocks, 0);
}

/**
 * El siguiente paso empezando por el bloque `startIndex` y dando la vuelta: si
 * la persona eligió otro ejercicio y registró allí, se sigue desde ese bloque
 * (A1 → A2 dentro de él) en vez de saltar al primero pendiente.
 */
export function stepFrom(blocks: ReadonlyArray<FlowBlock<FlowItem>>, startIndex: number): FlowStep | null {
  const start = Math.max(0, Math.min(blocks.length - 1, startIndex));
  for (let offset = 0; offset < blocks.length; offset += 1) {
    const index = (start + offset) % blocks.length;
    const block = blocks[index];
    if (!block) continue;
    const step = stepInBlock(block, index);
    if (step) return step;
  }
  return null;
}

/** El paso de un ejercicio concreto (para el que la persona eligió a mano). */
export function stepOf(blocks: ReadonlyArray<FlowBlock<FlowItem>>, itemId: string): FlowStep | null {
  const blockIndex = blocks.findIndex((block) => block.items.some((item) => item.id === itemId));
  const block = blocks[blockIndex];
  const item = block?.items.find((candidate) => candidate.id === itemId);
  if (!block || !item) return null;
  const natural = stepInBlock(block, blockIndex);
  if (natural && natural.itemId === itemId) return natural;
  return { blockIndex, itemId, round: item.logged + 1 };
}

/** Los mismos bloques con una serie más registrada en `itemId` (antes de que responda el servidor). */
export function withLoggedSet<T extends FlowItem>(blocks: ReadonlyArray<FlowBlock<T>>, itemId: string): Array<FlowBlock<T>> {
  return blocks.map((block) => ({
    ...block,
    items: block.items.map((item) => (item.id === itemId ? { ...item, logged: item.logged + 1 } : item)),
  }));
}

/** Los ejercicios que vienen después del actual, en orden y sin repetir. */
export function upcomingItems<T extends FlowItem>(
  blocks: ReadonlyArray<FlowBlock<T>>,
  step: FlowStep | null,
  limit = 6,
): T[] {
  if (!step) return [];
  const block = blocks[step.blockIndex];
  if (!block) return [];
  const position = block.items.findIndex((item) => item.id === step.itemId);
  const candidates = [
    // Lo que queda de esta vuelta…
    ...block.items.slice(position + 1),
    // …y, en un bloque, el principio de la vuelta siguiente.
    ...(block.kind === 'single' ? [] : block.items.slice(0, position)),
    ...blocks.slice(step.blockIndex + 1).flatMap((next) => next.items),
  ];
  const seen = new Set<string>([step.itemId]);
  const out: T[] = [];
  for (const item of candidates) {
    if (seen.has(item.id) || isItemDone(item)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export type RestPlan = {
  /** Segundos de descanso; 0 = pasar directo al siguiente. */
  seconds: number;
  kind: 'between' | 'round' | 'set' | 'none';
};

/**
 * Cuánto descansar justo después de registrar una serie de `itemId`, con los
 * contadores **ya actualizados** (la serie recién registrada incluida).
 */
export function restAfterLogging(
  blocks: ReadonlyArray<FlowBlock<FlowItem>>,
  itemId: string,
  fallback = FALLBACK_REST_SEC,
): RestPlan {
  const blockIndex = blocks.findIndex((block) => block.items.some((item) => item.id === itemId));
  const block = blocks[blockIndex];
  if (!block) return { seconds: fallback, kind: 'set' };
  if (!currentStep(blocks)) return { seconds: 0, kind: 'none' };
  if (block.kind === 'single') {
    // Entre series, y también al cambiar de ejercicio: el descanso del que se hizo.
    return { seconds: block.items[0]?.descansoSeg ?? fallback, kind: 'set' };
  }
  const next = stepInBlock(block, blockIndex);
  const done = block.items.find((item) => item.id === itemId);
  const position = block.items.findIndex((item) => item.id === itemId);
  const laterInRound =
    next !== null &&
    done !== undefined &&
    block.items.findIndex((item) => item.id === next.itemId) > position &&
    next.round === done.logged;
  if (laterInRound) return { seconds: block.between, kind: block.between > 0 ? 'between' : 'none' };
  return { seconds: block.restAfter ?? fallback, kind: 'round' };
}

/**
 * El descanso real antes de una serie: el tiempo desde la última serie
 * registrada en la sesión (de cualquier ejercicio), acotado a 0–7200 s.
 * La primera serie de la sesión no tiene descanso anterior (0).
 */
export function previousRestSeconds(
  registeredAt: readonly string[],
  now: number = Date.now(),
): number {
  let latest = Number.NEGATIVE_INFINITY;
  for (const iso of registeredAt) {
    const time = new Date(iso).getTime();
    if (Number.isFinite(time) && time > latest) latest = time;
  }
  if (!Number.isFinite(latest)) return 0;
  return Math.min(MAX_PREVIOUS_REST_SEC, Math.max(0, Math.round((now - latest) / 1000)));
}

/** «2/4» (con objetivo) o «2 series» (sin él). */
export function progressLabel(item: Pick<FlowItem, 'logged' | 'target'>): string {
  if (item.target !== null) return `${Math.min(item.logged, item.target)}/${item.target}`;
  return `${item.logged} ${item.logged === 1 ? 'serie' : 'series'}`;
}

/** «Vuelta 2/3». */
export function roundLabel(round: number, rounds: number | null): string {
  return rounds ? `Vuelta ${Math.min(round, rounds)}/${rounds}` : `Vuelta ${round}`;
}

/** 80 → «80», 62.5 → «62,5». */
export function kgLabel(kg: number): string {
  return (Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, '')).replace('.', ',');
}

/** «9 × 80 kg» (reps × carga), como se dice en la sala. */
export function lastTimeLabel(set: { pesoKg: number; repeticiones: number }): string {
  return `${set.repeticiones} × ${kgLabel(set.pesoKg)} kg`;
}
