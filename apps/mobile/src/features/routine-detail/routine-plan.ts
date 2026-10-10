import { exerciseGroupLabelEs } from '@gymsheet/domain';
import { copyNumberFromName, estimateDayMinutes } from '@gymsheet/hooks';
import type { Routine, RoutineCard, RoutineDay, RoutineExercise } from '@gymsheet/types';

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
 * Minutos estimados de un día de la rutina base, con la misma cuenta que la
 * pantalla del Día (`estimateDayMinutes`: bloques, transiciones y descanso tras
 * la vuelta una sola vez), para que la tarjeta y el Día digan lo mismo.
 */
export function dayMinutes(day: Pick<RoutineDay, 'ejercicios'>): number {
  return estimateDayMinutes(
    day.ejercicios.map((item) => ({
      grupo: item.grupo ?? null,
      grupoTipo: item.grupoTipo ?? null,
      series: item.seriesObjetivo,
      descansoSeg: item.descansoSeg,
      descansoEntreSeg: item.descansoEntreSeg ?? null,
      duracionSeg: item.duracionSeg ?? null,
    })),
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

/**
 * Número de copia de una tarjeta propia: `numeroCopia` del backend (C2) cuando
 * viene, y si no, el sufijo «· vN» del nombre (tarjetas anteriores a M-C3).
 */
export function cardCopyNumber(card: Pick<RoutineCard, 'nombre' | 'numeroCopia'>): number | null {
  return card.numeroCopia ?? copyNumberFromName(card.nombre);
}

/**
 * Copias propias de una rutina ajena, a partir de las tarjetas de «Mías» (C2):
 * la señal es `basadaEnRutinaId === routine.id`. Solo con tarjetas antiguas, sin
 * ese campo, se cae a la atribución congelada al copiar (nombre y autor).
 */
export function ownCopiesOf(
  source: Pick<Routine, 'id' | 'nombre' | 'creadoPorUsuarioId'>,
  mine: readonly RoutineCard[],
): RoutineCard[] {
  return mine
    .filter((card) => {
      if (!card.esMia) return false;
      if (card.basadaEnRutinaId !== undefined) return card.basadaEnRutinaId === source.id;
      return (
        card.atribucion?.routineName === source.nombre &&
        (card.atribucion.authorId === null || card.atribucion.authorId === source.creadoPorUsuarioId)
      );
    })
    .sort((a, b) => (cardCopyNumber(b) ?? 0) - (cardCopyNumber(a) ?? 0));
}
