export type ActiveKind = 'gym' | 'cardio';

/**
 * Qué se abre por defecto: lo que pida el enlace; si no, la que está activada.
 * Con las dos activas manda la de hoy (cardio solo si hoy no toca pesas).
 */
export function defaultKind(
  requested: string | undefined,
  active: { gym: boolean; cardio: boolean },
  today: { gym: boolean; cardio: boolean },
): ActiveKind {
  if (requested === 'gym' || requested === 'cardio') return requested;
  if (active.gym && active.cardio) return today.cardio && !today.gym ? 'cardio' : 'gym';
  if (active.cardio) return 'cardio';
  return 'gym';
}
