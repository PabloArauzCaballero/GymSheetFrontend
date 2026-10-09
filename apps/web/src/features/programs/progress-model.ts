import type { Program, ProgramWeekProgress } from '@gymsheet/types';

/** Estado de una semana del programa para mostrarlo sin depender solo del color. */
export type WeekState = 'cumplida' | 'incumplida' | 'actual' | 'pendiente';

export function weekState(week: ProgramWeekProgress, currentWeek: number | null): WeekState {
  if (week.cumplida === true) return 'cumplida';
  if (week.cumplida === false) return 'incumplida';
  return currentWeek === week.numero ? 'actual' : 'pendiente';
}

export const WEEK_STATE_LABEL: Record<WeekState, string> = {
  cumplida: 'Cumplida',
  incumplida: 'No cumplida',
  actual: 'En curso',
  pendiente: 'Por venir',
};

/** El programa pasó de su fecha final: toca decidir qué sigue (RF-19). */
export function hasEnded(program: Pick<Program, 'estado' | 'semanaActual' | 'fechaFinPrevista'>, today: string): boolean {
  return program.estado === 'ACTIVE' && (program.semanaActual === null || program.fechaFinPrevista < today);
}

export function summarizeWeeks(weeks: readonly ProgramWeekProgress[]) {
  const closed = weeks.filter((week) => week.cumplida !== null);
  const done = closed.filter((week) => week.cumplida === true).length;
  return {
    cumplidas: done,
    cerradas: closed.length,
    sesionesHechas: weeks.reduce((sum, week) => sum + week.sesionesHechas, 0),
    sesionesPlan: weeks.reduce((sum, week) => sum + week.sesionesPlan, 0),
    minutosCardio: weeks.reduce((sum, week) => sum + week.minutosCardio, 0),
  };
}

/** Avance hacia una meta de marca, de 0 a 1, entre la marca inicial y la meta. */
export function goalProgress(meta: { marcaInicialKg: number | null; marcaActualKg: number | null; marcaMetaKg: number | null }): number {
  const { marcaInicialKg: start, marcaActualKg: now, marcaMetaKg: goal } = meta;
  if (start === null || goal === null || goal <= start) return 0;
  return Math.min(1, Math.max(0, ((now ?? start) - start) / (goal - start)));
}
