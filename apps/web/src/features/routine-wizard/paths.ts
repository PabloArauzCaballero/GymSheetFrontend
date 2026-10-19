import { WEEKDAYS, WIZARD_STEPS, type DayTarget, type Weekday } from '@gymsheet/hooks';

/** Rutas del asistente de creación de rutinas (`/routines/new/<paso>`). */
export function wizardStepPath(index: number): string {
  const step =
    WIZARD_STEPS[Math.min(Math.max(index, 0), WIZARD_STEPS.length - 1)] ?? WIZARD_STEPS[0];
  return `/routines/new/${step.id}`;
}

/** Índice (base 0) del paso con ese identificador de URL, o `null` si no existe. */
export function stepIndexFromSlug(slug: string): number | null {
  const index = WIZARD_STEPS.findIndex((step) => step.id === slug);
  return index === -1 ? null : index;
}

export function dayPath(dia: DayTarget): string {
  return `/routines/new/dia/${dia}`;
}

export function orderPath(dia: DayTarget): string {
  return `/routines/new/dia/${dia}/ordenar`;
}

/** Ficha de un ejercicio abierta desde el asistente (con «Añadir a la rutina»). */
export function pickDetailPath(exerciseId: string, dia: DayTarget): string {
  return `/routines/new/ejercicio/${exerciseId}?dia=${dia}`;
}

/** `dia` de la URL: un día de la semana (1 a 7) o `grupo`; `null` si no es ninguno. */
export function parseDayTarget(value: string | null | undefined): DayTarget | null {
  if (value === 'grupo') return 'grupo';
  const day: Weekday | undefined = WEEKDAYS.find((candidate) => String(candidate) === value);
  return day ?? null;
}
