import type { Routine, RoutineCalendar, RoutineWeek } from '@gymsheet/types';
import { WEEKDAYS, WEEKDAY_NAMES, type Weekday } from '../routine-draft/model';
import type { MonthColumn, PlannedWeek } from '../routine-draft/quality';

/** Una semana generada (`GET /routines/:id/calendar`) con el formato de la vista Mes. */
export function calendarWeeks(calendar: Pick<RoutineCalendar, 'semanas'>): PlannedWeek[] {
  return calendar.semanas.map((week) => ({
    numero: week.numero,
    esDescarga: week.esDescarga,
    ajustada: false,
  }));
}

/** Los siete días de la semana con lo que se entrena en cada uno. */
export function routineColumns(routine: Pick<Routine, 'dias'>): MonthColumn[] {
  return WEEKDAYS.map((dia) => {
    const day = routine.dias.find((candidate) => candidate.diaSemana === dia);
    return {
      dia,
      entrena: day !== undefined,
      nombre: day?.nombre?.trim() || null,
      ejercicios: day?.ejercicios.length ?? 0,
    };
  });
}

/** Rutina de «cualquier día»: un solo día sin día de la semana. */
export function isAnyDayRoutine(routine: Pick<Routine, 'dias'>): boolean {
  return routine.dias.length > 0 && routine.dias.every((day) => day.diaSemana === null);
}

export type DayExerciseView = {
  routineExerciseId: string;
  ejercicioId: string;
  nombre: string;
  grupoMuscular: string | null;
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  /** Ejercicio personal (privado) de otra persona: se puede denunciar. */
  esPrivado: boolean;
  /** Las series o el peso de la semana difieren de la rutina base (descarga). */
  ajustado: boolean;
};

export type DayView = {
  diaId: string;
  diaSemana: number | null;
  titulo: string;
  ejercicios: DayExerciseView[];
};

/**
 * La hoja de un día en una semana concreta: los nombres salen de la rutina y las
 * series, repeticiones y peso, de la semana generada (que ya aplica la descarga).
 */
export function dayView(
  routine: Pick<Routine, 'dias'>,
  week: RoutineWeek | undefined,
  diaId: string,
): DayView | null {
  const base = routine.dias.find((day) => day.id === diaId);
  if (!base) return null;
  const generated = week?.dias.find((day) => day.diaId === diaId);
  const title = [
    base.diaSemana ? WEEKDAY_NAMES[base.diaSemana as Weekday] : 'Cualquier día',
    base.nombre?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');
  const exercises = base.ejercicios.map((item): DayExerciseView => {
    const planned = generated?.ejercicios.find((e) => e.routineExerciseId === item.id);
    const series = planned?.series ?? item.seriesObjetivo;
    return {
      routineExerciseId: item.id,
      ejercicioId: item.ejercicio?.id ?? planned?.ejercicioId ?? '',
      nombre: item.ejercicio?.nombre ?? 'Ejercicio no disponible',
      grupoMuscular: item.ejercicio?.grupoMuscular ?? null,
      esPrivado: item.ejercicio?.tipoEjercicio === 'PERSONAL',
      series,
      repsMin: planned?.repsMin ?? item.repsMin,
      repsMax: planned?.repsMax ?? item.repsMax,
      pesoObjetivoKg: planned?.pesoObjetivoKg ?? item.pesoObjetivoKg,
      ajustado: series !== item.seriesObjetivo,
    };
  });
  return { diaId, diaSemana: base.diaSemana, titulo: title, ejercicios: exercises };
}

/** «3 × 8-12» o «4 series». */
export function setsLabel(item: Pick<DayExerciseView, 'series' | 'repsMin' | 'repsMax'>): string {
  const { series, repsMin, repsMax } = item;
  if (repsMin === null && repsMax === null) return `${series} series`;
  const reps =
    repsMin !== null && repsMax !== null && repsMin !== repsMax
      ? `${repsMin}-${repsMax}`
      : `${repsMin ?? repsMax}`;
  return `${series} × ${reps}`;
}
