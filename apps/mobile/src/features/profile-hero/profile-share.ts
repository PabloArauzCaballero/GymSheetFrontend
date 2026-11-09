import { shareWithBrand } from '@/lib/share-brand';

/**
 * Enlace al perfil público, en el mismo formato de esquema que ya usa
 * «Compartir rutina» (`gymsheet://routines/<id>`): la ruta es `perfil/[userId]`.
 */
export function profileDeepLink(userId: string): string {
  return `gymsheet://perfil/${userId}`;
}

/** La cifra que mejor presume: vive en `@gymsheet/domain`. */
export { proudStat } from '@gymsheet/domain';

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
