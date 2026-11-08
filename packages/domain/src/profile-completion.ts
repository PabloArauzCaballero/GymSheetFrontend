/** Completitud del perfil propio y la cifra para presumirlo: compartido por web y móvil. */
/**
 * Qué le falta al perfil propio, deducido solo de lo que la pantalla ya pide
 * (perfil, fotos y pesajes). Un dato cuya consulta aún no respondió no cuenta
 * ni como hecho ni como pendiente: mejor callar que avisar en falso.
 */
export type CompletionItem = { key: 'datos' | 'foto' | 'peso'; done: boolean; label: string };

export function profileCompletion({
  profileKnown,
  hasProfile,
  photosKnown,
  hasPhoto,
  measurementsKnown,
  hasMeasurement,
}: {
  profileKnown: boolean;
  hasProfile: boolean;
  photosKnown: boolean;
  hasPhoto: boolean;
  measurementsKnown: boolean;
  hasMeasurement: boolean;
}): { items: CompletionItem[]; missing: CompletionItem[]; ratio: number } {
  const items: CompletionItem[] = [];
  if (profileKnown) items.push({ key: 'datos', done: hasProfile, label: 'tus datos' });
  if (photosKnown) items.push({ key: 'foto', done: hasPhoto, label: 'una foto' });
  if (measurementsKnown) items.push({ key: 'peso', done: hasMeasurement, label: 'tu primer pesaje' });
  const missing = items.filter((item) => !item.done);
  const ratio = items.length ? (items.length - missing.length) / items.length : 0;
  return { items, missing, ratio };
}

/** «Para un perfil completo: una foto y tu primer pesaje.» Sin verbo, así concuerda con uno o varios. */
export function completionMessage(missing: readonly CompletionItem[]): string | null {
  if (!missing.length) return null;
  const labels = missing.map((item) => item.label);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `Para un perfil completo: ${list}.`;
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
