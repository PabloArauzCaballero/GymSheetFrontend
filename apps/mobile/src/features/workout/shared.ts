import { longestTimedSet, topSet } from '@gymsheet/domain';
import { secondsLabel } from '@gymsheet/hooks';
import type { WorkoutExercise } from '@gymsheet/types';
import { prescriptionLabel } from '@/components/exercise-row';
import { setLabel } from '@/features/workout/exercise-card';
import { roundLabel, type FlowBlock, type FlowItem, type FlowStep } from '@/features/workout/workout-flow';

/** Un ejercicio de la sesión dentro del flujo guiado. */
export type Item = FlowItem & { source: WorkoutExercise };

export function nameOf(item: WorkoutExercise): string {
  return item.ejercicio?.nombreEs?.trim() || item.ejercicio?.nombre || 'Ejercicio no disponible';
}

export function strengthSets(item: WorkoutExercise) {
  return item.series.filter((set) => set.tipoSerie !== 'CARDIO');
}

/** Ejercicio por tiempo (plancha 45 s): la rutina le puso `duracionSeg`; sus series se miden en segundos. */
export function isTimed(item: WorkoutExercise): boolean {
  return item.duracionSeg !== null && item.ejercicio?.category !== 'cardio';
}

export function isCardio(item: WorkoutExercise): boolean {
  return item.ejercicio?.category === 'cardio';
}

/** «Mejor: …» de un ejercicio contraído: la serie más pesada o, si es por tiempo, el aguante más largo. */
export function bestOf(item: WorkoutExercise): string | null {
  if (isTimed(item)) {
    const seconds = longestTimedSet(item);
    return seconds !== null ? secondsLabel(seconds) : null;
  }
  const best = topSet(item);
  return best ? setLabel({ tipoSerie: 'FUERZA', pesoKg: best.pesoKg, repeticiones: best.repeticiones, duracionSeg: null, distanciaM: null }) : null;
}

/** «3 × 8–12 · 60 kg · RIR 2» del objetivo copiado de la rutina; `null` si se añadió a mano. */
export function targetOf(item: WorkoutExercise): string | null {
  if (item.seriesObjetivo === null) return null;
  return prescriptionLabel({
    series: item.seriesObjetivo,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
    duracionSeg: item.duracionSeg,
    pesoKg: item.pesoObjetivoKg,
    rir: item.rirObjetivo,
  });
}

export function blockName(block: FlowBlock<Item>): string {
  return `${block.kind === 'circuito' ? 'Circuito' : 'Superserie'} ${block.label ?? ''}`.trim();
}

/** Posición «A1», «A2» de un ejercicio en su bloque. */
export function badgeOf(block: FlowBlock<Item>, item: Item): string | null {
  if (block.kind === 'single' || !block.label) return null;
  return `${block.label}${block.items.indexOf(item) + 1}`;
}

/** «Remo con mancuerna · vuelta 2/3» o «Press banca · serie 3». */
export function stepLabel(blocks: ReadonlyArray<FlowBlock<Item>>, step: FlowStep): string {
  const block = blocks[step.blockIndex];
  const item = block?.items.find((candidate) => candidate.id === step.itemId);
  if (!block || !item) return '';
  const name = nameOf(item.source);
  if (block.kind === 'single') return `${name} · serie ${step.round}`;
  return `${name} · ${roundLabel(step.round, block.rounds).toLowerCase()}`;
}

/** Los ejercicios de la sesión, en orden, como elementos del flujo. */
export function toFlowItems(ordered: readonly WorkoutExercise[]): Item[] {
  return ordered.map((item) => ({
    id: item.id,
    grupo: item.grupo,
    grupoTipo: item.grupoTipo,
    target: item.seriesObjetivo,
    logged: isCardio(item) ? item.series.length : strengthSets(item).length,
    descansoSeg: item.descansoSeg,
    descansoEntreSeg: item.descansoEntreSeg,
    source: item,
  }));
}
