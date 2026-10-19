import { shareWithBrand } from '@/lib/share-brand';

/**
 * Enlace al perfil público, en el mismo formato de esquema que ya usa
 * «Compartir rutina» (`gymsheet://routines/<id>`): la ruta es `perfil/[userId]`.
 */
export function profileDeepLink(userId: string): string {
  return `gymsheet://perfil/${userId}`;
}

/**
 * La cifra que mejor presume, de la más viva a la más acumulada: la racha si
 * la hay, si no las sesiones, si no los puntos. Solo cifras reales.
 */
export function proudStat({ streak, sessions, points }: { streak: number; sessions: number; points: number }): string {
  if (streak > 0) return streak === 1 ? '1 día de racha' : `${streak.toLocaleString('es-ES')} días de racha`;
  if (sessions > 0) return sessions === 1 ? '1 sesión entrenada' : `${sessions.toLocaleString('es-ES')} sesiones entrenadas`;
  return `${points.toLocaleString('es-ES')} pts`;
}

/** «Compartir mi perfil» (#93 viral loops · #87 powered by): rango + una cifra, firmado. */
export function shareMyProfile({
  userId,
  rank,
  stat,
}: {
  userId: string;
  rank: string;
  stat: string;
}): void {
  shareWithBrand([`Rango ${rank} · ${stat}.`, 'Entrena conmigo:'], profileDeepLink(userId));
}
