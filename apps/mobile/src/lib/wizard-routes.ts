import { router, type Href } from 'expo-router';
import { WEEKDAYS, WIZARD_STEPS, type DayTarget, type Weekday } from '@gymsheet/hooks';

/**
 * Rutas del asistente de creación de rutinas. El primer paso es `/routines/new`
 * (así el botón «Crear rutina» no cambia) y el resto cuelga de él.
 */
export function wizardStepPath(index: number): Href {
  const step = WIZARD_STEPS[index];
  // Las rutas del asistente son dinámicas: se tipan como `Href` aquí, una sola vez.
  return (index <= 0 || !step ? '/routines/new' : `/routines/new/${step.id}`) as Href;
}

/** Pantalla de ejercicios de un día; `grupo` es «Configurar juntos». */
export function dayPath(dia: Weekday | 'grupo'): Href {
  return `/routines/new/day/${dia}` as Href;
}

export function orderPath(dia: Weekday | 'grupo'): Href {
  return `/routines/new/ordenar/${dia}` as Href;
}

/** Ficha de un ejercicio abierta desde el asistente (con «Añadir a la rutina»). */
export function pickDetailPath(exerciseId: string, dia: Weekday | 'grupo'): Href {
  return `/routines/new/ejercicio/${exerciseId}?pickFor=${dia}` as Href;
}

/** Vuelve a un paso ya recorrido, sin apilar otra copia encima. */
export function goToWizardStep(index: number): void {
  router.navigate(wizardStepPath(index));
}

/** Parámetro `dia` de la URL: un día de la semana (1 a 7) o `grupo`; `null` si no es ninguno. */
export function parseDayTarget(value: string | undefined): DayTarget | null {
  if (value === 'grupo') return 'grupo';
  return WEEKDAYS.find((candidate) => String(candidate) === value) ?? null;
}
