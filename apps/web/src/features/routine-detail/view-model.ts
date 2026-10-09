import { WEEKDAYS, type Weekday } from '@gymsheet/hooks';
import type { Routine, RoutineCalendar } from '@gymsheet/types';

/** Un ejercicio dentro de un día de una semana concreta, con las series ya ajustadas por la descarga. */
export type ExerciseLine = {
  routineExerciseId: string;
  ejercicioId: string;
  nombre: string;
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoKg: number | null;
};

export type DayModel = {
  diaId: string;
  diaSemana: number | null;
  nombre: string | null;
  ejercicios: ExerciseLine[];
};

export type WeekModel = {
  numero: number;
  esDescarga: boolean;
  factorVolumen: number;
  factorCarga: number;
  nota: string | null;
  dias: DayModel[];
};

/**
 * Las semanas que se enseñan: las del calendario del servidor, con el nombre de
 * cada ejercicio tomado de la rutina. Si el calendario no llegó, la semana base
 * de la propia rutina — la pantalla sigue siendo útil.
 */
export function buildWeeks(routine: Routine, calendar: RoutineCalendar | null): WeekModel[] {
  const names = new Map<string, string>();
  for (const day of routine.dias) {
    for (const exercise of day.ejercicios) names.set(exercise.id, exercise.ejercicio?.nombre ?? 'Ejercicio');
  }
  if (calendar && calendar.semanas.length > 0) {
    return calendar.semanas.map((week) => ({
      numero: week.numero,
      esDescarga: week.esDescarga,
      factorVolumen: week.factorVolumen,
      factorCarga: week.factorCarga,
      nota: week.nota,
      dias: week.dias.map((day) => ({
        diaId: day.diaId,
        diaSemana: day.diaSemana,
        nombre: day.nombre,
        ejercicios: day.ejercicios
          .slice()
          .sort((a, b) => a.orden - b.orden)
          .map((exercise) => ({
            routineExerciseId: exercise.routineExerciseId,
            ejercicioId: exercise.ejercicioId,
            nombre: names.get(exercise.routineExerciseId) ?? 'Ejercicio',
            series: exercise.series,
            repsMin: exercise.repsMin,
            repsMax: exercise.repsMax,
            pesoKg: exercise.pesoSugeridoKg ?? exercise.pesoObjetivoKg,
          })),
      })),
    }));
  }
  return [
    {
      numero: 1,
      esDescarga: false,
      factorVolumen: 1,
      factorCarga: 1,
      nota: null,
      dias: routine.dias.map((day) => ({
        diaId: day.id,
        diaSemana: day.diaSemana,
        nombre: day.nombre,
        ejercicios: day.ejercicios.map((exercise) => ({
          routineExerciseId: exercise.id,
          ejercicioId: exercise.ejercicio?.id ?? '',
          nombre: exercise.ejercicio?.nombre ?? 'Ejercicio',
          series: exercise.seriesObjetivo,
          repsMin: exercise.repsMin,
          repsMax: exercise.repsMax,
          pesoKg: exercise.pesoObjetivoKg,
        })),
      })),
    },
  ];
}

/** Una rutina de «cualquier día»: ningún día tiene fecha en la semana (las rutinas anteriores a los días). */
export function isAnyDayRoutine(weeks: readonly WeekModel[]): boolean {
  const days = weeks[0]?.dias ?? [];
  return days.length > 0 && days.every((day) => day.diaSemana === null);
}

/** Los siete días de la semana, cada uno con su día de rutina o `null` si descansa. */
export function weekColumns(week: WeekModel): Array<{ dia: Weekday; day: DayModel | null }> {
  return WEEKDAYS.map((dia) => ({ dia, day: week.dias.find((candidate) => candidate.diaSemana === dia) ?? null }));
}

/** El nombre con el que se llama a un día: el que le puso su autor o, si no, el día de la semana. */
export function dayTitle(day: DayModel, weekdayName: (dia: Weekday) => string): string {
  if (day.nombre) return day.nombre;
  return day.diaSemana ? weekdayName(day.diaSemana as Weekday) : 'Cualquier día';
}

export function findDay(week: WeekModel | undefined, diaId: string | null): DayModel | null {
  if (!week || !diaId) return null;
  return week.dias.find((day) => day.diaId === diaId) ?? null;
}

/** Texto de las repeticiones: «8–12», «5» o nada. */
export function repsLabel(line: Pick<ExerciseLine, 'repsMin' | 'repsMax'>): string | null {
  if (line.repsMin === null && line.repsMax === null) return null;
  if (line.repsMin !== null && line.repsMax !== null && line.repsMin !== line.repsMax) {
    return `${line.repsMin}–${line.repsMax}`;
  }
  return String(line.repsMin ?? line.repsMax);
}

/** «3 series × 8–12 reps · 62,5 kg». */
export function lineSummary(line: ExerciseLine): string {
  const reps = repsLabel(line);
  const parts = [`${line.series} ${line.series === 1 ? 'serie' : 'series'}${reps ? ` × ${reps} reps` : ''}`];
  if (line.pesoKg) parts.push(`${line.pesoKg.toLocaleString('es')} kg`);
  return parts.join(' · ');
}
