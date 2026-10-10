import { GOAL_LABELS } from '@gymsheet/hooks';
import type { RoutineVisibility, TrainingGoal } from '@gymsheet/types';

export function goalLabel(goal: TrainingGoal | null): string {
  return goal ? GOAL_LABELS[goal] : 'Objetivo libre';
}

export function visibilityLabel(visibility: RoutineVisibility | string): string {
  switch (visibility) {
    case 'PRIVATE':
      return 'Privada';
    case 'PUBLIC':
      return 'Pública';
    case 'SHARED':
      return 'Compartida';
    case 'TEMPLATE':
      return 'Plantilla';
    default:
      return visibility;
  }
}

/** «12 semanas · 3 meses» cuando son meses completos de cuatro semanas; «6 semanas» si no. */
export function durationLabel(weeks: number | null): string | null {
  if (!weeks) return null;
  if (weeks >= 4 && weeks % 4 === 0) {
    const months = weeks / 4;
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  }
  return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
}

export function daysPerWeekLabel(days: number): string {
  return `${days} ${days === 1 ? 'día' : 'días'}/sem`;
}

export function exerciseCountLabel(count: number | null): string {
  if (count === null) return 'Contenido oculto hasta aceptar';
  return `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`;
}

/** «4,6 (32)» o «Sin valoraciones». */
export function ratingLabel(promedio: number | null, total: number): string {
  if (promedio === null || total === 0) return 'Sin valoraciones';
  return `${promedio.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (${total})`;
}
