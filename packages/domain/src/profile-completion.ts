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

/**
 * The empty-state line under the senda when the numbers are zero: a next step,
 * not a scolding. Null once there is a live streak.
 */
export function fitnessEmptyHint({ streak, sessions }: { streak: number; sessions: number }): string | null {
  if (sessions === 0) return 'Tu primera sesión enciende la racha.';
  if (streak === 0) return 'Entrena hoy y vuelve a encender tu racha.';
  return null;
}

/**
 * Lo que devuelve `GET /me/progression/profile-completion`, solo con los campos
 * que leen estas funciones: el servidor decide qué vale cada dato y si ya está
 * pagado; aquí solo se ordena y se dice.
 */
export type ProfileCompletionItemLike = {
  code: string;
  label: string;
  hint: string;
  points: number;
  done: boolean;
  awarded: boolean;
};

/** Lo que falta y todavía da puntos, de más a menos valioso (orden del servidor). */
export function pendingProfileItems<T extends ProfileCompletionItemLike>(items: readonly T[]): T[] {
  return items.filter((item) => !item.done && !item.awarded);
}

/** «Completa tu perfil y gana +190 puntos». Sin puntos pendientes no hay promesa. */
export function profileNudgeTitle(pointsAvailable: number): string | null {
  if (pointsAvailable <= 0) return null;
  return `Completa tu perfil y gana +${pointsAvailable.toLocaleString('es-ES')} puntos`;
}

/**
 * The single profile progress number: items done out of items listed, exactly
 * the server's `percent`. The ring, the bar and the edit header all read this,
 * so they never disagree; points are what each item pays, not the progress.
 */
export function profileProgress(completion: { completed: number; total: number; percent: number }): { ratio: number; label: string } {
  const ratio = Math.min(Math.max(completion.percent / 100, 0), 1);
  const label = `Perfil al ${completion.percent} %: ${completion.completed} de ${completion.total} datos`;
  return { ratio, label };
}

/**
 * What a screen reader hears on the completion ring. Without a photo the ring
 * wraps initials, so it speaks of the profile, not of «tu foto». The pill's
 * «Sin cargar» is said too, so a failed read is never silent.
 */
export function completionRingLabel({ hasPhoto, percent, failed = false }: { hasPhoto: boolean; percent: number | null; failed?: boolean }): string {
  const subject = hasPhoto ? 'Tu foto de perfil' : 'Tu perfil';
  if (percent !== null) return `${subject}, ${percent} % completo`;
  return failed ? `${subject}. Progreso sin cargar` : subject;
}

/**
 * Points the server awarded in this very read (`awardedNow`), and the line
 * that says it. Zero when nothing was awarded: no celebration for old news.
 */
export function awardedNowPoints<T extends Pick<ProfileCompletionItemLike, 'code' | 'points'>>(completion: { items: readonly T[]; awardedNow: readonly string[] }): number {
  return completion.items.filter((item) => completion.awardedNow.includes(item.code)).reduce((sum, item) => sum + item.points, 0);
}

/**
 * Points to celebrate on a completion read. Any progression read on the server
 * can be the one that awards (`awardedNow` lands on whichever request got
 * there first), so the client also compares `pointsEarned` with the last read
 * it saw for this member: a rise is an award, whichever request granted it.
 * Without a previous read there is nothing to compare: no celebration.
 */
export function pointsAwardDelta(previousEarned: number | null, completion: { pointsEarned: number; items: readonly Pick<ProfileCompletionItemLike, 'code' | 'points'>[]; awardedNow: readonly string[] }): number {
  // Already counted (another screen read the same data first): never celebrate twice.
  if (previousEarned !== null) return Math.max(completion.pointsEarned - previousEarned, 0);
  return awardedNowPoints(completion);
}

export function awardAnnouncement(points: number): string {
  return `+${points.toLocaleString('es-ES')} puntos por completar tu perfil.`;
}

/**
 * The «complete» state: the profile is at 100 %. It says what completing it
 * earned (the server's `pointsEarned`) and points to the reward: how others see
 * you. Members who had everything before points existed earned 0: no number.
 */
export function profileCompleteCopy(completion: { percent: number; pointsEarned: number }): { title: string; body: string } | null {
  if (completion.percent < 100) return null;
  const body = completion.pointsEarned > 0
    ? `Ganaste ${completion.pointsEarned.toLocaleString('es-ES')} puntos completándolo. Así te ven en Conocer.`
    : 'Así te ven en Conocer.';
  return { title: 'Perfil completo', body };
}

/** «+50». Lo que vale un dato, listo para una ficha. */
export function pointsChip(points: number): string {
  return `+${points.toLocaleString('es-ES')}`;
}

/**
 * El nombre tal como sale en la carta de Conocer: nombre de pila e inicial del
 * segundo token. Mismo criterio que `shortenName` del backend, para que «Ver
 * como te ven» no enseñe un nombre que nadie más ve.
 */
export function cardDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? '';
  const initial = parts.length > 1 && parts[1] ? `${parts[1].charAt(0).toUpperCase()}.` : '';
  return [first, initial].filter(Boolean).join(' ');
}

export const experienceLevelLabels: Record<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED', string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
};

/** Largo máximo de la bio: el mismo que valida el servidor. */
export const BIO_MAX_LENGTH = 160;
