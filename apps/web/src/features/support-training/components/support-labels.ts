import type { RecomputeResult } from '@/features/support-training/services/support-training-service';

export const LANE_LABEL: Record<string, string> = {
  STRENGTH: 'Fuerza',
  CARDIO: 'Cardio',
};

export const MODE_LABEL: Record<string, string> = {
  NONE: 'Sin modo',
  PROGRESSIVE_OVERLOAD: 'Sobrecarga progresiva',
  STRENGTH_GOAL: 'Meta de fuerza',
};

export const PROGRAM_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  FINISHED: 'Terminado',
  STOPPED: 'Detenido',
};

export const SHARE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  DECLINED: 'Rechazada',
  REVOKED: 'Revocada',
};

export const REWARD_REASON_LABEL: Record<string, string> = {
  SEMANA_CUMPLIDA: 'Semana cumplida',
  PROGRAMA_COMPLETADO: 'Programa completado',
};

export const label = (map: Record<string, string>, key: string) => map[key] ?? key;

/** Qué le pasó a la semana, dicho a quien atiende al socio. */
export function recomputeMessage(result: RecomputeResult): string {
  switch (result.motivo) {
    case 'CUMPLIDA':
      return `Semana recalculada: ahora cuenta como cumplida (multiplicador ×${result.multiplicador?.toFixed(2) ?? '—'}, bono de ${result.bono ?? 0} puntos).`;
    case 'YA_CUMPLIDA':
      return 'No hubo cambios: la semana ya estaba cumplida. Recalcular no resta ni duplica puntos.';
    case 'SIGUE_SIN_CUMPLIR':
      return 'No hubo cambios: con las sesiones registradas la semana sigue sin cumplirse.';
    case 'SEMANA_ABIERTA':
      return 'La semana todavía no ha terminado, así que no se puede recalcular.';
    case 'SEMANA_NO_ENCONTRADA':
      return 'Esa semana no existe en el programa.';
  }
}

/** `2026-10-08` → `08/10/2026`, sin pasar por `Date` (que lo correría por zona horaria). */
export function isoDayLabel(day: string): string {
  const [year, month, date] = day.slice(0, 10).split('-');
  return `${date}/${month}/${year}`;
}
