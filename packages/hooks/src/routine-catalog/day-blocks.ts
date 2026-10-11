import type { RoutineGroupType } from '@gymsheet/types';

/**
 * Bloques de un día (C3): ejercicios sueltos, superseries y circuitos, con sus
 * etiquetas y la duración estimada. Lógica pura que comparten la pantalla del
 * día, el entrenamiento guiado y el editor, en web y en móvil.
 */

/** Lo mínimo que hace falta de un ejercicio para agruparlo y estimar su tiempo. */
export type BlockableItem = {
  grupo: number | null;
  grupoTipo?: RoutineGroupType | null;
  series: number;
  /** Descanso tras cada serie; en un bloque, el del último es el descanso tras la vuelta. */
  descansoSeg: number | null;
  /** Transición dentro del bloque (0–60 s). */
  descansoEntreSeg: number | null;
  /** Serie por tiempo: sustituye al tiempo de trabajo estimado. */
  duracionSeg?: number | null;
};

export type DayBlockKind = 'single' | 'superserie' | 'circuito';

export type DayBlockItem<T> = T & {
  /** «A1», «A2»… dentro de un bloque; `null` en un ejercicio suelto. */
  posicion: string | null;
};

export type DayBlock<T> = {
  kind: DayBlockKind;
  /** Letra del bloque («A», «B»…); `null` en un ejercicio suelto. */
  label: string | null;
  /** Vueltas del bloque (la serie más alta de sus ejercicios); en uno suelto, sus series. */
  rondas: number;
  /** Descanso tras cada vuelta (el `descansoSeg` del último ejercicio); en uno suelto, tras cada serie. */
  descansoTrasVueltaSeg: number | null;
  /** Transición entre ejercicios del bloque; `null` en uno suelto. */
  descansoEntreSeg: number | null;
  items: Array<DayBlockItem<T>>;
};

/** Letra de un bloque por su posición (0 → A … 25 → Z, 26 → AA). */
export function blockLetter(index: number): string {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function kindOf(items: readonly BlockableItem[]): DayBlockKind {
  const declared = items.find((item) => item.grupoTipo)?.grupoTipo;
  if (declared === 'SUPERSERIE') return 'superserie';
  if (declared === 'CIRCUITO') return 'circuito';
  return items.length >= 3 ? 'circuito' : 'superserie';
}

/**
 * Agrupa en bloques los ejercicios de un día, en su orden. Un bloque son los
 * ejercicios **contiguos** con el mismo `grupo`; uno solo con grupo (dato
 * defectuoso) se trata como suelto, igual que haría el backend al rechazarlo.
 */
export function buildDayBlocks<T extends BlockableItem>(items: readonly T[]): Array<DayBlock<T>> {
  const runs: T[][] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    const prev = last?.[last.length - 1];
    if (last && prev && item.grupo !== null && prev.grupo === item.grupo) last.push(item);
    else runs.push([item]);
  }

  const blocks: Array<DayBlock<T>> = [];
  let letter = 0;
  for (const run of runs) {
    const first = run[0];
    if (!first) continue;
    if (run.length < 2 || first.grupo === null) {
      for (const item of run) {
        blocks.push({
          kind: 'single',
          label: null,
          rondas: item.series,
          descansoTrasVueltaSeg: item.descansoSeg,
          descansoEntreSeg: null,
          items: [{ ...item, posicion: null }],
        });
      }
      continue;
    }
    const label = blockLetter(letter);
    letter += 1;
    const last = run[run.length - 1] ?? first;
    blocks.push({
      kind: kindOf(run),
      label,
      rondas: Math.max(...run.map((item) => item.series)),
      descansoTrasVueltaSeg: last.descansoSeg,
      descansoEntreSeg: run.find((item) => item.descansoEntreSeg !== null)?.descansoEntreSeg ?? 0,
      items: run.map((item, index) => ({
        ...item,
        posicion: `${label}${index + 1}`,
      })),
    });
  }
  return blocks;
}

/** Tiempo de trabajo que se supone a una serie por repeticiones. */
export const ESTIMATED_WORK_SEG = 40;
/** Descanso que se supone cuando la rutina no lo indica (el del temporizador). */
export const DEFAULT_REST_SEG = 90;

export type DurationEstimateOptions = {
  trabajoSeg?: number;
  descansoSeg?: number;
};

/**
 * Segundos estimados de un día: cada serie suma su trabajo (la duración en una
 * serie por tiempo, o ~40 s) y su descanso. En un bloque, cada vuelta suma el
 * trabajo de los ejercicios que aún tienen series, las transiciones entre ellos
 * y el descanso tras la vuelta **una sola vez**.
 */
export function estimateBlocksSeconds(
  blocks: ReadonlyArray<DayBlock<BlockableItem>>,
  options: DurationEstimateOptions = {},
): number {
  const work = options.trabajoSeg ?? ESTIMATED_WORK_SEG;
  const rest = options.descansoSeg ?? DEFAULT_REST_SEG;
  const workOf = (item: BlockableItem) => item.duracionSeg ?? work;
  let total = 0;
  for (const block of blocks) {
    if (block.kind === 'single') {
      const item = block.items[0];
      if (!item) continue;
      total += item.series * (workOf(item) + (item.descansoSeg ?? rest));
      continue;
    }
    for (let round = 1; round <= block.rondas; round += 1) {
      const active = block.items.filter((item) => item.series >= round);
      if (active.length === 0) continue;
      total += active.reduce((sum, item) => sum + workOf(item), 0);
      total += (active.length - 1) * (block.descansoEntreSeg ?? 0);
      total += block.descansoTrasVueltaSeg ?? rest;
    }
  }
  return total;
}

/** Minutos estimados de un día («≈55 min»). Un día con ejercicios nunca baja de 1. */
export function estimateDayMinutes<T extends BlockableItem>(
  items: readonly T[],
  options?: DurationEstimateOptions,
): number {
  if (items.length === 0) return 0;
  const seconds = estimateBlocksSeconds(buildDayBlocks(items), options);
  return Math.max(1, Math.round(seconds / 60));
}

/** «30 s», «1 min», «1:30 min». */
export function secondsLabel(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} min` : `${minutes}:${String(rest).padStart(2, '0')} min`;
}

/** Reloj de descanso: 90 → «1:30», 45 → «0:45». */
export function clockLabel(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** «3 × 8–12», «5 × 5», «3 × 30 s» o «4 series». */
export function setsLabel(item: {
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  duracionSeg?: number | null;
}): string {
  const { series, repsMin, repsMax, duracionSeg } = item;
  if (duracionSeg != null) return `${series} × ${secondsLabel(duracionSeg)}`;
  if (repsMin === null && repsMax === null) return `${series} ${series === 1 ? 'serie' : 'series'}`;
  const reps =
    repsMin !== null && repsMax !== null && repsMin !== repsMax
      ? `${repsMin}–${repsMax}`
      : `${repsMin ?? repsMax}`;
  return `${series} × ${reps}`;
}

/** 62.5 → «62,5». */
export function weightLabel(kg: number): string {
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1).replace(/\.0$/, '')}`.replace('.', ',');
}

/** «3 series · 8–12 reps · 60 kg · RIR 2» (o «3 series · 30 s» en una serie por tiempo). */
export function exerciseMetaLabel(item: {
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  duracionSeg?: number | null;
  pesoObjetivoKg?: number | null;
  rirObjetivo?: number | null;
}): string {
  const parts = [`${item.series} ${item.series === 1 ? 'serie' : 'series'}`];
  if (item.duracionSeg != null) {
    parts.push(secondsLabel(item.duracionSeg));
  } else if (item.repsMin !== null || item.repsMax !== null) {
    const reps =
      item.repsMin !== null && item.repsMax !== null && item.repsMin !== item.repsMax
        ? `${item.repsMin}–${item.repsMax}`
        : `${item.repsMin ?? item.repsMax}`;
    parts.push(`${reps} reps`);
  }
  if (item.pesoObjetivoKg != null && item.pesoObjetivoKg > 0) {
    parts.push(`${weightLabel(item.pesoObjetivoKg)} kg`);
  }
  if (item.rirObjetivo != null) parts.push(`RIR ${item.rirObjetivo}`);
  return parts.join(' · ');
}

/** «Descanso 2:00»; `null` si la rutina no lo indica. */
export function restLabel(seconds: number | null | undefined): string | null {
  if (seconds == null) return null;
  return seconds === 0 ? 'Sin descanso' : `Descanso ${clockLabel(seconds)}`;
}

/** Conector entre ejercicios de un bloque: «sin descanso» o «15 s». */
export function transitionLabel(seconds: number | null | undefined): string {
  return !seconds ? 'sin descanso' : secondsLabel(seconds);
}

/** «Superserie A · 3 vueltas», «Circuito B · 1 vuelta»; `null` en un ejercicio suelto. */
export function blockTitle(
  block: Pick<DayBlock<unknown>, 'kind' | 'label' | 'rondas'>,
): string | null {
  if (block.kind === 'single' || !block.label) return null;
  const name = block.kind === 'superserie' ? 'Superserie' : 'Circuito';
  return `${name} ${block.label} · ${block.rondas} ${block.rondas === 1 ? 'vuelta' : 'vueltas'}`;
}

/** «Descanso 1:30 tras la vuelta»; `null` si el bloque no lo indica. */
export function blockRestLabel(
  block: Pick<DayBlock<unknown>, 'kind' | 'descansoTrasVueltaSeg'>,
): string | null {
  if (block.descansoTrasVueltaSeg == null) return null;
  if (block.kind === 'single') return restLabel(block.descansoTrasVueltaSeg);
  return `Descanso ${clockLabel(block.descansoTrasVueltaSeg)} tras la vuelta`;
}
