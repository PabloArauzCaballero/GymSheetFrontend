import type { RoutineChangeProposal } from '@gymsheet/types';

/** La lista de cambios de la hoja RF-20 en palabras (la propuesta trae ids; los nombres vienen de la sesión). */
export function describeProposal(
  proposal: RoutineChangeProposal,
  names: ReadonlyMap<string, string> = new Map(),
): string[] {
  const name = (id: string) => names.get(id) ?? 'un ejercicio';
  const lines: string[] = [];
  for (const change of proposal.cambios) {
    const parts: string[] = [];
    if (change.pesoObjetivoKg !== undefined) parts.push(`peso ${change.pesoObjetivoKg.toLocaleString('es')} kg`);
    if (change.seriesObjetivo !== undefined) parts.push(`${change.seriesObjetivo} ${change.seriesObjetivo === 1 ? 'serie' : 'series'}`);
    lines.push(`${name(change.routineExerciseId)}: ${parts.join(' y ')}`);
  }
  for (const added of proposal.agregar) {
    const detail = added.pesoObjetivoKg ? ` con ${added.pesoObjetivoKg.toLocaleString('es')} kg` : '';
    lines.push(`Se añade ${name(added.ejercicioId)} (${added.seriesObjetivo} ${added.seriesObjetivo === 1 ? 'serie' : 'series'}${detail})`);
  }
  for (const removed of proposal.quitar) lines.push(`Se quita ${name(removed)}`);
  return lines;
}
