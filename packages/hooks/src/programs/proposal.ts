import type { Routine, RoutineChangeProposal } from '@gymsheet/types';
import { formatKg } from './strength';

/**
 * Líneas legibles de la hoja RF-20 «¿Actualizar tu rutina?»: qué se cambió respecto de la
 * rutina durante la sesión. Los nombres salen de la propia rutina.
 */
export function describeProposal(proposal: RoutineChangeProposal, routine: Pick<Routine, 'ejercicios'> | null): string[] {
  const nameOf = (routineExerciseId: string) =>
    routine?.ejercicios.find((item) => item.id === routineExerciseId)?.ejercicio?.nombre ?? 'Un ejercicio';
  const lines: string[] = [];
  for (const change of proposal.cambios) {
    const parts: string[] = [];
    if (change.pesoObjetivoKg !== undefined) parts.push(`peso a ${formatKg(change.pesoObjetivoKg)}`);
    if (change.seriesObjetivo !== undefined) parts.push(`${change.seriesObjetivo} ${change.seriesObjetivo === 1 ? 'serie' : 'series'}`);
    lines.push(`${nameOf(change.routineExerciseId)}: ${parts.join(' y ')}`);
  }
  for (const added of proposal.agregar) {
    const weight = added.pesoObjetivoKg !== undefined ? ` con ${formatKg(added.pesoObjetivoKg)}` : '';
    lines.push(`Se añade un ejercicio nuevo: ${added.seriesObjetivo} series${weight}`);
  }
  for (const removed of proposal.quitar) lines.push(`Se quita ${nameOf(removed)}`);
  return lines;
}

export const proposalSize = (proposal: RoutineChangeProposal): number =>
  proposal.cambios.length + proposal.agregar.length + proposal.quitar.length;
