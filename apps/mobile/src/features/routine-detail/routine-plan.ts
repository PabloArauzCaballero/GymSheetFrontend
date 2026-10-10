import { exerciseGroupLabelEs } from '@gymsheet/domain';
import type { Routine, RoutineCard, RoutineDay, RoutineExercise } from '@gymsheet/types';

/** Trabajo medio de una serie, en segundos (incluye colocarse). */
const WORK_PER_SET_SEC = 40;
/** Descanso supuesto cuando el plan no lo fija. */
const DEFAULT_REST_SEC = 90;

/** Días en el orden de la semana (o en el de la rutina si son «cualquier día»). */
export function orderedDays(routine: Pick<Routine, 'dias'>): RoutineDay[] {
  return [...routine.dias].sort(
    (a, b) => (a.diaSemana ?? 99) - (b.diaSemana ?? 99) || a.orden - b.orden,
  );
}

/** «Día N» según la posición del día en la semana. */
export function dayNumber(routine: Pick<Routine, 'dias'>, diaId: string): number {
  return orderedDays(routine).findIndex((day) => day.id === diaId) + 1;
}

/**
 * Duración estimada de un día en minutos, redondeada a 5: series × (trabajo +
 * descanso del plan), sin el último descanso. Es una estimación honesta que se
 * presenta con «≈», no una promesa.
 */
export function estimateMinutes(
  items: ReadonlyArray<{ series: number; descansoSeg: number | null }>,
): number {
  if (items.length === 0) return 0;
  let seconds = 0;
  for (const item of items) {
    seconds += item.series * (WORK_PER_SET_SEC + (item.descansoSeg ?? DEFAULT_REST_SEC));
  }
  const last = items[items.length - 1];
  seconds -= last?.descansoSeg ?? DEFAULT_REST_SEC;
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

export function dayMinutes(day: Pick<RoutineDay, 'ejercicios'>): number {
  return estimateMinutes(
    day.ejercicios.map((item) => ({ series: item.seriesObjetivo, descansoSeg: item.descansoSeg })),
  );
}

/** Media de minutos por día de entreno. */
export function routineMinutes(routine: Pick<Routine, 'dias'>): number {
  const days = routine.dias.filter((day) => day.ejercicios.length > 0);
  if (days.length === 0) return 0;
  const total = days.reduce((sum, day) => sum + dayMinutes(day), 0);
  return Math.round(total / days.length / 5) * 5;
}

/** Músculos del día en español, sin repetir, en orden de aparición. */
export function dayMuscles(day: Pick<RoutineDay, 'ejercicios'>, limit = 4): string[] {
  const seen = new Set<string>();
  for (const item of day.ejercicios) {
    const raw = item.ejercicio?.targetMuscle ?? item.ejercicio?.grupoMuscular ?? null;
    const label = exerciseGroupLabelEs(raw);
    if (label) seen.add(label);
  }
  return [...seen].slice(0, limit);
}

/** Etiqueta del músculo de un ejercicio en español. */
export function exerciseMuscle(item: Pick<RoutineExercise, 'ejercicio'>): string {
  return exerciseGroupLabelEs(item.ejercicio?.targetMuscle ?? item.ejercicio?.grupoMuscular ?? null);
}

/** Primeros ejercicios con imagen de la rutina, para la portada. */
export function coverExercises(routine: Pick<Routine, 'dias'>, count = 3) {
  const out: NonNullable<RoutineExercise['ejercicio']>[] = [];
  for (const day of orderedDays(routine)) {
    for (const item of day.ejercicios) {
      if (item.ejercicio && !out.some((e) => e.id === item.ejercicio?.id)) out.push(item.ejercicio);
      if (out.length >= count) return out;
    }
  }
  return out;
}

/** Día de hoy en la escala de la rutina: 1 = lunes … 7 = domingo. */
export function todayWeekday(now = new Date()): number {
  return ((now.getDay() + 6) % 7) + 1;
}

/** «Torso · v2» → 2. */
export function copyNumberOf(name: string): number | null {
  const match = /·\s*v(\d+)\s*$/.exec(name);
  return match ? Number(match[1]) : null;
}

/**
 * Copias propias de una rutina ajena, a partir de las tarjetas de «Mías»: la
 * atribución congelada al copiar nombra la rutina y su autor. Mientras el
 * backend no exponga `basadaEnRutinaId` en la tarjeta, es la mejor señal.
 */
export function ownCopiesOf(
  source: Pick<Routine, 'nombre' | 'creadoPorUsuarioId'>,
  mine: readonly RoutineCard[],
): RoutineCard[] {
  return mine
    .filter(
      (card) =>
        card.esMia &&
        card.atribucion?.routineName === source.nombre &&
        (card.atribucion.authorId === null || card.atribucion.authorId === source.creadoPorUsuarioId),
    )
    .sort((a, b) => (copyNumberOf(b.nombre) ?? 0) - (copyNumberOf(a.nombre) ?? 0));
}
