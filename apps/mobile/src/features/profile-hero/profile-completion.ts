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

/** «Te falta una foto y tu primer pesaje para un perfil completo.» */
export function completionMessage(missing: readonly CompletionItem[]): string | null {
  if (!missing.length) return null;
  const labels = missing.map((item) => item.label);
  const list = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
  return `Te falta ${list} para un perfil completo.`;
}
