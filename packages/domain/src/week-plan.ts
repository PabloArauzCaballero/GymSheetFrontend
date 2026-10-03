import type { RoutineAssignment } from '@gymsheet/types';

/**
 * La semana de entrenamiento: cómo se guardan los días y cómo se pintan.
 *
 * El backend guarda `diasSemana` como enteros con la convención de
 * `Date.getDay()` (0 = domingo). Ese es el contrato; lo que cambia es el orden
 * de presentación, que en España y Latinoamérica empieza el lunes. Separar
 * almacenamiento de presentación permite tener las dos cosas bien, y tenerlo
 * escrito una sola vez evita que una app desplace todas las rutinas un día.
 */

/** Orden de presentación: lunes primero. Los valores siguen siendo `getDay()`. */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Iniciales indexadas por `getDay()`. La X distingue miércoles de martes. */
export const WEEKDAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

/** Nombres completos indexados por `getDay()`, para lectores de pantalla. */
export const WEEKDAY_NAME = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * Cuánto dura un plan, en las palabras que usa la gente.
 *
 * Nadie piensa «hasta el 18 de septiembre»; piensa «lo pruebo un mes». Ofrecer
 * duraciones en vez de un calendario quita un selector del flujo y aun así
 * escribe una fecha de fin real, que es lo que guarda el backend.
 */
export const SCHEDULE_DURATIONS = [
  { label: '1 mes', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: 'Sin límite', days: null },
] as const satisfies readonly { label: string; days: number | null }[];

/**
 * `YYYY-MM-DD` en hora local.
 *
 * `toISOString()` daría la fecha UTC: en Bolivia (UTC-4), a partir de las 20:00
 * eso ya es mañana, y un plan programado de noche empezaría un día tarde.
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Fecha de fin de un plan que empieza `from`, o `null` si es indefinido. */
export function scheduleEndDate(days: number | null, from: Date = new Date()): string | null {
  if (days === null) return null;
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return toLocalIsoDate(end);
}

/** Cuerpo de `POST /routines/:id/schedule`, con los días ordenados y sin repetir. */
export function buildRoutineSchedule(
  weekdays: readonly number[],
  durationDays: number | null,
  from: Date = new Date(),
): { diasSemana: number[]; repiteDesde: string; repiteHasta: string | null } {
  return {
    diasSemana: [...new Set(weekdays)].sort((a, b) => a - b),
    repiteDesde: toLocalIsoDate(from),
    repiteHasta: scheduleEndDate(durationDays, from),
  };
}

/** Asignaciones activas que caen en un día (`getDay()`). */
export function assignmentsForWeekday(
  assignments: readonly RoutineAssignment[],
  day: number,
): RoutineAssignment[] {
  return assignments.filter((item) => item.estado === 'ACTIVE' && item.diasSemana.includes(day));
}

/**
 * Los planes del coach comparten el prefijo «Plan del coach — », así que lo que
 * va después de la raya es lo único que distingue un día de otro.
 */
export function shortRoutineName(name: string): string {
  return name.split('—').pop()?.trim() ?? name;
}
