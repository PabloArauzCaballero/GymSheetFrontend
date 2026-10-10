import { WEEKDAY_INITIALS, WEEKDAY_NAMES, type Weekday } from '@gymsheet/hooks';
import type { Routine, Workout } from '@gymsheet/types';
import type { WeekDot } from '@/components/week-dots';

const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Lunes = 1 … domingo = 7 para una fecha local. */
function isoDay(date: Date): Weekday {
  return (((date.getDay() + 6) % 7) + 1) as Weekday;
}

/** Medianoche local del lunes de la semana de `now`. */
function mondayOf(now: Date): Date {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (isoDay(now) - 1));
  return monday;
}

/**
 * La semana de Inicio en 7 círculos: hecho (sesión finalizada ese día de esta
 * semana), entreno (la rutina lo tiene y aún no se hizo), descanso, y hoy con
 * anillo. Sin rutina, solo cuentan las sesiones hechas.
 */
export function homeWeekDots(
  sessions: readonly Pick<Workout, 'estado' | 'fechaInicio'>[],
  routine: Pick<Routine, 'dias'> | null | undefined,
  now = new Date(),
): { days: WeekDot[]; done: number; planned: number } {
  const monday = mondayOf(now).getTime();
  const nextMonday = monday + 7 * 24 * 60 * 60 * 1000;
  const doneDays = new Set<Weekday>();
  for (const session of sessions) {
    if (session.estado !== 'FINALIZADA') continue;
    const start = new Date(session.fechaInicio);
    const time = start.getTime();
    if (time >= monday && time < nextMonday) doneDays.add(isoDay(start));
  }
  const routineDays = new Map<number, string | null>();
  for (const day of routine?.dias ?? []) {
    if (day.diaSemana !== null && day.ejercicios.length > 0) routineDays.set(day.diaSemana, day.nombre);
  }
  const today = isoDay(now);
  const days = WEEK.map((dia): WeekDot => {
    const done = doneDays.has(dia);
    const training = routineDays.has(dia);
    const name = routineDays.get(dia);
    return {
      key: String(dia),
      initial: WEEKDAY_INITIALS[dia],
      label: `${WEEKDAY_NAMES[dia]}${done ? '' : training ? `, ${name ?? 'entreno'}` : ', descanso'}`,
      state: done ? 'done' : training ? 'training' : 'rest',
      today: dia === today,
    };
  });
  return { days, done: doneDays.size, planned: routineDays.size };
}
